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

	var teachers []domain.Teacher
	if err := db.Preload("User").Find(&teachers).Error; err != nil {
		log.Fatalf("Failed to fetch teachers: %v", err)
	}

	fmt.Println("Found Teachers:")
	for _, t := range teachers {
		fmt.Printf("- ID: %s | Name: %s | UnitID: %d | NIP: %s\n", t.ID, t.User.Name, t.UnitID, t.NIP)
	}
}
