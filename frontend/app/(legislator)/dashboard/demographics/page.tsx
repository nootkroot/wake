import { fetchDashboardDemographics } from "@/lib/api";
import { DemographicPanel } from "@/components/legislator/DemographicPanel";
import { DashboardNav } from "@/components/legislator/DashboardNav";

export const dynamic = "force-dynamic";

export default async function DashboardDemographicsPage({
  searchParams,
}: {
  searchParams: { period?: string; topic?: string };
}) {
  const rows = await fetchDashboardDemographics({
    period_id: searchParams.period,
    topic: searchParams.topic,
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Demographic breakdown</h1>
          <p className="text-sm text-muted-foreground">
            Submissions enriched with US Census ACS 5-year tract estimates.
          </p>
        </div>
        <DashboardNav />
      </header>
      <DemographicPanel rows={rows} />
    </div>
  );
}
