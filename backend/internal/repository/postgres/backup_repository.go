package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BackupRepository struct {
	db *gorm.DB
}

func NewBackupRepository(db *gorm.DB) *BackupRepository {
	return &BackupRepository{db: db}
}

func (r *BackupRepository) Create(backup *domain.DatabaseBackup) error {
	return r.db.Create(backup).Error
}

func (r *BackupRepository) GetAll() ([]domain.DatabaseBackup, error) {
	var backups []domain.DatabaseBackup
	err := r.db.Preload("CreatedBy").Order("created_at DESC").Find(&backups).Error
	return backups, err
}

func (r *BackupRepository) GetByID(id uuid.UUID) (*domain.DatabaseBackup, error) {
	var backup domain.DatabaseBackup
	err := r.db.Preload("CreatedBy").Where("id = ?", id).First(&backup).Error
	if err != nil {
		return nil, err
	}
	return &backup, nil
}

func (r *BackupRepository) UpdateStatus(id uuid.UUID, status string) error {
	return r.db.Model(&domain.DatabaseBackup{}).Where("id = ?", id).Update("status", status).Error
}

func (r *BackupRepository) MarkRestored(id uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&domain.DatabaseBackup{}).Where("id = ?", id).Updates(map[string]interface{}{
		"restored_at": &now,
		"status":      "Restored",
	}).Error
}

func (r *BackupRepository) Delete(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&domain.DatabaseBackup{}).Error
}
