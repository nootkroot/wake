"use client";

import { useRouter } from "next/navigation";
import { SubmissionForm } from "@/components/submissions/SubmissionForm";
import type { DisplayMode } from "@/lib/types";

interface NewSubmissionPageProps {
  searchParams?: {
    mode?: string;
  };
}

export default function NewSubmissionPage({ searchParams }: NewSubmissionPageProps) {
  const router = useRouter();
  const mode: DisplayMode =
    searchParams?.mode?.toUpperCase() === "ISSUE" ? "ISSUE" : "SUGGESTION";

  return (
    <div className="max-w-2xl mx-auto">
      <SubmissionForm
        defaultMode={mode}
        onSubmitted={(s) =>
          router.push(s.display_mode === "ISSUE" ? `/issues/${s.id}` : `/suggestions/${s.id}`)
        }
      />
    </div>
  );
}
