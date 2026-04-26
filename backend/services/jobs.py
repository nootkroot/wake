"""Manual job runner. No background threads, no cron. Triggered via /jobs/run."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from ..models.job import JobQueue, JobStatus, JobType
from ..models.legislation import LegislationChunk
from ..models.submission import Submission, SubmissionStatus
from ..models.voting_period import VotingPeriod
from ..models.common import GranularityLevel
from ..schemas import (
    ChunkFilter,
    LegislationChunkCreate,
    PeriodMetadata,
)
from .export.adapter import ExportAdapter
from .export.pdf_adapter import PDFExportAdapter
from .gemma import GemmaClient, get_gemma_client
from .score import ScoreService
from .vector_store import VectorStore

logger = logging.getLogger(__name__)


class JobRunner:
    """Orchestrates manual processing of jobs in the JobQueue table."""

    def __init__(
        self,
        session: Session,
        gemma: Optional[GemmaClient] = None,
        export_adapter: Optional[ExportAdapter] = None,
    ) -> None:
        self.session = session
        self.gemma = gemma or get_gemma_client()
        self.export_adapter = export_adapter or PDFExportAdapter()
        self.vector_store = VectorStore(session)
        self.score_service = ScoreService(session)

    async def run_pending(
        self, limit: int = 5, job_type: Optional[JobType] = None
    ) -> list[JobQueue]:
        stmt = select(JobQueue).where(JobQueue.status == JobStatus.PENDING)
        if job_type is not None:
            stmt = stmt.where(JobQueue.job_type == job_type)
        stmt = stmt.order_by(JobQueue.created_at).limit(limit)
        jobs = self.session.exec(stmt).all()
        results: list[JobQueue] = []
        for job in jobs:
            try:
                await self._run_one(job)
            except Exception as exc:
                logger.exception("Job %s failed", job.id)
                job.status = JobStatus.FAILED
                job.error = str(exc)
                job.finished_at = datetime.now(timezone.utc)
                self.session.add(job)
                self.session.commit()
            results.append(job)
        return results

    async def _run_one(self, job: JobQueue) -> None:
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        self.session.add(job)
        self.session.commit()

        if job.job_type == JobType.SCORE_SUBMISSION:
            await self._run_score(job)
        elif job.job_type == JobType.INGEST_DOCUMENT:
            await self._run_ingest(job)
        elif job.job_type == JobType.TRANSLATE_CHUNKS:
            await self._run_translate(job)
        elif job.job_type == JobType.CLOSE_PERIOD:
            await self._run_close_period(job)
        else:
            raise RuntimeError(f"Unknown job type: {job.job_type}")

        job.status = JobStatus.DONE
        job.finished_at = datetime.now(timezone.utc)
        self.session.add(job)
        self.session.commit()

    async def _run_score(self, job: JobQueue) -> None:
        submission_id = UUID(job.payload["submission_id"])
        submission = self.session.get(Submission, submission_id)
        if submission is None:
            raise LookupError(f"Submission {submission_id} not found")

        # Pull a small amount of context from the legislation store.
        try:
            embedding = (await self.gemma.embed_texts([f"{submission.title}\n{submission.body}"]))[0]
            context_chunks = await self.vector_store.similarity_search(
                query_embedding=embedding,
                top_k=3,
                filter=ChunkFilter(),
            )
        except Exception:
            context_chunks = []

        result = await self.gemma.score_submission(
            title=submission.title,
            body=submission.body,
            image_url=submission.image_url,
            context_chunks=[c.content for c in context_chunks],
        )

        submission.severity = result.severity
        submission.gemma_rationale = result.rationale
        submission.scoring_job_id = job.id
        if submission.status == SubmissionStatus.PENDING_REVIEW:
            submission.status = SubmissionStatus.ACTIVE
        submission.updated_at = datetime.now(timezone.utc)
        self.session.add(submission)
        self.session.commit()

        job.result = {
            "submission_id": str(submission.id),
            "severity": int(result.severity),
            "rationale": result.rationale,
            "confidence": result.confidence,
        }

    async def _run_ingest(self, job: JobQueue) -> None:
        payload = job.payload
        text = payload.get("text") or ""
        if not text and payload.get("url"):
            import httpx

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(payload["url"])
                resp.raise_for_status()
                text = resp.text

        if not text:
            raise ValueError("Ingest job requires either `text` or `url`")

        granularity = GranularityLevel(payload.get("granularity", "CITY"))
        doc_id = UUID(payload["doc_id"])
        chunks = await self.gemma.ingest_document(
            text=text,
            doc_id=doc_id,
            doc_title=payload["title"],
            doc_source=payload.get("source") or payload.get("url") or payload["title"],
            granularity=granularity,
            source_verified=bool(payload.get("source_verified", False)),
            ingestion_job_id=job.id,
        )
        count = await self.vector_store.upsert_chunks(chunks)
        job.result = {"doc_id": str(doc_id), "chunks": count}

    async def _run_translate(self, job: JobQueue) -> None:
        payload = job.payload
        doc_id = UUID(payload["doc_id"])
        target_lang = payload["target_lang"]
        chunks = self.session.exec(
            select(LegislationChunk).where(LegislationChunk.doc_id == doc_id)
        ).all()
        if not chunks:
            job.result = {"doc_id": str(doc_id), "translated": 0}
            return
        texts = [c.content for c in chunks]
        translated = await self.gemma.translate_chunks(texts, target_lang=target_lang)
        for ch, tr in zip(chunks, translated):
            ch.content_translated = tr
            ch.lang_translated = target_lang
            self.session.add(ch)
        self.session.commit()
        job.result = {"doc_id": str(doc_id), "translated": len(translated)}

    async def _run_close_period(self, job: JobQueue) -> None:
        period_id = UUID(job.payload["period_id"])
        period = self.session.get(VotingPeriod, period_id)
        if period is None:
            raise LookupError(f"Voting period {period_id} not found")

        ranked = self.score_service.finalize_period(period_id)

        total_subs = self.session.exec(
            select(Submission).where(Submission.voting_period_id == period_id)
        ).all()
        total_votes = sum(s.vote_count for s in total_subs)

        metadata = PeriodMetadata(
            total_submissions=len(total_subs),
            total_votes=total_votes,
            granularity=GranularityLevel.CITY,
            generated_at=datetime.now(timezone.utc),
        )

        export_result = await self.export_adapter.export(period, ranked, metadata)
        period.export_url = export_result.url
        self.session.add(period)
        self.session.commit()

        job.result = {
            "period_id": str(period_id),
            "export_url": export_result.url,
            "format": export_result.format,
            "ranked": [
                {
                    "rank": r.rank,
                    "submission_id": str(r.submission_id),
                    "title": r.title,
                    "severity": r.severity,
                    "true_score": r.true_score,
                }
                for r in ranked
            ],
        }


def enqueue(session: Session, job_type: JobType, payload: dict) -> JobQueue:
    job = JobQueue(job_type=job_type, payload=payload)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job
