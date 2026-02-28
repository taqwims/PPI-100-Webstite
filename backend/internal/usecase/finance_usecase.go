package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type FinanceUsecase struct {
	financeRepo         *postgres.FinanceRepository
	notificationUsecase *NotificationUsecase
	userRepo            *postgres.UserRepository
	studentRepo         *postgres.StudentRepository
}

func NewFinanceUsecase(
	financeRepo *postgres.FinanceRepository,
	notificationUsecase *NotificationUsecase,
	userRepo *postgres.UserRepository,
	studentRepo *postgres.StudentRepository,
) *FinanceUsecase {
	return &FinanceUsecase{
		financeRepo:         financeRepo,
		notificationUsecase: notificationUsecase,
		userRepo:            userRepo,
		studentRepo:         studentRepo,
	}
}

func (u *FinanceUsecase) CreateBill(studentID uuid.UUID, title string, amount float64, dueDate time.Time, billType string, academicYearID *uint) error {
	if billType == "" {
		billType = "SPP"
	}
	bill := &domain.Bill{
		StudentID:      studentID,
		Title:          title,
		Amount:         amount,
		DueDate:        dueDate,
		Status:         "Unpaid",
		BillType:       billType,
		AcademicYearID: academicYearID,
	}
	if err := u.financeRepo.CreateBill(bill); err != nil {
		return err
	}

	// Send notification to student (via student's UserID)
	student, err := u.studentRepo.GetByID(studentID.String())
	if err == nil {
		_ = u.notificationUsecase.SendNotification(
			student.UserID,
			"Tagihan Baru",
			"Anda memiliki tagihan baru: "+title,
			"bill",
			bill.ID.String(),
		)

		// Also notify parent if linked
		if student.ParentID != nil {
			parent, err := u.getParentByID(*student.ParentID)
			if err == nil {
				_ = u.notificationUsecase.SendNotification(
					parent.UserID,
					"Tagihan Baru untuk Anak Anda",
					"Tagihan baru untuk "+student.User.Name+": "+title,
					"bill",
					bill.ID.String(),
				)
			}
		}
	}

	return nil
}

// helper: get parent record by parent.ID
func (u *FinanceUsecase) getParentByID(parentID uuid.UUID) (*domain.Parent, error) {
	return u.studentRepo.GetParentByID(parentID.String())
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
	if user.Student != nil {
		return u.GetStudentBills(user.Student.ID.String())
	}
	return nil, errors.New("user is not a student")
}

func (u *FinanceUsecase) GetParentBills(userID string) ([]domain.Bill, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.Parent == nil {
		return nil, errors.New("user is not a parent")
	}

	// Get all children for this parent
	children, err := u.studentRepo.GetByParent(user.Parent.ID.String())
	if err != nil {
		return nil, err
	}

	// Collect all student IDs
	var studentIDs []uuid.UUID
	for _, child := range children {
		studentIDs = append(studentIDs, child.ID)
	}

	return u.financeRepo.GetBillsByStudentIDs(studentIDs)
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
