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

	var schedules []domain.Schedule
	if err := db.Preload("Class").Preload("Subject").Preload("Teacher.User").Find(&schedules).Error; err != nil {
		log.Fatalf("Failed to fetch schedules: %v", err)
	}

	fmt.Println("Found Schedules:")
	for _, s := range schedules {
		fmt.Printf("- ID: %d | Class: %s | Subject: %s | Teacher: %s\n", s.ID, s.Class.Name, s.Subject.Name, s.Teacher.User.Name)
	}
}
