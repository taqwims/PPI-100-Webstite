package postgres

import (
	"fmt"
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type InfaqTypeRepository interface {
	Create(infaqType *domain.InfaqType) error
	GetAll() ([]domain.InfaqType, error)
	GetByID(id uint) (*domain.InfaqType, error)
	Update(id uint, name, description string, isActive bool) error
	Delete(id uint) error
}

type infaqTypeRepository struct {
	db *gorm.DB
}

func NewInfaqTypeRepository(db *gorm.DB) InfaqTypeRepository {
	return &infaqTypeRepository{db: db}
}

func (r *infaqTypeRepository) Create(infaqType *domain.InfaqType) error {
	return r.db.Create(infaqType).Error
}

func (r *infaqTypeRepository) GetAll() ([]domain.InfaqType, error) {
	var types []domain.InfaqType
	if err := r.db.Order("name asc").Find(&types).Error; err != nil {
		return nil, err
	}
	return types, nil
}

func (r *infaqTypeRepository) GetByID(id uint) (*domain.InfaqType, error) {
	var infaqType domain.InfaqType
	if err := r.db.First(&infaqType, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("%w: infaq type id %d", domain.ErrNotFound, id)
		}
		return nil, err
	}
	return &infaqType, nil
}

func (r *infaqTypeRepository) Update(id uint, name, description string, isActive bool) error {
	result := r.db.Model(&domain.InfaqType{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":        name,
		"description": description,
		"is_active":   isActive,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("%w: infaq type id %d", domain.ErrNotFound, id)
	}
	return nil
}

func (r *infaqTypeRepository) Delete(id uint) error {
	result := r.db.Delete(&domain.InfaqType{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("%w: infaq type id %d", domain.ErrNotFound, id)
	}
	return nil
}
