"""Pydantic request/response schemas for the API surface."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .models.common import GranularityLevel
from .models.job import JobStatus, JobType
from .models.submission import DisplayMode, SeverityRank, SubmissionStatus


# ---------- Submissions ----------

class SubmissionCreate(BaseModel):
    display_mode: DisplayMode
    title: str = Field(..., max_length=120)
    body: str = Field(..., max_length=2000)
    image_url: Optional[str] = None
    is_anonymous: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    granularity: GranularityLevel = GranularityLevel.CITY
    scope_tag: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    lang: str = "en"
    voting_period_id: Optional[UUID] = None


class SubmissionUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    moderator_note: Optional[str] = None
    status: Optional[SubmissionStatus] = None
    tags: Optional[list[str]] = None


class SubmissionRead(BaseModel):
    id: UUID
    display_mode: DisplayMode
    title: str
    body: str
    image_url: Optional[str]
    is_anonymous: bool
    latitude: Optional[float]
    longitude: Optional[float]
    geohash: Optional[str]
    neighborhood: Optional[str]
    granularity: GranularityLevel
    severity: Optional[SeverityRank]
    gemma_rationale: Optional[str]
    display_score: int
    vote_count: int
    status: SubmissionStatus
    scope_tag: Optional[str]
    tags: list[str]
    lang: str
    voting_period_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    user_vote: Optional[int] = None  # -1, 0, or 1 for current session

    class Config:
        from_attributes = True


# ---------- Votes ----------

class VoteRequest(BaseModel):
    direction: int = Field(..., ge=-1, le=1)  # 1, -1, or 0 to retract


class VoteResult(BaseModel):
    submission_id: UUID
    user_vote: int  # -1, 0, 1
    display_score: int
    vote_count: int


# ---------- Reports ----------

class ReportRequest(BaseModel):
    reason: Optional[str] = None


class ReportResult(BaseModel):
    submission_id: UUID
    report_count: int
    hidden: bool


# ---------- Legislation ----------

class IngestRequest(BaseModel):
    url: Optional[str] = None
    title: str
    text: Optional[str] = None  # Inline text alternative to URL fetch
    granularity: GranularityLevel = GranularityLevel.CITY
    source_verified: bool = False


class TranslateRequest(BaseModel):
    doc_id: UUID
    target_lang: str


class LegislationSearchResultChunk(BaseModel):
    chunk_id: UUID
    doc_id: UUID
    doc_title: str
    doc_source: str
    source_verified: bool
    content: str
    content_translated: Optional[str] = None
    lang: str
    similarity: float


class LegislationSearchResponse(BaseModel):
    query: str
    lang: str
    results: list[LegislationSearchResultChunk]


class LegislationDocSummary(BaseModel):
    doc_id: UUID
    doc_title: str
    doc_source: str
    chunk_count: int
    source_verified: bool


# ---------- Voting Periods ----------

class VotingPeriodCreate(BaseModel):
    label: str
    scope: str
    starts_at: datetime
    ends_at: datetime
    top_n: int = 10


class VotingPeriodRead(BaseModel):
    id: UUID
    label: str
    scope: str
    starts_at: datetime
    ends_at: datetime
    is_closed: bool
    export_url: Optional[str]
    top_n: int

    class Config:
        from_attributes = True


# ---------- Jobs ----------

class JobRead(BaseModel):
    id: UUID
    job_type: JobType
    status: JobStatus
    payload: dict[str, Any]
    result: Optional[dict[str, Any]]
    error: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobRunRequest(BaseModel):
    limit: int = 5
    job_type: Optional[JobType] = None


class JobRunResponse(BaseModel):
    processed: int
    jobs: list[JobRead]


# ---------- Dashboard ----------

class TopicCount(BaseModel):
    tag: str
    count: int
    avg_severity: float
    total_score: int


class DashboardSummary(BaseModel):
    period_id: Optional[UUID]
    granularity: GranularityLevel
    total_submissions: int
    avg_severity: float
    top_topics: list[TopicCount]
    top_submissions: list[SubmissionRead]


class DemographicEnrichedSubmission(BaseModel):
    submission: SubmissionRead
    tract_fips: Optional[str]
    median_income: Optional[int]
    poverty_rate: Optional[float]
    languages: dict[str, float]
    estimated_socioeconomic_tier: Optional[int]


# ---------- Service-side dataclasses (not API-shaped) ----------

@dataclass
class ScoringResult:
    severity: SeverityRank
    rationale: str
    confidence: float


@dataclass
class RetrievedChunk:
    chunk_id: UUID
    doc_id: UUID
    doc_title: str
    doc_source: str
    source_verified: bool
    content: str
    content_translated: Optional[str]
    lang: str
    similarity: float


@dataclass
class LegislationChunkCreate:
    doc_id: UUID
    doc_title: str
    doc_source: str
    source_verified: bool
    chunk_index: int
    content: str
    embedding: list[float]
    granularity: GranularityLevel = GranularityLevel.CITY
    lang: str = "en"
    ingestion_job_id: Optional[UUID] = None


@dataclass
class ChunkFilter:
    granularity: Optional[GranularityLevel] = None
    doc_ids: Optional[list[UUID]] = None
    lang: Optional[str] = None


@dataclass
class TractDemographics:
    tract_fips: str
    median_income: Optional[int]
    poverty_rate: Optional[float]
    languages: dict[str, float]
    age_distribution: dict[str, float]
    estimated_socioeconomic_tier: int


@dataclass
class RankedSubmission:
    submission_id: UUID
    title: str
    severity: Optional[int]
    true_score: int
    rank: int


@dataclass
class PeriodMetadata:
    total_submissions: int
    total_votes: int
    granularity: GranularityLevel
    generated_at: datetime


@dataclass
class ExportResult:
    url: str
    format: str
    delivered_at: datetime


@dataclass
class VerificationResult:
    verified: bool
    method: str
    reason: Optional[str] = None
