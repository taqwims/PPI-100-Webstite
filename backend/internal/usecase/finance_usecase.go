package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type FinanceUsecase struct {
	financeRepo      *postgres.FinanceRepository
	notificationUsecase *NotificationUsecase
	userRepo *postgres.UserRepository
}

func NewFinanceUsecase(financeRepo *postgres.FinanceRepository, notificationUsecase *NotificationUsecase, userRepo *postgres.UserRepository) *FinanceUsecase {
	return &FinanceUsecase{
		financeRepo:      financeRepo,
		notificationUsecase: notificationUsecase,
		userRepo: userRepo,
	}
}

func (u *FinanceUsecase) CreateBill(studentID uuid.UUID, title string, amount float64, dueDate time.Time) error {
	bill := &domain.Bill{
		StudentID: studentID,
		Title:     title,
		Amount:    amount,
		DueDate:   dueDate,
		Status:    "Unpaid",
	}
	if err := u.financeRepo.CreateBill(bill); err != nil {
		return err
	}

	// Send Notification
	return u.notificationUsecase.SendNotification(
		studentID,
		"Tagihan Baru",
		"Anda memiliki tagihan baru: "+title,
		"bill",
		bill.ID.String(),
	)
}

func (u *FinanceUsecase) GetAllBills(unitID uint) ([]domain.Bill, error) {
	return u.financeRepo.GetAllBills(unitID)
}

func (u *FinanceUsecase) GetStudentBills(studentID string) ([]domain.Bill, error) {
	return u.financeRepo.GetBillsByStudent(studentID)
}

func (u *FinanceUsecase) GetStudentBillsByUserID(userID string) ([]domain.Bill, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.Student == nil {
		return nil, errors.New("user is not a student")
	}
	return u.GetStudentBills(user.Student.ID.String())
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

// Update/Delete Bill
func (u *FinanceUsecase) UpdateBill(bill *domain.Bill) error {
	return u.financeRepo.UpdateBill(bill)
}

func (u *FinanceUsecase) DeleteBill(id string) error {
	return u.financeRepo.DeleteBill(id)
}

// Update/Delete Payment
func (u *FinanceUsecase) UpdatePayment(payment *domain.Payment) error {
	return u.financeRepo.UpdatePayment(payment)
}

func (u *FinanceUsecase) DeletePayment(id string) error {
	return u.financeRepo.DeletePayment(id)
}

