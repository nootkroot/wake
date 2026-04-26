import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";
import { getSubmission } from "@/lib/api";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("submission_id");
  if (!id) {
    return new Response("submission_id required", { status: 400 });
  }

  let submission;
  try {
    submission = await getSubmission(id);
  } catch {
    return new Response("not found", { status: 404 });
  }

  const severityColors: Record<number, string> = {
    1: "#94a3b8",
    2: "#fbbf24",
    3: "#fb923c",
    4: "#ef4444",
  };
  const sevColor = severityColors[submission.severity ?? 1] ?? "#94a3b8";
  const city = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "Your city";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          color: "white",
          padding: 60,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8 }}>Wake · {city}</div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 30, lineHeight: 1.1 }}>
          {submission.title}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 40, alignItems: "center" }}>
          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              background: sevColor,
              color: "#0f172a",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Severity {submission.severity ?? "—"}/4
          </div>
          <div style={{ fontSize: 24, opacity: 0.85 }}>
            {submission.display_score} votes
          </div>
        </div>
        <div style={{ marginTop: "auto", fontSize: 24, opacity: 0.7 }}>
          wake · vote and share
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
