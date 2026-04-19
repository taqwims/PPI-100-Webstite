package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SchoolSettingRepository struct {
	db *gorm.DB
}

func NewSchoolSettingRepository(db *gorm.DB) *SchoolSettingRepository {
	return &SchoolSettingRepository{db: db}
}

func (r *SchoolSettingRepository) GetAll() ([]domain.SchoolSetting, error) {
	var settings []domain.SchoolSetting
	err := r.db.Order("id ASC").Find(&settings).Error
	return settings, err
}

func (r *SchoolSettingRepository) GetByKey(key string) (*domain.SchoolSetting, error) {
	var setting domain.SchoolSetting
	err := r.db.Where("key = ?", key).First(&setting).Error
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func (r *SchoolSettingRepository) BulkUpdate(settings []domain.SchoolSetting) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, s := range settings {
			if err := tx.Model(&domain.SchoolSetting{}).
				Where("key = ?", s.Key).
				Update("value", s.Value).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *SchoolSettingRepository) GetUnits() ([]domain.Unit, error) {
	var units []domain.Unit
	err := r.db.Preload("Foundation").Find(&units).Error
	return units, err
}

func (r *SchoolSettingRepository) GetFoundations() ([]domain.Foundation, error) {
	var foundations []domain.Foundation
	err := r.db.Find(&foundations).Error
	return foundations, err
}

// Seed creates default school settings if they don't exist yet.
// It reads initial values from the provided defaults map (typically from env vars).
func (r *SchoolSettingRepository) Seed(defaults map[string]string) error {
	seedSettings := []domain.SchoolSetting{
		{Key: "school_name", Value: defaults["school_name"], Description: "Nama Sekolah", IsAdminEdit: true},
		{Key: "school_address", Value: defaults["school_address"], Description: "Alamat Sekolah", IsAdminEdit: true},
		{Key: "school_logo_url", Value: defaults["school_logo_url"], Description: "URL Logo Sekolah", IsAdminEdit: true},
		{Key: "school_phone", Value: "", Description: "Nomor Telepon Sekolah", IsAdminEdit: true},
		{Key: "school_email", Value: "", Description: "Email Sekolah", IsAdminEdit: true},
		{Key: "school_npsn", Value: "", Description: "NPSN Sekolah", IsAdminEdit: true},
		{Key: "foundation_name", Value: "", Description: "Nama Yayasan (Developer Only)", IsAdminEdit: true}, // initially true, updated below
	}

	for _, s := range seedSettings {
		// Only insert if not exists — don't overwrite existing values
		r.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "key"}},
			DoNothing: true,
		}).Create(&s)
	}

	// Fix developer-only fields (GORM ignores false because it's a zero value with default:true)
	r.db.Model(&domain.SchoolSetting{}).Where("key = ?", "foundation_name").Update("is_admin_edit", false)

	return nil
}
