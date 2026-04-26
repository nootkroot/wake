from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ModerationFlag(SQLModel, table=True):
    __tablename__ = "moderationflag"
    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "reporter_session_id",
            name="uq_moderationflag_submission_reporter",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submission.id", index=True)
    reporter_session_id: str = Field(index=True)
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
