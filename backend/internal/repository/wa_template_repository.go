package repository

import "ppi-100-sis/internal/domain"

type WATemplateRepository interface {
	Create(template *domain.WATemplate) error
	GetAll() ([]domain.WATemplate, error)
	GetByID(id uint) (*domain.WATemplate, error)
	Update(id uint, name, bodyTemplate string, isDefault bool) error
	Delete(id uint) error
}
