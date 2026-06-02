package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
)

func (u *FinanceUsecase) CreateBill(studentID uuid.UUID, title string, amount float64, dueDate time.Time, billType string, academicYearID *uint, transactionCodeID *uint, isInstallment bool, obligationID *uuid.UUID, activityObligationID *uuid.UUID) error {
	if billType == "" {
		billType = "SPP"
	}
	bill := &domain.Bill{
		StudentID:            studentID,
		Title:                title,
		Amount:               amount,
		DueDate:              dueDate,
		Status:               "Unpaid",
		BillType:             billType,
		AcademicYearID:       academicYearID,
		TransactionCodeID:    transactionCodeID,
		IsInstallment:        isInstallment,
		ObligationID:         obligationID,
		ActivityObligationID: activityObligationID,
		InvoiceNumber:        fmt.Sprintf("INV-%d-%s", time.Now().UnixMilli(), studentID.String()[:8]),
	}
	if err := u.financeRepo.CreateBill(bill); err != nil {
		return err
	}

	// Send notifications
	student, err := u.studentRepo.GetByID(studentID.String())
	if err == nil {
		u.sendBillInAppNotifications(student, bill)
	}

	return nil
}

func (u *FinanceUsecase) GetAllBills(unitID uint) ([]domain.Bill, error) {
	return u.financeRepo.GetAllBills(unitID)
}

func (u *FinanceUsecase) GetStudentBills(studentID string) ([]domain.Bill, error) {
	return u.financeRepo.GetBillsByStudent(studentID)
}

func (u *FinanceUsecase) GetBillsByIDsOrObligationIDs(ids []string) ([]domain.Bill, error) {
	return u.financeRepo.GetBillsByIDsOrObligationIDs(ids)
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

func (u *FinanceUsecase) UpdateBill(bill *domain.Bill) error {
	return u.financeRepo.UpdateBill(bill)
}

func (u *FinanceUsecase) GetBillByID(id string) (*domain.Bill, error) {
	return u.financeRepo.GetBillByID(id)
}

func (u *FinanceUsecase) DeleteBill(id string) error {
	return u.financeRepo.DeleteBill(id)
}

// Bill Templates
func (u *FinanceUsecase) CreateBillTemplate(template *domain.BillTemplate) error {
	return u.financeRepo.CreateBillTemplate(template)
}

func (u *FinanceUsecase) GetBillTemplates(unitID uint) ([]domain.BillTemplate, error) {
	return u.financeRepo.GetBillTemplates(unitID)
}

func (u *FinanceUsecase) DeleteBillTemplate(id string) error {
	return u.financeRepo.DeleteBillTemplate(id)
}
