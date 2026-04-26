"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askLegislation, searchLegislation } from "@/lib/api";
import type { LegislationAnswerResponse, LegislationSearchResultChunk } from "@/lib/types";
import { ResultChunk } from "./ResultChunk";

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part, idx) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${part}-${idx}`}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={`${part}-${idx}`}>{part}</span>
      ),
    );
}

function renderAnswer(answerText: string): React.ReactNode {
  const lines = answerText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "No answer generated.";

  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  function flushBullets() {
    if (!bulletBuffer.length) return;
    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {bulletBuffer.map((item, idx) => (
          <li key={`${item}-${idx}`}>{renderInlineBold(item)}</li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  }

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }
    flushBullets();
    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-relaxed">
        {renderInlineBold(line)}
      </p>,
    );
  }
  flushBullets();
  return <div className="space-y-2 text-sm">{blocks}</div>;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LegislationSearchResultChunk[]>([]);
  const [answer, setAnswer] = useState<LegislationAnswerResponse | null>(null);
  const [retrievalMode, setRetrievalMode] = useState<"keyword" | "vector">("keyword");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const [qa, resp] = await Promise.all([
        askLegislation(query.trim(), { top_k: 6, retrieval_mode: retrievalMode }),
        searchLegislation(query.trim(), { top_k: 6 }),
      ]);
      setAnswer(qa);
      setResults(resp.results);
    } catch {
      setError("Search failed — try a different query.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask the legislative archive…"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Searching…" : "Search"}
        </Button>
      </form>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Answer mode:</span>
        <select
          className="scheme-dark max-w-full rounded-md border border-white/25 bg-black px-2 py-1 text-xs text-white"
          value={retrievalMode}
          onChange={(e) => setRetrievalMode(e.target.value as "keyword" | "vector")}
          aria-label="Answer retrieval mode"
        >
          <option value="keyword" className="bg-black text-white">
            Document context (Gemma over important sections)
          </option>
          <option value="vector" className="bg-black text-white">
            Vector index retrieval
          </option>
        </select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {answer && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Gemma answer</h3>
          <div className="mt-1">{renderAnswer(answer.answer)}</div>
          {answer.sources.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
              {answer.sources.slice(0, 5).map((s) => (
                <li key={s.chunk_id}>
                  {s.doc_title} - chunk #{s.chunk_index}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="space-y-3">
        {results.map((r) => (
          <ResultChunk key={r.chunk_id} chunk={r} highlightQuery={query} />
        ))}
      </div>
    </div>
  );
}
