import { HeatmapLayer } from "@/components/map/HeatmapLayer";

export const dynamic = "force-dynamic";

export default function DashboardMapPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Geographic heatmap</h1>
        <p className="text-sm text-muted-foreground">
          Submission density weighted by score and severity.
        </p>
      </header>
      <HeatmapLayer periodId={searchParams.period} />
    </div>
  );
}
