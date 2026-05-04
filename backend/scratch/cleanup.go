package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/domain"
	"gorm.io/gorm"
)

func main() {
	cfg := &config.Config{
		DBHost: "localhost",
		DBPort: "5435",
		DBUser: "postgres",
		DBPassword: "180903",
		DBName: "sdit_management",
	}

	db, err := postgres.NewPostgresDB(cfg)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Migrating Student model...")
	db.AutoMigrate(&domain.Student{}, &domain.Parent{}, &domain.Teacher{})

	fmt.Println("Cleaning up orphaned students...")
	result := db.Exec("UPDATE students SET deleted_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE deleted_at IS NOT NULL) AND deleted_at IS NULL")
	if result.Error != nil {
		log.Fatal(result.Error)
	}
	fmt.Printf("Updated %d orphaned students\n", result.RowsAffected)
}
