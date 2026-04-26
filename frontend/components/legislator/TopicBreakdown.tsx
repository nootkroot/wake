"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopicCount } from "@/lib/types";

export function TopicBreakdown({ topics }: { topics: TopicCount[] }) {
  const max = Math.max(1, ...topics.map((t) => t.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top topics</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2">
          {topics.length === 0 && (
            <li className="text-sm text-muted-foreground">No tagged submissions yet.</li>
          )}
          {topics.map((t) => (
            <li key={t.tag} className="text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{t.tag}</span>
                <span className="text-muted-foreground">
                  {t.count} · sev {t.avg_severity.toFixed(1)}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(t.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
