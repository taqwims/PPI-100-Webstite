package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type ExternalDebtUsecase interface {
	GetAll() ([]domain.ExternalDebt, error)
	Create(req CreateExternalDebtRequest, createdByID uuid.UUID) (*domain.ExternalDebt, error)
	Update(id string, req UpdateExternalDebtRequest) (*domain.ExternalDebt, error)
	Delete(id string) error
	GetPayments(debtID string) ([]domain.ExternalDebtPayment, error)
	RecordPayment(debtID string, req RecordDebtPaymentRequest, paidByID uuid.UUID) (*domain.ExternalDebtPayment, error)
}

type CreateExternalDebtRequest struct {
	CreditorName string     `json:"creditor_name"`
	Description  string     `json:"description"`
	Amount       float64    `json:"amount"`
	DueDate      *time.Time `json:"due_date"`
	Notes        string     `json:"notes"`
}

type UpdateExternalDebtRequest struct {
	CreditorName string     `json:"creditor_name"`
	Description  string     `json:"description"`
	Amount       float64    `json:"amount"`
	DueDate      *time.Time `json:"due_date"`
	Notes        string     `json:"notes"`
}

type RecordDebtPaymentRequest struct {
	Amount     float64 `json:"amount"`
	FundSource string  `json:"fund_source"` // "Kas Umum" or "Infaq"
	Notes      string  `json:"notes"`
}

type externalDebtUsecase struct {
	repo postgres.ExternalDebtRepository
}

func NewExternalDebtUsecase(repo postgres.ExternalDebtRepository) ExternalDebtUsecase {
	return &externalDebtUsecase{repo: repo}
}

func (u *externalDebtUsecase) GetAll() ([]domain.ExternalDebt, error) {
	return u.repo.GetAll()
}

func (u *externalDebtUsecase) Create(req CreateExternalDebtRequest, createdByID uuid.UUID) (*domain.ExternalDebt, error) {
	if req.CreditorName == "" {
		return nil, errors.New("nama kreditur tidak boleh kosong")
	}
	if req.Description == "" {
		return nil, errors.New("deskripsi hutang tidak boleh kosong")
	}
	if req.Amount <= 0 {
		return nil, errors.New("nominal hutang harus lebih dari 0")
	}

	debt := &domain.ExternalDebt{
		CreditorName: req.CreditorName,
		Description:  req.Description,
		Amount:       req.Amount,
		DueDate:      req.DueDate,
		Notes:        req.Notes,
		CreatedByID:  createdByID,
		Status:       "Unpaid",
	}
	if err := u.repo.Create(debt); err != nil {
		return nil, fmt.Errorf("gagal membuat catatan hutang: %w", err)
	}
	return debt, nil
}

func (u *externalDebtUsecase) Update(id string, req UpdateExternalDebtRequest) (*domain.ExternalDebt, error) {
	debt, err := u.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.CreditorName != "" {
		updates["creditor_name"] = req.CreditorName
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Amount > 0 {
		updates["amount"] = req.Amount
	}
	if req.DueDate != nil {
		updates["due_date"] = req.DueDate
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	if err := u.repo.Update(debt, updates); err != nil {
		return nil, fmt.Errorf("gagal update hutang: %w", err)
	}
	return debt, nil
}

func (u *externalDebtUsecase) Delete(id string) error {
	return u.repo.Delete(id)
}

func (u *externalDebtUsecase) GetPayments(debtID string) ([]domain.ExternalDebtPayment, error) {
	return u.repo.GetPayments(debtID)
}

func (u *externalDebtUsecase) RecordPayment(debtID string, req RecordDebtPaymentRequest, paidByID uuid.UUID) (*domain.ExternalDebtPayment, error) {
	debt, err := u.repo.GetByID(debtID)
	if err != nil {
		return nil, err
	}

	if req.Amount <= 0 {
		return nil, errors.New("nominal pembayaran harus lebih dari 0")
	}

	remaining := debt.Amount - debt.PaidAmount
	if req.Amount > remaining {
		return nil, fmt.Errorf("pembayaran (%.2f) melebihi sisa hutang (%.2f)", req.Amount, remaining)
	}

	if req.FundSource != "Kas Umum" && req.FundSource != "Infaq" {
		return nil, errors.New("sumber dana harus 'Kas Umum' atau 'Infaq'")
	}

	payment := &domain.ExternalDebtPayment{
		DebtID:     debt.ID,
		Amount:     req.Amount,
		FundSource: req.FundSource,
		Notes:      req.Notes,
		PaidByID:   paidByID,
	}

	if err := u.repo.RecordPaymentTx(debt, payment, req.FundSource); err != nil {
		return nil, err
	}
	return payment, nil
}
