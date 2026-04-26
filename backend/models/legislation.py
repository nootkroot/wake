from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column
from sqlmodel import Field, SQLModel

from .common import GranularityLevel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LegislationChunk(SQLModel, table=True):
    __tablename__ = "legislationchunk"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    doc_id: UUID = Field(index=True)
    doc_title: str
    doc_source: str
    source_verified: bool = False
    chunk_index: int
    content: str
    content_translated: Optional[str] = None
    lang_translated: Optional[str] = None
    embedding: Any = Field(sa_column=Column(Vector(768)))
    granularity: GranularityLevel = GranularityLevel.CITY
    lang: str = "en"
    created_at: datetime = Field(default_factory=_now)
    ingestion_job_id: Optional[UUID] = None
