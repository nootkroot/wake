"""pgvector-backed vector store for legislation chunks."""
from __future__ import annotations

import re
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlmodel import Session

from ..models.legislation import LegislationChunk
from ..schemas import ChunkFilter, LegislationChunkCreate, RetrievedChunk


class VectorStore:
    def __init__(self, session: Session) -> None:
        self.session = session

    async def upsert_chunks(self, chunks: list[LegislationChunkCreate]) -> int:
        if not chunks:
            return 0
        rows = [
            LegislationChunk(
                doc_id=c.doc_id,
                doc_title=c.doc_title,
                doc_source=c.doc_source,
                source_verified=c.source_verified,
                chunk_index=c.chunk_index,
                content=c.content,
                embedding=c.embedding,
                granularity=c.granularity,
                lang=c.lang,
                ingestion_job_id=c.ingestion_job_id,
            )
            for c in chunks
        ]
        self.session.add_all(rows)
        self.session.commit()
        return len(rows)

    async def similarity_search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filter: Optional[ChunkFilter] = None,
        prefer_lang: str = "en",
    ) -> list[RetrievedChunk]:
        # pgvector: `<=>` is cosine distance (lower is better). 1 - distance = similarity.
        # The embedding parameter is bound as a literal vector — psycopg sends
        # Python lists as float[] by default, so we explicitly format and cast.
        embedding_literal = "[" + ",".join(repr(float(x)) for x in query_embedding) + "]"
        sql = """
            SELECT id, chunk_index, doc_id, doc_title, doc_source, source_verified,
                   content, content_translated, lang_translated, lang,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM legislationchunk
            WHERE 1=1
        """
        params: dict = {"embedding": embedding_literal}
        if filter is not None:
            if filter.granularity is not None:
                sql += " AND granularity = :granularity"
                params["granularity"] = filter.granularity.value
            if filter.doc_ids:
                sql += " AND doc_id = ANY(:doc_ids)"
                params["doc_ids"] = list(filter.doc_ids)
            if filter.lang is not None:
                sql += " AND lang = :lang"
                params["lang"] = filter.lang
        sql += " ORDER BY embedding <=> CAST(:embedding AS vector) LIMIT :limit"
        params["limit"] = top_k

        result = self.session.execute(text(sql), params).all()

        chunks: list[RetrievedChunk] = []
        for row in result:
            content = row.content
            if prefer_lang and row.lang_translated == prefer_lang and row.content_translated:
                content_to_show = row.content_translated
            else:
                content_to_show = content
            chunks.append(
                RetrievedChunk(
                    chunk_id=row.id,
                    chunk_index=int(row.chunk_index),
                    doc_id=row.doc_id,
                    doc_title=row.doc_title,
                    doc_source=row.doc_source,
                    source_verified=row.source_verified,
                    content=content_to_show,
                    content_translated=row.content_translated,
                    lang=row.lang_translated or row.lang,
                    similarity=float(row.similarity),
                )
            )
        return chunks

    async def keyword_search(
        self,
        query: str,
        top_k: int = 8,
        filter: Optional[ChunkFilter] = None,
        prefer_lang: str = "en",
        candidate_limit: int = 300,
    ) -> list[RetrievedChunk]:
        sql = """
            SELECT id, doc_id, doc_title, doc_source, source_verified,
                   chunk_index, content, content_translated, lang_translated, lang
            FROM legislationchunk
            WHERE 1=1
        """
        params: dict = {}
        if filter is not None:
            if filter.granularity is not None:
                sql += " AND granularity = :granularity"
                params["granularity"] = filter.granularity.value
            if filter.doc_ids:
                sql += " AND doc_id = ANY(:doc_ids)"
                params["doc_ids"] = list(filter.doc_ids)
            if filter.lang is not None:
                sql += " AND lang = :lang"
                params["lang"] = filter.lang
        sql += " ORDER BY created_at DESC LIMIT :limit"
        params["limit"] = candidate_limit
        rows = self.session.execute(text(sql), params).all()

        tokens = _query_tokens(query)
        if not tokens:
            tokens = ["budget"]

        scored: list[tuple[float, RetrievedChunk]] = []
        for row in rows:
            content = row.content
            if prefer_lang and row.lang_translated == prefer_lang and row.content_translated:
                content_to_show = row.content_translated
            else:
                content_to_show = content
            haystack = str(content_to_show).lower()
            score = 0.0
            for token in tokens:
                freq = haystack.count(token)
                if freq > 0:
                    score += min(8, freq) * (1.0 + min(len(token), 12) / 12.0)
            if score <= 0:
                continue
            proximity_bonus = 0.3 if any(token in haystack[:220] for token in tokens) else 0.0
            score += proximity_bonus
            scored.append(
                (
                    score,
                    RetrievedChunk(
                        chunk_id=row.id,
                        chunk_index=int(row.chunk_index),
                        doc_id=row.doc_id,
                        doc_title=row.doc_title,
                        doc_source=row.doc_source,
                        source_verified=row.source_verified,
                        content=content_to_show,
                        content_translated=row.content_translated,
                        lang=row.lang_translated or row.lang,
                        similarity=score,
                    ),
                )
            )

        scored.sort(key=lambda x: x[0], reverse=True)
        return [chunk for _, chunk in scored[:top_k]]

    async def delete_by_doc_id(self, doc_id: UUID) -> int:
        result = self.session.execute(
            text("DELETE FROM legislationchunk WHERE doc_id = :doc_id"),
            {"doc_id": str(doc_id)},
        )
        self.session.commit()
        return getattr(result, "rowcount", 0) or 0

    async def set_translations(
        self,
        doc_id: UUID,
        target_lang: str,
        translated_chunks: list[str],
    ) -> int:
        if not translated_chunks:
            return 0
        updated = 0
        for idx, text_value in enumerate(translated_chunks):
            result = self.session.execute(
                text(
                    """
                    UPDATE legislationchunk
                    SET content_translated = :content_translated,
                        lang_translated = :lang_translated
                    WHERE doc_id = :doc_id
                      AND chunk_index = :chunk_index
                    """
                ),
                {
                    "content_translated": text_value,
                    "lang_translated": target_lang,
                    "doc_id": str(doc_id),
                    "chunk_index": idx,
                },
            )
            updated += int(getattr(result, "rowcount", 0) or 0)
        self.session.commit()
        return updated

    async def list_documents(self) -> list[dict]:
        rows = self.session.execute(
            text(
                """
                SELECT doc_id, doc_title, doc_source, source_verified,
                       COUNT(*) AS chunk_count
                FROM legislationchunk
                GROUP BY doc_id, doc_title, doc_source, source_verified
                ORDER BY doc_title
                """
            )
        ).all()
        return [
            {
                "doc_id": r.doc_id,
                "doc_title": r.doc_title,
                "doc_source": r.doc_source,
                "source_verified": r.source_verified,
                "chunk_count": int(r.chunk_count),
            }
            for r in rows
        ]


def _query_tokens(text_value: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9]{3,}", text_value.lower())
    stop = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "what",
        "when",
        "where",
        "which",
        "was",
        "were",
        "are",
        "how",
        "into",
        "about",
        "2025",
        "2026",
    }
    uniq: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        if t in stop:
            continue
        if t in seen:
            continue
        seen.add(t)
        uniq.append(t)
    return uniq
