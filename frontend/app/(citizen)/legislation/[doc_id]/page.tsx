import { searchLegislation } from "@/lib/api";
import { ResultChunk } from "@/components/legislation/ResultChunk";

export const dynamic = "force-dynamic";

export default async function LegislationDocPage({
  params,
}: {
  params: { doc_id: string };
}) {
  // Naive doc-detail view: pull the doc's chunks via search with a generic query.
  const search = await searchLegislation("section", { top_k: 20 }).catch(() => null);
  const chunks =
    search?.results.filter((r) => r.doc_id === params.doc_id) ?? [];

  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">
          {chunks[0]?.doc_title ?? "Legislative document"}
        </h1>
        <p className="text-xs text-muted-foreground">{chunks[0]?.doc_source}</p>
      </header>
      {chunks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No chunks available for this document. Try a search query instead.
        </p>
      )}
      {chunks.map((c) => (
        <ResultChunk key={c.chunk_id} chunk={c} />
      ))}
    </article>
  );
}
