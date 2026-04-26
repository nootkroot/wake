"""FastAPI dependencies: session resolution, auth/role gates, request session id."""
from __future__ import annotations

import hashlib
import os
from collections.abc import Generator
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlmodel import Session

from .config import get_settings
from .database import get_session

# ---------- Session / role identification ----------

ANON_COOKIE_NAME = "wake_session"


def get_db() -> Generator[Session, None, None]:
    yield from get_session()


def get_session_id(
    request: Request,
    session_cookie: Optional[str] = Cookie(default=None, alias=ANON_COOKIE_NAME),
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
) -> str:
    """Returns a stable hashed session id for the current caller.

    Order of precedence:
      1. Explicit `X-Session-Id` header (set by the Next.js BFF using the
         Supabase anon session id).
      2. The `wake_session` cookie (browser fallback, set by the Next.js layer).
      3. A deterministic hash of the request IP — last-resort, only for demos.
    """
    raw: Optional[str] = x_session_id or session_cookie
    if not raw:
        client_host = request.client.host if request.client else "unknown"
        raw = f"ip:{client_host}"
    # Normalize to a stable hash so we never persist the raw token.
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_current_user_id(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Optional[UUID]:
    if not x_user_id:
        return None
    try:
        return UUID(x_user_id)
    except ValueError:
        return None


def require_user(
    user_id: Annotated[Optional[UUID], Depends(get_current_user_id)],
) -> UUID:
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user_id


def require_admin(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
) -> None:
    expected = os.environ.get("ADMIN_TOKEN") or get_settings().supabase_service_role_key
    if not expected:
        # Demo mode: no admin token configured → allow.
        return
    if x_admin_token != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin token required",
        )
