package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type InfaqTypeUsecase interface {
	Create(req *domain.InfaqType) error
	GetAll() ([]domain.InfaqType, error)
	Update(id uint, req *domain.InfaqType) error
	Delete(id uint) error
}

type infaqTypeUsecase struct {
	repo postgres.InfaqTypeRepository
}

func NewInfaqTypeUsecase(repo postgres.InfaqTypeRepository) InfaqTypeUsecase {
	return &infaqTypeUsecase{repo: repo}
}

func (u *infaqTypeUsecase) Create(req *domain.InfaqType) error {
	if req.Name == "" {
		return errors.New("nama jenis infaq tidak boleh kosong")
	}
	return u.repo.Create(req)
}

func (u *infaqTypeUsecase) GetAll() ([]domain.InfaqType, error) {
	return u.repo.GetAll()
}

func (u *infaqTypeUsecase) Update(id uint, req *domain.InfaqType) error {
	if req.Name == "" {
		return errors.New("nama jenis infaq tidak boleh kosong")
	}
	return u.repo.Update(id, req.Name, req.Description, req.IsActive)
}

func (u *infaqTypeUsecase) Delete(id uint) error {
	return u.repo.Delete(id)
}
