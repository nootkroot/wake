import { IssueMap } from "@/components/map/IssueMap";
import { listSubmissions } from "@/lib/api";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const issues = await listSubmissions({ mode: "ISSUE", limit: 30 }).catch(() => []);
  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Issue map</h1>
          <p className="text-sm text-muted-foreground">
            Geo-located civic issues — clustered by location, ranked by severity and votes.
          </p>
        </div>
      </header>
      <IssueMap />
      <section>
        <h2 className="text-lg font-semibold mb-2">Recent issues</h2>
        <div className="space-y-3">
          {issues.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No issues yet. Submit one from <a className="text-primary" href="/suggestions/new">/suggestions/new</a>.
            </p>
          )}
          {issues.map((s) => (
            <SubmissionCard key={s.id} submission={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
