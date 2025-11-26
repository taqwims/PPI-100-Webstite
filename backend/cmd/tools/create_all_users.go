package main

import (
	"fmt"
	"log"
	"strings"

	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/pkg/utils"

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

	// 1. Get All Roles
	var roles []domain.Role
	if err := db.Find(&roles).Error; err != nil {
		log.Fatalf("Failed to fetch roles: %v", err)
	}

	fmt.Println("Found Roles:")
	for _, r := range roles {
		fmt.Printf("- ID: %d, Name: %s\n", r.ID, r.Name)
	}
	fmt.Println("------------------------------------------------")

	// 2. Create User for each Role if not exists
	password := "password123"
	hashedPassword, _ := utils.HashPassword(password)

	for _, role := range roles {
		// Normalize role name for email (e.g., "Super Admin" -> "super_admin")
		emailPrefix := strings.ToLower(strings.ReplaceAll(role.Name, " ", "_"))
		email := fmt.Sprintf("%s@example.com", emailPrefix)
		name := fmt.Sprintf("User %s", role.Name)

		var existingUser domain.User
		if err := db.Where("email = ?", email).First(&existingUser).Error; err == nil {
			fmt.Printf("[EXISTS] Role: %s | Email: %s | Password: %s\n", role.Name, email, password)
			continue
		}

		// Create User
		user := domain.User{
			ID:           uuid.New(),
			Name:         name,
			Email:        email,
			PasswordHash: hashedPassword,
			RoleID:       role.ID,
			UnitID:       1, // Default to Unit 1
		}

		if err := db.Create(&user).Error; err != nil {
			log.Printf("Failed to create user for role %s: %v", role.Name, err)
			continue
		}

		fmt.Printf("[CREATED] Role: %s | Email: %s | Password: %s\n", role.Name, email, password)

		// Create associated profile if needed (Teacher, Student, Parent)
		// Role IDs: 4=Guru, 5=Wali Kelas, 6=Siswa, 7=Orang Tua (Based on previous knowledge, but we should rely on DB IDs if possible, or just hardcode for now based on names)
		
		// Simple check based on name
		if strings.Contains(strings.ToLower(role.Name), "guru") || strings.Contains(strings.ToLower(role.Name), "wali") {
			teacher := domain.Teacher{
				UserID: user.ID,
				NIP:    fmt.Sprintf("NIP%s", user.ID.String()[:8]),
				UnitID: 1,
			}
			db.Create(&teacher)
		} else if strings.Contains(strings.ToLower(role.Name), "siswa") {
			student := domain.Student{
				UserID:  user.ID,
				NISN:    fmt.Sprintf("NISN%s", user.ID.String()[:8]),
				ClassID: 1,
				UnitID:  1,
			}
			db.Create(&student)
		} else if strings.Contains(strings.ToLower(role.Name), "orang tua") {
			parent := domain.Parent{
				UserID: user.ID,
				Phone:  "08123456789",
			}
			db.Create(&parent)
		}
	}
}
