package main

import (
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

	log.Println("Dropping table ppdb_registrations...")
	if err := db.Migrator().DropTable(&domain.PPDBRegistration{}); err != nil {
		log.Fatalf("Failed to drop table: %v", err)
	}
	log.Println("Table ppdb_registrations dropped successfully.")
}
