package repository

import "ppi-100-sis/internal/domain"

type InfaqTypeRepository interface {
	Create(infaqType *domain.InfaqType) error
	GetAll() ([]domain.InfaqType, error)
	GetByID(id uint) (*domain.InfaqType, error)
	Update(id uint, name, description string, isActive bool) error
	Delete(id uint) error
}
