# GeoEntity Manager

A full-stack web application to **display and manage entities with geographic locations** (vehicles, IoT sensors, and facilities) on an interactive map.

- **Frontend:** React 18 + TypeScript (Vite), Tailwind CSS, React Leaflet + OpenStreetMap, TanStack Query, React Hook Form + Zod, Lucide React
- **Backend:** Go (`net/http` + `chi/v5`) REST API with pure-Go SQLite persistence (`modernc.org/sqlite`)

![Dashboard mockup (design reference)](references/GeoEntity%20Manager%20Dashboard%20in%20San%20Francisco.png)

## Features

- **Interactive Map (Leaflet + OpenStreetMap):** Displays all backend entities as custom status-colored markers (`Active` green, `Inactive` gray, `Maintenance` orange) with type icons, entity code badges, popups, zoom/scale controls, and a status legend.
- **Left Entity Sidebar:** Collapsible groups by entity type (`Vehicles`, `IoT Sensors`, `Facilities`), status badges, left status color stripes, search by name/code/type/location, status filter dropdown, and live status counters.
- **Entity Detail Panel:** Displays full entity metadata (`name`, `code`, `type`, `status`, `description`, `region`, `address`, `latitude`, `longitude`, `updatedAt`, `createdAt`) with Edit, Duplicate, Delete, and Close actions.
- **Create, Edit & Delete (CRUD):** Modal forms backed by `POST /api/v1/entities`, `PUT /api/v1/entities/{id}`, and `DELETE /api/v1/entities/{id}` (with confirmation dialog).
- **Map Coordinate Selection:** Click **Pick on Map** inside the Create or Edit form to click anywhere on the map (or drag the picked marker) and populate `latitude` and `longitude`.
- **Dual-Layer Input Validation:** Identical validation rules on both the frontend (Zod + React Hook Form) and backend (Go domain validation + SQLite `CHECK` constraints), including structured `422` and `409` field-error mapping onto form inputs.

## Getting Started

### Prerequisites

- **Go** ≥ 1.21 (tested on Go 1.21.1 `windows/amd64`)
- **Node.js** ≥ 20 and **npm** (tested on Node 22.19.0 / npm 10.9.3)
- **No C compiler (CGO) or external database server required** — SQLite runs embedded via a pure-Go driver.

### 1. Run the Go Backend

```bash
cd backend
go run ./cmd/server
```

The backend listens on `http://localhost:8080`. On first start, if the SQLite database (`./data/geoentity.db`) is empty, it automatically seeds the 6 sample San Francisco Bay Area entities (`DV-101`, `TR-204`, `TS-01`, `AQ-07`, `WH-001`, `CS-02`).

### 2. Run the React Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Vite proxies `/api` and `/healthz` requests to `http://localhost:8080`.

### Running Tests & Quality Checks

```bash
# Backend unit + repository + HTTP handler tests
cd backend
go vet ./...
go test ./...

# Backend live HTTP CRUD + persistence smoke test (PowerShell)
cd backend
go build -o bin/server.exe ./cmd/server
powershell -NoProfile -File .\scripts\smoke.ps1

# Frontend TypeScript check, Vitest unit/integration suite, and production build
cd frontend
npm run typecheck
npm run test
npm run build

# Frontend + live Go backend end-to-end integration test
cd frontend
$env:LIVE_BACKEND="1"; npm run test
```

### Configuration (Environment Variables)

| Variable | Default | Service | Description |
|---|---|---|---|
| `PORT` | `8080` | Backend | HTTP listen port |
| `DB_PATH` | `./data/geoentity.db` | Backend | SQLite database file path (auto-created) |
| `CORS_ORIGINS` | `http://localhost:5173` | Backend | Comma-separated allowed CORS origins |
| `SEED` | `true` | Backend | Seed sample entities when database is empty |
| `VITE_API_BASE_URL` | `""` (same origin `/api`) | Frontend | Optional explicit API origin when not using Vite proxy |

## Library Choices & Rationale

Full architectural comparisons are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

| Library | Why it was chosen |
|---|---|
| **go-chi/chi v5** & **go-chi/cors** | Idiomatic `net/http`-compatible router with URL parameters and clean middleware composition; compatible with Go 1.21. |
| **modernc.org/sqlite** (`v1.29.5`) | Pure-Go SQLite driver requiring no CGO/gcc toolchain, ensuring `go run` and `go test` work out of the box on Windows, macOS, and Linux. |
| **SQLite** | Persistent relational storage in a single file with `UNIQUE` and `CHECK` constraints, requiring zero database server setup for reviewers. |
| **google/uuid** & **log/slog** | Standard UUID v4 entity identifiers and standard-library structured request logging. |
| **React 18 + TypeScript + Vite** | Fast development server, strict static typing, and built-in `/api` proxy. |
| **Leaflet + react-leaflet + OpenStreetMap** | Free, mature interactive map library requiring no API key or billing account; supports custom HTML/SVG `divIcon` status pins and map-click coordinate picking. |
| **TanStack Query v5** | Manages server-state caching, loading/error states, and automatic cache updates + query invalidation after Create/Update/Delete mutations. |
| **React Hook Form + Zod** | Single declarative schema (`schema.ts`) providing both static TypeScript inference and runtime validation matching backend rules, plus `setError` mapping for backend `409`/`422` field errors. |
| **Tailwind CSS + lucide-react** | Rapid, maintainable styling and clean iconography matching the enterprise SaaS dashboard mockup. |
| **Vitest + Testing Library** | Fast Vite-native unit, component, and end-to-end integration testing. |

## REST API Summary

All entity routes are under `/api/v1`. Full request/response schemas and error codes are in [docs/API.md](docs/API.md).

| Method | Path | Success | Description |
|---|---|---|---|
| `GET` | `/healthz` | `200` | Liveness and database connectivity check |
| `GET` | `/api/v1/entities` | `200` | List entities (optional query filters: `type`, `status`, `q`) |
| `GET` | `/api/v1/entities/{id}` | `200` | Get a single entity by UUID |
| `POST` | `/api/v1/entities` | `201` | Create entity (`400` bad JSON, `409` duplicate code, `422` validation error) |
| `PUT` | `/api/v1/entities/{id}` | `200` | Update entity (`400`, `404`, `409`, `422`) |
| `DELETE` | `/api/v1/entities/{id}` | `204` | Delete entity (`400`, `404`) |

## Agentic AI Workflow

An AI coding agent (**Antigravity**) was used in a structured, phase-gated pair-programming workflow governed by [`AGENT.md`](AGENT.md):

1. **Phase 0 (Planning & Specification):** The agent extracted the authoritative requirements from `references/Take-Home Test - Software Developer.pdf` and inspected the UI mockup PNG, producing the specifications in `docs/` (`REQUIREMENTS.md`, `DATA_MODEL.md`, `API.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`) and `AGENT.md` before writing any code.
2. **Phase 1–2 (Go Backend & Verification):** Following the approved contract, the agent implemented the Go + Chi + SQLite backend, unit/repository/HTTP tests, and a PowerShell live CRUD smoke script (`backend/scripts/smoke.ps1`) reviewed and approved by the human candidate (55/55 assertions passed).
3. **Phase 3–5 (React Frontend & Integration):** The agent implemented the React + TypeScript + Leaflet + TanStack Query + RHF/Zod frontend, verified parity between client and server validation rules, and executed automated integration tests against both mocked fetch and the live Go backend binary.

The detailed session-by-session log is in [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md).

## Known Limitations & Unfinished Features

As documented in [docs/REQUIREMENTS.md §4](docs/REQUIREMENTS.md#4-explicitly-out-of-scope), the following mockup elements were intentionally kept out of scope because they are not requested by the take-home PDF:

- **Authentication & user accounts:** The `John Doe / Operations` profile badge in the header is static display only.
- **Activity, History & Actions tabs:** Only the **Details** tab in the entity detail panel is implemented; telemetry/audit logs are not part of the domain model.
- **Secondary navigation pages:** The left navigation rail highlights `Entities` and `Map` (active in the workspace); separate `Assets`, `Reports`, and `Settings` pages are omitted.
- **Real-time GPS streaming / non-point geometries:** Entities store point coordinates (`latitude`, `longitude`) updated via CRUD operations.
- **Docker Compose:** Omitted in favor of zero-dependency native execution (`go run` + `npm run dev`).

## Documentation Index

| File | Description |
|---|---|
| [AGENT.md](AGENT.md) | Rules and conventions for AI coding agents (required by brief) |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Verbatim brief transcription, requirement traceability, mockup scope analysis |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Shared entity schema, validation rules, and seed data specification |
| [docs/API.md](docs/API.md) | REST API contract and error envelope specification |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, layering, and library rationale |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phased checklist and verification status |
| [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) | Session-by-session Agentic AI workflow log |
