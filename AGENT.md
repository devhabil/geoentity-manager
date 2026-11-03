# AGENT.md

Instructions for AI coding agents working in this repository. The take-home brief requires this file whenever Agentic AI is used (see `docs/REQUIREMENTS.md`, S-6).

## Project

**GeoEntity Manager** is a web app to display and manage geo-located entities (vehicles, IoT sensors, facilities) on a map.
- `backend/`: Go REST API + SQLite
- `frontend/`: React + TypeScript (Vite) SPA with a Leaflet map

## Sources of truth (read before changing anything)

1. `references/Take-Home Test - Software Developer.pdf` is the **authoritative requirements**. It is transcribed in `docs/REQUIREMENTS.md` §1.
2. `references/GeoEntity Manager Dashboard in San Francisco.png` is a **design reference only**. It does not add requirements.
3. `docs/DATA_MODEL.md` is the **single spec for fields and validation**. The Go validator and the Zod schema must both match it.
4. `docs/API.md` is the REST contract. `docs/ARCHITECTURE.md` covers structure and library choices. `docs/IMPLEMENTATION_PLAN.md` holds phases and the checklist.

## Rules

- **Do not modify `references/`.**
- Work phase by phase as in `docs/IMPLEMENTATION_PLAN.md`. Tick checklist items when they are done.
- Keep changes small and reviewable. Don't add dependencies that aren't listed in `docs/ARCHITECTURE.md` without asking the human first.
- If a validation rule changes, update `docs/DATA_MODEL.md`, `backend/internal/entity/validate.go`, `frontend/src/features/entities/schema.ts`, and **both** test suites together.
- If the API changes, update `docs/API.md` in the same change.
- Never commit secrets, `.env` files, `node_modules/`, build output or `*.db` files.
- Don't claim something works unless you ran it. Report command output honestly, including failures.
- Anything unfinished must be listed in README "Known limitations / unfinished features".
- After each working session, append an entry to `docs/AI_WORKFLOW.md`.

## Conventions

**Go**
- Go module at `backend/`. Run `gofmt` and `go vet` before finishing.
- Layering: `httpapi` → `entity` (domain, no HTTP or SQL imports) → `entity.Repository` interface ← `storage/sqlite`.
- Map errors to HTTP status codes only in `httpapi/respond.go`.
- Table-driven tests; use `httptest` for handlers and `t.TempDir()` for SQLite.

**TypeScript / React**
- `strict` TS, no `any`. Infer types from Zod (`z.infer`).
- Server state lives only in TanStack Query. UI state lives in React state or the URL (`?selected=`). No global store.
- Components are in `features/entities/components/`; one component per file, PascalCase.
- Tailwind for styling. Status colours and type labels come only from `features/entities/constants.ts`.

**JSON / naming**
- JSON uses camelCase and SQL uses snake_case. Enum values are lowercase snake_case (`iot_sensor`).

## Commands

```bash
# backend
cd backend
go run ./cmd/server          # http://localhost:8080
go test ./...
go vet ./...

# frontend
cd frontend
npm install
npm run dev                  # http://localhost:5173 (proxies /api → :8080)
npm run test
npm run typecheck
npm run build
```

## Definition of done (per feature)

1. It meets the relevant requirement IDs in `docs/REQUIREMENTS.md`.
2. Tests were added or updated and pass locally.
3. Lint, vet and build are clean.
4. Docs were updated (API, data model, README) where affected.
