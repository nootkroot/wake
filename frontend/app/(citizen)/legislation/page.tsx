import { SearchBar } from "@/components/legislation/SearchBar";
import { BudgetPieChart } from "@/components/legislation/BudgetPieChart";
import { listLegislationDocs } from "@/lib/api";
import Link from "next/link";

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
        <div>
          <h2 className="text-base font-semibold">Budget overview</h2>
          <BudgetPieChart />
          <p className="mt-2 text-xs text-muted-foreground">
            Click a slice to drill into that line item (demo data).
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">Ingested documents</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {docs.length === 0 && (
              <li className="text-muted-foreground">
                No documents yet. Admins can ingest from the admin panel.
              </li>
            )}
            {docs.map((d) => (
              <li key={d.doc_id} className="flex items-center justify-between">
                <Link
                  href={`/legislation/${d.doc_id}`}
                  className="truncate text-primary hover:underline"
                >
                  {d.doc_title}
                </Link>
                <span className="text-xs text-muted-foreground">{d.chunk_count} chunks</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
