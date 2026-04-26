"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { createSubmission, ApiError } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import type { DisplayMode, Submission } from "@/lib/types";

interface Props {
  defaultMode?: DisplayMode;
  onSubmitted?: (submission: Submission) => void;
}

export function SubmissionForm({ defaultMode = "SUGGESTION", onSubmitted }: Props) {
  const [mode, setMode] = useState<DisplayMode>(defaultMode);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  async function detectLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => {
        setError("Couldn't get location — enter manually");
      },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Sign in (paste a user UUID for the demo) before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createSubmission(
        {
          display_mode: mode,
          title: title.trim(),
          body: body.trim(),
          is_anonymous: anonymous,
          tags: tagsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
          lang: typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en",
        },
        userId,
        getOrCreateSessionId(),
      );
      setTitle("");
      setBody("");
      setTagsRaw("");
      onSubmitted?.(created);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`Couldn't submit (${e.status})`);
      } else {
        setError("Couldn't submit — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a {mode === "ISSUE" ? "geo-located issue" : "suggestion"}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Verified accounts may submit · anyone may vote anonymously.
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {(["SUGGESTION", "ISSUE"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={
                  "rounded-md border px-3 py-1 text-sm " +
                  (mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border")
                }
              >
                {m === "ISSUE" ? "Issue (mapped)" : "Suggestion (forum)"}
              </button>
            ))}
          </div>

          <Input
            placeholder="User UUID (demo auth)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />

          <Input
            placeholder="Title (max 120 chars)"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="Describe the issue or suggestion (max 2000 chars)"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <Input
            placeholder="Tags, comma-separated"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
          />

          {mode === "ISSUE" && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Latitude"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
              <Input
                placeholder="Longitude"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="col-span-2"
                onClick={detectLocation}
              >
                Use my current location
              </Button>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Submit anonymously (suggestions only)
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
