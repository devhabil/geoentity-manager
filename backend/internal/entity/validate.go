package entity

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"unicode/utf8"
)

var codePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9-]*$`)

// Normalize trims string fields and uppercases the code.
func (in Input) Normalize() Input {
	in.Code = strings.ToUpper(strings.TrimSpace(in.Code))
	in.Name = strings.TrimSpace(in.Name)
	in.Description = strings.TrimSpace(in.Description)
	in.Region = strings.TrimSpace(in.Region)
	in.Address = strings.TrimSpace(in.Address)
	in.Type = Type(strings.TrimSpace(string(in.Type)))
	in.Status = Status(strings.TrimSpace(string(in.Status)))
	return in
}

// Validate checks a (normalized) input against docs/DATA_MODEL.md §2 and
// returns every violation at once.
func (in Input) Validate() []FieldError {
	var errs []FieldError
	add := func(field, msg string) { errs = append(errs, FieldError{field, msg}) }

	switch n := utf8.RuneCountInString(in.Code); {
	case n == 0:
		add("code", "code is required")
	case n < 2 || n > 20:
		add("code", "code must be 2-20 characters")
	case !codePattern.MatchString(in.Code):
		add("code", "code may contain only letters, digits and hyphens")
	}

	switch n := utf8.RuneCountInString(in.Name); {
	case n == 0:
		add("name", "name is required")
	case n > 100:
		add("name", "name must be at most 100 characters")
	}

	if !in.Type.IsValid() {
		add("type", "type must be one of: vehicle, iot_sensor, facility")
	}
	if !in.Status.IsValid() {
		add("status", "status must be one of: active, inactive, maintenance")
	}

	if utf8.RuneCountInString(in.Description) > 500 {
		add("description", "description must be at most 500 characters")
	}
	if utf8.RuneCountInString(in.Region) > 100 {
		add("region", "region must be at most 100 characters")
	}
	if utf8.RuneCountInString(in.Address) > 200 {
		add("address", "address must be at most 200 characters")
	}

	checkCoord := func(field string, v *float64, limit float64) {
		switch {
		case v == nil:
			add(field, field+" is required")
		case math.IsNaN(*v) || math.IsInf(*v, 0) || *v < -limit || *v > limit:
			add(field, fmt.Sprintf("%s must be between -%d and %d", field, int(limit), int(limit)))
		}
	}
	checkCoord("latitude", in.Latitude, 90)
	checkCoord("longitude", in.Longitude, 180)

	return errs
}
