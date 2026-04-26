import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/api";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({
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
      {submission.latitude !== null && submission.longitude !== null && (
        <div className="text-sm text-muted-foreground">
          Location: {submission.latitude!.toFixed(4)}, {submission.longitude!.toFixed(4)}
          {submission.neighborhood ? ` · ${submission.neighborhood}` : ""}
        </div>
      )}
    </article>
  );
}
