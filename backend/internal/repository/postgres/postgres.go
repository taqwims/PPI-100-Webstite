package postgres

import (
	"fmt"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewPostgresDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.User{},
		&domain.Role{},
		&domain.Unit{},
		&domain.Student{},
		&domain.Parent{},
		&domain.Teacher{},
		&domain.Class{},
		&domain.Subject{},
		&domain.Schedule{},
		&domain.Attendance{},
		&domain.Violation{},
		&domain.BKCall{},
		&domain.Material{},
		&domain.Task{},
		&domain.TaskSubmission{},
		&domain.Bill{},
		&domain.Payment{},
		&domain.Notification{},
		&domain.NotificationToken{},
		&domain.PublicTeacher{},
		&domain.Download{},
		&domain.Alumni{},
		&domain.PPDBRegistration{},
		&domain.ContactMessage{},
		&domain.AcademicYear{},
		&domain.Payroll{},
		&domain.SavingAccount{},
		&domain.SavingTransaction{},
		&domain.CashLedger{},
		&domain.DailyInfaq{},
	)
}
