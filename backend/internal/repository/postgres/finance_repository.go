package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type FinanceRepository struct {
	db *gorm.DB
}

func NewFinanceRepository(db *gorm.DB) *FinanceRepository {
	return &FinanceRepository{db: db}
}

func (r *FinanceRepository) CreateBill(bill *domain.Bill) error {
	return r.db.Create(bill).Error
}

func (r *FinanceRepository) GetBillsByStudent(studentID string) ([]domain.Bill, error) {
	var bills []domain.Bill
	err := r.db.Where("student_id = ?", studentID).Preload("Student.User").Find(&bills).Error
	return bills, err
}

func (r *FinanceRepository) GetAllBills(unitID uint) ([]domain.Bill, error) {
	var bills []domain.Bill
	// Join with students to filter by unitID if needed, or just return all for now.
	// Assuming unitID filtering is done via Student relation
	err := r.db.Joins("JOIN students ON students.id = bills.student_id").
		Where("students.unit_id = ?", unitID).
		Preload("Student.User").
		Find(&bills).Error
	return bills, err
}

func (r *FinanceRepository) CreatePayment(payment *domain.Payment) error {
	return r.db.Create(payment).Error
}

func (r *FinanceRepository) UpdateBillStatus(billID string, status string) error {
	return r.db.Model(&domain.Bill{}).Where("id = ?", billID).Update("status", status).Error
}

// Full Update/Delete for Bill
func (r *FinanceRepository) UpdateBill(bill *domain.Bill) error {
	return r.db.Save(bill).Error
}

func (r *FinanceRepository) DeleteBill(id string) error {
	return r.db.Delete(&domain.Bill{}, "id = ?", id).Error
}

// Update/Delete for Payment
func (r *FinanceRepository) UpdatePayment(payment *domain.Payment) error {
	return r.db.Save(payment).Error
}

func (r *FinanceRepository) DeletePayment(id string) error {
	return r.db.Delete(&domain.Payment{}, "id = ?", id).Error
}

