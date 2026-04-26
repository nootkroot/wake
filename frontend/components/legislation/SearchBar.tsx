"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchLegislation } from "@/lib/api";
import type { LegislationSearchResultChunk } from "@/lib/types";
import { ResultChunk } from "./ResultChunk";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<string>(
    typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en",
  );
  const [results, setResults] = useState<LegislationSearchResultChunk[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await searchLegislation(query.trim(), { lang, top_k: 5 });
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
        <select
          className="rounded-md border border-border bg-transparent px-2 text-sm"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Search language"
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
        <Button type="submit" disabled={busy}>
          {busy ? "Searching…" : "Search"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="space-y-3">
        {results.map((r) => (
          <ResultChunk key={r.chunk_id} chunk={r} highlightQuery={query} />
        ))}
      </div>
    </div>
  );
}
