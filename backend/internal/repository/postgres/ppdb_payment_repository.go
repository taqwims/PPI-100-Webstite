package postgres

import (
	"ppi-100-sis/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PPDBPaymentRepository struct {
	db *gorm.DB
}

func NewPPDBPaymentRepository(db *gorm.DB) *PPDBPaymentRepository {
	return &PPDBPaymentRepository{db: db}
}

func (r *PPDBPaymentRepository) Create(payment *domain.PPDBPayment) error {
	return r.db.Create(payment).Error
}

func (r *PPDBPaymentRepository) GetByID(id string) (*domain.PPDBPayment, error) {
	var payment domain.PPDBPayment
	err := r.db.Where("id = ?", id).
		Preload("Items").
		Preload("PPDBRegistration").
		First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *PPDBPaymentRepository) GetByRegistrationID(registrationID uuid.UUID) (*domain.PPDBPayment, error) {
	var payment domain.PPDBPayment
	err := r.db.Where("ppdb_registration_id = ?", registrationID).
		Preload("Items").
		Preload("PPDBRegistration").
		First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *PPDBPaymentRepository) GetAll() ([]domain.PPDBPayment, error) {
	var payments []domain.PPDBPayment
	err := r.db.
		Preload("Items").
		Preload("PPDBRegistration").
		Order("created_at desc").
		Find(&payments).Error
	return payments, err
}

func (r *PPDBPaymentRepository) Update(payment *domain.PPDBPayment) error {
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Updates(payment).Error
}

func (r *PPDBPaymentRepository) Delete(id string) error {
	return r.db.Delete(&domain.PPDBPayment{}, "id = ?", id).Error
}
