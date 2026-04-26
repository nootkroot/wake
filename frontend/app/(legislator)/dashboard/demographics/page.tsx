import { fetchDashboardDemographics } from "@/lib/api";
import { DemographicPanel } from "@/components/legislator/DemographicPanel";

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
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Demographic breakdown</h1>
        <p className="text-sm text-muted-foreground">
          Submissions enriched with US Census ACS 5-year tract estimates.
        </p>
      </header>
      <DemographicPanel rows={rows} />
    </div>
  );
}
