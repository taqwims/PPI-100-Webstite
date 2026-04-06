package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type PaymentTypeUsecase struct {
	repo *postgres.PaymentTypeRepository
}

func NewPaymentTypeUsecase(repo *postgres.PaymentTypeRepository) *PaymentTypeUsecase {
	return &PaymentTypeUsecase{repo: repo}
}

func (u *PaymentTypeUsecase) Create(pt *domain.PaymentType) error {
	return u.repo.Create(pt)
}

func (u *PaymentTypeUsecase) GetAll(academicYearID uint) ([]domain.PaymentType, error) {
	return u.repo.GetAll(academicYearID)
}

func (u *PaymentTypeUsecase) GetByID(id uint) (*domain.PaymentType, error) {
	return u.repo.GetByID(id)
}

func (u *PaymentTypeUsecase) Update(pt *domain.PaymentType) error {
	return u.repo.Update(pt)
}

func (u *PaymentTypeUsecase) Delete(id uint) error {
	return u.repo.Delete(id)
}
