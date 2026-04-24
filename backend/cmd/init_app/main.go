package main

import (
	"log"
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
		{ID: 11, Name: "Teller Infaq"},
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

	// 4. Seed Super Admin
	log.Println("Seeding super admin...")
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	superAdmin := domain.User{
		Name:         "Super Admin",
		Email:        "admin@example.com",
		PasswordHash: string(hashedPassword),
		RoleID:       1,
		UnitID:       3, // Public
	}
	
	var existingUser domain.User
	if err := db.Where("email = ?", superAdmin.Email).First(&existingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			db.Create(&superAdmin)
		}
	}

	log.Println("Database initialization completed successfully!")
}
