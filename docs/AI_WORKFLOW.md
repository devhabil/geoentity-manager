# Agentic AI Workflow Log

The brief asks the candidate to explain how far Agentic AI was used (S-3). This file is the running log, and the README contains the summary.

## Roles

| Who | Responsibility |
|---|---|
| **Candidate (human)** | Owns requirements interpretation, all technical decisions and approvals, review of scripts and code changes, manual testing, final submission |
| **AI coding agent** (Antigravity) | Reads references, drafts plans and docs, implements backend and frontend code following the approved specs, writes unit and integration tests, runs builds and tests locally, reports actual results |

Guardrails for the agent are defined in [`AGENT.md`](../AGENT.md).

## Session log

### Session 1: Planning (2026-11-03)

**Prompt (summary):** Inspect `references/`, read the PDF (authoritative) and the mockup (design reference), then plan and write documentation only. No implementation.

**What the agent did:**
1. Listed the workspace: only `references/` existed, with no code and no git repo.
2. Viewed the mockup PNG directly.
3. Extracted the full Indonesian brief text from the PDF and transcribed it verbatim in `docs/REQUIREMENTS.md` §1.
4. Checked the local toolchain (Go 1.21.1, Node 22.19, npm 10.9, Git 2.45, Docker 28.4) to ground the technology choices.
5. Produced: `README.md`, `AGENT.md`, `docs/REQUIREMENTS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/AI_WORKFLOW.md`.

### Session 2: Backend Implementation & Smoke Testing (2026-11-03)

**Prompt (summary):** Implement Phase 2 (Go backend with Chi, pure-Go SQLite, CRUD endpoints, validation, CORS, and tests), then write and run a reviewed local CRUD smoke test script.

**What the agent did:**
1. Initialized `backend/` Go module (`go 1.21.1`) and pinned `modernc.org/sqlite v1.29.5` (pure-Go, compatible with Go 1.21), `go-chi/chi/v5 v5.0.12`, `go-chi/cors v1.2.1`, and `google/uuid v1.6.0`.
2. Implemented `internal/config`, `internal/entity` (domain model, normalization, validation, service), `internal/storage/sqlite` (embedded migration with SQL `CHECK` constraints, parameterized queries, seed data), `internal/httpapi` (Chi router, strict JSON decoding, unified error envelope), and `cmd/server/main.go`.
3. Wrote unit, repository, and `httptest` API tests (`go test ./...` all passing).
4. Placed `backend/scripts/smoke.ps1` in the workspace for human review, refined it with explicit HTTP status and payload assertions and non-zero failure exit codes per candidate feedback, and executed it after approval (**55 passed, 0 failed**).

### Session 3: Frontend Implementation & Backend Integration (2026-11-03)

**Prompt (summary):** Implement the React + TypeScript + Vite + Tailwind + React Leaflet + TanStack Query + React Hook Form + Zod frontend, integrate with the Go backend, and verify all mandatory CRUD, map, and validation flows.

**What the agent did:**
1. Implemented the typed API client (`src/api/client.ts`), shared Zod validation schema (`src/features/entities/schema.ts`), status/type constants (`constants.ts`), and TanStack Query hooks (`hooks.ts`).
2. Built the dashboard UI following the mockup: `LayoutShell.tsx` (Header + NavRail), `StatusCounters.tsx`, `StatusBadge.tsx`, `EntityTypeIcon.tsx`, `EntityList.tsx` (grouped by type, collapsible, search/filter, empty states), `EntityMap.tsx` (React Leaflet + OpenStreetMap tiles, status-colored SVG `divIcon` markers with code labels, `MapLegend.tsx`, fly-to-selected, and click-to-pick coordinates), `EntityDetailPanel.tsx`, `EntityFormDialog.tsx` (Create/Edit + server `409`/`422` field error mapping), and `DeleteConfirmDialog.tsx`.
3. Verified `tsc --noEmit` (`0` errors) and `vite build` (production bundle succeeds).
4. Wrote and executed 4 Vitest test suites (13 tests total), including `live-backend.e2e.test.tsx` which spawns the compiled Go server (`backend/bin/server.exe`) against a temporary SQLite database and drives the React `<App />` through initial seed load, marker status verification, Create, duplicate-code `409` error handling, Update, simulated browser reload persistence, and Delete.
5. Initialized Git (`git init`), added root `.gitignore`, and updated `README.md` and `docs/IMPLEMENTATION_PLAN.md`.

### Session 4: Final Pre-Submission Audit (2026-11-03)

**Prompt (summary):** After the candidate manually verified all browser workflows (map markers, Create, Read, Update, Delete, Pick on Map, validation, and reload persistence), perform a final pre-submission audit across requirements, tests, builds, documentation, security, and Git readiness.

**What the agent did:**
1. Re-ran Go backend checks (`gofmt -l .`, `go vet ./...`, `go build`, `go test -count=1 ./...`) and frontend checks (`npm run typecheck`, `npm run test` with `LIVE_BACKEND=1`, `npm run build`).
2. Audited `git status --untracked-files=all --ignored` to verify `.gitignore` excludes `node_modules/`, `frontend/dist/`, `backend/bin/`, `backend/data/*.db*`, `.env*`, and `backend/scripts/.idea/`.
3. Scanned source files for hardcoded secrets, tokens, or unsafe SQL/HTML constructs.
4. Aligned `AGENT.md` and `docs/IMPLEMENTATION_PLAN.md` command references (`npm run typecheck`) with `frontend/package.json`.
