package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/pkg/utils"
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

	email := "admin@example.com"
	password := "password123"

	var user domain.User
	if err := db.Where("email = ?", email).First(&user).Error; err != nil {
		log.Fatalf("User not found: %v", err)
	}

	fmt.Printf("User Found: %s (ID: %s)\n", user.Name, user.ID)
	fmt.Printf("Stored Hash: %s\n", user.PasswordHash)

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		fmt.Printf("Password verification FAILED\n")
		
		// Let's try to hash the password again and see
		newHash, _ := utils.HashPassword(password)
		fmt.Printf("New Hash of '%s': %s\n", password, newHash)
	} else {
		fmt.Println("Password verification SUCCESS!")
	}
}
