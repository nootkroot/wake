"""GemmaClient unit tests — focuses on offline mode + parsing helpers."""
from __future__ import annotations

import asyncio

import pytest

from backend.services.gemma import (
    GemmaClient,
    _chunk_text,
    _offline_embed,
    _offline_score,
    _parse_json_loose,
)
from backend.models.submission import SeverityRank


def test_offline_score_low() -> None:
    result = _offline_score("Trim the hedges", "Cosmetic neighborhood request.")
    assert result.severity == SeverityRank.LOW


def test_offline_score_critical() -> None:
    result = _offline_score("Building fire reported", "There is a building fire on 5th.")
    assert result.severity == SeverityRank.CRITICAL


def test_offline_embed_is_unit_normed() -> None:
    emb = _offline_embed("hello", dim=768)
    assert len(emb) == 768
    norm = sum(x * x for x in emb) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_chunk_text_overlap_and_completeness() -> None:
    text = " ".join([f"w{i}" for i in range(100)])
    chunks = _chunk_text(text, chunk_size=20, overlap=5)
    assert len(chunks) > 1
    rejoined = " ".join(chunks)
    for token in ("w0", "w99"):
        assert token in rejoined


def test_parse_json_loose_handles_fences() -> None:
    text = "```json\n{\"severity\": 3, \"rationale\": \"x\", \"confidence\": 0.4}\n```"
    parsed = _parse_json_loose(text)
    assert parsed["severity"] == 3


def test_offline_score_dispatch() -> None:
    client = GemmaClient()
    if client.offline:
        result = asyncio.run(client.score_submission("Pothole", "There is a pothole."))
        assert result.severity in {SeverityRank.LOW, SeverityRank.MODERATE}
    else:
        pytest.skip("Live OPENROUTER_API_KEY configured — skipping offline path")
