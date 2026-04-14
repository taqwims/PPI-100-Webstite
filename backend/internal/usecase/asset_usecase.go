package usecase

import (
	"errors"
	"time"

	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type AssetUsecase struct {
	repo *postgres.AssetRepository
}

func NewAssetUsecase(repo *postgres.AssetRepository) *AssetUsecase {
	return &AssetUsecase{repo: repo}
}

// CreateAsset validates and creates a new asset.
// Requirements 9.19: acquisition_value must be > 0
// Requirements 9.20: acquisition_date must not be in the future
func (u *AssetUsecase) CreateAsset(asset *domain.Asset) error {
	if err := validateAsset(asset); err != nil {
		return err
	}
	return u.repo.Create(asset)
}

// GetAssets returns assets filtered by the given parameters.
func (u *AssetUsecase) GetAssets(kategori, kondisi, status, lokasi, keyword string) ([]domain.Asset, error) {
	return u.repo.GetAll(kategori, kondisi, status, lokasi, keyword)
}

// GetAssetByID returns a single asset by its ID.
func (u *AssetUsecase) GetAssetByID(id string) (*domain.Asset, error) {
	return u.repo.GetByID(id)
}

// UpdateAsset validates and updates an existing asset.
// Requirements 9.9: when status is changed to "Dihapuskan", deleted_at is set automatically.
// Requirements 9.19: acquisition_value must be > 0
// Requirements 9.20: acquisition_date must not be in the future
func (u *AssetUsecase) UpdateAsset(asset *domain.Asset) error {
	if err := validateAsset(asset); err != nil {
		return err
	}
	if asset.Status == "Dihapuskan" && asset.DeletedAt == nil {
		now := time.Now()
		asset.DeletedAt = &now
	}
	return u.repo.Update(asset)
}

// DeleteAsset permanently deletes an asset by ID.
func (u *AssetUsecase) DeleteAsset(id string) error {
	return u.repo.Delete(id)
}

// GetAssetRecap returns a summary of assets grouped by category and status.
func (u *AssetUsecase) GetAssetRecap() (*domain.AssetRecap, error) {
	return u.repo.GetRecap()
}

// validateAsset checks acquisition_value and acquisition_date constraints.
func validateAsset(asset *domain.Asset) error {
	if asset.AcquisitionValue <= 0 {
		return errors.New("Nilai perolehan harus berupa angka positif")
	}
	if asset.AcquisitionDate.After(time.Now()) {
		return errors.New("Tanggal perolehan tidak boleh melebihi tanggal hari ini")
	}
	return nil
}
