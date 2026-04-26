// Mirrors backend Pydantic schemas. Keep in sync with backend/schemas.py.

export type DisplayMode = "ISSUE" | "SUGGESTION";
export type SubmissionStatus = "PENDING_REVIEW" | "ACTIVE" | "HIDDEN" | "CLOSED";
export type GranularityLevel = "NEIGHBORHOOD" | "CITY" | "COUNTY" | "STATE";
export type SeverityRank = 1 | 2 | 3 | 4;

export interface Submission {
  id: string;
  display_mode: DisplayMode;
  title: string;
  body: string;
  image_url: string | null;
  is_anonymous: boolean;
  latitude: number | null;
  longitude: number | null;
  geohash: string | null;
  neighborhood: string | null;
  granularity: GranularityLevel;
  severity: SeverityRank | null;
  gemma_rationale: string | null;
  display_score: number;
  vote_count: number;
  status: SubmissionStatus;
  scope_tag: string | null;
  tags: string[];
  lang: string;
  voting_period_id: string | null;
  created_at: string;
  updated_at: string;
  user_vote: -1 | 0 | 1 | null;
}

export interface SubmissionCreate {
  display_mode: DisplayMode;
  title: string;
  body: string;
  image_url?: string | null;
  is_anonymous?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  granularity?: GranularityLevel;
  scope_tag?: string | null;
  tags?: string[];
  lang?: string;
  voting_period_id?: string | null;
}

export interface VoteResult {
  submission_id: string;
  user_vote: -1 | 0 | 1;
  display_score: number;
  vote_count: number;
}

export interface ReportResult {
  submission_id: string;
  report_count: number;
  hidden: boolean;
}

export interface VotingPeriod {
  id: string;
  label: string;
  scope: string;
  starts_at: string;
  ends_at: string;
  is_closed: boolean;
  export_url: string | null;
  top_n: number;
}

export interface LegislationSearchResultChunk {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  doc_source: string;
  source_verified: boolean;
  content: string;
  content_translated: string | null;
  lang: string;
  similarity: number;
}

export interface LegislationSearchResponse {
  query: string;
  lang: string;
  results: LegislationSearchResultChunk[];
}

export interface LegislationDocSummary {
  doc_id: string;
  doc_title: string;
  doc_source: string;
  chunk_count: number;
  source_verified: boolean;
}

export interface JobRead {
  id: string;
  job_type: "SCORE_SUBMISSION" | "INGEST_DOCUMENT" | "TRANSLATE_CHUNKS" | "CLOSE_PERIOD";
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobRunResponse {
  processed: number;
  jobs: JobRead[];
}

export interface TopicCount {
  tag: string;
  count: number;
  avg_severity: number;
  total_score: number;
}

export interface DashboardSummary {
  period_id: string | null;
  granularity: GranularityLevel;
  total_submissions: number;
  avg_severity: number;
  top_topics: TopicCount[];
  top_submissions: Submission[];
}

export interface DemographicEnrichedSubmission {
  submission: Submission;
  tract_fips: string | null;
  median_income: number | null;
  poverty_rate: number | null;
  languages: Record<string, number>;
  estimated_socioeconomic_tier: number | null;
}

export type GeoJSONFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

export type GeoJSONCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};
