import { DashboardNav } from "@/components/legislator/DashboardNav";

export const dynamic = "force-dynamic";

export default function DashboardMapPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Geographic map</h1>
          <p className="text-sm text-muted-foreground">
            Interactive map powered by ArcGIS
          </p>
        </div>
        <DashboardNav />
      </header>
      <div className="rounded-lg border border-border overflow-hidden">
        <iframe
          src="https://seattlecitygis.maps.arcgis.com/apps/instant/sidebar/index.html?appid=f84566582a374ed9890b5a28ae79c594"
          height="600"
          width="100%"
          title="Geographic map"
          style={{ border: "none" }}
        />
      </div>
    </div>
  );
}
