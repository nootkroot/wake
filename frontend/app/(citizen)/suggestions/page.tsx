import { listSubmissions } from "@/lib/api";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuggestionsPage() {
  const suggestions = await listSubmissions({ mode: "SUGGESTION", limit: 50 }).catch(
    () => [],
  );

  // Sort by display_score desc on the server-rendered list.
  const sorted = [...suggestions].sort(
    (a, b) => b.display_score - a.display_score,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Forum-style threads, ranked by vote popularity (fuzzed for display).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/suggestions/new"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Submit suggestion
          </Link>
          <Link
            href="/suggestions/new?mode=ISSUE"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Submit issue
          </Link>
        </div>
      </header>
      <div className="space-y-3">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — be the first to{" "}
            <Link className="text-primary" href="/suggestions/new">
              submit
            </Link>
            .
          </p>
        )}
        {sorted.map((s) => (
          <SubmissionCard key={s.id} submission={s} />
        ))}
      </div>
    </div>
  );
}
