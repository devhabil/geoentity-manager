// Package config reads runtime configuration from environment variables.
package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds runtime settings.
type Config struct {
	Port        string
	DBPath      string
	CORSOrigins []string
	Seed        bool
}

// Load reads configuration, applying the defaults documented in ARCHITECTURE.md §5.
func Load() Config {
	return Config{
		Port:        get("PORT", "8080"),
		DBPath:      get("DB_PATH", "./data/geoentity.db"),
		CORSOrigins: splitList(get("CORS_ORIGINS", "http://localhost:5173")),
		Seed:        getBool("SEED", true),
	}
}

func get(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func getBool(key string, def bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
