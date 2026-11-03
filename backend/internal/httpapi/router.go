// Package httpapi exposes the entity service over REST (see docs/API.md).
package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/geoentity/backend/internal/entity"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func idParam(r *http.Request) string { return chi.URLParam(r, "id") }

// NewRouter builds the HTTP handler tree.
func NewRouter(svc *entity.Service, corsOrigins []string) http.Handler {
	h := &Handler{svc: svc}
	r := chi.NewRouter()

	r.Use(recoverer)
	r.Use(requestLogger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: corsOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Accept"},
		ExposedHeaders: []string{"Location"},
		MaxAge:         300,
	}))

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "Route not found.")
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed.")
	})

	r.Get("/healthz", h.health)
	r.Route("/api/v1/entities", func(r chi.Router) {
		r.Get("/", h.list)
		r.Post("/", h.create)
		r.Get("/{id}", h.get)
		r.Put("/{id}", h.update)
		r.Delete("/{id}", h.delete)
	})
	return r
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "status", sw.status, "duration", time.Since(start))
	})
}

func recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic", "value", rec)
				writeError(w, http.StatusInternalServerError, "internal", "Internal server error.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
