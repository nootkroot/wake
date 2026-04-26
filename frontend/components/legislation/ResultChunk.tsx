import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LegislationSearchResultChunk } from "@/lib/types";

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return text;
  const re = new RegExp("(" + tokens.map(escape).join("|") + ")", "ig");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="bg-yellow-200/40 rounded px-0.5">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ResultChunk({
  chunk,
  highlightQuery,
}: {
  chunk: LegislationSearchResultChunk;
  highlightQuery?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate">{chunk.doc_title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge>Chunk #{chunk.chunk_index}</Badge>
            {chunk.source_verified && <Badge>Verified source</Badge>}
            <Badge>match {(chunk.similarity * 100).toFixed(0)}%</Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground truncate">{chunk.doc_source}</div>
      </CardHeader>
      <CardBody>
        <p className="leading-relaxed">{highlight(chunk.content, highlightQuery ?? "")}</p>
        <div className="mt-3">
          <Link
            href={`/legislation/${chunk.doc_id}`}
            className="text-sm text-primary hover:underline"
          >
            Read full document →
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
