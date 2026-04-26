# Wake — Architecture Document
> Hackathon edition · Next.js + FastAPI + Supabase + Gemma 4

---

## 0. Guiding Principles

| Principle | Implementation |
|---|---|
| **Modularity** | Three bounded domains (`submissions`, `legislation`, `export`), each with a clean service interface. Cross-domain calls go through interfaces, never direct imports. |
| **Minimalism** | One DB (Supabase Postgres + pgvector). One AI provider (Google AI Studio / Gemma 4). One job queue table. No message brokers, no separate worker processes. |
| **Extensibility** | Adapters for export, verification, and AI are interface-backed. Swap PDF→email, stub→Stripe Identity, Gemma→Claude without touching business logic. |
| **Demo safety** | All heavy AI workloads are manually triggered via admin endpoint. No background threads. No cron jobs. |
| **Privacy-first** | Anonymous voting via Supabase anon sessions. Score fuzzing on all public-facing counts. Verified identity required only to create submissions. |

---

## 1. High-Level System Diagram

```
Browser (Next.js App Router)
│
├── /app/(citizen)/          → Issue map, suggestion forum, legislation search
├── /app/(legislator)/       → Aggregated dashboard, demographic breakdowns
└── /app/(admin)/            → Job queue trigger, moderation panel
        │
        │  REST / tRPC
        ▼
FastAPI Backend
│
├── routers/
│   ├── submissions.py       → CRUD + voting for issues & suggestions
│   ├── legislation.py       → Doc ingestion + vector search
│   ├── export.py            → PDF compilation + ExportAdapter stub
│   └── jobs.py              → Manual AI job trigger endpoint
│
├── services/
│   ├── gemma.py             → GemmaClient (severity, translation, analysis)
│   ├── vector_store.py      → pgvector wrapper (embed, query)
│   ├── score.py             → Vote recording + score fuzzing
│   ├── census.py            → ACS API enrichment (tract → demographics)
│   └── export/
│       ├── adapter.py       → ExportAdapter interface
│       └── pdf_adapter.py   → WeasyPrint PDF implementation
│
└── models/                  → SQLModel / Pydantic data models
        │
        ▼
Supabase (Postgres + pgvector + Auth + Storage)
│
├── submissions              → Issues and suggestions (unified)
├── votes                    → Per-user vote records
├── voting_periods           → Period config + close timestamp
├── legislation_chunks       → Vector-embedded doc chunks
├── job_queue                → Pending AI jobs
└── moderation_flags         → Report threshold tracking
        │
        ▼ (on manual trigger)
Google AI Studio — Gemma 4
        │
        ▼ (on legislator dashboard)
US Census ACS API            → Demographic enrichment by census tract
```

---

## 2. File Structure

```
wake/
│
├── frontend/                          # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Landing / role router
│   │   ├── (citizen)/
│   │   │   ├── issues/
│   │   │   │   ├── page.tsx           # Map view, clustered by location
│   │   │   │   └── [id]/page.tsx      # Single issue detail
│   │   │   ├── suggestions/
│   │   │   │   ├── page.tsx           # Forum list, sorted by score
│   │   │   │   ├── [id]/page.tsx      # Thread detail + voting
│   │   │   │   └── new/page.tsx       # Submission flow
│   │   │   └── legislation/
│   │   │       ├── page.tsx           # Search + query interface
│   │   │       └── [doc_id]/page.tsx  # Doc detail, chunked highlights
│   │   ├── (legislator)/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Overview: budget chart, top issues
│   │   │       ├── map/page.tsx       # Geographic heatmap
│   │   │       └── demographics/page.tsx
│   │   └── (admin)/
│   │       ├── jobs/page.tsx          # Manual job trigger UI
│   │       └── moderation/page.tsx   # Flagged content review
│   │
│   ├── components/
│   │   ├── submissions/
│   │   │   ├── SubmissionCard.tsx
│   │   │   ├── SubmissionForm.tsx     # Shared form for issues + suggestions
│   │   │   ├── VoteControl.tsx        # Up/down + anonymous session handling
│   │   │   └── SeverityBadge.tsx      # 1–4 rank display
│   │   ├── map/
│   │   │   ├── IssueMap.tsx           # Mapbox GL, clustered markers
│   │   │   └── HeatmapLayer.tsx
│   │   ├── legislation/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── ResultChunk.tsx        # Highlighted passage + source citation
│   │   │   └── BudgetPieChart.tsx     # Citizen dashboard widget
│   │   ├── legislator/
│   │   │   ├── TopicBreakdown.tsx
│   │   │   ├── DemographicPanel.tsx
│   │   │   └── PeriodSummaryCard.tsx
│   │   └── ui/                        # Shared primitives (shadcn/ui)
│   │
│   ├── lib/
│   │   ├── api.ts                     # Typed fetch wrappers for all endpoints
│   │   ├── supabase.ts                # Supabase client (browser + server)
│   │   ├── i18n.ts                    # next-intl config
│   │   └── share.ts                   # OG image generation + share helpers
│   │
│   └── middleware.ts                  # Role-based route guard
│
├── backend/                           # FastAPI
│   ├── main.py
│   ├── config.py                      # Settings from env
│   ├── database.py                    # SQLModel engine + session
│   │
│   ├── routers/
│   │   ├── submissions.py
│   │   ├── legislation.py
│   │   ├── export.py
│   │   ├── jobs.py
│   │   └── auth.py                    # Verification stubs
│   │
│   ├── services/
│   │   ├── gemma.py
│   │   ├── vector_store.py
│   │   ├── score.py
│   │   ├── census.py
│   │   └── export/
│   │       ├── adapter.py
│   │       └── pdf_adapter.py
│   │
│   ├── models/
│   │   ├── submission.py
│   │   ├── vote.py
│   │   ├── voting_period.py
│   │   ├── legislation.py
│   │   ├── job.py
│   │   └── moderation.py
│   │
│   └── tests/
│       ├── test_submissions.py
│       ├── test_scoring.py
│       └── test_gemma.py              # Mocked GemmaClient
│
└── infra/
    ├── supabase/
    │   ├── migrations/
    │   │   └── 001_initial.sql
    │   └── seed.sql
    └── .env.example
```

---

## 3. Data Models

### 3.1 `Submission` (unified issues + suggestions)

```python
class DisplayMode(str, Enum):
    ISSUE = "ISSUE"           # Aggregated by location on map
    SUGGESTION = "SUGGESTION" # Forum-style thread

class SeverityRank(int, Enum):
    LOW = 1
    MODERATE = 2
    HIGH = 3
    CRITICAL = 4

class SubmissionStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"   # Awaiting AI scoring
    ACTIVE = "ACTIVE"
    HIDDEN = "HIDDEN"                   # Above report threshold, pending mod
    CLOSED = "CLOSED"                   # Voting period ended

class Submission(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    display_mode: DisplayMode
    title: str                          # max 120 chars
    body: str                           # max 2000 chars
    image_url: Optional[str]            # Supabase Storage URL
    author_id: Optional[UUID]           # NULL = anonymous (suggestions only)
    is_anonymous: bool = False

    # Location (required for ISSUE, optional for SUGGESTION)
    latitude: Optional[float]
    longitude: Optional[float]
    geohash: Optional[str]              # Precomputed for clustering
    neighborhood: Optional[str]         # Reverse geocoded label
    granularity: GranularityLevel       # NEIGHBORHOOD | CITY | COUNTY | STATE

    # AI scoring (populated by job)
    severity: Optional[SeverityRank]
    gemma_rationale: Optional[str]      # Short explanation of ranking
    scoring_job_id: Optional[UUID]

    # Voting
    true_score: int = 0                 # Actual net votes (private)
    display_score: int = 0              # Fuzzed value shown to users
    vote_count: int = 0                 # Raw number of voters

    # Moderation
    status: SubmissionStatus = SubmissionStatus.PENDING_REVIEW
    report_count: int = 0
    report_threshold: int = 5           # Configurable per deployment
    moderator_note: Optional[str]

    # Metadata
    scope_tag: Optional[str]            # "university" | "hoa" | "city" | etc.
    tags: list[str] = Field(default=[], sa_column=Column(ARRAY(String)))
    lang: str = "en"                    # Original submission language

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    voting_period_id: Optional[UUID] = Field(foreign_key="votingperiod.id")
```

### 3.2 `Vote`

```python
class VoteDirection(int, Enum):
    UP = 1
    DOWN = -1

class Vote(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submission.id")
    session_id: str           # Supabase anon session ID (hashed)
    user_id: Optional[UUID]   # Set if authenticated
    direction: VoteDirection
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Constraints enforced in DB: unique(submission_id, session_id)
```

### 3.3 `VotingPeriod`

```python
class VotingPeriod(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    label: str                # e.g. "Q2 2025 – Downtown"
    scope: str                # Organization or geography scope
    starts_at: datetime
    ends_at: datetime
    is_closed: bool = False
    export_url: Optional[str] # URL to compiled PDF once generated
    top_n: int = 10           # How many items to include in PDF
```

### 3.4 `LegislationChunk`

```python
class LegislationChunk(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    doc_id: UUID              # Groups chunks from same source doc
    doc_title: str
    doc_source: str           # URL or file name
    source_verified: bool     # Must be True for ingestion (admin toggle)
    chunk_index: int
    content: str              # Raw text chunk (~512 tokens)
    content_translated: Optional[str]   # Batch-translated content
    lang_translated: Optional[str]
    embedding: list[float]    # pgvector, 768-dim (Gemma text-embedding)
    granularity: GranularityLevel
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ingestion_job_id: UUID
```

### 3.5 `JobQueue`

```python
class JobType(str, Enum):
    SCORE_SUBMISSION = "SCORE_SUBMISSION"
    INGEST_DOCUMENT  = "INGEST_DOCUMENT"
    TRANSLATE_CHUNKS = "TRANSLATE_CHUNKS"
    CLOSE_PERIOD     = "CLOSE_PERIOD"       # Finalize scores, trigger export

class JobStatus(str, Enum):
    PENDING    = "PENDING"
    RUNNING    = "RUNNING"
    DONE       = "DONE"
    FAILED     = "FAILED"

class JobQueue(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    job_type: JobType
    status: JobStatus = JobStatus.PENDING
    payload: dict = Field(sa_column=Column(JSON))   # Job-specific params
    result: Optional[dict] = Field(sa_column=Column(JSON))
    error: Optional[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
```

### 3.6 `ModerationFlag`

```python
class ModerationFlag(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submission.id")
    reporter_session_id: str   # Hashed anon session
    reason: Optional[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 4. Service Interfaces

### 4.1 `GemmaClient` (`services/gemma.py`)

All methods are async. All calls go through this single client — swap the implementation without touching callers.

```python
class GemmaClient:
    """
    Wraps Google AI Studio REST API for Gemma 4.
    All methods raise GemmaError on failure.
    """

    async def score_submission(
        self,
        title: str,
        body: str,
        image_url: Optional[str] = None,
        context_chunks: list[str] = []     # Relevant legislation excerpts
    ) -> ScoringResult:
        """
        Returns SeverityRank (1–4) + short rationale string.
        Prompt instructs Gemma to respond in strict JSON.
        context_chunks are top-k semantic matches from legislation DB.
        """

    async def ingest_document(
        self,
        text: str,
        doc_id: UUID,
        doc_title: str,
        chunk_size: int = 512,
        overlap: int = 64
    ) -> list[LegislationChunkCreate]:
        """
        Chunks text, generates embeddings via Gemma text-embedding endpoint.
        Returns chunk objects ready for bulk insert into pgvector.
        Does NOT commit to DB — caller owns the transaction.
        """

    async def translate_chunks(
        self,
        chunks: list[str],
        target_lang: str
    ) -> list[str]:
        """
        Batch translates chunk texts. Called only on manual trigger.
        Returns translated strings in same order as input.
        """

    async def query_legislation(
        self,
        query: str,
        top_k: int = 5,
        lang: str = "en"
    ) -> list[RetrievedChunk]:
        """
        Embeds query, runs pgvector cosine similarity search,
        returns top_k chunks with scores and source metadata.
        """


@dataclass
class ScoringResult:
    severity: SeverityRank
    rationale: str
    confidence: float           # 0.0–1.0, informational only

@dataclass
class RetrievedChunk:
    chunk_id: UUID
    doc_title: str
    content: str
    similarity: float           # 0.0–1.0
    source_url: str
```

### 4.2 `ScoreService` (`services/score.py`)

```python
class ScoreService:

    def record_vote(
        self,
        submission_id: UUID,
        session_id: str,
        direction: VoteDirection,
        user_id: Optional[UUID] = None
    ) -> VoteResult:
        """
        Upserts vote. Recalculates true_score.
        Calls _refresh_display_score() to reapply fuzz.
        Returns updated display_score and user's current vote.
        Raises DuplicateVoteError if same session flips too fast.
        """

    def _refresh_display_score(self, submission_id: UUID) -> int:
        """
        display_score = true_score + round(gauss(0, sigma=3))
        Sigma is config-driven. Seed is (submission_id XOR period_id)
        so score is stable within a render but unpredictable across sessions.
        Persists display_score to DB.
        """

    def finalize_period(
        self,
        period_id: UUID
    ) -> list[RankedSubmission]:
        """
        Called at period close (manual trigger via CLOSE_PERIOD job).
        Switches all submissions in period to CLOSED status.
        Re-ranks using true_score (not display_score).
        Returns top_n submissions for export.
        """
```

### 4.3 `ExportAdapter` (`services/export/adapter.py`)

```python
from abc import ABC, abstractmethod

class ExportAdapter(ABC):
    """
    Interface for compiling period results into a deliverable.
    Extend this to add email, webhook, or Change.org integration.
    """

    @abstractmethod
    async def export(
        self,
        period: VotingPeriod,
        submissions: list[RankedSubmission],
        metadata: PeriodMetadata
    ) -> ExportResult:
        """
        Returns ExportResult(url, format, delivered_at).
        """

class PDFExportAdapter(ExportAdapter):
    """
    Concrete implementation using WeasyPrint.
    Renders a Jinja2 HTML template → PDF → uploads to Supabase Storage.
    """
    async def export(self, period, submissions, metadata) -> ExportResult: ...

# Stubs for future adapters:
class EmailExportAdapter(ExportAdapter): ...
class WebhookExportAdapter(ExportAdapter): ...
class ChangeOrgExportAdapter(ExportAdapter): ...
```

### 4.4 `CensusService` (`services/census.py`)

```python
class CensusService:
    """
    Queries US Census ACS 5-Year API.
    No API key required. Caches tract lookups in Redis or in-memory dict.
    """

    async def get_tract_demographics(
        self,
        lat: float,
        lng: float
    ) -> TractDemographics:
        """
        1. Hit Census Geocoder API → get FIPS state + county + tract
        2. Query ACS 5-year estimates for that tract:
           - Median household income (B19013_001E)
           - % below poverty line (B17001_002E / B17001_001E)
           - Language spoken at home breakdown (B16001_*)
           - Age distribution (B01001_*)
        Returns structured TractDemographics dataclass.
        """

    async def enrich_submissions(
        self,
        submissions: list[Submission]
    ) -> list[EnrichedSubmission]:
        """
        Batch enriches a list of submissions with tract demographics.
        Deduplicates tract lookups. Used by legislator dashboard endpoint.
        """

@dataclass
class TractDemographics:
    tract_fips: str
    median_income: Optional[int]
    poverty_rate: Optional[float]       # 0.0–1.0
    languages: dict[str, float]         # {"Spanish": 0.23, "Vietnamese": 0.08}
    age_distribution: dict[str, float]  # {"0-17": 0.21, "18-34": 0.28, ...}
    estimated_socioeconomic_tier: int   # 1–5, derived from income quintile
```

### 4.5 `VectorStore` (`services/vector_store.py`)

```python
class VectorStore:

    async def upsert_chunks(
        self,
        chunks: list[LegislationChunkCreate]
    ) -> int:
        """Bulk inserts/updates. Returns count of inserted rows."""

    async def similarity_search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filter: Optional[ChunkFilter] = None   # Filter by granularity, doc_id, lang
    ) -> list[RetrievedChunk]:
        """Runs pgvector <=> cosine distance query."""

    async def delete_by_doc_id(self, doc_id: UUID) -> int:
        """Removes all chunks from a document. Used for re-ingestion."""

@dataclass
class ChunkFilter:
    granularity: Optional[GranularityLevel]
    doc_ids: Optional[list[UUID]]
    lang: Optional[str]
```

---

## 5. API Endpoints

All endpoints prefixed with `/api/v1`.

### 5.1 Submissions

```
POST   /submissions                  Create new submission (auth required)
GET    /submissions                  List (filter: mode, status, period, bbox, granularity)
GET    /submissions/{id}             Single submission + vote status for session
PATCH  /submissions/{id}             Update (author or moderator only)
DELETE /submissions/{id}             Soft delete (sets status=HIDDEN)

POST   /submissions/{id}/vote        Cast or retract vote (anon session OK)
POST   /submissions/{id}/report      Flag for moderation (anon session OK)

GET    /submissions/map              GeoJSON FeatureCollection for ISSUE mode
                                     (Clustered by geohash at requested precision)
```

### 5.2 Legislation

```
POST   /legislation/ingest           Enqueue INGEST_DOCUMENT job (admin only)
                                     Body: { url, title, granularity, source_verified }

GET    /legislation/search           Semantic search
                                     Params: q, lang, top_k, granularity, doc_id[]

GET    /legislation/docs             List all ingested documents + status
DELETE /legislation/docs/{doc_id}    Remove doc + all its chunks

POST   /legislation/translate        Enqueue TRANSLATE_CHUNKS job (admin only)
                                     Body: { doc_id, target_lang }
```

### 5.3 Voting Periods

```
POST   /periods                      Create period (admin)
GET    /periods                      List periods
GET    /periods/{id}                 Period detail + top submissions
POST   /periods/{id}/close           Enqueue CLOSE_PERIOD job → triggers export
GET    /periods/{id}/export          Download or redirect to compiled PDF
```

### 5.4 Jobs (Admin)

```
GET    /jobs                         List jobs (filter: status, type)
POST   /jobs/run                     Manually process next N PENDING jobs
                                     Body: { limit: int, job_type?: JobType }
GET    /jobs/{id}                    Job detail + result/error
```

### 5.5 Legislator Dashboard

```
GET    /dashboard/summary            Top issues by topic, period, granularity
GET    /dashboard/map                Submissions as GeoJSON + severity heat
GET    /dashboard/demographics       Submissions enriched with ACS tract data
                                     Params: period_id, granularity, topic
```

---

## 6. Submission User Flow (Detailed)

```
User lands on /suggestions/new
        │
        ├─ If not authenticated:
        │   └─ Supabase anon session created → can vote/react but NOT submit
        │
        └─ Authenticated (verified user):
            │
            1. Fill SubmissionForm (title, body, optional image, location)
            │
            2. POST /submissions → backend:
            │   a. Validate + sanitize
            │   b. Reverse geocode lat/lng → neighborhood label + geohash
            │   c. Semantic pre-check: embed title+body, query pgvector
            │      → return top 3 matching legislation chunks
            │      (shown inline: "This may relate to Ordinance 2024-11B")
            │
            3. OPTIONAL: User clicks "Get AI Analysis"
            │   → Enqueues SCORE_SUBMISSION job with draft payload
            │   → Job runs Gemma 4: severity + rationale returned in <5s
            │   → Shown to user before they confirm submission
            │
            4. User reviews, optionally edits, submits
            │
            5. Submission created with status=PENDING_REVIEW
            │   SCORE_SUBMISSION job enqueued (if not already run in step 3)
            │
            6. Job processed (manual trigger):
            │   → Gemma scores → severity + rationale written to submission
            │   → status → ACTIVE, indexed in forum / map
            │
            7. Submission visible publicly
                → Voting open until period closes
                → display_score shown (fuzzed)
                → On CLOSE_PERIOD: true_score used for ranking → PDF export
```

---

## 7. Legislation Query Flow

```
User types query in SearchBar (any language)
        │
        1. Frontend detects language (browser navigator.language or user pref)
        │
        2. GET /legislation/search?q=<query>&lang=<lang>&top_k=5
        │
        3. Backend GemmaClient.query_legislation():
        │   a. Embed query string → 768-dim vector
        │   b. pgvector cosine similarity search on legislation_chunks
        │   c. If lang != "en" and translated chunks exist → prefer those
        │   d. Return top_k chunks with similarity scores
        │
        4. ResultChunk components rendered:
        │   - Source doc title + verified badge
        │   - Highlighted passage
        │   - Similarity score (visual only, not raw float)
        │   - "Read full document" link
        │
        5. Citizen dashboard also shows:
            - BudgetPieChart (pre-ingested budget doc, key figures extracted)
            - Hover segment → query legislation for that budget line
```

---

## 8. Score Fuzzing

```python
# services/score.py

import random, math
from uuid import UUID

FUZZ_SIGMA = 3.0   # Configurable in settings

def fuzz_score(true_score: int, submission_id: UUID, period_id: UUID) -> int:
    """
    Adds Gaussian noise to true_score for public display.
    Seed is deterministic per (submission × period) to prevent
    score fishing via repeated refreshes within a session.
    Resets when period_id changes (new period = new seed).
    """
    seed = int(submission_id) ^ int(period_id)
    rng = random.Random(seed)
    noise = rng.gauss(0, FUZZ_SIGMA)
    return true_score + round(noise)

# true_score is NEVER exposed via API to unauthenticated users
# Finalized rankings always use true_score (fuzz not applied to PDF)
```

---

## 9. Moderation System

```python
# Threshold-based auto-hide (configurable per deployment):

REPORT_THRESHOLD = 5   # default

def handle_report(submission_id: UUID, reporter_session: str) -> ModerationResult:
    """
    1. Insert ModerationFlag (unique on submission_id + reporter_session)
    2. Increment submission.report_count
    3. If report_count >= report_threshold:
       a. Set status = HIDDEN
       b. Submission disappears from public feeds
       c. Queued for moderator review at /admin/moderation
    4. Moderator can: RESTORE (reset count) | CONFIRM_HIDE | DELETE
    """
```

**Score fuzzing + moderation interact**: hidden submissions retain their true\_score but are excluded from period rankings unless restored.

---

## 10. Auth & Verification

```
Role            How obtained                   Capabilities
─────────────────────────────────────────────────────────────────
Anonymous       Supabase anon session          Vote, react, report, search legislation
Citizen         Email/OAuth (Supabase Auth)    + Submit issues/suggestions
Verified        Gov ID stub → sets user flag   + Create new voting periods (future)
Legislator      Admin assigns role             + Access /legislator dashboard
Admin           Supabase service role          + Trigger jobs, moderate, ingest docs
```

**Verification stub** (`routers/auth.py`):
```python
class VerificationAdapter(ABC):
    @abstractmethod
    async def verify(self, user_id: UUID, id_document: bytes) -> VerificationResult: ...

class StubVerificationAdapter(VerificationAdapter):
    """Always returns verified=True. Replace with Stripe Identity for prod."""
    async def verify(self, user_id, id_document) -> VerificationResult:
        return VerificationResult(verified=True, method="stub")
```

---

## 11. Sharing & Social Integration

```typescript
// lib/share.ts

interface SharePayload {
    submission_id: string
    title: string
    severity: number
    display_score: number
    period_label: string
    city: string
}

// OG image generated server-side via @vercel/og (Next.js route handler)
// /api/og?submission_id=<id> → 1200×630 PNG with:
//   - Issue title + severity badge
//   - Vote count + city name
//   - Wake branding + QR code to submission

const shareTargets = {
    twitter: (p: SharePayload) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `"${p.title}" needs attention in ${p.city} — ranked severity ${p.severity}/4. Vote now:`
        )}&url=<submission_url>`,

    changeOrg: (p: SharePayload) => `https://www.change.org/start-a-petition`,  // stub

    discord: (p: SharePayload) => ({
        embeds: [{
            title: p.title,
            description: `Severity: ${p.severity}/4 · Score: ${p.display_score}`,
            color: severityColor(p.severity),
            url: `<submission_url>`
        }]
    }),

    copyLink: (p: SharePayload) => navigator.clipboard.writeText(`<submission_url>`)
}
```

---

## 12. Multilingual Strategy

| Layer | Approach | Trigger |
|---|---|---|
| UI strings | `next-intl`, static JSON files per locale | Build time |
| User submissions | Stored in original language (`lang` field) | On create |
| AI severity scoring | Gemma 4 is multilingual; prompt works as-is | Job trigger |
| Legislation chunks | Batch translated via `TRANSLATE_CHUNKS` job | Manual admin trigger |
| Legislation search | Query embedded in original language; pgvector returns chunks in best matching lang | On search |
| Crowdsourced translation | **v2** — Crowdin integration stub in `ExportAdapter` | — |

---

## 13. Database Migrations (`infra/supabase/migrations/001_initial.sql`)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Submissions
CREATE TABLE submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_mode TEXT NOT NULL CHECK (display_mode IN ('ISSUE','SUGGESTION')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    author_id UUID REFERENCES auth.users(id),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geohash TEXT,
    neighborhood TEXT,
    granularity TEXT NOT NULL DEFAULT 'CITY',
    severity SMALLINT CHECK (severity BETWEEN 1 AND 4),
    gemma_rationale TEXT,
    scoring_job_id UUID,
    true_score INTEGER NOT NULL DEFAULT 0,
    display_score INTEGER NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    report_count INTEGER NOT NULL DEFAULT 0,
    report_threshold INTEGER NOT NULL DEFAULT 5,
    moderator_note TEXT,
    scope_tag TEXT,
    tags TEXT[] DEFAULT '{}',
    lang TEXT NOT NULL DEFAULT 'en',
    voting_period_id UUID REFERENCES votingperiod(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes (unique per session per submission)
CREATE TABLE vote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    direction SMALLINT NOT NULL CHECK (direction IN (1, -1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, session_id)
);

-- Voting Periods
CREATE TABLE votingperiod (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    scope TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    export_url TEXT,
    top_n INTEGER NOT NULL DEFAULT 10
);

-- Legislation Chunks (vector store)
CREATE TABLE legislationchunk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL,
    doc_title TEXT NOT NULL,
    doc_source TEXT NOT NULL,
    source_verified BOOLEAN NOT NULL DEFAULT FALSE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_translated TEXT,
    lang_translated TEXT,
    embedding vector(768),          -- Gemma text-embedding dim
    granularity TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ingestion_job_id UUID
);

CREATE INDEX ON legislationchunk USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Job Queue
CREATE TABLE jobqueue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Moderation Flags
CREATE TABLE moderationflag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
    reporter_session_id TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, reporter_session_id)
);

-- RLS: true_score never exposed to anon role
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON submission FOR SELECT USING (
    status = 'ACTIVE' AND (
        current_setting('role') != 'anon' OR true_score IS NULL
    )
);
-- Note: true_score hidden via view for anon access:
CREATE VIEW public_submission AS
    SELECT id, display_mode, title, body, image_url, is_anonymous,
           latitude, longitude, geohash, neighborhood, granularity,
           severity, gemma_rationale, display_score, vote_count,
           status, scope_tag, tags, lang, voting_period_id, created_at
    FROM submission WHERE status = 'ACTIVE';
```

---

## 14. Environment Configuration (`.env.example`)

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI Studio (Gemma 4)
GOOGLE_AI_API_KEY=
GEMMA_MODEL=gemma-4-it                 # or gemma-4-vision-it for image support
GEMMA_EMBEDDING_MODEL=text-embedding-004

# Census API (no key needed, but useful to namespace)
CENSUS_API_BASE=https://api.census.gov/data

# Score fuzzing
FUZZ_SIGMA=3.0

# Moderation
DEFAULT_REPORT_THRESHOLD=5

# Feature flags
ENABLE_IMAGE_UPLOAD=true
ENABLE_AI_ANALYSIS_ON_DRAFT=true       # Step 3 in user flow
ENABLE_LEGISLATOR_DASHBOARD=true
```

---

## 15. Key Extensibility Points

| Interface | Current impl | Swap in for prod |
|---|---|---|
| `VerificationAdapter` | `StubVerificationAdapter` | Stripe Identity, ID.me |
| `ExportAdapter` | `PDFExportAdapter` | Email, webhook, Change.org API |
| `GemmaClient` | Google AI Studio REST | Vertex AI, self-hosted |
| Crowdsourced translation | Not implemented | Crowdin SDK |
| Social sharing | Twitter + Discord stubs | Rich webhooks, OG images |
| Auth | Supabase Auth | Any OIDC provider |

---

*Document version 1.0 — Hackathon scope*
