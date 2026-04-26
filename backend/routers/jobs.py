"""Admin endpoints for the manual job queue."""
from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..dependencies import get_db, require_admin
from ..models.job import JobQueue, JobStatus, JobType
from ..schemas import JobRead, JobRunRequest, JobRunResponse
from ..services.jobs import JobRunner

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[JobRead])
def list_jobs(
    session: Annotated[Session, Depends(get_db)],
    status: Optional[JobStatus] = None,
    job_type: Optional[JobType] = None,
    limit: int = Query(50, ge=1, le=200),
) -> list[JobRead]:
    stmt = select(JobQueue).order_by(JobQueue.created_at.desc()).limit(limit)
    if status is not None:
        stmt = stmt.where(JobQueue.status == status)
    if job_type is not None:
        stmt = stmt.where(JobQueue.job_type == job_type)
    rows = session.exec(stmt).all()
    return [JobRead.model_validate(r, from_attributes=True) for r in rows]


@router.post("/run", response_model=JobRunResponse)
async def run_jobs(
    payload: JobRunRequest,
    session: Annotated[Session, Depends(get_db)],
) -> JobRunResponse:
    runner = JobRunner(session=session)
    jobs = await runner.run_pending(limit=payload.limit, job_type=payload.job_type)
    return JobRunResponse(
        processed=len(jobs),
        jobs=[JobRead.model_validate(j, from_attributes=True) for j in jobs],
    )


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> JobRead:
    job = session.get(JobQueue, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobRead.model_validate(job, from_attributes=True)
