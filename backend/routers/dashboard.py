"""Legislator-facing dashboard endpoints."""
from __future__ import annotations

from collections import Counter
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..dependencies import get_db
from ..models.common import GranularityLevel
from ..models.submission import DisplayMode, Submission, SubmissionStatus
from ..schemas import (
    DashboardSummary,
    DemographicEnrichedSubmission,
    SubmissionRead,
    TopicCount,
)
from ..services.census import CensusService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _filter(stmt, period_id, granularity):
    if period_id is not None:
        stmt = stmt.where(Submission.voting_period_id == period_id)
    if granularity is not None:
        stmt = stmt.where(Submission.granularity == granularity)
    return stmt.where(Submission.status != SubmissionStatus.HIDDEN)


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    session: Annotated[Session, Depends(get_db)],
    period_id: Optional[UUID] = None,
    granularity: GranularityLevel = GranularityLevel.CITY,
    topic: Optional[str] = None,
    top_n: int = Query(10, ge=1, le=50),
) -> DashboardSummary:
    stmt = _filter(select(Submission), period_id, granularity)
    if topic:
        # tags is text[]; SQLModel doesn't expose contains nicely cross-DB,
        # so we filter in-memory after a coarse fetch (acceptable for hackathon).
        rows = session.exec(stmt).all()
        rows = [r for r in rows if topic in (r.tags or [])]
    else:
        rows = session.exec(stmt).all()

    if not rows:
        return DashboardSummary(
            period_id=period_id,
            granularity=granularity,
            total_submissions=0,
            avg_severity=0.0,
            top_topics=[],
            top_submissions=[],
        )

    severities = [int(r.severity) for r in rows if r.severity is not None]
    avg_severity = (sum(severities) / len(severities)) if severities else 0.0

    counter: Counter[str] = Counter()
    for r in rows:
        for tag in (r.tags or []):
            counter[tag] += 1
    top_topics: list[TopicCount] = []
    for tag, count in counter.most_common(top_n):
        tag_rows = [r for r in rows if tag in (r.tags or [])]
        sevs = [int(r.severity) for r in tag_rows if r.severity is not None]
        avg = (sum(sevs) / len(sevs)) if sevs else 0.0
        total_score = sum(r.true_score for r in tag_rows)
        top_topics.append(
            TopicCount(tag=tag, count=count, avg_severity=avg, total_score=total_score)
        )

    top_submissions = sorted(rows, key=lambda r: r.true_score, reverse=True)[:top_n]
    return DashboardSummary(
        period_id=period_id,
        granularity=granularity,
        total_submissions=len(rows),
        avg_severity=round(avg_severity, 2),
        top_topics=top_topics,
        top_submissions=[
            SubmissionRead.model_validate(r, from_attributes=True) for r in top_submissions
        ],
    )


@router.get("/map")
def dashboard_map(
    session: Annotated[Session, Depends(get_db)],
    period_id: Optional[UUID] = None,
    granularity: Optional[GranularityLevel] = None,
) -> dict:
    stmt = _filter(
        select(Submission).where(
            Submission.display_mode == DisplayMode.ISSUE,
            Submission.latitude.is_not(None),
            Submission.longitude.is_not(None),
        ),
        period_id,
        granularity,
    )
    rows = session.exec(stmt).all()
    features = []
    for s in rows:
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]},
                "properties": {
                    "id": str(s.id),
                    "severity": int(s.severity) if s.severity else 1,
                    "weight": max(1, s.true_score),
                    "title": s.title,
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/demographics", response_model=list[DemographicEnrichedSubmission])
async def dashboard_demographics(
    session: Annotated[Session, Depends(get_db)],
    period_id: Optional[UUID] = None,
    granularity: GranularityLevel = GranularityLevel.CITY,
    topic: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
) -> list[DemographicEnrichedSubmission]:
    stmt = _filter(
        select(Submission).where(
            Submission.latitude.is_not(None),
            Submission.longitude.is_not(None),
        ),
        period_id,
        granularity,
    ).limit(limit)
    rows = session.exec(stmt).all()
    if topic:
        rows = [r for r in rows if topic in (r.tags or [])]
    if not rows:
        return []
    census = CensusService()
    try:
        return await census.enrich_submissions(rows)
    finally:
        await census.aclose()
