package main

import (
	"log"
	"time"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

	if err := postgres.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Make sure Roles exist
	roles := []domain.Role{
		{ID: 1, Name: "Super Admin"},
		{ID: 2, Name: "Admin MTS"},
		{ID: 3, Name: "Admin MA"},
		{ID: 4, Name: "Guru"},
		{ID: 5, Name: "Wali Kelas"},
		{ID: 6, Name: "Siswa"},
		{ID: 7, Name: "Orang Tua"},
		{ID: 8, Name: "Pimpinan"},
		{ID: 9, Name: "Bendahara Umum"},
		{ID: 10, Name: "Teller Tabungan"},
		{ID: 11, Name: "Teller Infaq"},
	}

	for _, role := range roles {
		if err := db.FirstOrCreate(&role, domain.Role{ID: role.ID}).Error; err != nil {
			log.Printf("Failed to seed role %s: %v", role.Name, err)
		}
	}

	// Make sure Academic Year exists
	academicYear := domain.AcademicYear{
		ID:        1,
		Name:      "2023/2024",
		IsActive:  true,
		StartDate: time.Now(),
		EndDate:   time.Now().AddDate(1, 0, 0),
	}
	if err := db.FirstOrCreate(&academicYear, domain.AcademicYear{ID: 1}).Error; err != nil {
		log.Printf("Failed to seed academic year: %v", err)
	}

	// Make sure Public unit exists
	publicUnit := domain.Unit{ID: 3, Name: "PUBLIC"}
	if err := db.FirstOrCreate(&publicUnit, domain.Unit{ID: 3}).Error; err != nil {
		log.Printf("Failed to seed unit %s: %v", publicUnit.Name, err)
	}

	// Seed Custom Super Admin
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("v@ngroupganti01"), bcrypt.DefaultCost)
	adminUser := domain.User{
		Name:         "Super Administrator",
		Email:        "winahsan100@gmail.com",
		PasswordHash: string(hashedPassword),
		RoleID:       1, // Super Admin
		UnitID:       3, // Public
	}

	seedUser(db, adminUser)
	log.Println("Administrator account seeded successfully")
}

func seedUser(db *gorm.DB, user domain.User) domain.User {
	var existingUser domain.User
	if err := db.Where("email = ?", user.Email).First(&existingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := db.Create(&user).Error; err != nil {
				log.Printf("Failed to create user %s: %v", user.Name, err)
			}
			return user
		}
	} else {
		// Update password if user exists
		existingUser.PasswordHash = user.PasswordHash
		if err := db.Save(&existingUser).Error; err != nil {
			log.Printf("Failed to update password for %s: %v", user.Name, err)
		}
	}
	return existingUser
}
