package repository

import (
	"ppi-100-sis/internal/domain"
	"time"
)

// InvoiceHistoryItem represents a grouped invoice history row.
type InvoiceHistoryItem struct {
	InvoiceNumber    string    `json:"invoice_number"`
	InvoiceType      string    `json:"invoice_type"`
	ReferenceID      string    `json:"reference_id"`
	Amount           float64   `json:"amount"`
	DocumentDate     string    `json:"document_date"`
	SignedAt         time.Time `json:"signed_at"`
	VerificationCode string    `json:"verification_code"`
	LatestCreatedAt  time.Time `json:"latest_created_at"`
}

// InvoiceSignatureRepository defines the data access contract.
type InvoiceSignatureRepository interface {
	FindByTypeAndRef(invoiceType, referenceID string) ([]domain.InvoiceSignature, error)
	CreateSignatures(sigs []domain.InvoiceSignature) error
	UpdateVerificationCode(invoiceType, referenceID, code, docDate string) error
	FindByVerificationCode(code string) ([]domain.InvoiceSignature, error)
	FindByShortCode(code string) ([]domain.InvoiceSignature, error)
	GetInvoiceHistory(userIDStr string, roleID int, invoiceType, search, startDate, endDate string) ([]InvoiceHistoryItem, error)
	GetConfigs() ([]domain.InvoiceNumberConfig, error)
	GetConfigByType(invoiceType string) (*domain.InvoiceNumberConfig, error)
	GetConfigByID(id uint) (*domain.InvoiceNumberConfig, error)
	SaveConfig(config *domain.InvoiceNumberConfig) error
	GetStakeholders() ([]domain.StakeholderConfig, error)
	GetStakeholderByID(id uint) (*domain.StakeholderConfig, error)
	SaveStakeholder(config *domain.StakeholderConfig) error
}
