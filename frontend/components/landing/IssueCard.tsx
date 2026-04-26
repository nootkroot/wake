import type { Submission } from '@/lib/submissions';
import { severityLabel, timeAgo } from '@/lib/submissions';

const SEVERITY_COLOR: Record<number, { text: string; border: string }> = {
  1: { text: '#85B7EB', border: '#85B7EB' },  // blue
  2: { text: '#FAC775', border: '#FAC775' },  // amber
  3: { text: '#FFA14E', border: '#FFA14E' },  // orange (matches gradient)
  4: { text: '#F09595', border: '#F09595' },  // red
};

export default function IssueCard({ submission }: { submission: Submission }) {
  const sev = SEVERITY_COLOR[submission.severity];

  return (
    <article className="relative w-[25rem] h-[520px] bg-[#171821]">
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
      <div className="absolute bottom-6 left-7 right-7 flex items-end justify-between">
        {/* Vote buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="w-8 h-8 border rounded-md border-white/30 flex items-center justify-center hover:border-white"
            aria-label="Upvote"
          >
            <Chevron dir="up" />
          </button>
          <span className="text-[18px] font-medium text-white min-w-[2ch] text-center">
            {submission.display_score}
          </span>
          <button
            type="button"
            className="w-8 h-8 border rounded-md border-white/30 flex items-center justify-center hover:border-white"
            aria-label="Downvote"
          >
            <Chevron dir="down" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-[11px] tracking-[0.18em] text-[#d9d9d9] font-medium">
            {timeAgo(submission.created_at)}
          </span>
          <div className="flex gap-1.5">
            <span
              className="text-[11px] px-2.5 py-1 rounded-full border"
              style={{ color: sev.text, borderColor: sev.border }}
            >
              {severityLabel(submission.severity)}
            </span>
            {submission.tags[0] && (
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/40 text-[#d9d9d9]">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      {dir === 'up' ? <path d="M12 4 L4 18 L20 18 Z" /> : <path d="M12 20 L4 6 L20 6 Z" />}
    </svg>
  );
}
