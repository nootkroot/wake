import { listSubmissions } from "@/lib/api";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";

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
      <header>
        <div>
          <h1 className="text-2xl font-semibold">Suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Forum-style threads, ranked by vote popularity (fuzzed for display).
          </p>
        </div>
      </header>
      <div className="space-y-3">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — be the first to submit.
          </p>
        )}
        {sorted.map((s) => (
          <SubmissionCard key={s.id} submission={s} />
        ))}
      </div>
    </div>
  );
}
