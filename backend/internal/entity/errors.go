package entity

import "errors"

var (
	// ErrNotFound is returned when an entity does not exist.
	ErrNotFound = errors.New("entity not found")
	// ErrConflict is returned when a unique constraint (code) is violated.
	ErrConflict = errors.New("entity code already exists")
	// ErrInvalidID is returned when an id is not a valid UUID.
	ErrInvalidID = errors.New("invalid id")
	// ErrInvalidFilter is returned for unknown type/status filters.
	ErrInvalidFilter = errors.New("invalid filter")
)

// FieldError describes one invalid field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationError aggregates every field error found in an input.
type ValidationError struct {
	Fields []FieldError
}

func (e *ValidationError) Error() string { return "validation failed" }
