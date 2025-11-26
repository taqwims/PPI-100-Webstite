package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
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

	var subjects []domain.Subject
	if err := db.Find(&subjects).Error; err != nil {
		log.Fatalf("Failed to fetch subjects: %v", err)
	}

	fmt.Println("Found Subjects:")
	for _, s := range subjects {
		fmt.Printf("- ID: %d | Name: %s | UnitID: %d\n", s.ID, s.Name, s.UnitID)
	}
}
