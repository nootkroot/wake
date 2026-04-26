"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteLegislationDoc } from "@/lib/api";
import { browserClient, getRoleFromUser } from "@/lib/supabase";
import type { LegislationDocSummary } from "@/lib/types";

export function IngestedDocumentsPanel({
  initialDocs,
}: {
  initialDocs: LegislationDocSummary[];
}) {
  const [docs, setDocs] = useState<LegislationDocSummary[]>(initialDocs);
  const [role, setRole] = useState<"loading" | "admin" | "other">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user ?? null;
      setUserId(user?.id ?? null);
      setRole(getRoleFromUser(user) === "admin" ? "admin" : "other");
    });
  }, []);

  const isAdmin = useMemo(() => role === "admin" && !!userId, [role, userId]);

  async function onDelete(doc: LegislationDocSummary) {
    if (!userId) {
      setError("Log in as an admin to delete documents.");
      return;
    }
    const ok = window.confirm(
      `Delete this ingested document and all indexed chunks?\n\n${doc.doc_title}`,
    );
    if (!ok) return;
    setDeletingId(doc.doc_id);
    setError(null);
    try {
      await deleteLegislationDoc(doc.doc_id, userId);
      setDocs((rows) => rows.filter((row) => row.doc_id !== doc.doc_id));
    } catch {
      setError("Delete failed. Make sure your account has admin role.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold">Ingested documents</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {docs.length === 0 && (
          <li className="text-muted-foreground">No documents indexed yet.</li>
        )}
        {docs.map((d) => (
          <li key={d.doc_id} className="rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/legislation/${d.doc_id}`}
                className="truncate text-primary hover:underline"
              >
                {d.doc_title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{d.chunk_count} chunks</span>
            </div>
            {isAdmin && (
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deletingId === d.doc_id}
                  onClick={() => onDelete(d)}
                  className="text-red-600 border-red-600/40 hover:bg-red-600/10"
                >
                  {deletingId === d.doc_id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {role !== "loading" && !isAdmin && (
        <p className="mt-2 text-xs text-muted-foreground">
          Only admin accounts can remove indexed documents.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
