package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type TransactionCodeUsecase struct {
	repo *postgres.TransactionCodeRepository
}

func NewTransactionCodeUsecase(repo *postgres.TransactionCodeRepository) *TransactionCodeUsecase {
	return &TransactionCodeUsecase{repo: repo}
}

func (u *TransactionCodeUsecase) CreateTransactionCode(tc *domain.TransactionCode) error {
	return u.repo.Create(tc)
}

func (u *TransactionCodeUsecase) GetAllTransactionCodes() ([]domain.TransactionCode, error) {
	return u.repo.GetAll()
}

func (u *TransactionCodeUsecase) GetTransactionCodeByID(id uint) (*domain.TransactionCode, error) {
	return u.repo.GetByID(id)
}

func (u *TransactionCodeUsecase) UpdateTransactionCode(tc *domain.TransactionCode) error {
	return u.repo.Update(tc)
}

func (u *TransactionCodeUsecase) DeleteTransactionCode(id uint) error {
	return u.repo.Delete(id)
}

func (u *TransactionCodeUsecase) GetGlobalTransactions(startDate, endDate, category string, codeID uint) ([]postgres.GlobalTransaction, error) {
	return u.repo.GetGlobalTransactions(startDate, endDate, category, codeID)
}
