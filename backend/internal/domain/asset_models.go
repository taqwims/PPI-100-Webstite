package domain

import (
	"time"

	"github.com/google/uuid"
	)

// ------------------- Asset Management -------------------
type Asset struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name             string     `gorm:"not null" json:"name"`
	Category         string     `gorm:"not null" json:"category"`          // Elektronik, Furnitur, Kendaraan, Bangunan, Perlengkapan
	Condition        string     `gorm:"not null" json:"condition"`         // Baik, Rusak Ringan, Rusak Berat
	Location         string     `gorm:"not null" json:"location"`
	AcquisitionValue float64    `gorm:"not null" json:"acquisition_value"`
	AcquisitionDate  time.Time  `gorm:"not null" json:"acquisition_date"`
	Status           string     `gorm:"not null;default:'Aktif'" json:"status"` // Aktif, Dalam Perbaikan, Dihapuskan
	DeletedAt        *time.Time `json:"deleted_at"`                        // Diisi otomatis saat status = Dihapuskan
	Notes            string     `json:"notes"`
	CreatedByID      uuid.UUID  `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy        User       `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type AssetRecap struct {
	ByCategory  []AssetCategoryCount `json:"by_category"`
	ByStatus    []AssetStatusCount   `json:"by_status"`
	TotalValue  float64              `json:"total_value"`
	TotalAssets int                  `json:"total_assets"`
}

type AssetCategoryCount struct {
	Category string  `json:"category"`
	Count    int     `json:"count"`
	Value    float64 `json:"value"`
}

type AssetStatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type AssetCategory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"uniqueIndex;not null" json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

