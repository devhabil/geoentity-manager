package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/geoentity/backend/internal/entity"
)

const maxBodyBytes = 1 << 20 // 1 MiB

// Handler groups the entity endpoints.
type Handler struct {
	svc *entity.Service
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "unavailable", "Database unavailable.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.svc.List(r.Context(), entity.Filter{
		Type:   entity.Type(q.Get("type")),
		Status: entity.Status(q.Get("status")),
		Query:  q.Get("q"),
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeData(w, http.StatusOK, items)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	e, err := h.svc.Get(r.Context(), idParam(r))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeData(w, http.StatusOK, e)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	in, ok := decodeInput(w, r)
	if !ok {
		return
	}
	e, err := h.svc.Create(r.Context(), in)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	w.Header().Set("Location", "/api/v1/entities/"+e.ID)
	writeData(w, http.StatusCreated, e)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	in, ok := decodeInput(w, r)
	if !ok {
		return
	}
	e, err := h.svc.Update(r.Context(), idParam(r), in)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeData(w, http.StatusOK, e)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), idParam(r)); err != nil {
		writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// decodeInput strictly decodes the JSON body: size-limited, unknown fields
// rejected, single JSON value only. On failure it writes a 400 and returns false.
func decodeInput(w http.ResponseWriter, r *http.Request) (entity.Input, bool) {
	var in entity.Input
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		var maxErr *http.MaxBytesError
		var typeErr *json.UnmarshalTypeError
		msg := "Request body is not valid JSON."
		switch {
		case errors.As(err, &maxErr):
			msg = "Request body is too large (max 1 MiB)."
		case errors.As(err, &typeErr):
			msg = "Field \"" + typeErr.Field + "\" has the wrong type."
		case errors.Is(err, io.EOF):
			msg = "Request body is empty."
		default:
			msg = "Request body is invalid: " + err.Error()
		}
		writeError(w, http.StatusBadRequest, "invalid_json", msg)
		return in, false
	}
	if dec.More() {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must contain a single JSON object.")
		return in, false
	}
	return in, true
}
