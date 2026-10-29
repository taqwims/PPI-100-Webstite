package main

import (
	"log"
	"time"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/delivery/http/routes"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/gin-gonic/gin"
)

func main() {
	// Set default timezone server ke WIB (Asia/Jakarta, UTC+7)
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	time.Local = loc
	log.Printf("[Init] Server timezone set to: %s (current time: %s)", loc.String(), time.Now().Format("2006-01-02 15:04:05 MST"))

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := postgres.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := postgres.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Seed default school settings from env vars (only inserts if not exist)
	postgres.SeedSchoolSettings(db, cfg)
	// Seed unit activation from ENABLED_UNIT_IDS env
	postgres.SeedUnitActivation(db, cfg.EnabledUnitIDs)
	// Seed foundation name from FOUNDATION_NAME env
	postgres.SeedFoundation(db, cfg.FoundationName)

	r := gin.Default()

	routes.SetupRoutes(r, db, cfg)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
