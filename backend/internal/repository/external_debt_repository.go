package repository

import (
	"ppi-100-sis/internal/domain"

	"github.com/google/uuid"
)

type ExternalDebtRepository interface {
	GetAll() ([]domain.ExternalDebt, error)
	Create(debt *domain.ExternalDebt) error
	GetByID(id string) (*domain.ExternalDebt, error)
	Update(debt *domain.ExternalDebt, updates map[string]interface{}) error
	Delete(id string) error
	GetPayments(debtID string) ([]domain.ExternalDebtPayment, error)
	RecordPaymentTx(debt *domain.ExternalDebt, payment *domain.ExternalDebtPayment, fundSource string) error
	RecalcStatus(debt *domain.ExternalDebt) error
}

// Ensure uuid is used
var _ = uuid.UUID{}
