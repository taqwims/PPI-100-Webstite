package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type FinanceUsecase struct {
	financeRepo *postgres.FinanceRepository
}

func NewFinanceUsecase(financeRepo *postgres.FinanceRepository) *FinanceUsecase {
	return &FinanceUsecase{financeRepo: financeRepo}
}

func (u *FinanceUsecase) CreateBill(studentID uuid.UUID, title string, amount float64, dueDate time.Time) error {
	bill := &domain.Bill{
		StudentID: studentID,
		Title:     title,
		Amount:    amount,
		DueDate:   dueDate,
		Status:    "Unpaid",
	}
	return u.financeRepo.CreateBill(bill)
}

func (u *FinanceUsecase) GetAllBills(unitID uint) ([]domain.Bill, error) {
	return u.financeRepo.GetAllBills(unitID)
}

func (u *FinanceUsecase) GetStudentBills(studentID string) ([]domain.Bill, error) {
	return u.financeRepo.GetBillsByStudent(studentID)
}

func (u *FinanceUsecase) RecordPayment(billID uuid.UUID, amount float64, method string) error {
	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: method,
		Status:        "Success", // Auto success for manual entry
		PaidAt:        time.Now(),
	}

	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return err
	}

	// Update bill status
	return u.financeRepo.UpdateBillStatus(billID.String(), "Paid")
}
