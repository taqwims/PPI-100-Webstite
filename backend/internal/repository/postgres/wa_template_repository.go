package postgres

import (
	"fmt"
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type WATemplateRepository interface {
	Create(template *domain.WATemplate) error
	GetAll() ([]domain.WATemplate, error)
	GetByID(id uint) (*domain.WATemplate, error)
	Update(id uint, name, bodyTemplate string, isDefault bool) error
	Delete(id uint) error
}

type waTemplateRepository struct {
	db *gorm.DB
}

func NewWATemplateRepository(db *gorm.DB) WATemplateRepository {
	return &waTemplateRepository{db: db}
}

func (r *waTemplateRepository) Create(template *domain.WATemplate) error {
	return r.db.Create(template).Error
}

func (r *waTemplateRepository) GetAll() ([]domain.WATemplate, error) {
	var templates []domain.WATemplate
	if err := r.db.Order("name asc").Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

func (r *waTemplateRepository) GetByID(id uint) (*domain.WATemplate, error) {
	var template domain.WATemplate
	if err := r.db.First(&template, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("%w: wa template id %d", domain.ErrNotFound, id)
		}
		return nil, err
	}
	return &template, nil
}

func (r *waTemplateRepository) Update(id uint, name, bodyTemplate string, isDefault bool) error {
	result := r.db.Model(&domain.WATemplate{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":          name,
		"body_template": bodyTemplate,
		"is_default":    isDefault,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("%w: wa template id %d", domain.ErrNotFound, id)
	}
	return nil
}

func (r *waTemplateRepository) Delete(id uint) error {
	result := r.db.Delete(&domain.WATemplate{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("%w: wa template id %d", domain.ErrNotFound, id)
	}
	return nil
}
