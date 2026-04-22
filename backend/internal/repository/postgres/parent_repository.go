package postgres

import (
	"ppi-100-sis/internal/domain"
	"gorm.io/gorm"
)

type ParentRepository struct {
	db *gorm.DB
}

func NewParentRepository(db *gorm.DB) *ParentRepository {
	return &ParentRepository{db: db}
}

func (r *ParentRepository) GetAll() ([]domain.Parent, error) {
	var parents []domain.Parent
	err := r.db.Preload("User").Find(&parents).Error
	return parents, err
}

func (r *ParentRepository) FindByID(id string) (*domain.Parent, error) {
	var parent domain.Parent
	err := r.db.Preload("User").First(&parent, "id = ?", id).Error
	return &parent, err
}

func (r *ParentRepository) FindByUserID(userID string) (*domain.Parent, error) {
	var parent domain.Parent
	err := r.db.Preload("User").First(&parent, "user_id = ?", userID).Error
	return &parent, err
}

func (r *ParentRepository) Create(parent *domain.Parent) error {
	return r.db.Create(parent).Error
}

func (r *ParentRepository) Update(parent *domain.Parent) error {
	return r.db.Save(parent).Error
}

func (r *ParentRepository) Delete(id string) error {
	return r.db.Delete(&domain.Parent{}, "id = ?", id).Error
}
