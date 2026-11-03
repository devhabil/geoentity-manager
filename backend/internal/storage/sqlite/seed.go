package sqlite

import (
	"context"
	"time"

	"github.com/geoentity/backend/internal/entity"
)

type seedRow struct {
	code, name string
	typ        entity.Type
	status     entity.Status
	desc       string
	region     string
	address    string
	lat, lng   float64
}

// Seed data taken from the mockup (docs/DATA_MODEL.md §4).
var seedRows = []seedRow{
	{"DV-101", "Delivery Vehicle DV-101", entity.TypeVehicle, entity.StatusActive, "Last-mile delivery vehicle for the San Francisco area. Used for daily distribution and on-demand deliveries.", "San Francisco, CA", "Near Market St", 37.7929, -122.4110},
	{"TR-204", "Truck TR-204", entity.TypeVehicle, entity.StatusMaintenance, "Heavy-duty truck currently under scheduled maintenance.", "Oakland, CA", "I-880 (Oakland)", 37.7990, -122.2840},
	{"TS-01", "Temperature Sensor TS-01", entity.TypeIoTSense, entity.StatusActive, "Monitors ambient temperature inside the warehouse.", "SF Warehouse", "Warehouse – Bayview", 37.7350, -122.3830},
	{"AQ-07", "Air Quality Sensor AQ-07", entity.TypeIoTSense, entity.StatusInactive, "Air quality sensor, currently offline.", "Mission District", "Mission St", 37.7599, -122.4148},
	{"WH-001", "Warehouse WH-001", entity.TypeFacility, entity.StatusActive, "Main distribution warehouse.", "San Francisco, CA", "Bayview Industrial Park", 37.7310, -122.3900},
	{"CS-02", "Charging Station CS-02", entity.TypeFacility, entity.StatusActive, "Electric vehicle charging station.", "San Francisco, CA", "Potrero Hill", 37.7605, -122.4009},
}

// SeedIfEmpty inserts the sample entities when the table is empty.
// It returns the number of rows inserted.
func SeedIfEmpty(ctx context.Context, repo entity.Repository) (int, error) {
	n, err := repo.Count(ctx)
	if err != nil || n > 0 {
		return 0, err
	}
	svc := entity.NewService(repo)
	for _, s := range seedRows {
		lat, lng := s.lat, s.lng
		if _, err := svc.Create(ctx, entity.Input{
			Code: s.code, Name: s.name, Type: s.typ, Status: s.status, Description: s.desc,
			Region: s.region, Address: s.address, Latitude: &lat, Longitude: &lng,
		}); err != nil {
			return 0, err
		}
		time.Sleep(time.Millisecond) // distinct createdAt values
	}
	return len(seedRows), nil
}
