"use client";

import { useRouter } from "next/navigation";
import { SubmissionForm } from "@/components/submissions/SubmissionForm";

export default function NewSubmissionPage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto">
      <SubmissionForm
        onSubmitted={(s) =>
          router.push(s.display_mode === "ISSUE" ? `/issues/${s.id}` : `/suggestions/${s.id}`)
        }
      />
    </div>
  );
}
