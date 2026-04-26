import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/api";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";

export const dynamic = "force-dynamic";

export default async function SuggestionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let submission;
  try {
    submission = await getSubmission(params.id);
  } catch {
    notFound();
  }
  return (
    <article className="space-y-4">
      <SubmissionCard submission={submission} />
      {submission.gemma_rationale && (
        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
          <div className="font-medium mb-1">Why this severity?</div>
          {submission.gemma_rationale}
        </div>
      )}
    </article>
  );
}
