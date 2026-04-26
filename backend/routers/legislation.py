"""Legislation document ingestion + semantic search."""
from __future__ import annotations

from io import BytesIO
from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session

from ..dependencies import get_db, require_admin
from ..models.common import GranularityLevel
from ..models.job import JobType
from ..schemas import (
    ChunkFilter,
    IngestRequest,
    LegislationAnswerResponse,
    LegislationAnswerSource,
    JobRead,
    LegislationDocSummary,
    LegislationSearchResponse,
    LegislationSearchResultChunk,
    LegislationUploadResult,
    TranslateRequest,
)
from ..services.gemma import GemmaError, detect_language_code, get_gemma_client
from ..services.jobs import enqueue
from ..services.vector_store import VectorStore

router = APIRouter(prefix="/legislation", tags=["legislation"])


def _extract_legislation_text(file: UploadFile, content: bytes) -> str:
    name = (file.filename or "").lower()
    ctype = (file.content_type or "").lower()
    if name.endswith(".pdf") or "pdf" in ctype:
        try:
            from pypdf import PdfReader
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail="PDF upload requires pypdf in backend environment",
            ) from exc
        try:
            reader = PdfReader(BytesIO(content))
            text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Failed to parse PDF") from exc
        if not text:
            raise HTTPException(status_code=422, detail="PDF has no extractable text")
        return text

    if name.endswith((".txt", ".md", ".markdown", ".json", ".csv")) or ctype.startswith("text/"):
        text = content.decode("utf-8", errors="ignore").strip()
        if not text:
            raise HTTPException(status_code=422, detail="Uploaded file is empty")
        return text

    raise HTTPException(
        status_code=422,
        detail="Unsupported file type. Use PDF, TXT, MD, JSON, or CSV.",
    )


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
                chunk_index=c.chunk_index,
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


@router.get("/ask", response_model=LegislationAnswerResponse)
async def ask_legislation(
    session: Annotated[Session, Depends(get_db)],
    q: str = Query(..., min_length=2),
    lang: Optional[str] = Query(default=None),
    top_k: int = Query(6, ge=1, le=20),
    retrieval_mode: str = Query("keyword"),
    granularity: Optional[GranularityLevel] = None,
    doc_id: Optional[list[UUID]] = Query(default=None),
) -> LegislationAnswerResponse:
    gemma = get_gemma_client()
    resolved_lang = (lang or "").strip().lower() or detect_language_code(q)
    store = VectorStore(session)
    chunk_filter = ChunkFilter(
        granularity=granularity,
        doc_ids=doc_id if doc_id else None,
        lang=None,
    )
    mode = retrieval_mode.strip().lower()
    if mode == "vector":
        chunks = await gemma.query_legislation(
            query=q,
            vector_store=store,
            top_k=top_k,
            lang=resolved_lang,
            chunk_filter=chunk_filter,
        )
    else:
        chunks = await store.keyword_search(
            query=q,
            top_k=top_k,
            filter=chunk_filter,
            prefer_lang=resolved_lang,
        )
    answer = await gemma.answer_legislation_question(
        question=q,
        context_chunks=[c.content for c in chunks],
        lang=resolved_lang,
    )
    supporting = [
        LegislationSearchResultChunk(
            chunk_id=c.chunk_id,
            chunk_index=c.chunk_index,
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
    ]
    sources = [
        LegislationAnswerSource(
            doc_id=c.doc_id,
            doc_title=c.doc_title,
            doc_source=c.doc_source,
            chunk_id=c.chunk_id,
            chunk_index=c.chunk_index,
            similarity=c.similarity,
        )
        for c in chunks
    ]
    return LegislationAnswerResponse(
        query=q,
        lang=resolved_lang,
        answer=answer,
        sources=sources,
        supporting_chunks=supporting,
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


@router.post(
    "/upload",
    response_model=LegislationUploadResult,
    dependencies=[Depends(require_admin)],
)
async def upload_document(
    session: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    title: str = Form(...),
    source_verified: bool = Form(False),
    granularity: GranularityLevel = Form(GranularityLevel.CITY),
    lang: str = Form("en"),
    translate_to: Optional[str] = Form(None),
) -> LegislationUploadResult:
    if not source_verified:
        raise HTTPException(
            status_code=422,
            detail="source_verified must be true to ingest a document",
        )
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    text = _extract_legislation_text(file, raw)

    doc_id = uuid4()
    doc_source = file.filename or "uploaded-file"
    gemma = get_gemma_client()
    store = VectorStore(session)

    chunks = await gemma.ingest_document(
        text=text,
        doc_id=doc_id,
        doc_title=title.strip(),
        doc_source=doc_source,
        granularity=granularity,
        source_verified=source_verified,
        lang=lang,
    )
    chunk_count = await store.upsert_chunks(chunks)

    translated_target: Optional[str] = None
    if translate_to and translate_to.strip() and translate_to.strip() != lang:
        try:
            translated = await gemma.translate_chunks(
                [chunk.content for chunk in chunks],
                target_lang=translate_to.strip(),
            )
            await store.set_translations(doc_id, translate_to.strip(), translated)
            translated_target = translate_to.strip()
        except GemmaError:
            translated_target = None

    return LegislationUploadResult(
        doc_id=doc_id,
        doc_title=title.strip(),
        doc_source=doc_source,
        chunk_count=chunk_count,
        source_verified=source_verified,
        lang=lang,
        translated_to=translated_target,
    )
