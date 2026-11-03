-- 001_create_entities.sql
CREATE TABLE IF NOT EXISTS entities (
    id          TEXT PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('vehicle','iot_sensor','facility')),
    status      TEXT NOT NULL CHECK (status IN ('active','inactive','maintenance')),
    description TEXT NOT NULL DEFAULT '',
    region      TEXT NOT NULL DEFAULT '',
    address     TEXT NOT NULL DEFAULT '',
    latitude    REAL NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude   REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type_name ON entities (type, name);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities (status);
