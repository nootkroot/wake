from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class JobType(str, Enum):
    SCORE_SUBMISSION = "SCORE_SUBMISSION"
    INGEST_DOCUMENT = "INGEST_DOCUMENT"
    TRANSLATE_CHUNKS = "TRANSLATE_CHUNKS"
    CLOSE_PERIOD = "CLOSE_PERIOD"


class JobStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class JobQueue(SQLModel, table=True):
    __tablename__ = "jobqueue"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    job_type: JobType
    status: JobStatus = JobStatus.PENDING
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    result: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
