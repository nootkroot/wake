from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class VotingPeriod(SQLModel, table=True):
    __tablename__ = "votingperiod"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    label: str
    scope: str
    starts_at: datetime
    ends_at: datetime
    is_closed: bool = False
    export_url: Optional[str] = None
    top_n: int = 10
    created_at: datetime = Field(default_factory=_now)
