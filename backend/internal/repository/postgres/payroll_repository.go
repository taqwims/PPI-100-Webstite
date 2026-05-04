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

func (r *PayrollRepository) GetPayrolls(month, year int, userID string) ([]domain.Payroll, error) {
	var payrolls []domain.Payroll
	query := r.db.Preload("User").Order("created_at desc")
	if month > 0 && year > 0 {
		query = query.Where("period_month = ? AND period_year = ?", month, year)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
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

func (r *PayrollRepository) GetPayrollTemplates() ([]domain.PayrollTemplate, error) {
	var templates []domain.PayrollTemplate
	err := r.db.Preload("User").Find(&templates).Error
	return templates, err
}

func (r *PayrollRepository) GetPayrollTemplateByUserID(userID string) (*domain.PayrollTemplate, error) {
	var template domain.PayrollTemplate
	err := r.db.Where("user_id = ?", userID).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *PayrollRepository) UpsertPayrollTemplate(template *domain.PayrollTemplate) error {
	// If it doesn't exist by UserID, create it. Otherwise, update it.
	var existing domain.PayrollTemplate
	err := r.db.Where("user_id = ?", template.UserID).First(&existing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	if err == gorm.ErrRecordNotFound {
		return r.db.Create(template).Error
	}
    
	existing.BaseSalary = template.BaseSalary
	existing.FunctionalAllowance = template.FunctionalAllowance
	existing.TransportAllowance = template.TransportAllowance
	existing.AdditionalTask = template.AdditionalTask
	existing.CustomIncomeItems = template.CustomIncomeItems
	existing.CustomDeductionItems = template.CustomDeductionItems
	return r.db.Save(&existing).Error
}
