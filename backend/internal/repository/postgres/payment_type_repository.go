package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type PaymentTypeRepository struct {
	db *gorm.DB
}

func NewPaymentTypeRepository(db *gorm.DB) *PaymentTypeRepository {
	return &PaymentTypeRepository{db: db}
}

func (r *PaymentTypeRepository) Create(pt *domain.PaymentType) error {
	return r.db.Create(pt).Error
}

func (r *PaymentTypeRepository) GetAll(academicYearID uint) ([]domain.PaymentType, error) {
	var pts []domain.PaymentType
	query := r.db.Preload("Class").Preload("AcademicYear").Preload("TransactionCode")
	if academicYearID > 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}
	if err := query.Order("code ASC").Find(&pts).Error; err != nil {
		return nil, err
	}
	return pts, nil
}

func (r *PaymentTypeRepository) GetByID(id uint) (*domain.PaymentType, error) {
	var pt domain.PaymentType
	if err := r.db.Preload("Class").Preload("AcademicYear").Preload("TransactionCode").Where("id = ?", id).First(&pt).Error; err != nil {
		return nil, err
	}
	return &pt, nil
}

func (r *PaymentTypeRepository) Update(pt *domain.PaymentType) error {
	return r.db.Save(pt).Error
}

func (r *PaymentTypeRepository) Delete(id uint) error {
	return r.db.Delete(&domain.PaymentType{}, id).Error
}
