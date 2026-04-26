"use client";

import { useEffect, useState } from "react";
import { listSubmissions } from "@/lib/api";
import type { Submission } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ModerationPage() {
  const [reported, setReported] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listSubmissions({ limit: 100 }),
      listSubmissions({ status: "HIDDEN", limit: 100 }),
    ])
      .then(([visibleRows, hiddenRows]) => {
        const mergedById = new Map<string, Submission>();
        [...visibleRows, ...hiddenRows].forEach((row) => mergedById.set(row.id, row));
        const queue = Array.from(mergedById.values())
          .filter((row) => row.report_count > 0 || row.status === "HIDDEN")
          .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
        setReported(queue);
      })
      .catch(() => setError("Couldn't load moderation queue"));
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">
          Reported submissions (including those pending auto-hide threshold).
        </p>
      </header>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {reported.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">Nothing flagged. ✨</p>
      )}
      <div className="space-y-3">
        {reported.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>{s.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge>{s.status}</Badge>
                  <Badge>{s.report_count} report(s)</Badge>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm">{s.body}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {s.tags.join(" · ") || "no tags"}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
