package sqlite

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/geoentity/backend/internal/entity"
)

func newRepo(t *testing.T) *Repository {
	t.Helper()
	r, err := Open(filepath.Join(t.TempDir(), "sub", "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { r.Close() })
	return r
}

func fp(v float64) *float64 { return &v }

func in(code, name string, typ entity.Type, st entity.Status) entity.Input {
	return entity.Input{Code: code, Name: name, Type: typ, Status: st, Latitude: fp(37.7), Longitude: fp(-122.4)}
}

func TestCRUD(t *testing.T) {
	ctx := context.Background()
	svc := entity.NewService(newRepo(t))

	created, err := svc.Create(ctx, in("a-1", "Alpha", entity.TypeVehicle, entity.StatusActive))
	if err != nil {
		t.Fatal(err)
	}
	if created.Code != "A-1" || created.ID == "" || created.CreatedAt.IsZero() {
		t.Fatalf("bad created: %+v", created)
	}

	got, err := svc.Get(ctx, created.ID)
	if err != nil || got != created {
		t.Fatalf("get: %v %+v vs %+v", err, got, created)
	}

	upd := in("A-1", "Alpha 2", entity.TypeFacility, entity.StatusMaintenance)
	upd.Latitude, upd.Longitude = fp(0), fp(0) // zero coords are valid
	updated, err := svc.Update(ctx, created.ID, upd)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "Alpha 2" || updated.Latitude != 0 || !updated.CreatedAt.Equal(created.CreatedAt) || updated.UpdatedAt.Before(created.UpdatedAt) {
		t.Fatalf("bad update: %+v", updated)
	}

	if err := svc.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Get(ctx, created.ID); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	if err := svc.Delete(ctx, created.ID); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("want ErrNotFound on second delete, got %v", err)
	}
}

func TestConflictCaseInsensitive(t *testing.T) {
	ctx := context.Background()
	svc := entity.NewService(newRepo(t))
	if _, err := svc.Create(ctx, in("DV-1", "One", entity.TypeVehicle, entity.StatusActive)); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(ctx, in("dv-1", "Two", entity.TypeVehicle, entity.StatusActive)); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("want ErrConflict, got %v", err)
	}
	other, _ := svc.Create(ctx, in("DV-2", "Three", entity.TypeVehicle, entity.StatusActive))
	if _, err := svc.Update(ctx, other.ID, in("DV-1", "Three", entity.TypeVehicle, entity.StatusActive)); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("update: want ErrConflict, got %v", err)
	}
}

func TestListFilters(t *testing.T) {
	ctx := context.Background()
	svc := entity.NewService(newRepo(t))
	svc.Create(ctx, in("V1", "Van", entity.TypeVehicle, entity.StatusActive))
	svc.Create(ctx, in("S1", "Sensor 100%", entity.TypeIoTSense, entity.StatusInactive))
	svc.Create(ctx, in("F1", "Depot", entity.TypeFacility, entity.StatusActive))

	count := func(f entity.Filter) int {
		items, err := svc.List(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		return len(items)
	}
	if n := count(entity.Filter{}); n != 3 {
		t.Errorf("all: %d", n)
	}
	if n := count(entity.Filter{Status: entity.StatusActive}); n != 2 {
		t.Errorf("active: %d", n)
	}
	if n := count(entity.Filter{Type: entity.TypeFacility}); n != 1 {
		t.Errorf("facility: %d", n)
	}
	if n := count(entity.Filter{Query: "DEPOT"}); n != 1 {
		t.Errorf("q depot: %d", n)
	}
	if n := count(entity.Filter{Query: "%"}); n != 1 { // literal %, not wildcard
		t.Errorf("q %%: %d", n)
	}
	if n := count(entity.Filter{Query: "'; DROP TABLE entities;--"}); n != 0 {
		t.Errorf("injection: %d", n)
	}
	if n := count(entity.Filter{}); n != 3 {
		t.Errorf("table damaged: %d", n)
	}
	if _, err := svc.List(ctx, entity.Filter{Type: "bogus"}); !errors.Is(err, entity.ErrInvalidFilter) {
		t.Errorf("bogus type: %v", err)
	}
}

func TestPersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "p.db")
	r1, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := entity.NewService(r1).Create(context.Background(), in("P1", "Persist", entity.TypeVehicle, entity.StatusActive)); err != nil {
		t.Fatal(err)
	}
	r1.Close()
	r2, err := Open(path) // also re-runs migrations idempotently
	if err != nil {
		t.Fatal(err)
	}
	defer r2.Close()
	if n, _ := r2.Count(context.Background()); n != 1 {
		t.Fatalf("want 1 row after reopen, got %d", n)
	}
}

func TestSeedIfEmpty(t *testing.T) {
	ctx := context.Background()
	r := newRepo(t)
	n, err := SeedIfEmpty(ctx, r)
	if err != nil || n != 6 {
		t.Fatalf("seed: %d %v", n, err)
	}
	n, err = SeedIfEmpty(ctx, r)
	if err != nil || n != 0 {
		t.Fatalf("second seed must be no-op: %d %v", n, err)
	}
}

func TestCheckConstraintsLastLineOfDefence(t *testing.T) {
	r := newRepo(t)
	_, err := r.db.Exec(`INSERT INTO entities (id,code,name,type,status,latitude,longitude,created_at,updated_at) VALUES ('x','X1','n','vehicle','active',95,0,'t','t')`)
	if err == nil {
		t.Fatal("CHECK on latitude should reject 95")
	}
}
