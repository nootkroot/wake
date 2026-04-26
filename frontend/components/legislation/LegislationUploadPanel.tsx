"use client";

import { useEffect, useState } from "react";
import { ApiError, formatFastApiDetail, uploadLegislationFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browserClient, getRoleFromUser } from "@/lib/supabase";

export function LegislationUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"loading" | "admin" | "other">("loading");
  const [lang, setLang] = useState("en");
  const [translateTo, setTranslateTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user ?? null;
      setUserId(user?.id ?? null);
      setRole(getRoleFromUser(user) === "admin" ? "admin" : "other");
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a legislation file first.");
      return;
    }
    if (!userId) {
      setError("Log in as an admin account to upload.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadLegislationFile(
        {
          file,
          title: title.trim() || file.name,
          source_verified: true,
          lang,
          translate_to: translateTo.trim() || undefined,
        },
        userId,
      );
      setMessage(
        `Indexed ${result.chunk_count} chunks for "${result.doc_title}"` +
          (result.translated_to ? ` (translated to ${result.translated_to})` : ""),
      );
      setFile(null);
      setTitle("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatFastApiDetail(err.detail));
      } else {
        setError("Upload or processing failed. Verify admin account and file type.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (role === "loading") return null;
  if (role !== "admin") return null;

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-base font-semibold">Upload legislation file</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload PDF/TXT/MD/JSON/CSV. It will be processed by Gemma and indexed for search.
      </p>
      <form className="mt-3 space-y-3" onSubmit={onSubmit}>
        <Input
          placeholder="Document title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="file"
          accept=".pdf,.txt,.md,.markdown,.json,.csv,text/plain,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
          required
        />
        <div className="flex gap-2">
          <Input
            placeholder="Input language (en)"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          />
          <Input
            placeholder="Translate to language code (optional, e.g. es)"
            value={translateTo}
            onChange={(e) => setTranslateTo(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Processing..." : "Upload and index"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {message && <p className="mt-2 text-sm text-green-500">{message}</p>}
    </div>
  );
}
