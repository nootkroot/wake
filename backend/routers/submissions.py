"""CRUD + voting for issues and suggestions."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from ..dependencies import get_db, get_session_id, require_user
from ..models.common import GranularityLevel
from ..models.moderation import ModerationFlag
from ..models.submission import DisplayMode, Submission, SubmissionStatus
from ..models.job import JobType
from ..schemas import (
    ReportRequest,
    ReportResult,
    SubmissionCreate,
    SubmissionRead,
    SubmissionUpdate,
    VoteRequest,
    VoteResult,
)
from ..services.geocode import encode_geohash, reverse_geocode
from ..services.gemma import GemmaError, get_gemma_client
from ..services.jobs import enqueue
from ..services.score import DuplicateVoteError, ScoreService, fuzz_score

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _to_read(sub: Submission, user_vote: Optional[int] = None) -> SubmissionRead:
    data = SubmissionRead.model_validate(sub, from_attributes=True)
    data.user_vote = user_vote
    return data


def _ensure_author_exists(session: Session, user_id: UUID) -> None:
    """Create a stub auth.users row so local FK checks pass in demo mode."""
    try:
        session.execute(
            text(
                """
                INSERT INTO auth.users (id)
                VALUES (:user_id)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"user_id": user_id},
        )
    except SQLAlchemyError:
        # Hosted Supabase DB users may not have write access to auth schema.
        # In that case, rely on existing auth.users row from Supabase Auth.
        pass


@router.post("", response_model=SubmissionRead, status_code=201)
async def create_submission(
    payload: SubmissionCreate,
    user_id: Annotated[UUID, Depends(require_user)],
    session: Annotated[Session, Depends(get_db)],
) -> SubmissionRead:
    if payload.display_mode == DisplayMode.ISSUE and (
        payload.latitude is None or payload.longitude is None
    ):
        raise HTTPException(status_code=422, detail="ISSUE submissions require lat/lng")

    geohash = None
    neighborhood = None
    if payload.latitude is not None and payload.longitude is not None:
        geohash = encode_geohash(payload.latitude, payload.longitude)
        neighborhood = reverse_geocode(payload.latitude, payload.longitude)

    if not payload.is_anonymous:
        _ensure_author_exists(session, user_id)

    submission = Submission(
        display_mode=payload.display_mode,
        title=payload.title.strip(),
        body=payload.body.strip(),
        image_url=payload.image_url,
        author_id=None if payload.is_anonymous else user_id,
        is_anonymous=payload.is_anonymous,
        latitude=payload.latitude,
        longitude=payload.longitude,
        geohash=geohash,
        neighborhood=neighborhood,
        granularity=payload.granularity,
        scope_tag=payload.scope_tag,
        tags=payload.tags,
        lang=payload.lang,
        voting_period_id=payload.voting_period_id,
        status=SubmissionStatus.PENDING_REVIEW,
    )
    submission.display_score = fuzz_score(0, submission.id, submission.voting_period_id)
    session.add(submission)
    session.commit()
    session.refresh(submission)

    if submission.display_mode == DisplayMode.ISSUE:
        gemma = get_gemma_client()
        try:
            result = await gemma.score_submission(
                title=submission.title,
                body=submission.body,
                image_url=submission.image_url,
                context_chunks=[],
            )
            submission.severity = result.severity
            submission.gemma_rationale = result.rationale
            if submission.status == SubmissionStatus.PENDING_REVIEW:
                submission.status = SubmissionStatus.ACTIVE
            submission.updated_at = datetime.now(timezone.utc)
            session.add(submission)
            session.commit()
            session.refresh(submission)
        except GemmaError:
            # Fallback path if network/model response fails.
            enqueue(session, JobType.SCORE_SUBMISSION, {"submission_id": str(submission.id)})

    return _to_read(submission)


@router.get("", response_model=list[SubmissionRead])
def list_submissions(
    session: Annotated[Session, Depends(get_db)],
    session_id: Annotated[str, Depends(get_session_id)],
    mode: Optional[DisplayMode] = None,
    status: Optional[SubmissionStatus] = None,
    period_id: Optional[UUID] = None,
    granularity: Optional[GranularityLevel] = None,
    bbox: Optional[str] = Query(
        None,
        description="minLng,minLat,maxLng,maxLat — restricts to ISSUE submissions",
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = 0,
) -> list[SubmissionRead]:
    stmt = select(Submission)
    if mode is not None:
        stmt = stmt.where(Submission.display_mode == mode)
    if status is not None:
        stmt = stmt.where(Submission.status == status)
    else:
        stmt = stmt.where(Submission.status != SubmissionStatus.HIDDEN)
    if period_id is not None:
        stmt = stmt.where(Submission.voting_period_id == period_id)
    if granularity is not None:
        stmt = stmt.where(Submission.granularity == granularity)
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = (float(x) for x in bbox.split(","))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="bbox must be 4 floats") from exc
        stmt = stmt.where(
            Submission.latitude.is_not(None),
            Submission.longitude.is_not(None),
            Submission.latitude >= min_lat,
            Submission.latitude <= max_lat,
            Submission.longitude >= min_lng,
            Submission.longitude <= max_lng,
        )
    stmt = stmt.order_by(Submission.created_at.desc()).offset(offset).limit(limit)
    rows = session.exec(stmt).all()

    score = ScoreService(session)
    out: list[SubmissionRead] = []
    for sub in rows:
        out.append(_to_read(sub, user_vote=score.get_user_vote(sub.id, session_id)))
    return out


@router.get("/map")
def submissions_map(
    session: Annotated[Session, Depends(get_db)],
    granularity: Optional[GranularityLevel] = None,
    bbox: Optional[str] = None,
) -> dict:
    """Returns a GeoJSON FeatureCollection of ISSUE submissions."""
    stmt = (
        select(Submission)
        .where(
            Submission.display_mode == DisplayMode.ISSUE,
            Submission.status.in_(
                [SubmissionStatus.ACTIVE, SubmissionStatus.PENDING_REVIEW]
            ),
            Submission.latitude.is_not(None),
            Submission.longitude.is_not(None),
        )
        .limit(2000)
    )
    if granularity is not None:
        stmt = stmt.where(Submission.granularity == granularity)
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = (float(x) for x in bbox.split(","))
            stmt = stmt.where(
                Submission.latitude >= min_lat,
                Submission.latitude <= max_lat,
                Submission.longitude >= min_lng,
                Submission.longitude <= max_lng,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="bbox must be 4 floats") from exc

    rows = session.exec(stmt).all()
    features = []
    for s in rows:
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]},
                "properties": {
                    "id": str(s.id),
                    "title": s.title,
                    "severity": int(s.severity) if s.severity else None,
                    "display_score": s.display_score,
                    "geohash": s.geohash,
                    "granularity": s.granularity.value,
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/{submission_id}", response_model=SubmissionRead)
def get_submission(
    submission_id: UUID,
    session: Annotated[Session, Depends(get_db)],
    session_id: Annotated[str, Depends(get_session_id)],
) -> SubmissionRead:
    sub = session.get(Submission, submission_id)
    if sub is None or sub.status == SubmissionStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Submission not found")
    user_vote = ScoreService(session).get_user_vote(submission_id, session_id)
    return _to_read(sub, user_vote=user_vote)


@router.patch("/{submission_id}", response_model=SubmissionRead)
def update_submission(
    submission_id: UUID,
    payload: SubmissionUpdate,
    user_id: Annotated[UUID, Depends(require_user)],
    session: Annotated[Session, Depends(get_db)],
) -> SubmissionRead:
    sub = session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    # Only author or moderator (X-Admin-Token-bearing user via require_admin
    # would replace this check in production). For hackathon: author-only.
    if sub.author_id != user_id and not sub.is_anonymous:
        raise HTTPException(status_code=403, detail="Not the author")

    for field in ("title", "body", "image_url", "moderator_note"):
        value = getattr(payload, field)
        if value is not None:
            setattr(sub, field, value)
    if payload.tags is not None:
        sub.tags = payload.tags
    if payload.status is not None:
        sub.status = payload.status
    sub.updated_at = datetime.now(timezone.utc)
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return _to_read(sub)


@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_submission(
    submission_id: UUID,
    user_id: Annotated[UUID, Depends(require_user)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    sub = session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.author_id != user_id:
        raise HTTPException(status_code=403, detail="Not the author")
    sub.status = SubmissionStatus.HIDDEN
    sub.updated_at = datetime.now(timezone.utc)
    session.add(sub)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{submission_id}/vote", response_model=VoteResult)
def cast_vote(
    submission_id: UUID,
    payload: VoteRequest,
    session_id: Annotated[str, Depends(get_session_id)],
    session: Annotated[Session, Depends(get_db)],
) -> VoteResult:
    score = ScoreService(session)
    try:
        return score.record_vote(
            submission_id=submission_id,
            session_id=session_id,
            direction=int(payload.direction),
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DuplicateVoteError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc


@router.post("/{submission_id}/report", response_model=ReportResult)
def report_submission(
    submission_id: UUID,
    payload: ReportRequest,
    session_id: Annotated[str, Depends(get_session_id)],
    session: Annotated[Session, Depends(get_db)],
) -> ReportResult:
    sub = session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    existing = session.exec(
        select(ModerationFlag).where(
            ModerationFlag.submission_id == submission_id,
            ModerationFlag.reporter_session_id == session_id,
        )
    ).first()
    if existing is None:
        session.add(
            ModerationFlag(
                submission_id=submission_id,
                reporter_session_id=session_id,
                reason=payload.reason,
            )
        )
        sub.report_count += 1
        if sub.report_count >= sub.report_threshold:
            sub.status = SubmissionStatus.HIDDEN
        session.add(sub)
        session.commit()
        session.refresh(sub)
    return ReportResult(
        submission_id=sub.id,
        report_count=sub.report_count,
        hidden=sub.status == SubmissionStatus.HIDDEN,
    )
