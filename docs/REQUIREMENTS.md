# Requirements

> **Source of truth:** `references/Take-Home Test - Software Developer.pdf` (1 page, Indonesian).
> **Design reference only:** `references/GeoEntity Manager Dashboard in San Francisco.png`.
> If this document and the PDF ever disagree, the PDF wins.

## 1. Original brief (verbatim transcription)

> **Take-Home Test - Software Developer**
>
> **Overview**
> Buat sebuah aplikasi untuk menampilkan dan mengelola entity yang memiliki informasi lokasi geografis. entity tersebut dapat merepresentasikan berbagai jenis object di dunia nyata, misalnya kendaraan, perangkat IOT, lokasi fasilitas, dll. Setiap entitas memiliki identitas, atribut dasar, status, serta informasi lokasi berupa koordinat geografis.
>
> Aplikasi harus terdiri dari:
> - Frontend menggunakan React + TypeScript
> - Backend menggunakan Go
> - Data dapat disimpan dan diambil melalui backend
>
> Kandidat bebas menentukan:
> - Library yang digunakan
> - Database
> - API design
> - State management
> - Map provider / map library
> - Styling approach
>
> **Functional Requirement**
> - Aplikasi dapat menampilkan entitas ke dalam map
> - Aplikasi dapat menambahkan, menghapus, dan update entitas pada map
> - Aplikasi dapat melihat detail entitas pada map
> - Backend dan Frontend harus bisa melakukan validasi input atau data
>
> **Documentation**
> - Jelaskan cara menjalankan program.
> - Jelaskan alasan pemilihan library yang digunakan.
> - Jelaskan workflow penggunaan Agentic AI sejauh apa pada pengerjaan test ini.
>
> **Submission**
> - Kirimkan repository Git yang berisi source code aplikasi beserta dokumentasinya
> - Jika ada fitur yang belum selesai, kandidat harus menjelaskannya pada dokumentasi.
> - Jika menerapkan Agentic AI, sertakan file AGENT.md atau CLAUDE.md pada git repository.
> - Deadline 2 hari setelah menerima soal tes
> - kirim ke email ibnu.mukhtarom@len-iot.io dan muhammad.padmanaba@len-iot.io

## 2. Requirement catalogue (English) with traceability

Requirement IDs are referenced from the other docs and from commit messages.

### Mandatory: platform

| ID | Requirement | Planned solution | Verified by |
|---|---|---|---|
| P-1 | Frontend in **React + TypeScript** | Vite + React + TypeScript (strict) in `frontend/` | Build passes `tsc --noEmit` |
| P-2 | Backend in **Go** | Go HTTP service in `backend/` | `go build ./...`, `go test ./...` |
| P-3 | Data is **stored and retrieved through the backend** | REST API + SQLite persistence; frontend never stores entities locally | Restart backend → data persists |

### Mandatory: domain

| ID | Requirement | Planned solution |
|---|---|---|
| D-1 | Entities represent real-world objects (vehicles, IoT devices, facilities, …) | `type` enum: `vehicle`, `iot_sensor`, `facility` (extensible, see [DATA_MODEL.md](DATA_MODEL.md)) |
| D-2 | Each entity has an **identity** | Server-generated UUID `id` + human-readable unique `code` (e.g. `DV-101`) |
| D-3 | Each entity has **basic attributes** | `name`, `type`, `description`, `region`, `address` |
| D-4 | Each entity has a **status** | `status` enum: `active`, `inactive`, `maintenance` |
| D-5 | Each entity has **geographic coordinates** | `latitude`, `longitude` (WGS84 decimal degrees) |

### Mandatory: functional

| ID | Requirement | Planned solution |
|---|---|---|
| F-1 | Display entities **on a map** | Leaflet map with one marker per entity; colour = status, icon = type |
| F-2a | **Add** entities on the map | "Add Entity" form; coordinates can be typed in **or** picked by clicking the map |
| F-2b | **Delete** entities on the map | Delete action in the detail panel with confirmation dialog |
| F-2c | **Update** entities on the map | Edit form in the detail panel; location can also be changed by dragging the marker in edit mode |
| F-3 | View entity **details on the map** | Clicking a marker (or list item) selects it: marker popup + detail panel |
| F-4a | **Backend** validates input/data | Domain validation in Go and structured `422` errors, plus JSON decoding errors → `400` |
| F-4b | **Frontend** validates input/data | Zod schema + react-hook-form, with inline field errors; server errors mapped onto fields |

### Mandatory: documentation and submission

| ID | Requirement | Where |
|---|---|---|
| S-1 | Explain **how to run** the program | `README.md` → "Getting started" |
| S-2 | Explain **why each library was chosen** | `README.md` → "Library choices" (detail in [ARCHITECTURE.md](ARCHITECTURE.md)) |
| S-3 | Explain **how far Agentic AI was used** | `README.md` → "Agentic AI workflow" and [AI_WORKFLOW.md](AI_WORKFLOW.md) |
| S-4 | Submit a **Git repository** with source and docs | Repo root |
| S-5 | **Document any unfinished features** | `README.md` → "Known limitations / unfinished features" |
| S-6 | Include **AGENT.md or CLAUDE.md** if Agentic AI is used | `AGENT.md` at repo root |
| S-7 | Deadline is **2 days** after receiving the test | Plan is sized for about 2 days (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)) |
| S-8 | Send to the two listed email addresses | Manual step by the candidate (not automated) |

## 3. Mockup analysis (design reference, not a requirement)

The mockup shows a three-column dashboard. Each element is classified below.

| Mockup element | Decision | Rationale |
|---|---|---|
| Header: title + subtitle | **Build** | Cheap; gives context |
| Header: notifications bell, help icon, user "John Doe / Operations" | **Static or omitted** | No auth or notification requirement in the PDF |
| Left nav rail: Entities, Map, Assets, Reports, Settings | **Build "Entities" only**; others are rendered disabled or omitted | Not required; avoids fake pages |
| "Add Entity" primary button | **Build** | F-2a |
| Search box "by name, type, or location" | **Build** | Low cost, big usability win with many entities |
| Status filter dropdown | **Build** | Low cost |
| Status counters (Active / Inactive / Maintenance) | **Build** | Derived from data, cheap |
| Entity list grouped by type, collapsible, with status badge | **Build** | Second way to reach F-3 |
| Map: coloured pin per status, type icon, code label | **Build** | F-1 |
| Map: zoom controls, scale bar, OSM attribution | **Build** | Built into Leaflet |
| Map: layers button | **Nice-to-have** | e.g. street or light basemap toggle |
| Map: legend "Entity Status (Marker Color)" | **Build** | Explains colours |
| Detail panel: header, Details tab | **Build** | F-3 |
| Detail panel: Activity / History / Actions tabs | **Out of scope** | Needs telemetry or audit data that the PDF doesn't ask for; tabs hidden or disabled |
| Detail panel: Edit / Duplicate / Delete | **Build Edit + Delete**; Duplicate is **nice-to-have** (prefills the create form) | F-2b, F-2c |
| "Last Updated" with timezone | **Build** | From `updated_at`, formatted in the browser's local timezone |
| Six San Francisco Bay Area sample entities | **Seed data** | Makes the demo match the mockup on first run |

**Visual language to reproduce:** white or light-grey surfaces, blue primary (`#1d6ef0`-ish), status colours green (active), grey (inactive) and orange (maintenance), rounded cards, a left colour stripe on list items matching status, and Lucide-style line icons.

## 4. Explicitly out of scope

- Authentication or authorization, and multi-tenant users (the header user is decorative).
- Real-time telemetry, live GPS streaming, WebSockets.
- Activity, history or audit trails (mockup tabs).
- Assets, Reports and Settings pages.
- Geometries other than points (polygons, routes, geofences).
- Production deployment, HTTPS termination.

Any of these may be listed as "future work" in the README.

## 5. Assumptions

1. Coordinates are WGS84 decimal degrees and points only.
2. Dataset size is small (tens to low hundreds), so listing all entities without pagination is acceptable. The API still supports filters.
3. "Validation" means both shape validation (types, required fields) and domain rules (ranges, enums, lengths, uniqueness of `code`).
4. English is used for UI and docs, matching the mockup. The original brief is preserved above in Indonesian.
5. The reviewer runs the app locally on Windows, macOS or Linux, so the solution must not require CGO or a separately installed database server.
