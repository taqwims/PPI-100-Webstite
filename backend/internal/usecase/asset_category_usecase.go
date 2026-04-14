package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type AssetCategoryUsecase struct {
	repo *postgres.AssetCategoryRepository
}

func NewAssetCategoryUsecase(repo *postgres.AssetCategoryRepository) *AssetCategoryUsecase {
	return &AssetCategoryUsecase{repo: repo}
}

func (u *AssetCategoryUsecase) Create(cat *domain.AssetCategory) error {
	return u.repo.Create(cat)
}

func (u *AssetCategoryUsecase) GetAll() ([]domain.AssetCategory, error) {
	return u.repo.GetAll()
}

func (u *AssetCategoryUsecase) Update(cat *domain.AssetCategory) error {
	return u.repo.Update(cat)
}

func (u *AssetCategoryUsecase) Delete(id uint) error {
	return u.repo.Delete(id)
}
