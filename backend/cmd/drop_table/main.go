package main

import (
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/pkg/database"
)

func main() {
	cfg := config.LoadConfig()
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Dropping table schedules...")
	if err := db.Migrator().DropTable(&domain.Schedule{}); err != nil {
		log.Fatalf("Failed to drop table: %v", err)
	}
	log.Println("Table schedules dropped successfully.")
}
