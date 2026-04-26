import { SearchBar } from "@/components/legislation/SearchBar";
import { BudgetPieChart } from "@/components/legislation/BudgetPieChart";
import { LegislationUploadPanel } from "@/components/legislation/LegislationUploadPanel";
import { IngestedDocumentsPanel } from "@/components/legislation/IngestedDocumentsPanel";
import { listLegislationDocs } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function LegislationPage() {
  const docs = await listLegislationDocs().catch(() => []);
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Legislation search</h1>
          <p className="text-sm text-muted-foreground">
            Semantic search across ingested local laws and budget documents.
          </p>
        </header>
        <SearchBar />
      </section>
      <aside className="space-y-6">
        <LegislationUploadPanel />
        <div>
          <h2 className="text-base font-semibold">Budget overview</h2>
          <BudgetPieChart />
          <p className="mt-2 text-xs text-muted-foreground">
            Click a slice to drill into that line item (demo data).
          </p>
        </div>
        <IngestedDocumentsPanel initialDocs={docs} />
      </aside>
    </div>
  );
}
