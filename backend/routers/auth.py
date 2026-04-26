"""Verification stubs. Real auth flows are handled by Supabase on the frontend."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile

from ..dependencies import require_user
from ..schemas import VerificationResult
from ..services.verification import get_verification_adapter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify", response_model=VerificationResult)
async def verify_identity(
    user_id: Annotated[UUID, Depends(require_user)],
    id_document: UploadFile = File(...),
) -> VerificationResult:
    adapter = get_verification_adapter()
    document_bytes = await id_document.read()
    return await adapter.verify(user_id=user_id, id_document=document_bytes)


@router.get("/me")
def whoami(user_id: Annotated[UUID, Depends(require_user)]) -> dict:
    return {"user_id": str(user_id)}
