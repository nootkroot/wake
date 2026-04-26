"""Vote recording, score fuzzing, and period finalization."""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Session, select

from ..config import get_settings
from ..models.submission import Submission, SubmissionStatus
from ..models.vote import Vote, VoteDirection
from ..models.voting_period import VotingPeriod
from ..schemas import RankedSubmission, VoteResult


class DuplicateVoteError(RuntimeError):
    """Raised when the same session flips its vote faster than the cooldown."""


VOTE_COOLDOWN_SECONDS = 2.0


def _uuid_to_int(value: UUID) -> int:
    return int(value)


def fuzz_score(true_score: int, submission_id: UUID, period_id: Optional[UUID]) -> int:
    """Add deterministic Gaussian noise so display_score doesn't leak true_score."""
    if true_score == 0:
        # Keep brand-new / zero-vote posts visually consistent in the UI.
        return 1
    settings = get_settings()
    seed = _uuid_to_int(submission_id)
    if period_id is not None:
        seed ^= _uuid_to_int(period_id)
    rng = random.Random(seed)
    noise = rng.gauss(0, settings.fuzz_sigma)
    return true_score + round(noise)


class ScoreService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def record_vote(
        self,
        submission_id: UUID,
        session_id: str,
        direction: VoteDirection | int,
        user_id: Optional[UUID] = None,
    ) -> VoteResult:
        submission = self.session.get(Submission, submission_id)
        if submission is None:
            raise LookupError(f"Submission {submission_id} not found")
        if submission.status not in {SubmissionStatus.ACTIVE, SubmissionStatus.PENDING_REVIEW}:
            raise PermissionError(f"Voting closed for submission {submission_id}")

        existing = self.session.exec(
            select(Vote).where(
                Vote.submission_id == submission_id,
                Vote.session_id == session_id,
            )
        ).first()

        now = datetime.now(timezone.utc)
        retract = int(direction) == 0

        if existing is not None:
            existing_created = existing.created_at
            if existing_created.tzinfo is None:
                existing_created = existing_created.replace(tzinfo=timezone.utc)
            if (now - existing_created) < timedelta(seconds=VOTE_COOLDOWN_SECONDS) and not retract:
                raise DuplicateVoteError("Vote flipped too fast")

            old_dir = int(existing.direction)
            if retract:
                self.session.delete(existing)
                submission.true_score -= old_dir
                submission.vote_count = max(0, submission.vote_count - 1)
                user_vote = 0
            else:
                if int(direction) == old_dir:
                    user_vote = old_dir
                else:
                    submission.true_score += int(direction) - old_dir
                    existing.direction = VoteDirection(int(direction))
                    existing.created_at = now
                    user_vote = int(direction)
        else:
            if retract:
                user_vote = 0
            else:
                vote = Vote(
                    id=uuid4(),
                    submission_id=submission_id,
                    session_id=session_id,
                    user_id=user_id,
                    direction=VoteDirection(int(direction)),
                    created_at=now,
                )
                self.session.add(vote)
                submission.true_score += int(direction)
                submission.vote_count += 1
                user_vote = int(direction)

        submission.display_score = fuzz_score(
            submission.true_score, submission.id, submission.voting_period_id
        )
        submission.updated_at = now
        self.session.add(submission)
        self.session.commit()
        self.session.refresh(submission)

        return VoteResult(
            submission_id=submission.id,
            user_vote=user_vote,
            display_score=submission.display_score,
            vote_count=submission.vote_count,
        )

    def refresh_display_score(self, submission_id: UUID) -> int:
        submission = self.session.get(Submission, submission_id)
        if submission is None:
            raise LookupError(f"Submission {submission_id} not found")
        submission.display_score = fuzz_score(
            submission.true_score, submission.id, submission.voting_period_id
        )
        self.session.add(submission)
        self.session.commit()
        return submission.display_score

    def get_user_vote(self, submission_id: UUID, session_id: str) -> int:
        vote = self.session.exec(
            select(Vote).where(
                Vote.submission_id == submission_id,
                Vote.session_id == session_id,
            )
        ).first()
        return int(vote.direction) if vote else 0

    def finalize_period(self, period_id: UUID) -> list[RankedSubmission]:
        period = self.session.get(VotingPeriod, period_id)
        if period is None:
            raise LookupError(f"Voting period {period_id} not found")

        submissions = self.session.exec(
            select(Submission).where(
                Submission.voting_period_id == period_id,
                Submission.status != SubmissionStatus.HIDDEN,
            )
        ).all()

        ranked = sorted(submissions, key=lambda s: s.true_score, reverse=True)
        results: list[RankedSubmission] = []
        for idx, sub in enumerate(ranked[: period.top_n], start=1):
            results.append(
                RankedSubmission(
                    submission_id=sub.id,
                    title=sub.title,
                    severity=int(sub.severity) if sub.severity else None,
                    true_score=sub.true_score,
                    rank=idx,
                )
            )

        for sub in submissions:
            sub.status = SubmissionStatus.CLOSED
            self.session.add(sub)
        period.is_closed = True
        self.session.add(period)
        self.session.commit()

        return results
