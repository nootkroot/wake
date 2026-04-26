"""ExportAdapter interface — extend for new delivery channels."""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone

from ...models.voting_period import VotingPeriod
from ...schemas import ExportResult, PeriodMetadata, RankedSubmission


class ExportAdapter(ABC):
    """Interface for compiling period results into a deliverable."""

    @abstractmethod
    async def export(
        self,
        period: VotingPeriod,
        submissions: list[RankedSubmission],
        metadata: PeriodMetadata,
    ) -> ExportResult: ...


class EmailExportAdapter(ExportAdapter):
    async def export(self, period, submissions, metadata) -> ExportResult:
        return ExportResult(
            url=f"mailto:legislator@example.org?subject={period.label}",
            format="email",
            delivered_at=datetime.now(timezone.utc),
        )


class WebhookExportAdapter(ExportAdapter):
    def __init__(self, webhook_url: str) -> None:
        self.webhook_url = webhook_url

    async def export(self, period, submissions, metadata) -> ExportResult:
        return ExportResult(
            url=self.webhook_url,
            format="webhook",
            delivered_at=datetime.now(timezone.utc),
        )


class ChangeOrgExportAdapter(ExportAdapter):
    async def export(self, period, submissions, metadata) -> ExportResult:
        return ExportResult(
            url="https://www.change.org/start-a-petition",
            format="change_org",
            delivered_at=datetime.now(timezone.utc),
        )
