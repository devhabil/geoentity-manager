// Package sqlite implements entity.Repository on SQLite (pure-Go driver).
package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/geoentity/backend/internal/entity"
	sqlite3 "modernc.org/sqlite"
	sqlite3lib "modernc.org/sqlite/lib"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Repository is the SQLite-backed entity.Repository.
type Repository struct {
	db *sql.DB
}

var _ entity.Repository = (*Repository)(nil)

// Open opens (creating if needed) the database at path and runs migrations.
// Use ":memory:" only for single-connection tests.
func Open(path string) (*Repository, error) {
	if path != ":memory:" {
		if dir := filepath.Dir(path); dir != "." {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return nil, fmt.Errorf("create db dir: %w", err)
			}
		}
	}
	dsn := path + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// SQLite allows one writer; a single connection avoids SQLITE_BUSY and
	// keeps ":memory:" databases consistent.
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	r := &Repository{db: db}
	if err := r.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return r, nil
}

// Close closes the database.
func (r *Repository) Close() error { return r.db.Close() }

func (r *Repository) migrate() error {
	if _, err := r.db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`); err != nil {
		return err
	}
	files, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(files))
	for _, f := range files {
		names = append(names, f.Name())
	}
	sort.Strings(names)
	for _, name := range names {
		var n int
		if err := r.db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, name).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			continue
		}
		body, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		tx, err := r.db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(string(body)); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s: %w", name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, name, time.Now().UTC().Format(time.RFC3339)); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

const columns = `id, code, name, type, status, description, region, address, latitude, longitude, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

func scan(s scanner) (entity.Entity, error) {
	var e entity.Entity
	var typ, status, created, updated string
	if err := s.Scan(&e.ID, &e.Code, &e.Name, &typ, &status, &e.Description, &e.Region, &e.Address, &e.Latitude, &e.Longitude, &created, &updated); err != nil {
		return entity.Entity{}, err
	}
	e.Type, e.Status = entity.Type(typ), entity.Status(status)
	var err error
	if e.CreatedAt, err = time.Parse(time.RFC3339Nano, created); err != nil {
		return entity.Entity{}, err
	}
	if e.UpdatedAt, err = time.Parse(time.RFC3339Nano, updated); err != nil {
		return entity.Entity{}, err
	}
	return e, nil
}

func ts(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }

// escapeLike escapes LIKE wildcards so user input is matched literally.
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}

// List implements entity.Repository. All values are bound parameters.
func (r *Repository) List(ctx context.Context, f entity.Filter) ([]entity.Entity, error) {
	q := `SELECT ` + columns + ` FROM entities`
	var where []string
	var args []any
	if f.Type != "" {
		where = append(where, "type = ?")
		args = append(args, string(f.Type))
	}
	if f.Status != "" {
		where = append(where, "status = ?")
		args = append(args, string(f.Status))
	}
	if f.Query != "" {
		like := "%" + escapeLike(strings.ToLower(f.Query)) + "%"
		where = append(where, `(LOWER(name) LIKE ? ESCAPE '\' OR LOWER(code) LIKE ? ESCAPE '\' OR LOWER(region) LIKE ? ESCAPE '\' OR LOWER(address) LIKE ? ESCAPE '\')`)
		args = append(args, like, like, like, like)
	}
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	q += " ORDER BY type, name"

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []entity.Entity{}
	for rows.Next() {
		e, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// Get implements entity.Repository.
func (r *Repository) Get(ctx context.Context, id string) (entity.Entity, error) {
	e, err := scan(r.db.QueryRowContext(ctx, `SELECT `+columns+` FROM entities WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Entity{}, entity.ErrNotFound
	}
	return e, err
}

func isUnique(err error) bool {
	var se *sqlite3.Error
	if errors.As(err, &se) {
		return se.Code() == sqlite3lib.SQLITE_CONSTRAINT_UNIQUE || se.Code() == sqlite3lib.SQLITE_CONSTRAINT_PRIMARYKEY
	}
	return false
}

// Create implements entity.Repository.
func (r *Repository) Create(ctx context.Context, e entity.Entity) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO entities (`+columns+`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
		e.ID, e.Code, e.Name, string(e.Type), string(e.Status), e.Description, e.Region, e.Address,
		e.Latitude, e.Longitude, ts(e.CreatedAt), ts(e.UpdatedAt))
	if isUnique(err) {
		return entity.ErrConflict
	}
	return err
}

// Update implements entity.Repository.
func (r *Repository) Update(ctx context.Context, e entity.Entity) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE entities SET code=?, name=?, type=?, status=?, description=?, region=?, address=?, latitude=?, longitude=?, updated_at=? WHERE id=?`,
		e.Code, e.Name, string(e.Type), string(e.Status), e.Description, e.Region, e.Address,
		e.Latitude, e.Longitude, ts(e.UpdatedAt), e.ID)
	if isUnique(err) {
		return entity.ErrConflict
	}
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return entity.ErrNotFound
	}
	return nil
}

// Delete implements entity.Repository.
func (r *Repository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM entities WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return entity.ErrNotFound
	}
	return nil
}

// Count implements entity.Repository.
func (r *Repository) Count(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM entities`).Scan(&n)
	return n, err
}

// Ping implements entity.Repository.
func (r *Repository) Ping(ctx context.Context) error { return r.db.PingContext(ctx) }
