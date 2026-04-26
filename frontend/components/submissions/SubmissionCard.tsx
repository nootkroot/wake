"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "./SeverityBadge";
import { VoteControl } from "./VoteControl";
import { formatDate } from "@/lib/utils";
import { reportSubmission } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import type { Submission } from "@/lib/types";

export function SubmissionCard({
  submission,
  detailHref,
}: {
  submission: Submission;
  detailHref?: string;
}) {
  const href =
    detailHref ??
    (submission.display_mode === "ISSUE"
      ? `/issues/${submission.id}`
      : `/suggestions/${submission.id}`);

  const [reportState, setReportState] = useState<"idle" | "sending" | "done">("idle");
  const [current, setCurrent] = useState(submission);
  const [locationLabel, setLocationLabel] = useState<string | null>(
    submission.neighborhood?.trim() || null,
  );

  useEffect(() => {
    const rawNeighborhood = submission.neighborhood?.trim() || null;
    setLocationLabel(rawNeighborhood);
    if (submission.display_mode !== "ISSUE") return;
    if (submission.latitude == null || submission.longitude == null) return;
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    if (!mapboxToken) return;
    const ac = new AbortController();
    const coordsFallback = `${submission.latitude.toFixed(4)}, ${submission.longitude.toFixed(4)}`;

    async function resolveAddress() {
      try {
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${submission.longitude},${submission.latitude}.json?types=address,neighborhood,place,locality&limit=1&access_token=${mapboxToken}`,
          { signal: ac.signal },
        );
        if (!resp.ok) {
          setLocationLabel(rawNeighborhood || coordsFallback);
          return;
        }
        const data = (await resp.json()) as { features?: Array<{ place_name?: string }> };
        const placeName = data.features?.[0]?.place_name?.trim();
        setLocationLabel(placeName && placeName.length > 0 ? placeName : rawNeighborhood || coordsFallback);
      } catch {
        if (!ac.signal.aborted) {
          setLocationLabel(rawNeighborhood || coordsFallback);
        }
      }
    }

    void resolveAddress();
    return () => ac.abort();
  }, [
    submission.display_mode,
    submission.latitude,
    submission.longitude,
    submission.neighborhood,
  ]);

  async function flag() {
    if (reportState !== "idle") return;
    const reason = window.prompt("Why are you flagging this?") ?? null;
    setReportState("sending");
    try {
      await reportSubmission(submission.id, reason, getOrCreateSessionId());
      setReportState("done");
    } catch {
      setReportState("idle");
    }
  }

  return (
    <Card className="flex gap-4">
      <VoteControl
        submission={current}
        onChange={(next) =>
          setCurrent((c) => ({
            ...c,
            display_score: next.display_score,
            user_vote: next.user_vote,
          }))
        }
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={submission.severity} />
          <Badge>{submission.display_mode === "ISSUE" ? "Issue" : "Suggestion"}</Badge>
          {submission.tags.slice(0, 4).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
        <Link href={href} className="block mt-2 text-base font-semibold hover:underline">
          {submission.title}
        </Link>
        <CardBody className="mt-1 text-muted-foreground line-clamp-3">
          {submission.body}
        </CardBody>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-3">
            <span>{formatDate(submission.created_at)}</span>
            {locationLabel && <span>· {locationLabel}</span>}
            {submission.lang !== "en" && <span>· {submission.lang}</span>}
          </div>
          <button onClick={flag} className="hover:text-red-500" aria-label="Report">
            {reportState === "done" ? "Reported ✓" : "Report"}
          </button>
        </div>
        {submission.gemma_rationale && (
          <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
            <span className="font-medium">AI rationale:</span> {submission.gemma_rationale}
          </div>
        )}
      </div>
    </Card>
  );
}
