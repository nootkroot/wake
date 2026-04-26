"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { DemographicEnrichedSubmission } from "@/lib/types";
import { SeverityBadge } from "@/components/submissions/SeverityBadge";

const TIER_LABEL: Record<number, string> = {
  1: "Lower",
  2: "Lower-mid",
  3: "Middle",
  4: "Upper-mid",
  5: "Upper",
};

export function DemographicPanel({
  rows,
}: {
  rows: DemographicEnrichedSubmission[];
}) {
  if (!rows.length) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-muted-foreground">
            No location-aware submissions in this slice yet.
          </p>
        </CardBody>
      </Card>
    );
  }

  // Aggregate by tier.
  const tiers: Record<number, DemographicEnrichedSubmission[]> = {};
  for (const r of rows) {
    const tier = r.estimated_socioeconomic_tier ?? 3;
    (tiers[tier] ??= []).push(r);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demographic distribution (ACS 5-year)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Submissions grouped by estimated socioeconomic tier of the originating tract.
        </p>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {Object.keys(tiers)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => {
              const tier = Number(k);
              const list = tiers[tier];
              const avgSev =
                list.reduce((acc, r) => acc + (r.submission.severity ?? 0), 0) / list.length;
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      Tier {tier} · {TIER_LABEL[tier] ?? "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {list.length} submission(s) · avg sev {avgSev.toFixed(1)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {list.slice(0, 3).map((r) => (
                      <li key={r.submission.id} className="flex items-center gap-2">
                        <SeverityBadge severity={r.submission.severity} />
                        <span className="truncate">{r.submission.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      </CardBody>
    </Card>
  );
}
