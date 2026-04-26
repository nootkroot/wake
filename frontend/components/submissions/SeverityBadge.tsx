import { cn } from "@/lib/utils";
import { severityLabel } from "@/lib/utils";
import type { SeverityRank } from "@/lib/types";

const COLORS: Record<number, string> = {
  1: "bg-severity-1/15 text-severity-1 border-severity-1/30",
  2: "bg-severity-2/15 text-severity-2 border-severity-2/40",
  3: "bg-severity-3/15 text-severity-3 border-severity-3/40",
  4: "bg-severity-4/20 text-severity-4 border-severity-4/40",
};

export function SeverityBadge({ severity }: { severity: SeverityRank | null }) {
  if (!severity) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
        Unscored
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        COLORS[severity],
      )}
    >
      {severityLabel(severity)} · {severity}/4
    </span>
  );
}
