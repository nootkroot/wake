from datetime import datetime, timezone
from enum import IntEnum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class VoteDirection(IntEnum):
    UP = 1
    DOWN = -1


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Vote(SQLModel, table=True):
    __tablename__ = "vote"
    __table_args__ = (UniqueConstraint("submission_id", "session_id", name="uq_vote_submission_session"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submission.id", index=True)
    session_id: str = Field(index=True)
    user_id: Optional[UUID] = None
    direction: VoteDirection
    created_at: datetime = Field(default_factory=_now)
