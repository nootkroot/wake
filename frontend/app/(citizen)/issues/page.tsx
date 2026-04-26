import { IssueMap } from "@/components/map/IssueMap";
import { listSubmissions } from "@/lib/api";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";
import Link from "next/link";

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
        <div className="flex gap-2">
          <Link
            href="/suggestions/new?mode=ISSUE"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Submit issue
          </Link>
          <Link
            href="/suggestions/new"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Submit suggestion
          </Link>
        </div>
      </header>
      <IssueMap />
      <section>
        <h2 className="text-lg font-semibold mb-2">Recent issues</h2>
        <div className="space-y-3">
          {issues.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No issues yet. Submit one{" "}
              <Link className="text-primary" href="/suggestions/new?mode=ISSUE">
                here
              </Link>
              .
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
