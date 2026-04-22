package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Core Tables
type User struct {
	ID                uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name              string    `gorm:"not null" json:"name"`
	Email             string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash      string    `gorm:"not null" json:"-"`
	PhotoURL          string    `json:"photo_url"`
	Phone             string    `json:"phone"`
	Address           string    `json:"address"`
	RoleID            uint      `gorm:"not null" json:"role_id"`
	UnitID            uint      `gorm:"not null" json:"unit_id"`
	BankName          string    `json:"bank_name"`
	BankAccountNumber string    `json:"bank_account_number"`
	BankAccountHolder string    `json:"bank_account_holder"`
	Teacher           *Teacher  `gorm:"foreignKey:UserID" json:"teacher,omitempty"`
	Parent            *Parent   `gorm:"foreignKey:UserID" json:"parent,omitempty"`
	Student           *Student  `gorm:"foreignKey:UserID" json:"student,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

type Role struct {
	ID   uint   `gorm:"primaryKey"`
	Name string `gorm:"unique;not null"` // Super Admin, Admin MTS, Admin MA, Guru, Wali Kelas, Siswa, Orang Tua
}

type Unit struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	Name         string      `gorm:"unique;not null" json:"name"` // MTS, MA, PUBLIC
	FoundationID *uint       `json:"foundation_id"`
	Foundation   *Foundation `gorm:"foreignKey:FoundationID" json:"foundation,omitempty"`
	Code         string      `json:"code"`                     // Short code: "mts", "ma"
	IsActive     bool        `gorm:"default:true" json:"is_active"`
}

// ------------------- School Bank Account -------------------
type SchoolBankAccount struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	BankName      string    `gorm:"not null" json:"bank_name"`       // BSI, BCA, Mandiri
	AccountNumber string    `gorm:"not null" json:"account_number"`  // 7123456789
	AccountHolder string    `gorm:"not null" json:"account_holder"`  // Yayasan PPI 100
	IsPrimary     bool      `gorm:"default:false" json:"is_primary"` // Rekening utama
	IsActive      bool      `gorm:"default:true" json:"is_active"`   // Tampil/Tidak
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ------------------- Foundation (Yayasan) -------------------
type Foundation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"` // "Yayasan PPI 100"
	Address   string    `json:"address"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	LogoURL   string    `json:"logo_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ------------------- School Settings -------------------
type SchoolSetting struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"uniqueIndex;not null" json:"key"` // "school_name", "school_address", etc.
	Value       string    `gorm:"type:text" json:"value"`
	Description string    `json:"description"`
	IsAdminEdit bool      `gorm:"default:true" json:"is_admin_edit"` // true = admin can edit
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

