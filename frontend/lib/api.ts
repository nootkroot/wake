// Typed fetch wrappers for the FastAPI backend.

import type {
  DashboardSummary,
  DemographicEnrichedSubmission,
  GeoJSONCollection,
  JobRead,
  JobRunResponse,
  LegislationAnswerResponse,
  LegislationDocSummary,
  LegislationUploadResult,
  LegislationSearchResponse,
  ReportResult,
  Submission,
  SubmissionCreate,
  VoteResult,
  VotingPeriod,
} from "./types";

const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_BASE_INTERNAL ?? "http://backend:8000/api/v1")
    : (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1");

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  sessionId?: string;
  userId?: string | null;
  adminToken?: string;
}

async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, sessionId, userId, adminToken, headers, ...rest } = opts;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      finalBody = body;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      finalBody = JSON.stringify(body);
    }
  }
  if (sessionId) finalHeaders["X-Session-Id"] = sessionId;
  if (userId) finalHeaders["X-User-Id"] = userId;
  if (adminToken) finalHeaders["X-Admin-Token"] = adminToken;

  const resp = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
    cache: "no-store",
  });
  if (!resp.ok) {
    let detail: unknown = null;
    try {
      detail = await resp.json();
    } catch {
      detail = await resp.text();
    }
    throw new ApiError(
      resp.status,
      detail,
      `API ${resp.status} on ${path}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
    );
  }
  if (resp.status === 204) return undefined as unknown as T;
  return (await resp.json()) as T;
}

// -------- Submissions --------

export async function listSubmissions(
  params: {
    mode?: "ISSUE" | "SUGGESTION";
    status?: "PENDING_REVIEW" | "ACTIVE" | "HIDDEN" | "CLOSED";
    period_id?: string;
    granularity?: string;
    bbox?: string;
    limit?: number;
    offset?: number;
  } = {},
  sessionId?: string,
): Promise<Submission[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  return api<Submission[]>(`/submissions?${qs}`, { sessionId });
}

export async function getSubmission(
  id: string,
  sessionId?: string,
): Promise<Submission> {
  return api<Submission>(`/submissions/${id}`, { sessionId });
}

export async function createSubmission(
  payload: SubmissionCreate,
  userId: string,
  sessionId?: string,
): Promise<Submission> {
  return api<Submission>("/submissions", {
    method: "POST",
    body: payload,
    userId,
    sessionId,
  });
}

export async function castVote(
  submissionId: string,
  direction: -1 | 0 | 1,
  sessionId: string,
  userId: string,
): Promise<VoteResult> {
  return api<VoteResult>(`/submissions/${submissionId}/vote`, {
    method: "POST",
    body: { direction },
    sessionId,
    userId,
  });
}

export async function reportSubmission(
  submissionId: string,
  reason: string | null,
  sessionId: string,
): Promise<ReportResult> {
  return api<ReportResult>(`/submissions/${submissionId}/report`, {
    method: "POST",
    body: { reason },
    sessionId,
  });
}

export async function fetchIssuesGeoJSON(params: {
  bbox?: string;
  granularity?: string;
} = {}): Promise<GeoJSONCollection> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<GeoJSONCollection>(`/submissions/map?${qs}`);
}

// -------- Legislation --------

export async function searchLegislation(
  q: string,
  params: { lang?: string; top_k?: number; granularity?: string } = {},
): Promise<LegislationSearchResponse> {
  const qs = new URLSearchParams({ q });
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<LegislationSearchResponse>(`/legislation/search?${qs}`);
}

export async function askLegislation(
  q: string,
  params: {
    lang?: string;
    top_k?: number;
    granularity?: string;
    retrieval_mode?: "keyword" | "vector";
  } = {},
): Promise<LegislationAnswerResponse> {
  const qs = new URLSearchParams({ q });
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<LegislationAnswerResponse>(`/legislation/ask?${qs}`);
}

export async function listLegislationDocs(): Promise<LegislationDocSummary[]> {
  return api<LegislationDocSummary[]>("/legislation/docs");
}

export async function deleteLegislationDoc(
  docId: string,
  userId: string,
): Promise<{ doc_id: string; deleted_chunks: number }> {
  return api<{ doc_id: string; deleted_chunks: number }>(`/legislation/docs/${docId}`, {
    method: "DELETE",
    userId,
  });
}

export async function ingestLegislation(
  payload: {
    title: string;
    url?: string;
    text?: string;
    granularity?: string;
    source_verified: boolean;
  },
  adminToken: string,
): Promise<JobRead> {
  return api<JobRead>("/legislation/ingest", {
    method: "POST",
    body: payload,
    adminToken,
  });
}

export async function uploadLegislationFile(
  payload: {
    file: File;
    title: string;
    source_verified: boolean;
    granularity?: string;
    lang?: string;
    translate_to?: string;
  },
  userId: string,
): Promise<LegislationUploadResult> {
  const form = new FormData();
  form.append("file", payload.file);
  form.append("title", payload.title);
  form.append("source_verified", String(payload.source_verified));
  if (payload.granularity) form.append("granularity", payload.granularity);
  if (payload.lang) form.append("lang", payload.lang);
  if (payload.translate_to) form.append("translate_to", payload.translate_to);
  return api<LegislationUploadResult>("/legislation/upload", {
    method: "POST",
    body: form,
    userId,
  });
}

// -------- Jobs / admin --------

export async function listJobs(
  params: { status?: string; job_type?: string; limit?: number } = {},
  adminToken: string,
): Promise<JobRead[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<JobRead[]>(`/jobs?${qs}`, { adminToken });
}

export async function runJobs(
  payload: { limit?: number; job_type?: string },
  adminToken: string,
): Promise<JobRunResponse> {
  return api<JobRunResponse>("/jobs/run", {
    method: "POST",
    body: payload,
    adminToken,
  });
}

// -------- Periods --------

export async function listPeriods(): Promise<VotingPeriod[]> {
  return api<VotingPeriod[]>("/periods");
}

export async function getPeriod(id: string): Promise<{
  period: VotingPeriod;
  top_submissions: Submission[];
}> {
  return api(`/periods/${id}`);
}

export async function closePeriod(id: string, adminToken: string): Promise<JobRead> {
  return api<JobRead>(`/periods/${id}/close`, {
    method: "POST",
    adminToken,
  });
}

// -------- Dashboard --------

export async function fetchDashboardSummary(
  params: { period_id?: string; granularity?: string; topic?: string } = {},
): Promise<DashboardSummary> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<DashboardSummary>(`/dashboard/summary?${qs}`);
}

export async function fetchDashboardMap(params: {
  period_id?: string;
  granularity?: string;
} = {}): Promise<GeoJSONCollection> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<GeoJSONCollection>(`/dashboard/map?${qs}`);
}

export async function fetchDashboardDemographics(
  params: { period_id?: string; granularity?: string; topic?: string } = {},
): Promise<DemographicEnrichedSubmission[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  return api<DemographicEnrichedSubmission[]>(`/dashboard/demographics?${qs}`);
}

export async function translateUiStrings(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  const cleaned = texts.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0 || targetLang === "en") return cleaned;
  const response = await api<{ target_lang: string; translations: string[] }>("/i18n/translate-ui", {
    method: "POST",
    body: { texts: cleaned, target_lang: targetLang },
  });
  return response.translations;
}
