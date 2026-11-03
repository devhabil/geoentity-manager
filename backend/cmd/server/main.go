// Command server runs the GeoEntity Manager REST API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/geoentity/backend/internal/config"
	"github.com/geoentity/backend/internal/entity"
	"github.com/geoentity/backend/internal/httpapi"
	"github.com/geoentity/backend/internal/storage/sqlite"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.Load()

	repo, err := sqlite.Open(cfg.DBPath)
	if err != nil {
		return err
	}
	defer repo.Close()

	if cfg.Seed {
		n, err := sqlite.SeedIfEmpty(context.Background(), repo)
		if err != nil {
			return err
		}
		if n > 0 {
			slog.Info("seeded sample entities", "count", n)
		}
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.NewRouter(entity.NewService(repo), cfg.CORSOrigins),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", srv.Addr, "db", cfg.DBPath)
		errCh <- srv.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-stop:
		slog.Info("shutting down")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(ctx)
	}
	return nil
}
