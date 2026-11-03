# REST API Specification (v1)

- Base URL (dev): `http://localhost:8080`. The Vite dev server proxies `/api` there.
- Content type: `application/json; charset=utf-8`.
- All entity routes live under `/api/v1`.
- Field definitions and validation rules: [DATA_MODEL.md](DATA_MODEL.md).

## Endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| `GET` | `/healthz` | Liveness and DB ping | `200 {"status":"ok"}` |
| `GET` | `/api/v1/entities` | List entities (optional filters) | `200` |
| `GET` | `/api/v1/entities/{id}` | Get one entity | `200` |
| `POST` | `/api/v1/entities` | Create entity | `201` + `Location` header |
| `PUT` | `/api/v1/entities/{id}` | Replace entity (full update) | `200` |
| `DELETE` | `/api/v1/entities/{id}` | Delete entity | `204` |

> `PUT` (full replacement) was chosen over `PATCH` because the edit form always submits the whole entity. It keeps validation identical for create and update.

### `GET /api/v1/entities`

Query parameters (all optional, combinable):

| Param | Example | Behaviour |
|---|---|---|
| `type` | `vehicle` | Exact match. Invalid value → `400 invalid_query` |
| `status` | `active` | Exact match. Invalid value → `400 invalid_query` |
| `q` | `market` | Case-insensitive substring over `name`, `code`, `region`, `address` |

Response: results are sorted by `type`, then `name`.

```json
{ "data": [ { "id": "…", "code": "DV-101", "...": "..." } ] }
```

> The frontend loads the full list once and filters client-side for instant feedback, because the dataset is small. The server-side filters exist so the API is usable on its own, and they are covered by tests.

### `GET /api/v1/entities/{id}`

`200 { "data": Entity }` · `400 invalid_id` · `404 not_found`

### `POST /api/v1/entities`

Request body (server-managed fields are rejected):

```json
{
  "code": "DV-102",
  "name": "Delivery Vehicle DV-102",
  "type": "vehicle",
  "status": "active",
  "description": "",
  "region": "San Francisco, CA",
  "address": "Embarcadero",
  "latitude": 37.7955,
  "longitude": -122.3937
}
```

`201 { "data": Entity }` with `Location: /api/v1/entities/{id}` · `400 invalid_json` · `409 conflict` · `422 validation_failed`

### `PUT /api/v1/entities/{id}`

Same body as `POST`. `updatedAt` is refreshed and `createdAt` is preserved.
`200 { "data": Entity }` · `400` · `404` · `409` · `422`

### `DELETE /api/v1/entities/{id}`

`204` (no body) · `400 invalid_id` · `404 not_found`

## Error envelope

Every non-2xx response uses this shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "latitude", "message": "latitude must be between -90 and 90" },
      { "field": "code", "message": "code is required" }
    ]
  }
}
```

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `invalid_json` | Malformed JSON, wrong types, unknown fields, body over 1 MiB |
| 400 | `invalid_id` | Path `{id}` is not a UUID |
| 400 | `invalid_query` | Bad `type` or `status` filter |
| 404 | `not_found` | Entity doesn't exist |
| 405 | `method_not_allowed` | Unsupported method on a known route |
| 409 | `conflict` | Duplicate `code` (`details[0].field = "code"`) |
| 422 | `validation_failed` | Domain validation failed. **All** field errors are returned at once |
| 500 | `internal` | Unexpected error. The message is generic and the detail is only logged |

## Cross-cutting behaviour

- **CORS:** allowed origins come from `CORS_ORIGINS` (default `http://localhost:5173`). This isn't needed when using the Vite proxy, but it allows running the frontend separately.
- **Logging:** structured request logs (`log/slog`) with method, path, status and duration.
- **Recovery:** panics are converted to `500 internal`.
- **Timeouts:** `ReadHeaderTimeout` and `ReadTimeout`/`WriteTimeout` are set on `http.Server`. Graceful shutdown happens on SIGINT/SIGTERM.

## curl smoke test

```bash
curl -s localhost:8080/api/v1/entities | jq '.data | length'
curl -s -X POST localhost:8080/api/v1/entities -H 'content-type: application/json' \
  -d '{"code":"X-1","name":"Test","type":"vehicle","status":"active","latitude":91,"longitude":0}'
# → 422 with details[0].field == "latitude"
```
