"""Verification adapters. Swap StubVerificationAdapter for Stripe Identity in prod."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from ..schemas import VerificationResult


class VerificationAdapter(ABC):
    @abstractmethod
    async def verify(self, user_id: UUID, id_document: bytes) -> VerificationResult: ...


class StubVerificationAdapter(VerificationAdapter):
    """Always returns verified=True. Replace with Stripe Identity for prod."""

    async def verify(self, user_id: UUID, id_document: bytes) -> VerificationResult:
        return VerificationResult(verified=True, method="stub")


_default: VerificationAdapter | None = None


def get_verification_adapter() -> VerificationAdapter:
    global _default
    if _default is None:
        _default = StubVerificationAdapter()
    return _default
