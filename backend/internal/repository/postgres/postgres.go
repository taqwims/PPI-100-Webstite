package postgres

import (
	"fmt"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewPostgresDB(cfg *config.Config) (*gorm.DB, error) {
	sslMode := "disable"
	if cfg.DBSSLMode != "" {
		sslMode = cfg.DBSSLMode
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, sslMode)

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Disable prepared statement cache for Supabase pgbouncer
	}), &gorm.Config{})
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
		&domain.StudentViolation{},
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
		&domain.StudentClassHistory{},
		&domain.Payroll{},
		&domain.PayrollTemplate{},
		&domain.SavingAccount{},
		&domain.SavingTransaction{},
		&domain.CashLedger{},
		&domain.DailyInfaq{},
		&domain.TransactionCode{},
		&domain.BillItem{},
		&domain.BudgetCategory{},
		&domain.Budget{},
		&domain.BillTemplate{},
		&domain.PaymentType{},
		&domain.StudentObligation{},

		// Activities (Fase 3)
		&domain.Activity{},
		&domain.ActivityObligation{},
		&domain.ActivityTransaction{},

		// Enhancement models
		&domain.InfaqType{},
		&domain.WATemplate{},
		&domain.WASchedule{},
		&domain.WAScheduleDetail{},

		// Savings Operational
		&domain.SavingsOperationalWithdrawal{},
		&domain.SavingsOperationalReturn{},

		// Savings Receivable / Piutang
		&domain.SavingsReceivableWithdrawal{},
		&domain.SavingsReceivableReturn{},

		// External Debt (Catatan Hutang)
		&domain.ExternalDebt{},
		&domain.ExternalDebtPayment{},

		// Invoice Signatures & Config
		&domain.InvoiceSignature{},
		&domain.InvoiceNumberConfig{},
		&domain.StakeholderConfig{},

		// PPDB Payment
		&domain.PPDBPayment{},
		&domain.PPDBPaymentItem{},

		// Asset Management
		&domain.Asset{},
		&domain.AssetCategory{},

		// School Bank Account
		&domain.SchoolBankAccount{},

		// Foundation & School Settings (SaaS)
		&domain.Foundation{},
		&domain.SchoolSetting{},
		&domain.DatabaseBackup{},
	)
}

// SeedSchoolSettings seeds default school settings from config env vars.
// Should be called after AutoMigrate.
func SeedSchoolSettings(db *gorm.DB, cfg *config.Config) {
	repo := NewSchoolSettingRepository(db)
	defaults := map[string]string{
		"school_name":     cfg.SchoolName,
		"school_address":  cfg.SchoolAddress,
		"school_logo_url": cfg.SchoolLogoURL,
		"fonnte_token":    cfg.FonnteToken,
	}
	repo.Seed(defaults)
}

// SeedUnitActivation syncs unit is_active status based on ENABLED_UNIT_IDS env config.
// Should be called after AutoMigrate.
func SeedUnitActivation(db *gorm.DB, enabledIDs []uint) {
	if len(enabledIDs) == 0 {
		return // No config = don't change anything
	}
	// Deactivate all units first
	db.Model(&domain.Unit{}).Where("1=1").Update("is_active", false)
	// Activate only the enabled ones
	db.Model(&domain.Unit{}).Where("id IN ?", enabledIDs).Update("is_active", true)
}

// SeedFoundation upserts the foundation name from FOUNDATION_NAME env config.
// Should be called after AutoMigrate.
func SeedFoundation(db *gorm.DB, name string) {
	if name == "" {
		return
	}
	var foundation domain.Foundation
	result := db.First(&foundation)
	if result.Error != nil {
		// Create first foundation
		db.Create(&domain.Foundation{Name: name})
	} else if foundation.Name != name {
		// Update name only if different
		db.Model(&foundation).Update("name", name)
	}
}
