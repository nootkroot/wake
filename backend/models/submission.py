from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import ARRAY, Column, SmallInteger, String
from sqlmodel import Field, SQLModel

from .common import GranularityLevel


class DisplayMode(str, Enum):
    ISSUE = "ISSUE"
    SUGGESTION = "SUGGESTION"


class SeverityRank(int, Enum):
    LOW = 1
    MODERATE = 2
    HIGH = 3
    CRITICAL = 4


class SubmissionStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    ACTIVE = "ACTIVE"
    HIDDEN = "HIDDEN"
    CLOSED = "CLOSED"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Submission(SQLModel, table=True):
    __tablename__ = "submission"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    display_mode: DisplayMode
    title: str = Field(max_length=120)
    body: str = Field(max_length=2000)
    image_url: Optional[str] = None
    author_id: Optional[UUID] = None
    is_anonymous: bool = False

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geohash: Optional[str] = Field(default=None, index=True)
    neighborhood: Optional[str] = None
    granularity: GranularityLevel = GranularityLevel.CITY

    # IntEnum stored as plain SMALLINT (matches the migration); pydantic on
    # the SQLModel side coerces ints back to SeverityRank members on load.
    severity: Optional[SeverityRank] = Field(default=None, sa_column=Column(SmallInteger))
    gemma_rationale: Optional[str] = None
    scoring_job_id: Optional[UUID] = None

    true_score: int = 0
    display_score: int = 0
    vote_count: int = 0

    status: SubmissionStatus = SubmissionStatus.PENDING_REVIEW
    report_count: int = 0
    report_threshold: int = 5
    moderator_note: Optional[str] = None

    scope_tag: Optional[str] = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    lang: str = "en"

    voting_period_id: Optional[UUID] = Field(default=None, foreign_key="votingperiod.id")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
