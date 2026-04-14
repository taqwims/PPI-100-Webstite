package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type AssetRepository struct {
	db *gorm.DB
}

func NewAssetRepository(db *gorm.DB) *AssetRepository {
	return &AssetRepository{db: db}
}

func (r *AssetRepository) Create(asset *domain.Asset) error {
	return r.db.Create(asset).Error
}

func (r *AssetRepository) GetByID(id string) (*domain.Asset, error) {
	var asset domain.Asset
	err := r.db.Where("id = ?", id).
		Preload("CreatedBy").
		First(&asset).Error
	if err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *AssetRepository) GetAll(kategori, kondisi, status, lokasi, keyword string) ([]domain.Asset, error) {
	var assets []domain.Asset
	query := r.db.Preload("CreatedBy")

	if kategori != "" {
		query = query.Where("category = ?", kategori)
	}
	if kondisi != "" {
		query = query.Where("condition = ?", kondisi)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if lokasi != "" {
		query = query.Where("location = ?", lokasi)
	}
	if keyword != "" {
		query = query.Where("name ILIKE ?", "%"+keyword+"%")
	}

	err := query.Order("created_at desc").Find(&assets).Error
	return assets, err
}

func (r *AssetRepository) Update(asset *domain.Asset) error {
	return r.db.Save(asset).Error
}

func (r *AssetRepository) Delete(id string) error {
	return r.db.Delete(&domain.Asset{}, "id = ?", id).Error
}

func (r *AssetRepository) GetRecap() (*domain.AssetRecap, error) {
	var byCategory []domain.AssetCategoryCount
	err := r.db.Model(&domain.Asset{}).
		Select("category, COUNT(*) as count, SUM(acquisition_value) as value").
		Group("category").
		Scan(&byCategory).Error
	if err != nil {
		return nil, err
	}

	var byStatus []domain.AssetStatusCount
	err = r.db.Model(&domain.Asset{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&byStatus).Error
	if err != nil {
		return nil, err
	}

	var totalValue float64
	var totalAssets int64
	r.db.Model(&domain.Asset{}).Select("COALESCE(SUM(acquisition_value), 0)").Scan(&totalValue)
	r.db.Model(&domain.Asset{}).Count(&totalAssets)

	return &domain.AssetRecap{
		ByCategory:  byCategory,
		ByStatus:    byStatus,
		TotalValue:  totalValue,
		TotalAssets: int(totalAssets),
	}, nil
}
