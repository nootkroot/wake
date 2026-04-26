"use client";

import { useEffect, useState } from "react";
import { listSubmissions } from "@/lib/api";
import type { Submission } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ModerationPage() {
  const [hidden, setHidden] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSubmissions({ limit: 50 })
      .then((rows) => setHidden(rows.filter((r) => r.status === "HIDDEN")))
      .catch(() => setError("Couldn't load moderation queue"));
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">
          Submissions auto-hidden after report-threshold breaches.
        </p>
      </header>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {hidden.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">Nothing flagged. ✨</p>
      )}
      <div className="space-y-3">
        {hidden.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>{s.title}</CardTitle>
                <Badge>{s.status}</Badge>
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
