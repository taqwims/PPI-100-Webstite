package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type SchoolSettingUsecase struct {
	repo *postgres.SchoolSettingRepository
}

func NewSchoolSettingUsecase(repo *postgres.SchoolSettingRepository) *SchoolSettingUsecase {
	return &SchoolSettingUsecase{repo: repo}
}

func (u *SchoolSettingUsecase) GetAllSettings() ([]domain.SchoolSetting, error) {
	return u.repo.GetAll()
}

// GetSchoolInfo returns school info as map[string]string — backward compatible with config.SchoolInfo()
func (u *SchoolSettingUsecase) GetSchoolInfo() map[string]string {
	settings, err := u.repo.GetAll()
	if err != nil {
		return map[string]string{
			"name":     "Sekolah",
			"logo_url": "",
			"address":  "",
		}
	}

	info := map[string]string{}
	keyMap := map[string]string{
		"school_name":     "name",
		"school_logo_url": "logo_url",
		"school_address":  "address",
		"school_phone":    "phone",
		"school_email":    "email",
		"school_npsn":     "npsn",
		"landing_hero_title": "landing_hero_title",
		"landing_hero_subtitle": "landing_hero_subtitle",
		"landing_about_title": "landing_about_title",
		"landing_about_desc": "landing_about_desc",
		"landing_cta_title": "landing_cta_title",
		"landing_cta_desc": "landing_cta_desc",
	}

	for _, s := range settings {
		if alias, ok := keyMap[s.Key]; ok {
			info[alias] = s.Value
		}
	}

	// Ensure required keys exist
	if info["name"] == "" {
		info["name"] = "Sekolah"
	}

	return info
}

// UpdateSettings updates settings, respecting isAdminEdit permission.
// If isAdmin is true, only settings with IsAdminEdit=true can be updated.
func (u *SchoolSettingUsecase) UpdateSettings(updates []domain.SchoolSetting, isAdmin bool) error {
	if isAdmin {
		// Verify all keys are admin-editable
		currentSettings, err := u.repo.GetAll()
		if err != nil {
			return err
		}

		settingMap := make(map[string]domain.SchoolSetting)
		for _, s := range currentSettings {
			settingMap[s.Key] = s
		}

		for _, update := range updates {
			existing, ok := settingMap[update.Key]
			if !ok {
				return fmt.Errorf("setting key '%s' not found", update.Key)
			}
			if !existing.IsAdminEdit {
				return fmt.Errorf("setting '%s' can only be changed by developer", update.Key)
			}
		}
	}

	return u.repo.BulkUpdate(updates)
}

func (u *SchoolSettingUsecase) GetUnits() ([]domain.Unit, error) {
	return u.repo.GetUnits()
}

func (u *SchoolSettingUsecase) GetFoundations() ([]domain.Foundation, error) {
	return u.repo.GetFoundations()
}
