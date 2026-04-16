package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type SchoolBankUsecase struct {
	repo *postgres.SchoolBankRepository
}

func NewSchoolBankUsecase(repo *postgres.SchoolBankRepository) *SchoolBankUsecase {
	return &SchoolBankUsecase{repo: repo}
}

func (u *SchoolBankUsecase) GetAll() ([]domain.SchoolBankAccount, error) {
	return u.repo.GetAll()
}

func (u *SchoolBankUsecase) GetActive() ([]domain.SchoolBankAccount, error) {
	return u.repo.GetActive()
}

func (u *SchoolBankUsecase) Create(account *domain.SchoolBankAccount) error {
	if account.BankName == "" || account.AccountNumber == "" || account.AccountHolder == "" {
		return errors.New("nama bank, nomor rekening, dan nama pemilik wajib diisi")
	}
	return u.repo.Create(account)
}

func (u *SchoolBankUsecase) Update(account *domain.SchoolBankAccount) error {
	if account.BankName == "" || account.AccountNumber == "" || account.AccountHolder == "" {
		return errors.New("nama bank, nomor rekening, dan nama pemilik wajib diisi")
	}
	existing, err := u.repo.GetByID(account.ID)
	if err != nil {
		return errors.New("rekening tidak ditemukan")
	}
	existing.BankName = account.BankName
	existing.AccountNumber = account.AccountNumber
	existing.AccountHolder = account.AccountHolder
	existing.IsActive = account.IsActive
	return u.repo.Update(existing)
}

func (u *SchoolBankUsecase) Delete(id uint) error {
	_, err := u.repo.GetByID(id)
	if err != nil {
		return errors.New("rekening tidak ditemukan")
	}
	return u.repo.Delete(id)
}

func (u *SchoolBankUsecase) SetPrimary(id uint) error {
	_, err := u.repo.GetByID(id)
	if err != nil {
		return errors.New("rekening tidak ditemukan")
	}
	return u.repo.SetPrimary(id)
}
