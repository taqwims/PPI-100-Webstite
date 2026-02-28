package main

import (
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

	if err := db.Migrator().DropTable("schedules"); err != nil {
		log.Fatalf("Failed to drop schedules table: %v", err)
	}

	log.Println("Successfully dropped schedules table")
}
