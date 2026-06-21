package main

import (
	"encoding/json"
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

	fmt.Println("--- Students List ---")
	var students []domain.Student
	err = db.Joins("User").
		Where("\"User\".deleted_at IS NULL").
		Preload("User").Preload("Class").Preload("Parent").Preload("Parent.User").
		Find(&students).Error
	if err != nil {
		log.Fatalf("Query error: %v", err)
	}

	for _, s := range students {
		fmt.Printf("Student ID: %s\n", s.ID)
		fmt.Printf("  NISN: %s\n", s.NISN)
		fmt.Printf("  User Name: %s\n", s.User.Name)
		fmt.Printf("  User Phone: %s\n", s.User.Phone)
		if s.Parent != nil {
			fmt.Printf("  Parent Phone: %s\n", s.Parent.Phone)
			fmt.Printf("  Parent User Phone: %s\n", s.Parent.User.Phone)
		} else {
			fmt.Println("  Parent: <nil>")
		}
		
		// Print JSON of the first student to see the actual JSON tags
		bz, _ := json.MarshalIndent(s, "", "  ")
		fmt.Println("  JSON Output:")
		fmt.Println(string(bz))
		fmt.Println("--------------------")
	}
}
