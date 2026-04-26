# Wake

Hackathon-edition civic engagement platform: citizens submit issues and
suggestions, an LLM scores them via OpenRouter (Gemma 4), citizens vote
anonymously, and at period close the system compiles a ranked PDF for
legislators.

```
wake/
├── frontend/             Next.js 14 App Router  (Dockerfile)
├── backend/              FastAPI + SQLModel     (Dockerfile)
├── infra/supabase/       SQL migrations + seed
├── infra/docker/         Docker-only init scripts (auth.users stub)
├── docker-compose.yml    pgvector + backend + frontend
└── pyproject.toml        Python project root (pytest config)
```

The rest of this document covers two paths. **Docker** is the fastest:
nothing to install except Docker itself. **Manual** is for when you want
hot-reload across both apps. Skip to [Operating model](#operating-model)
once you have things running.

---

## 0. Quick start with Docker (recommended)

```bash
cp infra/.env.example .env        # optional: edit OPENROUTER_API_KEY etc.
docker compose up --build
```

That's it. After the build finishes:

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js standalone |
| Backend | http://localhost:8000 | API + `/docs` (Swagger UI) |
| Health | http://localhost:8000/health | `{"status":"ok"}` |
| Postgres | localhost:5432 | `postgres` / `postgres` / db `wake` |

The Postgres image runs the schema + seed migrations on first boot:

1. `infra/docker/00_auth_stub.sql` — stubs `auth.users` so the migration's
   FKs resolve outside Supabase.
2. `infra/supabase/migrations/001_initial.sql` — the real schema + RLS.
3. `infra/supabase/seed.sql` — three demo submissions and one period.

Useful commands:

```bash
docker compose logs -f backend     # tail backend logs
docker compose exec db psql -U postgres wake     # psql shell
docker compose down                # stop, keep volumes
docker compose down -v             # stop + wipe DB (re-runs migrations next time)
```

> **Note on migrations.** The init scripts only run when the `dbdata` volume
> is empty. Apply schema changes with `docker compose down -v` (destroys
> data) or by running new SQL against the running container.

> **Note on Mapbox + OpenRouter.** Both are optional. Without
> `NEXT_PUBLIC_MAPBOX_TOKEN`, the map components render a list fallback.
> Without `OPENROUTER_API_KEY`, the backend uses a deterministic offline
> scorer. The full submit → vote → finalize flow works either way.

---

## 1. Prerequisites (manual setup only)

| Tool | Version | Why |
|---|---|---|
| Python | 3.11+ | Backend (uses `int \| None` syntax, `from collections.abc`) |
| Node.js | 18.17+ | Next.js 14 |
| Postgres | 15+ with `pgvector` | Vector search + RLS. Supabase ships with this. |
| `psql` CLI | any recent | Apply migrations |
| WeasyPrint native deps | optional | Real PDF export. Falls back to HTML if missing. |

> **Note on WeasyPrint.** PDF export needs Cairo, Pango, and GDK-PixBuf.
> On Debian/Ubuntu: `sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0`.
> On macOS: `brew install pango`. The backend gracefully falls back to an HTML
> file if WeasyPrint isn't available.

You'll also want **one** of:

- A free [Supabase](https://supabase.com) project (gives you Postgres +
  pgvector + Auth + Storage out of the box), **or**
- A local Postgres + pgvector — easiest via Docker:
  ```bash
  docker run -d --name wake-pg -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 pgvector/pgvector:pg16
  ```

Optional but recommended:

- **OpenRouter API key** — get one at https://openrouter.ai. Without it the
  backend uses a deterministic offline scorer (good enough to demo end-to-end).
- **Mapbox public token** — get one at https://account.mapbox.com. Without it
  the map components render a fallback list.

---

## 2. Configure environment variables

From the `wake/` root:

```bash
cp infra/.env.example backend/.env
cp infra/.env.example frontend/.env.local
```

Edit **`backend/.env`** and set, at minimum:

```bash
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/postgres
ADMIN_TOKEN=pick-a-strong-token
OPENROUTER_API_KEY=sk-or-...        # optional; offline mode works without it
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:exacto

# If using Supabase:
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Edit **`frontend/.env.local`** and set:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=...        # only if you wired Supabase Auth
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...  # optional
NEXT_PUBLIC_DEFAULT_CITY="Seattle"
NEXT_PUBLIC_DEFAULT_LAT=47.6062
NEXT_PUBLIC_DEFAULT_LNG=-122.3321
```

> Both apps load env files automatically (`pydantic-settings` for the backend,
> Next.js for the frontend). The backend reads `backend/.env` because
> uvicorn's working directory is `wake/` and `pydantic-settings` walks
> upward — to be safe, just put the file at `backend/.env`.

---

## 3. Apply database migrations

From `wake/`:

```bash
psql "$DATABASE_URL" -f infra/supabase/migrations/001_initial.sql
psql "$DATABASE_URL" -f infra/supabase/seed.sql       # optional demo rows
```

If the migration fails on `CREATE EXTENSION vector`, your Postgres image
doesn't have pgvector. Use the `pgvector/pgvector:pg16` Docker image above,
or install the extension manually.

The migration also creates RLS policies and a `public_submission` view that
hides `true_score` from the anon role.

---

## 4. Run the backend

From `wake/`:

```bash
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Verify it's up:

```bash
curl http://localhost:8000/health
# {"status":"ok","app":"Wake"}
```

Interactive API docs: http://localhost:8000/docs

### Run the test suite

From `wake/`:

```bash
pytest
```

Tests use an in-memory SQLite database — no external services required. The
`conftest.py` shims `pgvector.Vector` and `sqlalchemy.ARRAY` so the schema
compiles without Postgres.

---

## 5. Run the frontend

In a second terminal, from `wake/frontend/`:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm run start
```

---

## 6. Walking the demo

The system is intentionally synchronous: **AI work only runs when an admin
triggers it.** Here's the full happy path:

### a. Submit a suggestion

1. Open http://localhost:3000/suggestions/new.
2. The form requires a "User UUID" — paste any valid UUID (e.g.
   `11111111-1111-1111-1111-111111111111`). This is the demo's stand-in for
   Supabase Auth, set as the `X-User-Id` header on the backend call.
3. Fill in title, body, tags. Hit **Submit**. The submission lands in
   `PENDING_REVIEW` status, and a `SCORE_SUBMISSION` job is queued.

### b. Review moderation dashboard

Set the `wake_role=admin` cookie so middleware lets you into `/admin/*`:

```js
// In your browser devtools, on http://localhost:3000:
document.cookie = "wake_role=admin; path=/; max-age=86400"
```

1. Visit http://localhost:3000/moderation.
2. Review hidden/flagged submissions.
3. Use moderation tooling to audit and triage content quality.

### c. Vote and explore

- http://localhost:3000/suggestions — sorted by fuzzed `display_score`.
- http://localhost:3000/issues — geo-located issues, on a map if you
  configured `NEXT_PUBLIC_MAPBOX_TOKEN`.
- http://localhost:3000/legislation — semantic search across ingested docs.

Voting works without an account; the anon `wake_session` cookie identifies
the voter. Score fuzzing is deterministic per `(submission, period)` so a
single user always sees the same number on a given page.

### d. Close a period and export

Set `wake_role=admin` (above), then either:

- Hit `POST /api/v1/periods/{period_id}/close` (with `X-Admin-Token` header)
  via the docs UI, **or**
- Use curl:
  ```bash
  curl -X POST http://localhost:8000/api/v1/periods/<id>/close \
       -H "X-Admin-Token: $ADMIN_TOKEN"
  ```

This enqueues a `CLOSE_PERIOD` job. The job finalizes ranks (using
`true_score`, *not* `display_score`), flips all in-period submissions to
`CLOSED`, renders a PDF (or HTML fallback) under `exports/`, and stores the
path on the period's `export_url`.

Then `GET /api/v1/periods/{id}/export` 302s to that file.

### e. Legislator dashboard

Set `wake_role=legislator` (or stay on `admin`) and visit
http://localhost:3000/dashboard for top topics, period summary, and a
demographics breakdown.

---

## 7. Operating model

- **AI issue scoring is automatic.** New issues are scored on submit and receive
  severity + rationale immediately when the model is available.
- **Score fuzzing.** Every score shown publicly is `display_score`, a
  Gaussian-perturbed copy of `true_score` with a deterministic seed so it
  doesn't drift across refreshes. Final rankings (PDF export) always use
  `true_score`.
- **OpenRouter.** Default model is `google/gemma-4-26b-a4b-it:exacto`
  (override with `OPENROUTER_MODEL`). When `OPENROUTER_API_KEY` is unset,
  scoring uses a deterministic keyword heuristic. Embeddings always use a
  hash-based offline helper today — swap in a real embedding provider for
  production retrieval quality.
- **Roles.**
  - Anonymous browser session — vote, react, report, search legislation.
  - Citizen (Supabase Auth) — submit suggestions/issues. Demo uses a
    raw UUID in the `X-User-Id` header.
  - Verified citizen (`/auth/verify` stub) — create voting periods (future).
  - Legislator — `/dashboard` access via `wake_role=legislator` cookie.
  - Admin — `/admin/*` access via `wake_role=admin` cookie + `X-Admin-Token`
    header (or the admin token field in the UI).

---

## 8. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `psql: ERROR: type "vector" does not exist` | Postgres image lacks pgvector. Use `pgvector/pgvector:pg16` or install the extension. |
| `ModuleNotFoundError: backend` | You're running uvicorn or pytest from the wrong dir. Both expect `cwd = wake/`. |
| Empty issue map but data exists | `NEXT_PUBLIC_MAPBOX_TOKEN` not set; the component renders a list fallback. |
| Submissions stuck in `PENDING_REVIEW` | Check backend logs and OpenRouter credentials; issue scoring should be automatic. |
| Vote returns `429` | The same session flipped its vote within the cooldown window (2s). Real users will rarely hit this. |
| WeasyPrint complains about Cairo | Install native deps (see Prerequisites) or accept the HTML fallback. |
| `403 Admin token required` on `/jobs/*` | Set `X-Admin-Token` header (or paste in the admin UI input) matching `ADMIN_TOKEN` in `backend/.env`. |
| Docker: backend starts before DB is ready | The compose file uses `depends_on: condition: service_healthy`, but if you skipped `--build` after schema changes the old image may run first. `docker compose build backend` then `up`. |
| Docker: changed a migration but no effect | Init scripts only run on a fresh DB. `docker compose down -v` wipes the `dbdata` volume so migrations re-run. |
| Docker: changed `NEXT_PUBLIC_*` value but UI still shows old value | Public env vars are inlined at build time. Rebuild the frontend image: `docker compose build frontend`. |

---

## 9. Extension points

| Interface | Current impl | Swap in for prod |
|---|---|---|
| `VerificationAdapter` | `StubVerificationAdapter` | Stripe Identity, ID.me |
| `ExportAdapter` | `PDFExportAdapter` | Email, webhook, Change.org API |
| `GemmaClient` | OpenRouter (Gemma 4) | Vertex AI, self-hosted, OpenAI |
| Embeddings | Offline hash helper | OpenAI `text-embedding-3-*`, Cohere |
| Auth | Supabase Auth | Any OIDC provider |

See `ARCHITECTURE.md` for the full design document.
