package entity

import (
	"strings"
	"testing"
)

func f(v float64) *float64 { return &v }

func validInput() Input {
	return Input{Code: "DV-101", Name: "Delivery Vehicle", Type: TypeVehicle, Status: StatusActive, Latitude: f(37.79), Longitude: f(-122.41)}
}

func fieldsOf(errs []FieldError) map[string]string {
	m := map[string]string{}
	for _, e := range errs {
		m[e.Field] = e.Message
	}
	return m
}

func TestValidate_Valid(t *testing.T) {
	if errs := validInput().Normalize().Validate(); len(errs) != 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
}

func TestValidate_Rules(t *testing.T) {
	tests := []struct {
		name      string
		mutate    func(*Input)
		wantField string // "" = valid
		wantMsg   string
	}{
		{"lat 90 ok", func(i *Input) { i.Latitude = f(90) }, "", ""},
		{"lat -90 ok", func(i *Input) { i.Latitude = f(-90) }, "", ""},
		{"lat 0 ok", func(i *Input) { i.Latitude = f(0) }, "", ""},
		{"lng 180 ok", func(i *Input) { i.Longitude = f(180) }, "", ""},
		{"lng -180 ok", func(i *Input) { i.Longitude = f(-180) }, "", ""},
		{"lng 0 ok", func(i *Input) { i.Longitude = f(0) }, "", ""},
		{"lat 90.0001", func(i *Input) { i.Latitude = f(90.0001) }, "latitude", "latitude must be between -90 and 90"},
		{"lat -91", func(i *Input) { i.Latitude = f(-91) }, "latitude", "latitude must be between -90 and 90"},
		{"lng 180.5", func(i *Input) { i.Longitude = f(180.5) }, "longitude", "longitude must be between -180 and 180"},
		{"lng -181", func(i *Input) { i.Longitude = f(-181) }, "longitude", "longitude must be between -180 and 180"},
		{"lat missing", func(i *Input) { i.Latitude = nil }, "latitude", "latitude is required"},
		{"lng missing", func(i *Input) { i.Longitude = nil }, "longitude", "longitude is required"},
		{"code empty", func(i *Input) { i.Code = "  " }, "code", "code is required"},
		{"code short", func(i *Input) { i.Code = "A" }, "code", "code must be 2-20 characters"},
		{"code long", func(i *Input) { i.Code = strings.Repeat("A", 21) }, "code", "code must be 2-20 characters"},
		{"code 20 ok", func(i *Input) { i.Code = strings.Repeat("A", 20) }, "", ""},
		{"code bad chars", func(i *Input) { i.Code = "DV 101" }, "code", "code may contain only letters, digits and hyphens"},
		{"code leading hyphen", func(i *Input) { i.Code = "-DV" }, "code", "code may contain only letters, digits and hyphens"},
		{"name empty", func(i *Input) { i.Name = "" }, "name", "name is required"},
		{"name whitespace", func(i *Input) { i.Name = "   " }, "name", "name is required"},
		{"name 100 ok", func(i *Input) { i.Name = strings.Repeat("x", 100) }, "", ""},
		{"name 101", func(i *Input) { i.Name = strings.Repeat("x", 101) }, "name", "name must be at most 100 characters"},
		{"type invalid", func(i *Input) { i.Type = "drone" }, "type", "type must be one of: vehicle, iot_sensor, facility"},
		{"type empty", func(i *Input) { i.Type = "" }, "type", "type must be one of: vehicle, iot_sensor, facility"},
		{"status invalid", func(i *Input) { i.Status = "broken" }, "status", "status must be one of: active, inactive, maintenance"},
		{"status empty", func(i *Input) { i.Status = "" }, "status", "status must be one of: active, inactive, maintenance"},
		{"status case-sensitive", func(i *Input) { i.Status = "ACTIVE" }, "status", "status must be one of: active, inactive, maintenance"},
		{"description 500 ok", func(i *Input) { i.Description = strings.Repeat("d", 500) }, "", ""},
		{"description 501", func(i *Input) { i.Description = strings.Repeat("d", 501) }, "description", "description must be at most 500 characters"},
		{"region 101", func(i *Input) { i.Region = strings.Repeat("r", 101) }, "region", "region must be at most 100 characters"},
		{"address 201", func(i *Input) { i.Address = strings.Repeat("a", 201) }, "address", "address must be at most 200 characters"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := fieldsOf(in.Normalize().Validate())
			if tc.wantField == "" {
				if len(got) != 0 {
					t.Fatalf("expected valid, got %v", got)
				}
				return
			}
			if got[tc.wantField] != tc.wantMsg {
				t.Fatalf("field %q: got %q want %q (all: %v)", tc.wantField, got[tc.wantField], tc.wantMsg, got)
			}
		})
	}
}

func TestValidate_NaNInf(t *testing.T) {
	var zero float64
	nan := zero / zero
	inf := 1 / zero
	for _, v := range []float64{nan, inf, -inf} {
		v := v
		in := validInput()
		in.Latitude = &v
		in.Longitude = &v
		got := fieldsOf(in.Validate())
		if got["latitude"] == "" || got["longitude"] == "" {
			t.Fatalf("%v must be rejected", v)
		}
	}
}

func TestValidate_AllErrorsAtOnce(t *testing.T) {
	errs := Input{}.Normalize().Validate()
	got := fieldsOf(errs)
	for _, k := range []string{"code", "name", "type", "status", "latitude", "longitude"} {
		if got[k] == "" {
			t.Errorf("expected error for %s", k)
		}
	}
}

func TestNormalize(t *testing.T) {
	in := validInput()
	in.Code = "  dv-101 "
	in.Name = "  Truck  "
	n := in.Normalize()
	if n.Code != "DV-101" || n.Name != "Truck" {
		t.Fatalf("got %q %q", n.Code, n.Name)
	}
}
