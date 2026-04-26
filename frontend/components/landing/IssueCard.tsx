"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { castVote, ApiError } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { browserClient } from "@/lib/supabase";
import type { Submission } from '@/lib/submissions';
import { severityLabel, timeAgo } from '@/lib/submissions';

const SEVERITY_COLOR: Record<number, { text: string; border: string }> = {
  1: { text: '#85B7EB', border: '#85B7EB' },  // blue
  2: { text: '#FAC775', border: '#FAC775' },  // amber
  3: { text: '#FFA14E', border: '#FFA14E' },  // orange (matches gradient)
  4: { text: '#F09595', border: '#F09595' },  // red
};

export default function IssueCard({ submission }: { submission: Submission }) {
  const router = useRouter();
  const sev = SEVERITY_COLOR[submission.severity];
  const [score, setScore] = useState(submission.display_score);
  const [vote, setVote] = useState<-1 | 0 | 1>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScore(submission.display_score);
  }, [submission.id, submission.display_score]);

  async function sendVote(direction: -1 | 1) {
    if (busy) return;
    const next = vote === direction ? 0 : direction;
    setBusy(true);
    try {
      const supabase = browserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      const sessionId = getOrCreateSessionId();
      const result = await castVote(submission.id, next, sessionId, user.id);
      setVote(result.user_vote);
      setScore(result.display_score);
    } catch (e) {
      if (!(e instanceof ApiError)) {
        // noop: keep current UI on unexpected client/network errors
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="relative w-[25rem] h-[520px] cursor-pointer bg-[#171821]"
      onClick={() => router.push(`/issues/${submission.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/issues/${submission.id}`);
        }
      }}
      aria-label={`Open issue: ${submission.title}`}
    >
      {/* Dashed outline */}
      <div className="absolute inset-[-5px] border border-dashed border-white pointer-events-none" />

      {/* Title */}
      <h2 className="helvetica font-bold text-[2rem] leading-[1.1] text-white px-7 pt-7 pr-10">
        {submission.title}
      </h2>

      {/* Image */}
      <div className="mx-7 mt-4 h-[180px] overflow-hidden bg-black/40">
        {submission.image_url && (
          <img
            src={submission.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Description */}
      <p className="px-7 mt-4 text-[#d9d9d9] text-[1.25rem] leading-snug font-medium">
        {submission.body}
      </p>

      {/* Footer */}
      <div className="absolute bottom-8 left-6 right-6 flex items-end justify-between">
        {/* Vote buttons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-white/30 hover:border-white disabled:opacity-50"
            aria-label="Upvote"
            onClick={(e) => {
              e.stopPropagation();
              void sendVote(1);
            }}
            disabled={busy}
          >
            <Chevron dir="up" />
          </button>
          <span className="min-w-[2ch] text-center text-[27px] font-medium text-white">
            {score}
          </span>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-white/30 hover:border-white disabled:opacity-50"
            aria-label="Downvote"
            onClick={(e) => {
              e.stopPropagation();
              void sendVote(-1);
            }}
            disabled={busy}
          >
            <Chevron dir="down" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-3">
          <span className="text-[16px] tracking-[0.16em] text-[#d9d9d9] font-medium">
            {timeAgo(submission.created_at)}
          </span>
          <div className="flex gap-2">
            <span
              className="max-w-[11rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-4 py-1 text-[16px]"
              style={{ color: sev.text, borderColor: sev.border }}
            >
              {severityLabel(submission.severity)}
            </span>
            {submission.tags[0] && (
              <span className="max-w-[11rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-white/40 px-4 py-1 text-[16px] text-[#d9d9d9]">
                {submission.tags[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      {dir === 'up' ? <path d="M12 4 L4 18 L20 18 Z" /> : <path d="M12 20 L4 6 L20 6 Z" />}
    </svg>
  );
}
