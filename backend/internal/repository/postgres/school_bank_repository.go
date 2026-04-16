package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type SchoolBankRepository struct {
	db *gorm.DB
}

func NewSchoolBankRepository(db *gorm.DB) *SchoolBankRepository {
	return &SchoolBankRepository{db: db}
}

func (r *SchoolBankRepository) GetAll() ([]domain.SchoolBankAccount, error) {
	var accounts []domain.SchoolBankAccount
	err := r.db.Order("is_primary desc, created_at asc").Find(&accounts).Error
	return accounts, err
}

func (r *SchoolBankRepository) GetActive() ([]domain.SchoolBankAccount, error) {
	var accounts []domain.SchoolBankAccount
	err := r.db.Where("is_active = ?", true).Order("is_primary desc, created_at asc").Find(&accounts).Error
	return accounts, err
}

func (r *SchoolBankRepository) GetByID(id uint) (*domain.SchoolBankAccount, error) {
	var account domain.SchoolBankAccount
	err := r.db.First(&account, id).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *SchoolBankRepository) Create(account *domain.SchoolBankAccount) error {
	return r.db.Create(account).Error
}

func (r *SchoolBankRepository) Update(account *domain.SchoolBankAccount) error {
	return r.db.Save(account).Error
}

func (r *SchoolBankRepository) Delete(id uint) error {
	return r.db.Delete(&domain.SchoolBankAccount{}, id).Error
}

// SetPrimary sets one account as primary and resets all others
func (r *SchoolBankRepository) SetPrimary(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Reset all to non-primary
		if err := tx.Model(&domain.SchoolBankAccount{}).Where("1=1").Update("is_primary", false).Error; err != nil {
			return err
		}
		// Set the target as primary
		return tx.Model(&domain.SchoolBankAccount{}).Where("id = ?", id).Update("is_primary", true).Error
	})
}
