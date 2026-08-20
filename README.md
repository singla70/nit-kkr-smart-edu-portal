# NIT KKR — Smart Edu Portal

An AI-powered college portal for NIT Kurukshetra with three roles — **Student**, **Teacher**,
and **Admin** — built on the MERN stack with a Retrieval-Augmented Generation (RAG) core for
result lookup and campus Q&A.

**Live demo:** _add your deployed URL here once live_
**Video walkthrough:** _optional, add if you record one for placements_

---

## Highlights

- **Hybrid RAG result lookup** — ask a question in plain English ("What's Ananya's CGPA?") and
  get a semantically-retrieved answer via Pinecone + Groq; ask by exact roll number and it skips
  retrieval entirely for a guaranteed-accurate direct database lookup. No login required.
- **PDF → structured data pipeline** — admin uploads a raw result PDF; it's parsed, segmented
  per student, and extracted into structured records by an LLM, batch by batch (so one bad batch
  never blocks the rest). Nothing reaches students until an admin reviews and commits it from a
  **Pending Verification** queue — the AI's first pass is a draft, not the source of truth.
- **Unified AI chat** with automatic intent routing — one chat box for results, policy
  notifications, announcements, or general questions, each answered from the right data source.
- **PYQ question extraction** — previous-year papers are parsed into individual questions on
  upload, and each one has an "Ask AI" button that hands it straight to the chat.
- **Content moderation** — every piece of content (notes, PYQs, assignments, announcements,
  notifications) can be hidden without deleting it; teachers manage their own uploads, admin can
  manage anything.
- **Full light/dark theme**, applied app-wide via CSS custom properties, with auth screens kept
  on-brand and dashboards fully theme-aware.
- **Analytics dashboard** — content-by-department breakdowns, pass/fail trends, trending
  searches (from an anonymized query log), and a live activity feed.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Vector search | Pinecone (integrated inference — no local embedding model) |
| LLM | Groq (`openai/gpt-oss-120b`) |
| File storage | Cloudinary |
| Auth | JWT, role-based (student self-signup, teacher/admin provisioned) |

## Architecture decisions worth knowing

- **Pinecone is used only for results.** PYQs, study material, announcements, and notifications
  use plain MongoDB filters/keyword search — not every feature needed to be "AI-powered" to be
  useful, and it keeps those paths fast and free of LLM cost.
- **Two-stage result pipeline** (`ExtractionBatch` → `PendingResult` → `Result`). Admin-facing
  review exists because a hallucinated SGPA is a much worse failure than a hallucinated chatbot
  answer — this is the one place accuracy is enforced by a human, not just a prompt.
- **Auth pages don't theme-toggle** by design — they keep one fixed branded look; only the
  logged-in app (dashboards + guest result lookup) follows the light/dark preference.
- Rate limiting is applied specifically to the LLM-backed guest endpoints and to auth, since
  those are the ones reachable without login and the ones that cost money or invite abuse.

---

## Project structure

```
backend/
  src/
    models/        Mongoose schemas
    controllers/    Route handlers
    services/       LLM, Pinecone, extraction pipeline
    routes/         Express routers, one per role + shared
    middleware/      auth, rate limiting, uploads, error handling
    utils/           small pure-function helpers
  server.js
frontend/
  src/
    pages/          auth/, admin/, teacher/, student/, shared/
    components/      reusable UI (layout, cards, buttons, modal)
    context/         Auth + Theme providers
    api/             axios client
```

## Roles at a glance

| Role | Access | Notes |
|---|---|---|
| Guest | Free result lookup (filter or AI question) | No account needed |
| Student | Everything except content management | Self-signup, college email only |
| Teacher | Upload/manage own content, chat | Account created by admin |
| Admin | Full control — users, content, results pipeline, analytics | Seeded once via script |

---

## Local development setup

### Prerequisites
- Node.js 18+
- Accounts (all have free tiers): MongoDB Atlas, Pinecone, Groq (console.groq.com), Cloudinary

### Backend
```bash
cd backend
cp .env.example .env    # fill in real values — see "Environment variables" below
npm install
npm run seed:admin      # creates the one admin account from your .env
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

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Any long random string (`openssl rand -hex 32`) |
| `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` | Pinecone console — create an index with **integrated embedding** (model: `llama-text-embed-v2`) |
| `GROQ_API_KEY` | console.groq.com/keys |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary dashboard |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your choice — used once by `seed:admin` |
| `CLIENT_URL` | Frontend origin, for CORS (`http://localhost:5173` locally) |

Full list with comments in `backend/.env.example`.

---

## Status

Core product is feature-complete: auth, the full result pipeline (upload → extract → review →
commit → query), teacher/student/admin workflows, chat, analytics, bookmarks, and theming.
Not built: site settings, auto-logout warning UI, Neo4j (explicitly deferred to a later phase
once the MongoDB+Pinecone core has been used with real data for a while).
