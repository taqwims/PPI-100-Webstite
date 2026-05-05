package main

import (
	"log"
	"os"
	"strconv"
	"time"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return fallback
}

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := postgres.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 1. Run Migrations
	log.Println("Running migrations...")
	if err := postgres.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// 2. Seed Roles
	log.Println("Seeding roles...")
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
		{ID: 11, Name: "Teller Transaksional"},
	}
	for _, role := range roles {
		db.FirstOrCreate(&role, domain.Role{ID: role.ID})
	}

	// 3. Seed Units
	log.Println("Seeding units...")
	units := []domain.Unit{
		{ID: 1, Name: "MTS", IsActive: true},
		{ID: 2, Name: "MA", IsActive: true},
		{ID: 3, Name: "PUBLIC", IsActive: true},
		{ID: 4, Name: "SDIT", IsActive: true},
	}
	for _, unit := range units {
		db.FirstOrCreate(&unit, domain.Unit{ID: unit.ID})
	}

	// 4. Seed Academic Year
	log.Println("Seeding academic year...")
	academicYear := domain.AcademicYear{
		ID:        1,
		Name:      "2023/2024",
		IsActive:  true,
		StartDate: time.Now(),
		EndDate:   time.Now().AddDate(1, 0, 0),
	}
	db.FirstOrCreate(&academicYear, domain.AcademicYear{ID: 1})

	// 5. Seed Super Admin
	log.Println("Seeding super admin...")
	
	adminName := getEnv("ADMIN_NAME", "Super Administrator")
	adminEmail := getEnv("ADMIN_EMAIL", "admin@example.com")
	adminPass := getEnv("ADMIN_PASSWORD", "password")
	adminUnitID := uint(getEnvInt("ADMIN_UNIT_ID", 3))

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(adminPass), bcrypt.DefaultCost)
	superAdmin := domain.User{
		Name:         adminName,
		Email:        adminEmail,
		PasswordHash: string(hashedPassword),
		RoleID:       1,
		UnitID:       adminUnitID,
	}
	
	var existingUser domain.User
	if err := db.Where("email = ?", superAdmin.Email).First(&existingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			db.Create(&superAdmin)
			log.Printf("Super Admin created with email: %s\n", adminEmail)
		}
	} else {
		// Update password and unit if exists
		existingUser.Name = adminName
		existingUser.PasswordHash = string(hashedPassword)
		existingUser.UnitID = adminUnitID
		db.Save(&existingUser)
		log.Printf("Super Admin updated with email: %s\n", adminEmail)
	}

	log.Println("Database initialization completed successfully!")
}
