"use client";

import { useState, useEffect } from "react";
import { castVote, ApiError } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { Button } from "@/components/ui/button";
import type { Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  submission: Submission;
  onChange?: (next: { display_score: number; user_vote: -1 | 0 | 1 }) => void;
}

export function VoteControl({ submission, onChange }: Props) {
  const [vote, setVote] = useState<-1 | 0 | 1>(
    (submission.user_vote ?? 0) as -1 | 0 | 1,
  );
  const [score, setScore] = useState(submission.display_score);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVote((submission.user_vote ?? 0) as -1 | 0 | 1);
    setScore(submission.display_score);
  }, [submission.id, submission.user_vote, submission.display_score]);

  async function send(direction: -1 | 1) {
    if (busy) return;
    const next = vote === direction ? 0 : direction;
    setBusy(true);
    setError(null);
    try {
      const sessionId = getOrCreateSessionId();
      const result = await castVote(submission.id, next, sessionId);
      setVote(result.user_vote);
      setScore(result.display_score);
      onChange?.({ display_score: result.display_score, user_vote: result.user_vote });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError("Slow down — too many vote flips");
      } else {
        setError("Couldn't record vote");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 text-xs">
      <button
        aria-label="Upvote"
        onClick={() => send(1)}
        disabled={busy}
        className={cn(
          "rounded-md border border-border px-2 py-1 hover:bg-muted",
          vote === 1 && "bg-primary text-primary-foreground border-primary",
        )}
      >
        ▲
      </button>
      <span className="font-mono font-semibold">{score}</span>
      <button
        aria-label="Downvote"
        onClick={() => send(-1)}
        disabled={busy}
        className={cn(
          "rounded-md border border-border px-2 py-1 hover:bg-muted",
          vote === -1 && "bg-red-500 text-white border-red-500",
        )}
      >
        ▼
      </button>
      {error && <span className="text-red-500 text-[10px]">{error}</span>}
    </div>
  );
}
