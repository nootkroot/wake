"""Export-related endpoints (period-level export is in periods.py)."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..dependencies import get_db, require_admin
from ..models.voting_period import VotingPeriod

router = APIRouter(prefix="/export", tags=["export"], dependencies=[Depends(require_admin)])


@router.get("/{period_id}")
def get_export(
    period_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> dict:
    period = session.get(VotingPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    return {
        "period_id": str(period_id),
        "is_closed": period.is_closed,
        "export_url": period.export_url,
    }
