import {
  fetchDashboardSummary,
  listPeriods,
} from "@/lib/api";
import { TopicBreakdown } from "@/components/legislator/TopicBreakdown";
import { PeriodSummaryCard } from "@/components/legislator/PeriodSummaryCard";
import { BudgetPieChart } from "@/components/legislation/BudgetPieChart";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";
import { DashboardNav } from "@/components/legislator/DashboardNav";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const periods = await listPeriods().catch(() => []);
  const activePeriod =
    periods.find((p) => p.id === searchParams.period) ?? periods[0];
  const summary = await fetchDashboardSummary(
    activePeriod ? { period_id: activePeriod.id } : {},
  ).catch(() => null);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Legislator dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Aggregated citizen signal · {activePeriod?.label ?? "all periods"}
          </p>
        </div>
        <DashboardNav />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {activePeriod && summary && (
            <PeriodSummaryCard
              period={activePeriod}
              totalSubmissions={summary.total_submissions}
              avgSeverity={summary.avg_severity}
            />
          )}
          <div>
            <h2 className="text-base font-semibold mb-2">Top-ranked submissions</h2>
            <div className="space-y-3">
              {summary?.top_submissions.map((s) => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
              {(!summary || summary.top_submissions.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No submissions in this period yet.
                </p>
              )}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <TopicBreakdown topics={summary?.top_topics ?? []} />
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-base font-semibold mb-2">Budget mix</h3>
            <BudgetPieChart />
          </div>
        </aside>
      </div>
    </div>
  );
}
