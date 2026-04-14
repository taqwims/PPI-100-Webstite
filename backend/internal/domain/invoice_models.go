package domain

import (
	"time"

	"github.com/google/uuid"
)

// ─── Invoice Signature (Persisted Signatures) ───

type InvoiceSignature struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	InvoiceType     string    `gorm:"not null" json:"invoice_type"`      // Payroll, CashLedger, Bill, Obligation, Infaq, Activity, RKAS, Debt, Savings
	ReferenceID     string    `gorm:"not null" json:"reference_id"`      // UUID or ID of the source record
	StakeholderRole string    `gorm:"not null" json:"stakeholder_role"`  // principal, treasurer, committee, admin_tu, chairman
	StakeholderName string    `gorm:"not null" json:"stakeholder_name"`  // Display name
	SignatureHash   string    `gorm:"not null" json:"signature_hash"`    // Full HMAC-SHA256
	ShortCode       string    `gorm:"not null" json:"short_code"`        // SIG-PRI-xxxxxxxxxxxx
	VerificationCode string   `gorm:"default:'';not null" json:"verification_code"` // XXXX-XXXX-XXXX
	InvoiceNumber    string   `gorm:"default:'';not null" json:"invoice_number"`    // INV-202401-0001
	Amount           float64   `json:"amount"`
	DocumentDate     string    `gorm:"default:'';not null" json:"document_date"`    // The date used for signing (ISO)
	SignedAt         time.Time `gorm:"not null" json:"signed_at"`
	CreatedAt       time.Time `json:"created_at"`
}

// ─── Invoice Number Configuration ───

type InvoiceNumberConfig struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	InvoiceType  string    `gorm:"uniqueIndex;not null" json:"invoice_type"` // Payroll, CashLedger, Bill, Obligation, Infaq, Activity, RKAS, Debt, Savings
	Prefix       string    `gorm:"not null" json:"prefix"`                   // e.g. "INV", "KW", "BK", "SG"
	Separator    string    `gorm:"not null;default:'-'" json:"separator"`    // e.g. "-", "/"
	IncludeDate  bool      `gorm:"default:true" json:"include_date"`        // Include YYYYMM in number
	IncludeUnit  bool      `gorm:"default:false" json:"include_unit"`       // Include unit code
	CounterLength int      `gorm:"not null;default:4" json:"counter_length"` // Zero-padded counter length
	CurrentCounter int     `gorm:"not null;default:0" json:"current_counter"` // Auto-incrementing counter
	CounterResetPeriod string `gorm:"not null;default:'monthly'" json:"counter_reset_period"` // monthly, yearly, never
	LastResetDate *time.Time `json:"last_reset_date"`
	DisplayLabel  string    `gorm:"not null" json:"display_label"`          // "Kuitansi Pembayaran", "Slip Gaji", etc.
	AutoNotifyWA  bool      `gorm:"default:false" json:"auto_notify_wa"`    // Automatically send WA on creation
	WATemplateID  *uint     `json:"wa_template_id"`                         // Preferred template for this doc
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ─── Stakeholder Configuration ───

type StakeholderConfig struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Role            string    `gorm:"uniqueIndex;not null" json:"role"` // principal, treasurer, committee, admin_tu, chairman
	DisplayLabel    string    `gorm:"not null" json:"display_label"`    // Kepala Sekolah, Bendahara, Komite, Tata Usaha, Ketua Yayasan
	Name            string    `gorm:"not null" json:"name"`             // Actual person's name
	NIP             string    `json:"nip"`                              // Optional NIP/ID number
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
