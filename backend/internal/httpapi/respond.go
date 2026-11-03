package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/geoentity/backend/internal/entity"
)

type errorBody struct {
	Error errorPayload `json:"error"`
}

type errorPayload struct {
	Code    string              `json:"code"`
	Message string              `json:"message"`
	Details []entity.FieldError `json:"details,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			slog.Error("encode response", "err", err)
		}
	}
}

func writeData(w http.ResponseWriter, status int, v any) {
	writeJSON(w, status, map[string]any{"data": v})
}

func writeError(w http.ResponseWriter, status int, code, msg string, details ...entity.FieldError) {
	writeJSON(w, status, errorBody{errorPayload{Code: code, Message: msg, Details: details}})
}

// writeServiceError is the single place where domain errors map to HTTP.
func writeServiceError(w http.ResponseWriter, err error) {
	var verr *entity.ValidationError
	switch {
	case errors.As(err, &verr):
		writeError(w, http.StatusUnprocessableEntity, "validation_failed", "One or more fields are invalid.", verr.Fields...)
	case errors.Is(err, entity.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "Entity not found.")
	case errors.Is(err, entity.ErrConflict):
		writeError(w, http.StatusConflict, "conflict", "An entity with this code already exists.",
			entity.FieldError{Field: "code", Message: "code already exists"})
	case errors.Is(err, entity.ErrInvalidID):
		writeError(w, http.StatusBadRequest, "invalid_id", "The id must be a valid UUID.")
	case errors.Is(err, entity.ErrInvalidFilter):
		writeError(w, http.StatusBadRequest, "invalid_query", "Invalid type or status filter.")
	default:
		slog.Error("internal error", "err", err)
		writeError(w, http.StatusInternalServerError, "internal", "Internal server error.")
	}
}
