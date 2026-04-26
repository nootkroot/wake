"""
Test fixtures.

Tests run against an in-memory SQLite database. A handful of pgvector-specific
behaviors (similarity search) are not exercised here — those are covered in
integration tests against a real Postgres + pgvector deployment.
"""
from __future__ import annotations

import os
from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.types import TypeDecorator, JSON
from sqlmodel import Session, SQLModel

# Force a deterministic test DB before any app modules import.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Replace pgvector's Vector with a JSON-backed shim for sqlite test runs.
import pgvector.sqlalchemy as _pgv_mod  # noqa: E402


class _VectorShim(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dim: int | None = None) -> None:
        super().__init__()
        self.dim = dim

    def process_bind_param(self, value: Any, dialect):
        return list(value) if value is not None else None

    def process_result_value(self, value: Any, dialect):
        return value


_pgv_mod.Vector = _VectorShim  # type: ignore[attr-defined]


# SQLite has no ARRAY type. Replace sqlalchemy.ARRAY with a JSON-backed shim
# so the metadata can compile against the in-memory SQLite engine.
import sqlalchemy as _sa  # noqa: E402


class _ArrayShim(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, item_type=None, **kwargs) -> None:  # noqa: ANN001
        super().__init__()
        self.item_type = item_type

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return list(value)

    def process_result_value(self, value, dialect):
        return value or []


_sa.ARRAY = _ArrayShim  # type: ignore[attr-defined]

# Now safe to import application modules.
from backend import database  # noqa: E402
from backend.config import get_settings  # noqa: E402
from backend.main import create_app  # noqa: E402
from backend.models import (  # noqa: E402,F401
    Submission,
    Vote,
    VotingPeriod,
    LegislationChunk,
    JobQueue,
    ModerationFlag,
)


@pytest.fixture(scope="session")
def engine():
    settings = get_settings()
    settings.database_url = "sqlite:///:memory:"
    eng = create_engine(
        "sqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    database._engine = eng
    SQLModel.metadata.create_all(eng)
    return eng


@pytest.fixture
def session(engine) -> Generator[Session, None, None]:
    with Session(engine) as s:
        yield s
        # Cleanup tables between tests
        for table in reversed(SQLModel.metadata.sorted_tables):
            s.execute(table.delete())
        s.commit()


@pytest.fixture
def client(engine) -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as c:
        yield c
