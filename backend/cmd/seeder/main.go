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

	// Seed Roles
	roles := []domain.Role{
		{ID: 1, Name: "Super Admin"},
		{ID: 2, Name: "Admin MTS"},
		{ID: 3, Name: "Admin MA"},
		{ID: 4, Name: "Guru"},
		{ID: 5, Name: "Wali Kelas"},
		{ID: 6, Name: "Siswa"},
		{ID: 7, Name: "Orang Tua"},
	}

	for _, role := range roles {
		if err := db.FirstOrCreate(&role, domain.Role{ID: role.ID}).Error; err != nil {
			log.Printf("Failed to seed role %s: %v", role.Name, err)
		}
	}

	// Seed Units
	units := []domain.Unit{
		{ID: 1, Name: "MTS"},
		{ID: 2, Name: "MA"},
		{ID: 3, Name: "PUBLIC"},
	}

	for _, unit := range units {
		if err := db.FirstOrCreate(&unit, domain.Unit{ID: unit.ID}).Error; err != nil {
			log.Printf("Failed to seed unit %s: %v", unit.Name, err)
		}
	}

	// Seed Super Admin
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	superAdmin := domain.User{
		Name:         "Super Admin",
		Email:        "admin@example.com",
		PasswordHash: string(hashedPassword),
		RoleID:       1,
		UnitID:       3, // Public
	}
	seedUser(db, superAdmin)

	// Seed Teachers
	teachers := []domain.User{
		{Name: "Ustadz Ahmad", Email: "ahmad@example.com", RoleID: 4, UnitID: 1},
		{Name: "Ustadzah Siti", Email: "siti@example.com", RoleID: 4, UnitID: 1},
		{Name: "Ustadz Budi", Email: "budi@example.com", RoleID: 4, UnitID: 2},
	}

	for _, t := range teachers {
		t.PasswordHash = string(hashedPassword)
		user := seedUser(db, t)
		
		// Create Teacher Profile
		teacherProfile := domain.Teacher{
			UserID: user.ID,
			NIP:    "NIP" + user.ID.String()[:8],
			UnitID: user.UnitID,
		}
		if err := db.FirstOrCreate(&teacherProfile, domain.Teacher{UserID: user.ID}).Error; err != nil {
			log.Printf("Failed to seed teacher profile for %s: %v", user.Name, err)
		}
	}

	// Seed Classes
	classes := []domain.Class{
		{ID: 1, Name: "7A", UnitID: 1},
		{ID: 2, Name: "7B", UnitID: 1},
		{ID: 3, Name: "10A", UnitID: 2},
	}
	for _, c := range classes {
		if err := db.FirstOrCreate(&c, domain.Class{ID: c.ID}).Error; err != nil {
			log.Printf("Failed to seed class %s: %v", c.Name, err)
		}
	}

	// Seed Subjects
	subjects := []domain.Subject{
		{ID: 1, Name: "Matematika", UnitID: 1},
		{ID: 2, Name: "Bahasa Arab", UnitID: 1},
		{ID: 3, Name: "Fiqih", UnitID: 1},
		{ID: 4, Name: "Fisika", UnitID: 2},
	}
	for _, s := range subjects {
		if err := db.FirstOrCreate(&s, domain.Subject{ID: s.ID}).Error; err != nil {
			log.Printf("Failed to seed subject %s: %v", s.Name, err)
		}
	}

	// Seed Students & Parents
	students := []struct {
		Name      string
		Email     string
		ClassID   uint
		UnitID    uint
		ParentName string
		ParentEmail string
	}{
		{"Santri Satu", "santri1@example.com", 1, 1, "Ayah Satu", "ayah1@example.com"},
		{"Santri Dua", "santri2@example.com", 1, 1, "Ayah Dua", "ayah2@example.com"},
		{"Santri Tiga", "santri3@example.com", 3, 2, "Ayah Tiga", "ayah3@example.com"},
	}

	for _, s := range students {
		// Parent
		parentUser := domain.User{
			Name:         s.ParentName,
			Email:        s.ParentEmail,
			PasswordHash: string(hashedPassword),
			RoleID:       7, // Orang Tua
			UnitID:       s.UnitID,
		}
		pUser := seedUser(db, parentUser)
		parentProfile := domain.Parent{
			UserID: pUser.ID,
			Phone:  "08123456789",
		}
		db.FirstOrCreate(&parentProfile, domain.Parent{UserID: pUser.ID})

		// Student
		studentUser := domain.User{
			Name:         s.Name,
			Email:        s.Email,
			PasswordHash: string(hashedPassword),
			RoleID:       6, // Siswa
			UnitID:       s.UnitID,
		}
		sUser := seedUser(db, studentUser)
		studentProfile := domain.Student{
			UserID:   sUser.ID,
			NISN:     "NISN" + sUser.ID.String()[:8],
			ClassID:  s.ClassID,
			UnitID:   s.UnitID,
			ParentID: parentProfile.ID,
		}
		db.FirstOrCreate(&studentProfile, domain.Student{UserID: sUser.ID})

		// Seed Bill
		bill := domain.Bill{
			StudentID: studentProfile.ID,
			Title:     "SPP November 2025",
			Amount:    500000,
			DueDate:   time.Now().AddDate(0, 1, 0),
			Status:    "Unpaid",
		}
		db.Create(&bill)
	}

	log.Println("Seeding completed successfully")
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
	}
	return existingUser
}
