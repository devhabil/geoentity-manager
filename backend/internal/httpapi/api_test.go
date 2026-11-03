package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/geoentity/backend/internal/entity"
	"github.com/geoentity/backend/internal/storage/sqlite"
)

const validBody = `{"code":"dv-102","name":"Van","type":"vehicle","status":"active","description":"d","region":"SF","address":"Market","latitude":37.79,"longitude":-122.41}`

func newServer(t *testing.T) http.Handler {
	t.Helper()
	repo, err := sqlite.Open(filepath.Join(t.TempDir(), "api.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { repo.Close() })
	return NewRouter(entity.NewService(repo), []string{"http://localhost:5173"})
}

func do(h http.Handler, method, path, body string, hdr ...string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	for i := 0; i+1 < len(hdr); i += 2 {
		req.Header.Set(hdr[i], hdr[i+1])
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

type envelope struct {
	Data  json.RawMessage `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		Details []struct {
			Field   string `json:"field"`
			Message string `json:"message"`
		} `json:"details"`
	} `json:"error"`
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) envelope {
	t.Helper()
	var e envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &e); err != nil {
		t.Fatalf("bad json %q: %v", rec.Body.String(), err)
	}
	return e
}

func create(t *testing.T, h http.Handler, body string) entity.Entity {
	t.Helper()
	rec := do(h, "POST", "/api/v1/entities", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var e entity.Entity
	json.Unmarshal(decode(t, rec).Data, &e)
	return e
}

func TestHealth(t *testing.T) {
	rec := do(newServer(t), "GET", "/healthz", "")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"ok"`) {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}

func TestCreateGetListUpdateDelete(t *testing.T) {
	h := newServer(t)

	// Create
	rec := do(h, "POST", "/api/v1/entities", validBody)
	if rec.Code != 201 {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var e entity.Entity
	json.Unmarshal(decode(t, rec).Data, &e)
	if e.Code != "DV-102" || e.ID == "" {
		t.Fatalf("bad entity %+v", e)
	}
	if loc := rec.Header().Get("Location"); loc != "/api/v1/entities/"+e.ID {
		t.Fatalf("Location=%q", loc)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("content-type %q", ct)
	}

	// Get
	rec = do(h, "GET", "/api/v1/entities/"+e.ID, "")
	if rec.Code != 200 {
		t.Fatalf("get: %d", rec.Code)
	}

	// List
	rec = do(h, "GET", "/api/v1/entities", "")
	var list []entity.Entity
	json.Unmarshal(decode(t, rec).Data, &list)
	if rec.Code != 200 || len(list) != 1 {
		t.Fatalf("list: %d %d", rec.Code, len(list))
	}

	// Update (PUT)
	upd := strings.Replace(validBody, `"name":"Van"`, `"name":"Van Two"`, 1)
	upd = strings.Replace(upd, `"status":"active"`, `"status":"maintenance"`, 1)
	rec = do(h, "PUT", "/api/v1/entities/"+e.ID, upd)
	if rec.Code != 200 {
		t.Fatalf("update: %d %s", rec.Code, rec.Body)
	}
	var u entity.Entity
	json.Unmarshal(decode(t, rec).Data, &u)
	if u.Name != "Van Two" || u.Status != entity.StatusMaintenance || !u.CreatedAt.Equal(e.CreatedAt) || u.ID != e.ID {
		t.Fatalf("bad update %+v", u)
	}

	// Delete
	rec = do(h, "DELETE", "/api/v1/entities/"+e.ID, "")
	if rec.Code != 204 || rec.Body.Len() != 0 {
		t.Fatalf("delete: %d %q", rec.Code, rec.Body)
	}
	if rec = do(h, "GET", "/api/v1/entities/"+e.ID, ""); rec.Code != 404 {
		t.Fatalf("get after delete: %d", rec.Code)
	}
	rec = do(h, "GET", "/api/v1/entities", "")
	if !strings.Contains(rec.Body.String(), `"data":[]`) {
		t.Fatalf("empty list must be [] not null: %s", rec.Body)
	}
}

func TestListFiltersAndInvalid(t *testing.T) {
	h := newServer(t)
	create(t, h, validBody)
	create(t, h, `{"code":"WH-1","name":"Depot","type":"facility","status":"inactive","latitude":1,"longitude":2}`)

	count := func(q string) int {
		rec := do(h, "GET", "/api/v1/entities"+q, "")
		if rec.Code != 200 {
			t.Fatalf("%s: %d", q, rec.Code)
		}
		var l []entity.Entity
		json.Unmarshal(decode(t, rec).Data, &l)
		return len(l)
	}
	if count("?type=vehicle") != 1 || count("?status=inactive") != 1 || count("?q=depot") != 1 || count("?type=vehicle&status=inactive") != 0 {
		t.Fatal("filters wrong")
	}
	for _, q := range []string{"?type=bogus", "?status=bogus"} {
		rec := do(h, "GET", "/api/v1/entities"+q, "")
		if rec.Code != 400 || decode(t, rec).Error.Code != "invalid_query" {
			t.Fatalf("%s: %d %s", q, rec.Code, rec.Body)
		}
	}
}

func TestValidationErrors422(t *testing.T) {
	h := newServer(t)
	rec := do(h, "POST", "/api/v1/entities", `{"code":"X-1","name":"","type":"drone","status":"broken","latitude":91,"longitude":-181}`)
	if rec.Code != 422 {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	env := decode(t, rec)
	if env.Error.Code != "validation_failed" {
		t.Fatalf("code %q", env.Error.Code)
	}
	got := map[string]string{}
	for _, d := range env.Error.Details {
		got[d.Field] = d.Message
	}
	want := map[string]string{
		"name":      "name is required",
		"type":      "type must be one of: vehicle, iot_sensor, facility",
		"status":    "status must be one of: active, inactive, maintenance",
		"latitude":  "latitude must be between -90 and 90",
		"longitude": "longitude must be between -180 and 180",
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s: got %q want %q", k, got[k], v)
		}
	}
	// nothing was stored
	if !strings.Contains(do(h, "GET", "/api/v1/entities", "").Body.String(), `"data":[]`) {
		t.Fatal("invalid entity was stored")
	}
}

func TestMissingCoordinates422(t *testing.T) {
	rec := do(newServer(t), "POST", "/api/v1/entities", `{"code":"X-1","name":"n","type":"vehicle","status":"active"}`)
	if rec.Code != 422 || !strings.Contains(rec.Body.String(), "latitude is required") || !strings.Contains(rec.Body.String(), "longitude is required") {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}

func TestZeroCoordinatesAccepted(t *testing.T) {
	create(t, newServer(t), `{"code":"Z-1","name":"Null Island","type":"facility","status":"active","latitude":0,"longitude":0}`)
}

func TestBadJSON400(t *testing.T) {
	h := newServer(t)
	cases := map[string]string{
		"malformed":     `{"code":`,
		"empty":         ``,
		"wrong type":    `{"code":"X-1","name":"n","type":"vehicle","status":"active","latitude":"abc","longitude":0}`,
		"unknown field": `{"code":"X-1","name":"n","type":"vehicle","status":"active","latitude":1,"longitude":1,"foo":1}`,
		"id in body":    `{"id":"123","code":"X-1","name":"n","type":"vehicle","status":"active","latitude":1,"longitude":1}`,
		"createdAt":     `{"createdAt":"2020-01-01T00:00:00Z","code":"X-1","name":"n","type":"vehicle","status":"active","latitude":1,"longitude":1}`,
		"trailing":      validBody + `{"x":1}`,
		"array":         `[]`,
		"too large":     `{"description":"` + strings.Repeat("a", 1<<20+10) + `"}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			rec := do(h, "POST", "/api/v1/entities", body)
			if rec.Code != 400 || decode(t, rec).Error.Code != "invalid_json" {
				t.Fatalf("%d %s", rec.Code, rec.Body)
			}
		})
	}
}

func TestDuplicateCode409(t *testing.T) {
	h := newServer(t)
	create(t, h, validBody)
	rec := do(h, "POST", "/api/v1/entities", strings.Replace(validBody, "dv-102", "DV-102", 1))
	env := decode(t, rec)
	if rec.Code != 409 || env.Error.Code != "conflict" || env.Error.Details[0].Field != "code" {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}

func TestInvalidIDAndNotFound(t *testing.T) {
	h := newServer(t)
	for _, m := range []string{"GET", "DELETE"} {
		if rec := do(h, m, "/api/v1/entities/not-a-uuid", ""); rec.Code != 400 || decode(t, rec).Error.Code != "invalid_id" {
			t.Errorf("%s bad id: %d %s", m, rec.Code, rec.Body)
		}
	}
	if rec := do(h, "PUT", "/api/v1/entities/not-a-uuid", validBody); rec.Code != 400 {
		t.Errorf("PUT bad id: %d", rec.Code)
	}
	missing := "/api/v1/entities/6f1c7c2e-8f0b-4a37-9c52-1b5c3a2f9d10"
	for _, m := range []string{"GET", "DELETE"} {
		if rec := do(h, m, missing, ""); rec.Code != 404 || decode(t, rec).Error.Code != "not_found" {
			t.Errorf("%s missing: %d %s", m, rec.Code, rec.Body)
		}
	}
	if rec := do(h, "PUT", missing, validBody); rec.Code != 404 {
		t.Errorf("PUT missing: %d", rec.Code)
	}
}

func TestUpdateValidationAndConflict(t *testing.T) {
	h := newServer(t)
	a := create(t, h, validBody)
	create(t, h, strings.Replace(validBody, "dv-102", "dv-103", 1))
	if rec := do(h, "PUT", "/api/v1/entities/"+a.ID, strings.Replace(validBody, `"latitude":37.79`, `"latitude":-95`, 1)); rec.Code != 422 {
		t.Errorf("update invalid: %d", rec.Code)
	}
	if rec := do(h, "PUT", "/api/v1/entities/"+a.ID, strings.Replace(validBody, "dv-102", "DV-103", 1)); rec.Code != 409 {
		t.Errorf("update conflict: %d", rec.Code)
	}
	// same entity keeping its own code is fine
	if rec := do(h, "PUT", "/api/v1/entities/"+a.ID, validBody); rec.Code != 200 {
		t.Errorf("update same code: %d %s", rec.Code, rec.Body)
	}
}

func TestRoutingErrors(t *testing.T) {
	h := newServer(t)
	if rec := do(h, "PATCH", "/api/v1/entities/6f1c7c2e-8f0b-4a37-9c52-1b5c3a2f9d10", ""); rec.Code != 405 || decode(t, rec).Error.Code != "method_not_allowed" {
		t.Errorf("405: %d %s", rec.Code, rec.Body)
	}
	if rec := do(h, "GET", "/nope", ""); rec.Code != 404 || decode(t, rec).Error.Code != "not_found" {
		t.Errorf("404: %d %s", rec.Code, rec.Body)
	}
}

func TestCORS(t *testing.T) {
	h := newServer(t)
	rec := do(h, "OPTIONS", "/api/v1/entities", "", "Origin", "http://localhost:5173", "Access-Control-Request-Method", "POST", "Access-Control-Request-Headers", "content-type")
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("allowed origin header=%q status=%d", got, rec.Code)
	}
	rec = do(h, "GET", "/api/v1/entities", "", "Origin", "http://evil.example")
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("disallowed origin got header %q", got)
	}
}

func TestSQLInjectionInPathAndBody(t *testing.T) {
	h := newServer(t)
	create(t, h, validBody)
	if rec := do(h, "GET", "/api/v1/entities/1%27%20OR%20%271%27=%271", ""); rec.Code != 400 {
		t.Errorf("injection id: %d", rec.Code)
	}
	body := strings.Replace(validBody, `"name":"Van"`, `"name":"x'); DROP TABLE entities;--"`, 1)
	body = strings.Replace(body, "dv-102", "dv-999", 1)
	e := create(t, h, body)
	if e.Name != "x'); DROP TABLE entities;--" {
		t.Errorf("name stored as %q", e.Name)
	}
	if rec := do(h, "GET", "/api/v1/entities", ""); !strings.Contains(rec.Body.String(), "DV-102") {
		t.Error("table damaged")
	}
}
