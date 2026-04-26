"""Voting period CRUD and close-trigger."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from ..dependencies import get_db, require_admin
from ..models.job import JobType
from ..models.submission import Submission, SubmissionStatus
from ..models.voting_period import VotingPeriod
from ..schemas import (
    JobRead,
    SubmissionRead,
    VotingPeriodCreate,
    VotingPeriodRead,
)
from ..services.jobs import enqueue

router = APIRouter(prefix="/periods", tags=["periods"])


@router.post("", response_model=VotingPeriodRead, status_code=201, dependencies=[Depends(require_admin)])
def create_period(
    payload: VotingPeriodCreate,
    session: Annotated[Session, Depends(get_db)],
) -> VotingPeriodRead:
    period = VotingPeriod(**payload.model_dump())
    session.add(period)
    session.commit()
    session.refresh(period)
    return VotingPeriodRead.model_validate(period, from_attributes=True)


@router.get("", response_model=list[VotingPeriodRead])
def list_periods(
    session: Annotated[Session, Depends(get_db)],
) -> list[VotingPeriodRead]:
    rows = session.exec(select(VotingPeriod).order_by(VotingPeriod.starts_at.desc())).all()
    return [VotingPeriodRead.model_validate(r, from_attributes=True) for r in rows]


@router.get("/{period_id}")
def get_period(
    period_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> dict:
    period = session.get(VotingPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    submissions = session.exec(
        select(Submission)
        .where(
            Submission.voting_period_id == period_id,
            Submission.status != SubmissionStatus.HIDDEN,
        )
        .order_by(Submission.display_score.desc())
        .limit(period.top_n)
    ).all()
    return {
        "period": VotingPeriodRead.model_validate(period, from_attributes=True),
        "top_submissions": [
            SubmissionRead.model_validate(s, from_attributes=True) for s in submissions
        ],
    }


@router.post("/{period_id}/close", response_model=JobRead, dependencies=[Depends(require_admin)])
def close_period(
    period_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> JobRead:
    period = session.get(VotingPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    if period.is_closed:
        raise HTTPException(status_code=409, detail="Period already closed")
    job = enqueue(session, JobType.CLOSE_PERIOD, {"period_id": str(period_id)})
    return JobRead.model_validate(job, from_attributes=True)


@router.get("/{period_id}/export")
def export_period(
    period_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    period = session.get(VotingPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    if not period.export_url:
        raise HTTPException(status_code=409, detail="Period not yet exported")
    return Response(
        status_code=302,
        headers={"Location": period.export_url},
    )
