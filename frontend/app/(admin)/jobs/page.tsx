"use client";

import { useEffect, useState } from "react";
import { listJobs, runJobs, ApiError } from "@/lib/api";
import type { JobRead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-900",
  RUNNING: "bg-blue-100 text-blue-900",
  DONE: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-red-100 text-red-900",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRead[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");

  async function refresh() {
    if (!adminToken) return;
    try {
      const rows = await listJobs({}, adminToken);
      setJobs(rows);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError) setError(`API ${e.status}`);
      else setError("Couldn't load jobs");
    }
  }

  async function trigger(limit: number) {
    if (!adminToken) return;
    setBusy(true);
    try {
      await runJobs({ limit }, adminToken);
      await refresh();
    } catch {
      setError("Job run failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job queue</h1>
          <p className="text-sm text-muted-foreground">
            Operational queue for background tasks and processing visibility.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="password"
            placeholder="Admin token"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="rounded-md border border-border bg-transparent px-3 py-1 text-sm"
          />
          <Button onClick={refresh} variant="outline" size="sm">
            Refresh
          </Button>
          <Button onClick={() => trigger(3)} disabled={busy} size="sm">
            Run 3 jobs
          </Button>
          <Button onClick={() => trigger(10)} disabled={busy} size="sm">
            Run 10
          </Button>
        </div>
      </header>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3">
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">No jobs to display.</p>
        )}
        {jobs.map((j) => (
          <Card key={j.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-mono text-sm">{j.job_type}</CardTitle>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (STATUS_COLOR[j.status] ?? "bg-muted")
                  }
                >
                  {j.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                created {j.created_at} · {j.id}
              </div>
            </CardHeader>
            <CardBody>
              <pre className="whitespace-pre-wrap break-words text-xs bg-muted/40 rounded p-2">
                {JSON.stringify(j.payload, null, 2)}
              </pre>
              {j.result && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer">Result</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words bg-emerald-50 rounded p-2">
                    {JSON.stringify(j.result, null, 2)}
                  </pre>
                </details>
              )}
              {j.error && (
                <div className="mt-2 text-xs text-red-500">
                  Error: {j.error}
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
