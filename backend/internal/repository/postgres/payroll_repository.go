package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type PayrollRepository struct {
	db *gorm.DB
}

func NewPayrollRepository(db *gorm.DB) *PayrollRepository {
	return &PayrollRepository{db: db}
}

func (r *PayrollRepository) GetPayrolls(month, year int) ([]domain.Payroll, error) {
	var payrolls []domain.Payroll
	query := r.db.Preload("User").Order("created_at desc")
	if month > 0 && year > 0 {
		query = query.Where("period_month = ? AND period_year = ?", month, year)
	}
	err := query.Find(&payrolls).Error
	return payrolls, err
}

func (r *PayrollRepository) GetPayrollByID(id string) (*domain.Payroll, error) {
	var payroll domain.Payroll
	err := r.db.Preload("User").Where("id = ?", id).First(&payroll).Error
	if err != nil {
		return nil, err
	}
	return &payroll, nil
}

func (r *PayrollRepository) CreatePayroll(payroll *domain.Payroll) error {
	return r.db.Create(payroll).Error
}

func (r *PayrollRepository) UpdatePayroll(payroll *domain.Payroll) error {
	return r.db.Save(payroll).Error
}

func (r *PayrollRepository) DeletePayroll(id string) error {
	return r.db.Delete(&domain.Payroll{}, "id = ?", id).Error
}
