package main

import (
	"fmt"
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

	schedule := domain.Schedule{
		ClassID:   6,
		SubjectID: 5,
		TeacherID: uuid.MustParse("d4793adb-f681-483b-9989-a7de248821ef"),
		Day:       "Monday",
		StartTime: "08:00",
		EndTime:   "09:30",
	}

	if err := db.Create(&schedule).Error; err != nil {
		log.Fatalf("Failed to create schedule: %v", err)
	}

	fmt.Printf("Schedule created successfully with ID: %d\n", schedule.ID)
}
