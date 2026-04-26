"""WeasyPrint-backed PDF export. Falls back to HTML in environments without
the WeasyPrint native dependency stack."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, BaseLoader, select_autoescape

from ...config import get_settings
from ...models.voting_period import VotingPeriod
from ...schemas import ExportResult, PeriodMetadata, RankedSubmission
from .adapter import ExportAdapter

logger = logging.getLogger(__name__)


PDF_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{{ period.label }} — Wake Period Report</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: #111; padding: 40px; }
  h1 { font-size: 28px; margin-bottom: 0; }
  .scope { color: #555; margin-top: 4px; }
  .meta { color: #555; font-size: 13px; margin: 12px 0 28px; }
  .item { padding: 12px 16px; border-left: 4px solid #2563eb;
          background: #f8fafc; margin-bottom: 12px; border-radius: 4px; }
  .rank { font-weight: 700; color: #2563eb; margin-right: 8px; }
  .severity-1 { border-left-color: #94a3b8; }
  .severity-2 { border-left-color: #fbbf24; }
  .severity-3 { border-left-color: #fb923c; }
  .severity-4 { border-left-color: #ef4444; }
  .score { float: right; color: #475569; font-weight: 600; }
  .footer { margin-top: 40px; font-size: 11px; color: #888;
            border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
  <h1>Wake — Period Report</h1>
  <div class="scope">{{ period.label }} · scope: {{ period.scope }}</div>
  <div class="meta">
    {{ metadata.total_submissions }} submissions · {{ metadata.total_votes }} votes ·
    granularity: {{ metadata.granularity.value }} ·
    generated {{ metadata.generated_at.strftime('%Y-%m-%d %H:%M UTC') }}
  </div>

  {% for s in submissions %}
    <div class="item severity-{{ s.severity or 1 }}">
      <span class="score">score {{ s.true_score }}</span>
      <span class="rank">#{{ s.rank }}</span>
      {{ s.title }}
      {% if s.severity %}
        <div style="font-size: 12px; color: #555;">severity {{ s.severity }}/4</div>
      {% endif %}
    </div>
  {% endfor %}

  <div class="footer">
    Compiled by Wake for the period ending
    {{ period.ends_at.strftime('%Y-%m-%d') }}.
    True scores shown — public displays use fuzzed values.
  </div>
</body>
</html>
"""


class PDFExportAdapter(ExportAdapter):
    """Renders Jinja2 HTML → PDF via WeasyPrint and persists to disk.

    The render output path is configurable; in production callers should
    upload the result to Supabase Storage and persist the public URL on the
    VotingPeriod.export_url column.
    """

    def __init__(self, output_dir: Path | str = "exports") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._jinja = Environment(
            loader=BaseLoader(),
            autoescape=select_autoescape(["html"]),
        )
        self._tmpl = self._jinja.from_string(PDF_TEMPLATE)

    async def export(
        self,
        period: VotingPeriod,
        submissions: list[RankedSubmission],
        metadata: PeriodMetadata,
    ) -> ExportResult:
        html = self._tmpl.render(period=period, submissions=submissions, metadata=metadata)
        slug = f"period-{period.id}".replace("-", "")[:20]
        target = self.output_dir / f"{slug}.pdf"
        try:
            from weasyprint import HTML  # type: ignore

            HTML(string=html).write_pdf(target=str(target))
            fmt = "pdf"
            url = str(target.resolve())
        except Exception as exc:  # WeasyPrint missing or rendering failed
            logger.warning("WeasyPrint unavailable, falling back to HTML export: %s", exc)
            target = target.with_suffix(".html")
            target.write_text(html, encoding="utf-8")
            fmt = "html"
            url = str(target.resolve())

        return ExportResult(
            url=url,
            format=fmt,
            delivered_at=datetime.now(timezone.utc),
        )
