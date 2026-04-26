"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VotingPeriod } from "@/lib/types";

export function PeriodSummaryCard({
  period,
  totalSubmissions,
  avgSeverity,
}: {
  period: VotingPeriod;
  totalSubmissions: number;
  avgSeverity: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{period.label}</CardTitle>
        <div className="text-xs text-muted-foreground">scope: {period.scope}</div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Submissions</div>
            <div className="text-xl font-semibold">{totalSubmissions}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Avg severity</div>
            <div className="text-xl font-semibold">{avgSeverity.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Status</div>
            <Badge>{period.is_closed ? "Closed" : "Open"}</Badge>
          </div>
        </div>
        {period.export_url && (
          <a
            href={period.export_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Download compiled report →
          </a>
        )}
      </CardBody>
    </Card>
  );
}
