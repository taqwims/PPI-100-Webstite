package postgres

import (
	"ppi-100-sis/internal/domain"

	"github.com/google/uuid"
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
	err := r.db.Where("student_id = ?", studentID).
		Preload("Payments").
		Preload("Student.User").
		Preload("Student.Class").
		Preload("AcademicYear").
		Order("created_at desc").
		Find(&bills).Error
	return bills, err
}

func (r *FinanceRepository) GetAllBills(unitID uint) ([]domain.Bill, error) {
	var bills []domain.Bill
	// Join with students to filter by unitID if needed, or just return all for now.
	// Assuming unitID filtering is done via Student relation
	err := r.db.Joins("JOIN students ON students.id = bills.student_id").
		Where("students.unit_id = ?", unitID).
		Preload("Payments").
		Preload("Student.User").
		Preload("Student.Class").
		Preload("AcademicYear").
		Find(&bills).Error
	return bills, err
}

func (r *FinanceRepository) GetBillsByStudentIDs(studentIDs []uuid.UUID) ([]domain.Bill, error) {
	var bills []domain.Bill
	if len(studentIDs) == 0 {
		return bills, nil
	}
	err := r.db.Where("student_id IN ?", studentIDs).
		Preload("Payments").
		Preload("Student.User").
		Preload("Student.Class").
		Preload("AcademicYear").
		Order("created_at desc").
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

func (r *FinanceRepository) GetBillByID(id string) (*domain.Bill, error) {
	var bill domain.Bill
	err := r.db.Where("id = ?", id).
		Preload("Payments").
		Preload("Student.User").
		Preload("Student.Class").
		Preload("AcademicYear").
		Preload("TransactionCode").
		First(&bill).Error
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

// Update/Delete for Payment
func (r *FinanceRepository) UpdatePayment(payment *domain.Payment) error {
	return r.db.Save(payment).Error
}

func (r *FinanceRepository) DeletePayment(id string) error {
	return r.db.Delete(&domain.Payment{}, "id = ?", id).Error
}

// GetPaymentByTransactionID finds a payment by its Midtrans transaction/order ID
func (r *FinanceRepository) GetPaymentByTransactionID(transactionID string) (*domain.Payment, error) {
	var payment domain.Payment
	err := r.db.Where("transaction_id = ?", transactionID).First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// Bill Template CRUD
func (r *FinanceRepository) CreateBillTemplate(template *domain.BillTemplate) error {
	return r.db.Create(template).Error
}

func (r *FinanceRepository) GetBillTemplates(unitID uint) ([]domain.BillTemplate, error) {
	var templates []domain.BillTemplate
	err := r.db.Where("unit_id = ?", unitID).
		Preload("TransactionCode").
		Order("created_at desc").
		Find(&templates).Error
	return templates, err
}

func (r *FinanceRepository) DeleteBillTemplate(id string) error {
	return r.db.Delete(&domain.BillTemplate{}, "id = ?", id).Error
}

func (r *FinanceRepository) AddCashLedgerEntry(entry *domain.CashLedger) error {
	return r.db.Create(entry).Error
}

// GetBillByObligationID finds a bill linked to a StudentObligation
func (r *FinanceRepository) GetBillByObligationID(obligationID string) (*domain.Bill, error) {
	var bill domain.Bill
	err := r.db.Where("obligation_id = ?", obligationID).
		Preload("Payments").
		Preload("Student.User").
		First(&bill).Error
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

// GetBillByActivityObligationID finds a bill linked to an ActivityObligation
func (r *FinanceRepository) GetBillByActivityObligationID(activityObligationID string) (*domain.Bill, error) {
	var bill domain.Bill
	err := r.db.Where("activity_obligation_id = ?", activityObligationID).
		Preload("Payments").
		Preload("Student.User").
		First(&bill).Error
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

func (r *FinanceRepository) GetInvoiceConfigByType(invType string) (*domain.InvoiceNumberConfig, error) {
	var cfg domain.InvoiceNumberConfig
	err := r.db.Where("invoice_type = ?", invType).First(&cfg).Error
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}
