# Data Model and Validation Rules

This file is the **single specification** for entity fields and validation rules.
The Go validator (`backend/internal/entity/validate.go`) and the Zod schema (`frontend/src/features/entities/schema.ts`) must both implement exactly these rules. If a rule changes here, change both implementations and their tests in the same commit.

## 1. Entity

| Field | JSON | Go type | SQLite column | Required on write | Notes |
|---|---|---|---|---|---|
| ID | `id` | `string` (UUID v4) | `id TEXT PRIMARY KEY` | Server-generated | Never accepted from the client on create |
| Code | `code` | `string` | `code TEXT NOT NULL UNIQUE COLLATE NOCASE` | Yes | Short human identifier shown on map labels, e.g. `DV-101` |
| Name | `name` | `string` | `name TEXT NOT NULL` | Yes | e.g. `Delivery Vehicle DV-101` |
| Type | `type` | `EntityType` | `type TEXT NOT NULL` + CHECK | Yes | `vehicle` \| `iot_sensor` \| `facility` |
| Status | `status` | `EntityStatus` | `status TEXT NOT NULL` + CHECK | Yes | `active` \| `inactive` \| `maintenance` |
| Description | `description` | `string` | `description TEXT NOT NULL DEFAULT ''` | No | Free text |
| Region | `region` | `string` | `region TEXT NOT NULL DEFAULT ''` | No | City or area, e.g. `San Francisco, CA` |
| Address | `address` | `string` | `address TEXT NOT NULL DEFAULT ''` | No | Landmark or street, e.g. `Near Market St` |
| Latitude | `latitude` | `float64` | `latitude REAL NOT NULL` + CHECK | Yes | WGS84 decimal degrees |
| Longitude | `longitude` | `float64` | `longitude REAL NOT NULL` + CHECK | Yes | WGS84 decimal degrees |
| Created at | `createdAt` | `time.Time` | `created_at TEXT NOT NULL` | Server-set | RFC 3339, UTC |
| Updated at | `updatedAt` | `time.Time` | `updated_at TEXT NOT NULL` | Server-set | RFC 3339, UTC; shown as "Last Updated" |

JSON uses **camelCase**. SQL uses **snake_case**.

### Example

```json
{
  "id": "5b0c8a8e-3f7e-4d3f-9a43-2d5f3b0a9c11",
  "code": "DV-101",
  "name": "Delivery Vehicle DV-101",
  "type": "vehicle",
  "status": "active",
  "description": "Last-mile delivery vehicle for the San Francisco area. Used for daily distribution and on-demand deliveries.",
  "region": "San Francisco, CA",
  "address": "Near Market St",
  "latitude": 37.7929,
  "longitude": -122.411,
  "createdAt": "2025-01-20T08:00:00Z",
  "updatedAt": "2025-01-26T18:24:00Z"
}
```

## 2. Validation rules

String fields are **trimmed** before validation and storage, on both client and server.

| Field | Rule | Error message (canonical) |
|---|---|---|
| `code` | required; 2–20 chars; matches `^[A-Za-z0-9][A-Za-z0-9-]*$`; stored **uppercased**; unique (case-insensitive) | `code is required` / `code must be 2-20 characters` / `code may contain only letters, digits and hyphens` / `code already exists` |
| `name` | required; 1–100 chars | `name is required` / `name must be at most 100 characters` |
| `type` | required; one of `vehicle`, `iot_sensor`, `facility` | `type must be one of: vehicle, iot_sensor, facility` |
| `status` | required; one of `active`, `inactive`, `maintenance` | `status must be one of: active, inactive, maintenance` |
| `description` | optional; ≤ 500 chars | `description must be at most 500 characters` |
| `region` | optional; ≤ 100 chars | `region must be at most 100 characters` |
| `address` | optional; ≤ 200 chars | `address must be at most 200 characters` |
| `latitude` | required; finite number; −90 ≤ lat ≤ 90 | `latitude is required` / `latitude must be between -90 and 90` |
| `longitude` | required; finite number; −180 ≤ lng ≤ 180 | `longitude is required` / `longitude must be between -180 and 180` |

### Server-only checks

- Request body must be valid JSON, and is at most **1 MiB**. Errors → `400 invalid_json`.
- **Unknown fields are rejected** (`json.Decoder.DisallowUnknownFields`). Error → `400 invalid_json`.
- Wrong JSON types (e.g. `"latitude": "abc"`) → `400 invalid_json`, naming the field when possible.
- Missing required numbers are detected with pointer fields (`*float64`), so `0` is a valid coordinate and is distinct from "missing".
- `id`, `createdAt` and `updatedAt` in a request body count as unknown fields (they are read-only).
- `code` uniqueness is enforced by the DB constraint and mapped to `409 conflict` on field `code`.
- The `{id}` path parameter must be a valid UUID → otherwise `400 invalid_id`.
- SQLite `CHECK` constraints are a last line of defence (defence in depth).

### Client-only behaviour

- Lat/lng inputs accept typed values or a click on the map ("pick location" mode). Values are rounded to **6 decimals** (about 0.1 m).
- Errors are shown inline under each field. Submit is disabled while a request is in flight.
- Server `422`/`409` `details[]` are mapped onto the same form fields with `setError`, so server-side rules surface identically.

## 3. Enumerations: display mapping (frontend)

| `type` | Label | Group heading | Icon (lucide-react) |
|---|---|---|---|
| `vehicle` | Vehicle | Vehicles | `Car` (or `Truck` if name contains "truck", cosmetic only) |
| `iot_sensor` | IoT Sensor | IoT Sensors | `Radio` / `Thermometer` (cosmetic) |
| `facility` | Facility | Facilities | `Building2` / `Zap` (cosmetic) |

| `status` | Label | Colour | Legend text |
|---|---|---|---|
| `active` | Active | green `#22a447` | Operating normally |
| `inactive` | Inactive | grey `#8a8f98` | Offline or not in service |
| `maintenance` | Maintenance | orange `#f59e0b` | Under maintenance |

## 4. Seed data

Loaded on first start when the table is empty, unless `SEED=false` is set. Taken from the mockup. Coordinates are approximate real-world locations.

| Code | Name | Type | Status | Region | Address | Lat | Lng |
|---|---|---|---|---|---|---|---|
| DV-101 | Delivery Vehicle DV-101 | vehicle | active | San Francisco, CA | Near Market St | 37.7929 | -122.4110 |
| TR-204 | Truck TR-204 | vehicle | maintenance | Oakland, CA | I-880 (Oakland) | 37.7990 | -122.2840 |
| TS-01 | Temperature Sensor TS-01 | iot_sensor | active | SF Warehouse | Warehouse – Bayview | 37.7350 | -122.3830 |
| AQ-07 | Air Quality Sensor AQ-07 | iot_sensor | inactive | Mission District | Mission St | 37.7599 | -122.4148 |
| WH-001 | Warehouse WH-001 | facility | active | San Francisco, CA | Bayview Industrial Park | 37.7310 | -122.3900 |
| CS-02 | Charging Station CS-02 | facility | active | San Francisco, CA | Potrero Hill | 37.7605 | -122.4009 |

## 5. Extensibility

New entity types or statuses need: (1) the enum in this doc, (2) the Go constants and SQL `CHECK` (via a new migration), (3) the Zod enum and display mapping. No other code should switch on raw strings.
