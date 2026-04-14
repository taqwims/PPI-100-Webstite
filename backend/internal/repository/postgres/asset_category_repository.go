package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type AssetCategoryRepository struct {
	db *gorm.DB
}

func NewAssetCategoryRepository(db *gorm.DB) *AssetCategoryRepository {
	return &AssetCategoryRepository{db: db}
}

func (r *AssetCategoryRepository) Create(cat *domain.AssetCategory) error {
	return r.db.Create(cat).Error
}

func (r *AssetCategoryRepository) GetAll() ([]domain.AssetCategory, error) {
	var cats []domain.AssetCategory
	err := r.db.Order("name asc").Find(&cats).Error
	return cats, err
}

func (r *AssetCategoryRepository) GetByID(id uint) (*domain.AssetCategory, error) {
	var cat domain.AssetCategory
	err := r.db.First(&cat, id).Error
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (r *AssetCategoryRepository) Update(cat *domain.AssetCategory) error {
	return r.db.Save(cat).Error
}

func (r *AssetCategoryRepository) Delete(id uint) error {
	return r.db.Delete(&domain.AssetCategory{}, id).Error
}
