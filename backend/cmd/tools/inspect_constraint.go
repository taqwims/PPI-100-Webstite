package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/repository/postgres"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := postgres.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var result struct {
		Conname string
		Def     string
	}

	query := "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'fk_schedules_subject'"
	if err := db.Raw(query).Scan(&result).Error; err != nil {
		log.Fatalf("Failed to inspect constraint: %v", err)
	}

	fmt.Printf("Constraint: %s\nDefinition: %s\n", result.Conname, result.Def)
}
