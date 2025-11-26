package main

import (
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/google/uuid"
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

	userID := uuid.MustParse("38188f16-5d13-411c-b07f-827a0e047589") // User Guru

	teacher := domain.Teacher{
		UserID: userID,
		NIP:    "1234567890",
		UnitID: 1,
	}

	if err := db.Create(&teacher).Error; err != nil {
		log.Fatalf("Failed to create teacher: %v", err)
	}

	log.Printf("Teacher created successfully with ID: %s", teacher.ID)
}
