# NIT KKR — Smart Edu Portal

A full-stack, AI-powered college portal for NIT Kurukshetra with three roles — **Student**,
**Teacher**, and **Admin** — plus a fully public **Guest** result-lookup mode. Built on the MERN
stack with a unified Retrieval-Augmented Generation (RAG) core that powers result lookup,
campus Q&A, and content search across the entire portal from one chat interface.



---

## Highlights

- **Unified RAG across every content type** — one Pinecone index (not just results) covers
  results, notifications, announcements, assignments, PYQs, and study material, each tagged with
  a `type` metadata field. The AI Assistant can answer a single message that spans multiple
  topics ("any assignment due this week, and what's the attendance policy?") by retrieving from
  each matched type and merging the context, instead of forcing every question into one bucket.
- **Hybrid result lookup, no login required** — ask a question in plain English ("What's Ananya's
  CGPA?") and get a semantically-retrieved answer; type an exact roll number and it skips vector
  retrieval entirely for a guaranteed-accurate direct database lookup instead. Deliberately
  unrestricted by identity (anyone can look up anyone's result by name/roll/surname) — the one
  content type where that's the intended product design; every other type is access-scoped (see
  Security below).
- **PDF → structured data pipeline for results** — admin uploads a raw result PDF; it's split
  into per-student chunks (a cheap regex pass first, LLM segmentation as a fallback for unusual
  layouts), then each batch of 5-10 students is sent to an LLM to extract structured fields
  (roll number, name, subjects, SGPA/CGPA, pass/fail, reappear subjects) in parallel with bounded
  concurrency — a failure in one batch never blocks the rest. Every extracted record is
  heuristically flagged (missing roll number, missing name, implausible values) and nothing
  reaches students until an admin reviews the **Pending Verification** queue and commits it. The
  AI's first pass is a draft, not the source of truth.
- **PYQ question-level extraction** — previous-year papers are parsed into individual questions
  on upload, and each one has an "Ask AI" button that hands it straight to the chat.
- **Content moderation** — every content type can be hidden without deleting it, kept in sync
  with the vector index on every toggle (a hidden item can't leak back in through chat search
  either); teachers manage their own uploads, admin can manage anything.
- **Full light/dark theme**, app-wide via CSS custom properties (including auth screens), audited
  so no color reads correctly in one mode and becomes invisible/low-contrast in the other.
- **Analytics dashboard** — system-wide stat cards, pass/fail charts, trending searches (from an
  anonymized query log), and a recent-activity feed across all content types.
- **Guest scope control** — unauthenticated users can only ever query results; any other content
  type request returns a "please log in" response instead of running retrieval, and the
  ambiguous-query fallback search never runs against non-result content for guests either.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (Vite) + React Router v6 + Tailwind CSS |
| Backend | Node.js + Express (ESM) |
| Database | MongoDB (Mongoose) |
| Vector search | Pinecone, integrated inference (`llama-text-embed-v2`) — no local embedding model needed |
| LLM | Groq (`openai/gpt-oss-120b`), with an OpenRouter fallback path |
| File storage | Cloudinary (PDFs as `raw` resources) |
| Auth | JWT, role-based, per-role expiry (student self-signup; teacher/admin provisioned by admin only) |
| Charts / icons | Recharts, Lucide React |

---

## Architecture decisions worth knowing

- **One unified vector index, not results-only.** This started as a results-only Pinecone index
  with keyword-regex search for everything else; migrated mid-project to a single index with a
  `type` metadata field per record, so every content type gets real semantic search and can be
  combined in one query (metadata filter, or `$or` across types for an unrestricted fallback).
- **Routing without a classifier LLM call.** Intent used to be resolved with a dedicated LLM
  call before a second call generated the answer. Replaced with cheap keyword-heuristic routing
  (no LLM call), so a typical message costs **one** LLM call total — the final answer, once
  retrieval is done. A message matching no keyword category falls through to an unrestricted
  semantic search rather than a rigid "general" bucket, which is also what lets plain greetings
  resolve cleanly (nothing scores above the similarity threshold).
- **Score-thresholded retrieval.** A vector search always returns its "closest" K matches even
  when none are relevant. `PINECONE_MIN_SCORE` drops low-confidence hits instead of handing the
  LLM garbage context — tuned from real production log data, not guessed (see `DEBUG_PINECONE`).
- **Access control lives in the retrieval filter, not just the prompt.** Announcements are
  audience-scoped (`all`/`students`/`teachers`); assignments/PYQs/study material narrow to the
  asker's branch when known; results stay unrestricted by design but a logged-in student's vague
  "what's my CGPA" is scoped to their own roll number rather than an open semantic search across
  every student's grades. Guests are restricted to results at the routing layer entirely.
- **Two-stage result pipeline** (`ExtractionBatch` → `PendingResult` → `Result`). Admin review
  exists because a hallucinated SGPA is a much worse failure than a hallucinated chatbot answer —
  this is the one place accuracy is enforced by a human, not just a prompt.
- **Rate limiting is tiered**, not one-size-fits-all: a generous general ceiling, a stricter
  limiter on the LLM/Pinecone-backed endpoints reachable without login (guest chat + result
  lookup — these cost money and are the likeliest abuse target), and a separate limiter on auth
  endpoints to slow down credential stuffing.
- **Sessions expire proactively, not just reactively.** JWTs are short-lived (2h student/teacher,
  1h admin) and the frontend decodes/checks the token's `exp` on load and every 60s, logging out
  on its own instead of only reacting to the next failed API call.

---

## Project structure

```
backend/
  src/
    models/         Mongoose schemas (User, Result, PendingResult, ExtractionBatch,
                     Notification, Announcement, Assignment, PYQ, StudyMaterial, Bookmark, Todo, SearchLog)
    controllers/     Route handlers, one file per resource area
    services/        chatService (RAG orchestration), pineconeService, llmService, extractionService
    routes/          Express routers - one per role + shared auth/results
    middleware/       auth (JWT verify + role gate), rate limiting, file upload, error handling
    utils/            small pure-function helpers (roll-number extraction, summary-text builders, flags)
    scripts/          one-time/maintenance scripts (see "Operational scripts" below)
  server.js
frontend/
  src/
    pages/           auth/, admin/, teacher/, student/, shared/ (role-scoped route trees)
    components/       reusable UI - DashboardLayout, Badge, Switch, StatCard, FeatureCard, etc.
    context/          Auth + Theme providers
    api/              axios client (JWT attach + 401 handling)
    utils/            jwt.js (client-side expiry check)
```

---

## Roles at a glance

| Role | Access | Notes |
|---|---|---|
| Guest | Result lookup only (filter search or AI question) | No account needed; everything else prompts login |
| Student | Chat assistant, results, PYQs, study material, assignments, announcements, notifications, bookmarks, to-do | Self-signup restricted to the institute email domain |
| Teacher | Upload/manage own study material, PYQs, assignments, announcements; chat assistant; to-do | Account created by admin only |
| Admin | Full control — student/teacher accounts, results pipeline, notifications, announcements, analytics | Seeded once via script |

---

## Local development setup

### Prerequisites
- Node.js 18+
- Accounts (all have free tiers): MongoDB Atlas, Pinecone, Groq (console.groq.com), Cloudinary

### Backend
```bash
cd backend
cp .env.example .env    # fill in real values - see table below
npm install
npm run seed:admin      # creates the one admin account from your .env (first run only)
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Open `http://localhost:5173`.

### Environment variables (backend `.env`)

| Variable | Where to get it / notes |
|---|---|
| `PORT`, `NODE_ENV` | `5000`, `development` locally |
| `CLIENT_URL` | Frontend origin, for CORS (`http://localhost:5173` locally) |
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Any long random string (`openssl rand -hex 32`) |
| `JWT_STUDENT_EXPIRY`, `JWT_TEACHER_EXPIRY`, `JWT_ADMIN_EXPIRY` | Duration strings (`2h`, `1h`, etc.) — kept short deliberately |
| `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` | Pinecone console — create an index with **integrated embedding** (model: `llama-text-embed-v2`) |
| `PINECONE_EMBED_MODEL`, `PINECONE_NAMESPACE` | Match whatever the index was created with; namespace can be left blank |
| `PINECONE_MIN_SCORE` | Similarity cutoff for retrieval (0-1); `0.15` is the current tuned default |
| `DEBUG_PINECONE` | `true` to log every retrieval's raw hit scores, for re-tuning the threshold |
| `GROQ_API_KEY`, `GROQ_MODEL` | console.groq.com/keys — check `console.groq.com/docs/models` if the configured model 404s (models get deprecated) |
| `LLM_PROVIDER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Optional fallback provider |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary dashboard |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your choice — used once by `seed:admin`; use `update:admin` (not seed) to change later |
| `STUDENT_EMAIL_DOMAIN` | Restricts self-signup to this email domain (e.g. `nitkkr.ac.in`) |

Full list with inline comments in `backend/.env.example`. Frontend only needs `VITE_API_URL`.

### Operational scripts (backend, run as needed — all idempotent)

| Command | Purpose |
|---|---|
| `npm run seed:admin` | Creates the initial admin account (first run only — does nothing if one already exists) |
| `npm run update:admin` | Updates an **existing** admin's credentials from current env vars |
| `npm run backfill:content-index` | Syncs every existing Mongo document into Pinecone with correct metadata — needed once after any index-schema change |
| `npm run fix:pdf-extensions` | Repairs previously-uploaded Cloudinary PDFs served with the wrong Content-Type, via the rename API (no re-upload needed) |

---

## Data model

| Model | Purpose |
|---|---|
| `User` | Single collection for student/teacher/admin, role-discriminated; role-specific fields (rollNumber/branch/year for students, department for teachers) |
| `Result` | Committed, live student results |
| `PendingResult` | Extraction-pipeline staging area before admin verification/commit |
| `ExtractionBatch` | Audit trail per results-PDF upload (source PDF, per-batch status, errors) |
| `Notification`, `Announcement`, `Assignment`, `PYQ`, `StudyMaterial` | Content types, each with `isVisible`, ownership, and type-specific metadata (audience, branch/semester/subject, due dates) |
| `Bookmark` | Cross-content-type saved items per student |
| `Todo` | Personal task list, role-agnostic |
| `SearchLog` | Query + resolved intent logging — powers both chat routing analytics and the admin trending-searches panel |

---

## Security fixes made during hardening

Worth calling out explicitly, since these were caught by deliberate audit rather than bug
reports:

- **Audience leak** — teacher-only announcements were retrievable via a student's chat before
  audience filtering was added to the retrieval layer.
- **Guest scope creep** — the guest chat endpoint could answer non-result questions before an
  explicit type restriction was added at the routing layer.
- **Cloudinary Content-Type bug** — PDFs uploaded as `resource_type: raw` with the `.pdf`
  extension stripped from the `public_id` (for cleaner naming) had no explicit `format: "pdf"`,
  so Cloudinary served them with the wrong Content-Type and browsers rendered the binary as
  garbled text instead of a downloadable file. Fixed at the source, plus a migration script that
  repairs every already-uploaded file in place via Cloudinary's rename API (no re-upload needed).
- **SPA routing 404 on refresh** — direct navigation/refresh on a client-side route 404'd on the
  static host since `BrowserRouter` routes aren't real server paths without a rewrite rule.

---

## Status

Core product is feature-complete: auth (all four access levels), the full result pipeline
(upload → extract → review → commit → query), teacher/student/admin content workflows, the
unified RAG chat assistant, analytics, bookmarks, to-dos, and app-wide theming.

Deferred / not built: site-wide settings panel, a Neo4j graph-DB layer (explored for a related
movie-recommendation project, not part of this portal's core scope).

---

