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

	// 1. Find User by Email
	var user domain.User
	email := "guru@example.com"
	if err := db.Where("email = ?", email).First(&user).Error; err != nil {
		log.Fatalf("Failed to find user with email %s: %v", email, err)
	}
	fmt.Printf("Found User: %s (ID: %s)\n", user.Name, user.ID)

	// 2. Find Teacher by UserID
	var teacher domain.Teacher
	if err := db.Where("user_id = ?", user.ID).First(&teacher).Error; err != nil {
		log.Fatalf("Failed to find teacher for user ID %s: %v", user.ID, err)
	}
	fmt.Printf("Found Teacher ID: %s\n", teacher.ID)

	// 3. Update All Schedules to use this Teacher ID
	// WARNING: This updates ALL schedules. In a real app, be more specific.
	// For this dev environment, it's fine as we want to see data in the dashboard.
	result := db.Model(&domain.Schedule{}).Where("1 = 1").Update("teacher_id", teacher.ID)
	if result.Error != nil {
		log.Fatalf("Failed to update schedules: %v", result.Error)
	}

	fmt.Printf("Updated %d schedules to use Teacher ID: %s\n", result.RowsAffected, teacher.ID)
}
