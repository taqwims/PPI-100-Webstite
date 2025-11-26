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

    userID := uuid.MustParse("45a70a2e-82eb-482b-a904-6a1569831a0c")
    var teacher domain.Teacher
    if err := db.Where("user_id = ?", userID).First(&teacher).Error; err != nil {
        log.Fatalf("Failed to find teacher: %v", err)
    }
    
	schedule := domain.Schedule{
		ClassID:   5, // Test Class
		SubjectID: 1, // Matematika
		TeacherID: teacher.ID,
		Day:       "Monday",
		StartTime: "08:00",
		EndTime:   "09:30",
	}

	if err := db.Create(&schedule).Error; err != nil {
		log.Fatalf("Failed to create schedule: %v", err)
	}
    
    log.Printf("Successfully created schedule with ID: %d", schedule.ID)
}
