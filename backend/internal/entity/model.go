// Package entity holds the domain model, validation rules and service logic.
// It has no HTTP or SQL dependencies. See docs/DATA_MODEL.md for the spec.
package entity

import (
	"context"
	"time"
)

// Type is the kind of real-world object an entity represents.
type Type string

// Status is the operational state of an entity.
type Status string

const (
	TypeVehicle  Type = "vehicle"
	TypeIoTSense Type = "iot_sensor"
	TypeFacility Type = "facility"

	StatusActive      Status = "active"
	StatusInactive    Status = "inactive"
	StatusMaintenance Status = "maintenance"
)

// Types lists all valid entity types.
var Types = []Type{TypeVehicle, TypeIoTSense, TypeFacility}

// Statuses lists all valid statuses.
var Statuses = []Status{StatusActive, StatusInactive, StatusMaintenance}

// IsValid reports whether t is a known type.
func (t Type) IsValid() bool {
	for _, v := range Types {
		if v == t {
			return true
		}
	}
	return false
}

// IsValid reports whether s is a known status.
func (s Status) IsValid() bool {
	for _, v := range Statuses {
		if v == s {
			return true
		}
	}
	return false
}

// Entity is a geo-located object.
type Entity struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Type        Type      `json:"type"`
	Status      Status    `json:"status"`
	Description string    `json:"description"`
	Region      string    `json:"region"`
	Address     string    `json:"address"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Input is the client-writable subset of Entity. Coordinates are pointers so
// that a missing value can be distinguished from a valid 0.
// Unknown JSON fields (id, createdAt, ...) are rejected by the HTTP layer.
type Input struct {
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Type        Type     `json:"type"`
	Status      Status   `json:"status"`
	Description string   `json:"description"`
	Region      string   `json:"region"`
	Address     string   `json:"address"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
}

// Filter restricts List results. Zero values mean "no filter".
type Filter struct {
	Type   Type
	Status Status
	Query  string
}

// Repository is the persistence port implemented by storage packages.
// Implementations must return ErrNotFound / ErrConflict where applicable.
type Repository interface {
	List(ctx context.Context, f Filter) ([]Entity, error)
	Get(ctx context.Context, id string) (Entity, error)
	Create(ctx context.Context, e Entity) error
	Update(ctx context.Context, e Entity) error
	Delete(ctx context.Context, id string) error
	Count(ctx context.Context) (int, error)
	Ping(ctx context.Context) error
}
