# Implementation Plan

Sized for the 2-day deadline (S-7). Each phase ends in a working, committed state.
Status legend: `[ ]` todo · `[~]` in progress · `[x]` done.

## Phase 0: Planning and docs ✅

- [x] Read the brief PDF and the mockup PNG in `references/`
- [x] Write `docs/REQUIREMENTS.md`, `DATA_MODEL.md`, `API.md`, `ARCHITECTURE.md`, this plan, and `AI_WORKFLOW.md`
- [x] Write `README.md` (skeleton) and `AGENT.md`
- [x] Get the plan reviewed and approved by the candidate
- [x] `git init`, add `.gitignore` (Go, Node, `data/*.db`, `.idea/`), ready for commits

## Phase 1: Backend foundation (about 3 h)

- [x] `backend/go.mod`; Go 1.21 compatibility resolved by pinning `modernc.org/sqlite v1.29.5` (latest needs Go ≥ 1.26); chi v5.0.12, cors v1.2.1, uuid v1.6.0
- [x] `internal/config`: env parsing with defaults
- [x] `internal/entity`: model, enums, `Input` with pointer coords, `Validate`, typed errors, service
- [x] Table-driven validation tests covering every rule in DATA_MODEL §2
- [x] `internal/storage/sqlite`: open DB (WAL, foreign keys, busy timeout), embedded migration `001_create_entities.sql` with CHECK constraints, seed
- [x] Repository tests (temp DB): CRUD, case-insensitive unique code, filters, LIKE-wildcard escaping, SQL-injection string, persistence across reopen, seed idempotence, CHECK constraints

## Phase 2: Backend HTTP API (about 3 h)

- [x] `internal/httpapi`: chi router, middleware (request log, recoverer, CORS, body limit)
- [x] Handlers for all endpoints in API.md, strict JSON decoding, error envelope
- [x] `/healthz`
- [x] `httptest` tests: happy paths + 400/404/405/409/422 per endpoint, CORS allow/deny
- [x] `cmd/server/main.go`: wiring, timeouts, graceful shutdown (builds; shutdown path not exercised)
- [x] Live smoke test against the running binary (`backend/scripts/smoke.ps1`): 55 passed, 0 failed, exit code 0 (CRUD, validation, CORS, restart persistence)
- [ ] curl example from API.md (not run separately; covered by the smoke script's equivalent 422 case)

## Phase 3: Frontend foundation (about 2 h) ✅

- [x] Vite React-TS scaffold in `frontend/`, strict TS, Tailwind, `/api` proxy
- [x] `api/client.ts` (typed fetch, `ApiError` with `details`), entity endpoints (`list`, `get`, `create`, `update`, `remove`)
- [x] `features/entities/schema.ts` (Zod, mirroring DATA_MODEL §2) + Vitest parity tests (`schema.test.ts`)
- [x] TanStack Query provider and hooks (`useEntities`, `useCreateEntity`, `useUpdateEntity`, `useDeleteEntity` with cache update + invalidation)
- [x] Layout shell matching the mockup: header, nav rail (Entities active), toolbar, 3-column body

## Phase 4: Map and read features (about 3 h) → F-1, F-3 ✅

- [x] `EntityMap`: Leaflet + OSM tiles, initial view centered on San Francisco Bay Area, zoom and scale
- [x] Custom `divIcon` pin coloured by status (`#22a447` green, `#8a8f98` grey, `#f59e0b` orange), type SVG glyph, code label; selected state ring
- [x] `MapLegend`
- [x] `EntityList`: grouped by type, collapsible, counts, status badge and colour stripe
- [x] Search + status filter (client-side) and `StatusCounters`
- [x] Selection via `?selected=` with the map flying to the selected entity
- [x] `EntityDetailPanel` (Details tab): all fields (`name`, `code`, `type`, `status`, `description`, `region`, `address`, `latitude`, `longitude`, `updatedAt`, `createdAt`)
- [x] Loading, empty and error states

## Phase 5: Write features (about 3 h) → F-2, F-4b ✅

- [x] `EntityFormDialog` (create + edit) with RHF + Zod and inline errors
- [x] "Pick on Map" mode: map click fills lat/lng; a temporary draggable marker shows the chosen point
- [x] Map server `409`/`422` `details[]` to fields via `setError`
- [x] `DeleteConfirmDialog`; inline status/feedback banner for success and failure
- [x] Component and full CRUD integration tests (`components.test.tsx`, `app.integration.test.tsx`, `live-backend.e2e.test.tsx`)
- [x] Nice-to-have: Duplicate (prefill create form, clear `code`)

## Phase 6: Polish, packaging and docs (about 2 h) → S-1…S-6

- [x] Responsive behaviour (stacked layout on narrow screens, 12-col grid on desktop)
- [x] Accessibility pass: `aria-label`s, `role="dialog"`, `role="alert"` on validation errors
- [ ] Optional: `Dockerfile`s + `docker-compose.yml` (skipped — optional)
- [x] README: final run instructions, library choices, AI workflow summary, known limitations / unfinished features
- [x] Update `AI_WORKFLOW.md` log
- [x] Final review against the REQUIREMENTS.md traceability table

## Verification checklist (before submission)

| # | Check | Req |
|---|---|---|
| 1 | `cd backend && go vet ./... && go test ./...` passes | P-2, F-4a |
| 2 | `cd frontend && npm run typecheck && npm run test && npm run build` passes | P-1, F-4b |
| 3 | Fresh start shows 6 seeded markers in the SF Bay Area, with colours matching statuses | F-1 |
| 4 | Clicking a marker or list item opens the detail panel with correct data | F-3 |
| 5 | Create via map-click coordinates → marker appears; survives backend restart | F-2a, P-3 |
| 6 | Edit name/status/location (incl. drag) → marker and list update | F-2c |
| 7 | Delete with confirm → marker and list item disappear | F-2b |
| 8 | Form blocks lat 91 / empty name / bad code client-side | F-4b |
| 9 | curl with lat 91, unknown field, duplicate code → 422 / 400 / 409 | F-4a |
| 10 | README steps work from a clean clone on Windows | S-1 |
| 11 | `AGENT.md` present; README covers library rationale, AI usage, limitations | S-2, S-3, S-5, S-6 |

## Risks

| Risk | Mitigation |
|---|---|
| Go 1.21 incompatibility with latest deps | **Resolved:** pinned `modernc.org/sqlite v1.29.5`; `go.mod` declares `go 1.21.1` |
| OSM tile usage policy / offline reviewer | Tiles are only for display; app works without them (markers still render). Document it |
| Time overrun | Phases 4–5 are the core. Phase 6 Docker and the nice-to-haves are dropped first and listed under limitations |
| Client/server validation drift | Single spec (DATA_MODEL.md) + mirrored boundary tests on both sides |
