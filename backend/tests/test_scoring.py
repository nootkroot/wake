"""Vote recording, fuzz, and period finalization."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from backend.models import (
    DisplayMode,
    Submission,
    SubmissionStatus,
    VoteDirection,
    VotingPeriod,
)
from backend.services.score import (
    DuplicateVoteError,
    ScoreService,
    fuzz_score,
)


def _make_submission(session, period_id=None) -> Submission:
    sub = Submission(
        display_mode=DisplayMode.SUGGESTION,
        title="t",
        body="b",
        status=SubmissionStatus.ACTIVE,
        voting_period_id=period_id,
    )
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return sub


def test_vote_increments_then_decrements(session) -> None:
    sub = _make_submission(session)
    score = ScoreService(session)

    r1 = score.record_vote(sub.id, "sess-1", VoteDirection.UP)
    assert r1.user_vote == 1
    assert r1.vote_count == 1

    r2 = score.record_vote(sub.id, "sess-1", 0)  # retract
    assert r2.user_vote == 0
    assert r2.vote_count == 0


def test_fuzz_is_deterministic(session) -> None:
    sub_id = uuid4()
    period_id = uuid4()
    a = fuzz_score(50, sub_id, period_id)
    b = fuzz_score(50, sub_id, period_id)
    assert a == b
    c = fuzz_score(50, sub_id, uuid4())
    # Different period → different seed → very likely different value
    assert isinstance(c, int)


def test_duplicate_flip_raises(session, monkeypatch) -> None:
    from backend.services import score as score_mod

    monkeypatch.setattr(score_mod, "VOTE_COOLDOWN_SECONDS", 60.0)
    sub = _make_submission(session)
    svc = ScoreService(session)
    svc.record_vote(sub.id, "sess-1", VoteDirection.UP)
    with pytest.raises(DuplicateVoteError):
        svc.record_vote(sub.id, "sess-1", VoteDirection.DOWN)


def test_finalize_period_ranks_by_true_score(session) -> None:
    period = VotingPeriod(
        label="Test",
        scope="city",
        starts_at=datetime.now(timezone.utc) - timedelta(days=7),
        ends_at=datetime.now(timezone.utc),
        top_n=2,
    )
    session.add(period)
    session.commit()
    session.refresh(period)

    a = _make_submission(session, period_id=period.id)
    b = _make_submission(session, period_id=period.id)
    c = _make_submission(session, period_id=period.id)
    a.true_score, b.true_score, c.true_score = 1, 5, 3
    for s in (a, b, c):
        session.add(s)
    session.commit()

    ranked = ScoreService(session).finalize_period(period.id)
    assert [r.true_score for r in ranked] == [5, 3]
    session.refresh(a)
    assert a.status == SubmissionStatus.CLOSED
