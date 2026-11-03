package entity

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Service implements entity use cases on top of a Repository.
type Service struct {
	repo Repository
	now  func() time.Time
}

// NewService builds a Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo, now: func() time.Time { return time.Now().UTC().Truncate(time.Millisecond) }}
}

// ParseID validates that id is a UUID.
func ParseID(id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return ErrInvalidID
	}
	return nil
}

func prepare(in Input) (Input, error) {
	in = in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		return in, &ValidationError{Fields: errs}
	}
	return in, nil
}

func build(in Input) Entity {
	return Entity{
		Code: in.Code, Name: in.Name, Type: in.Type, Status: in.Status,
		Description: in.Description, Region: in.Region, Address: in.Address,
		Latitude: *in.Latitude, Longitude: *in.Longitude,
	}
}

// List returns entities matching f.
func (s *Service) List(ctx context.Context, f Filter) ([]Entity, error) {
	if f.Type != "" && !f.Type.IsValid() {
		return nil, ErrInvalidFilter
	}
	if f.Status != "" && !f.Status.IsValid() {
		return nil, ErrInvalidFilter
	}
	f.Query = strings.TrimSpace(f.Query)
	return s.repo.List(ctx, f)
}

// Get returns one entity.
func (s *Service) Get(ctx context.Context, id string) (Entity, error) {
	if err := ParseID(id); err != nil {
		return Entity{}, err
	}
	return s.repo.Get(ctx, id)
}

// Create validates and stores a new entity.
func (s *Service) Create(ctx context.Context, in Input) (Entity, error) {
	in, err := prepare(in)
	if err != nil {
		return Entity{}, err
	}
	e := build(in)
	e.ID = uuid.NewString()
	e.CreatedAt = s.now()
	e.UpdatedAt = e.CreatedAt
	if err := s.repo.Create(ctx, e); err != nil {
		return Entity{}, err
	}
	return e, nil
}

// Update validates and replaces an existing entity.
func (s *Service) Update(ctx context.Context, id string, in Input) (Entity, error) {
	if err := ParseID(id); err != nil {
		return Entity{}, err
	}
	in, err := prepare(in)
	if err != nil {
		return Entity{}, err
	}
	existing, err := s.repo.Get(ctx, id)
	if err != nil {
		return Entity{}, err
	}
	e := build(in)
	e.ID = id
	e.CreatedAt = existing.CreatedAt
	e.UpdatedAt = s.now()
	if err := s.repo.Update(ctx, e); err != nil {
		return Entity{}, err
	}
	return e, nil
}

// Delete removes an entity.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := ParseID(id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

// Ping checks the backing store.
func (s *Service) Ping(ctx context.Context) error { return s.repo.Ping(ctx) }
