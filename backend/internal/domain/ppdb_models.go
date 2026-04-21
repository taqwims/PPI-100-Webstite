package domain

import (
	"time"

	"github.com/google/uuid"
	)

type PPDBRegistration struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	NISN         string    `json:"nisn"`
	OriginSchool string    `json:"origin_school"`
	ParentName   string    `json:"parent_name"`
	Phone        string    `json:"phone"`
	Status       string    `json:"status"` // Pending, Accepted, Rejected
	UnitID       uint      `gorm:"not null" json:"unit_id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type PPDBPayment struct {
	ID                 uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PPDBRegistrationID uuid.UUID          `gorm:"type:uuid;not null" json:"ppdb_registration_id"`
	PPDBRegistration   PPDBRegistration   `gorm:"foreignKey:PPDBRegistrationID" json:"ppdb_registration"`
	InvoiceNumber      string             `gorm:"unique;not null" json:"invoice_number"`
	TotalAmount        float64            `gorm:"not null;default:0" json:"total_amount"`
	PaidAmount         float64            `gorm:"not null;default:0" json:"paid_amount"`
	Status             string             `gorm:"not null;default:'Belum Bayar'" json:"status"` // Belum Bayar, DP Terpenuhi, Lunas
	Items              []PPDBPaymentItem  `gorm:"foreignKey:PPDBPaymentID" json:"items,omitempty"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
}

type PPDBPaymentItem struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PPDBPaymentID  uuid.UUID `gorm:"type:uuid;not null" json:"ppdb_payment_id"`
	ItemName       string    `gorm:"not null" json:"item_name"`        // "Uang Bangunan", "Uang Tes Kemampuan"
	ExpectedAmount float64   `gorm:"not null" json:"expected_amount"`  // Nominal yang seharusnya dibayar
	PaidAmount     float64   `gorm:"not null;default:0" json:"paid_amount"` // Nominal yang sudah dibayar
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

