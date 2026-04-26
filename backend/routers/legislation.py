"""Legislation document ingestion + semantic search."""
from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from ..dependencies import get_db, require_admin
from ..models.common import GranularityLevel
from ..models.job import JobType
from ..schemas import (
    ChunkFilter,
    IngestRequest,
    JobRead,
    LegislationDocSummary,
    LegislationSearchResponse,
    LegislationSearchResultChunk,
    TranslateRequest,
)
from ..services.gemma import get_gemma_client
from ..services.jobs import enqueue
from ..services.vector_store import VectorStore

router = APIRouter(prefix="/legislation", tags=["legislation"])


@router.post("/ingest", response_model=JobRead, dependencies=[Depends(require_admin)])
def ingest_document(
    payload: IngestRequest,
    session: Annotated[Session, Depends(get_db)],
) -> JobRead:
    if not payload.url and not payload.text:
        raise HTTPException(status_code=422, detail="Provide url or text")
    if not payload.source_verified:
        raise HTTPException(
            status_code=422,
            detail="source_verified must be true to ingest a document",
        )

    job = enqueue(
        session,
        JobType.INGEST_DOCUMENT,
        payload={
            "doc_id": str(uuid4()),
            "url": payload.url,
            "text": payload.text,
            "title": payload.title,
            "granularity": payload.granularity.value,
            "source_verified": payload.source_verified,
        },
    )
    return JobRead.model_validate(job, from_attributes=True)


@router.get("/search", response_model=LegislationSearchResponse)
async def search_legislation(
    session: Annotated[Session, Depends(get_db)],
    q: str = Query(..., min_length=2),
    lang: str = "en",
    top_k: int = Query(5, ge=1, le=20),
    granularity: Optional[GranularityLevel] = None,
    doc_id: Optional[list[UUID]] = Query(default=None),
) -> LegislationSearchResponse:
    gemma = get_gemma_client()
    store = VectorStore(session)
    chunk_filter = ChunkFilter(
        granularity=granularity,
        doc_ids=doc_id if doc_id else None,
        lang=None,
    )
    chunks = await gemma.query_legislation(
        query=q,
        vector_store=store,
        top_k=top_k,
        lang=lang,
        chunk_filter=chunk_filter,
    )
    return LegislationSearchResponse(
        query=q,
        lang=lang,
        results=[
            LegislationSearchResultChunk(
                chunk_id=c.chunk_id,
                doc_id=c.doc_id,
                doc_title=c.doc_title,
                doc_source=c.doc_source,
                source_verified=c.source_verified,
                content=c.content,
                content_translated=c.content_translated,
                lang=c.lang,
                similarity=c.similarity,
            )
            for c in chunks
        ],
    )


@router.get("/docs", response_model=list[LegislationDocSummary])
async def list_docs(
    session: Annotated[Session, Depends(get_db)],
) -> list[LegislationDocSummary]:
    store = VectorStore(session)
    rows = await store.list_documents()
    return [LegislationDocSummary(**r) for r in rows]


@router.delete("/docs/{doc_id}", dependencies=[Depends(require_admin)])
async def delete_doc(
    doc_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> dict:
    store = VectorStore(session)
    deleted = await store.delete_by_doc_id(doc_id)
    return {"doc_id": str(doc_id), "deleted_chunks": deleted}


@router.post("/translate", response_model=JobRead, dependencies=[Depends(require_admin)])
def translate_doc(
    payload: TranslateRequest,
    session: Annotated[Session, Depends(get_db)],
) -> JobRead:
    job = enqueue(
        session,
        JobType.TRANSLATE_CHUNKS,
        payload={"doc_id": str(payload.doc_id), "target_lang": payload.target_lang},
    )
    return JobRead.model_validate(job, from_attributes=True)
