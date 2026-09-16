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

func (u *FinanceUsecase) isForceDeletePaidAllowed() bool {
	if u.schoolSettingRepo == nil {
		return false
	}
	s, err := u.schoolSettingRepo.GetByKey("allow_delete_paid_obligations")
	if err != nil || s == nil {
		return false
	}
	return s.Value == "true"
}

func (u *FinanceUsecase) UpdateBill(input *domain.Bill) error {
	existingBill, err := u.financeRepo.GetBillByID(input.ID.String())
	if err != nil || existingBill == nil {
		return errors.New("tagihan tidak ditemukan")
	}

	existingBill.Title = input.Title
	existingBill.Amount = input.Amount
	existingBill.DueDate = input.DueDate
	if input.BillType != "" {
		existingBill.BillType = input.BillType
	}
	if input.AcademicYearID != nil {
		existingBill.AcademicYearID = input.AcademicYearID
	}
	if input.TransactionCodeID != nil {
		existingBill.TransactionCodeID = input.TransactionCodeID
	}
	existingBill.IsInstallment = input.IsInstallment

	if err := u.financeRepo.UpdateBill(existingBill); err != nil {
		return err
	}

	// If linked to an obligation, sync title/amount if unpaid
	if existingBill.ObligationID != nil && u.studentObligationRepo != nil {
		ob, err := u.studentObligationRepo.GetByID(*existingBill.ObligationID)
		if err == nil && ob != nil && ob.PaidAmount == 0 {
			ob.Amount = existingBill.Amount
			_ = u.studentObligationRepo.Update(ob)
		}
	}

	return nil
}

func (u *FinanceUsecase) GetBillByID(id string) (*domain.Bill, error) {
	return u.financeRepo.GetBillByID(id)
}

func (u *FinanceUsecase) DeleteBill(id string) error {
	bill, err := u.financeRepo.GetBillByID(id)
	if err != nil || bill == nil {
		return errors.New("tagihan tidak ditemukan")
	}

	// Calculate total paid amount from successful payments
	paidAmount := 0.0
	for _, p := range bill.Payments {
		if p.Status == "Success" {
			paidAmount += p.Amount
		}
	}

	// Safety check: if payments have been made
	if paidAmount > 0 || bill.Status == "Paid" || bill.Status == "Partial" {
		if !u.isForceDeletePaidAllowed() {
			return errors.New("tidak bisa menghapus tagihan yang sudah memiliki riwayat pembayaran. Aktifkan fitur 'Izinkan Hapus Tanggungan Terbayar' di Pengaturan Sekolah jika ingin menghapus paksa/koreksi")
		}

		// 1. Revert RKAS budget realization if transaction code exists
		if u.budgetRepo != nil && bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 && paidAmount > 0 {
			billingMonth := int(bill.DueDate.Month())
			if bill.Obligation != nil && bill.Obligation.BillingMonth > 0 {
				billingMonth = bill.Obligation.BillingMonth
			}
			_ = u.budgetRepo.SubtractRealizationByTransactionCodeID(*bill.TransactionCodeID, paidAmount, billingMonth)
		}

		// 2. Remove CashLedger entries (BKU)
		if u.financeRepo != nil {
			studentName := ""
			if bill.Student.User.Name != "" {
				studentName = bill.Student.User.Name
			}
			_ = u.financeRepo.DeleteCashLedgersForBill(bill.ObligationID, studentName, bill.Title, bill.TransactionCodeID)
		}

		// 3. If linked to an obligation, also clean up the obligation
		if bill.ObligationID != nil && u.studentObligationRepo != nil {
			_ = u.studentObligationRepo.Delete(*bill.ObligationID)
		}
	} else {
		// Even for unpaid bill, if it's linked to an obligation, delete the obligation as well
		if bill.ObligationID != nil && u.studentObligationRepo != nil {
			_ = u.studentObligationRepo.Delete(*bill.ObligationID)
		}
	}

	// Clean up child payments & items explicitly (in addition to DB cascade)
	_ = u.financeRepo.DeletePaymentsByBillID(bill.ID.String())
	_ = u.financeRepo.DeleteBillItemsByBillID(bill.ID.String())

	return u.financeRepo.DeleteBill(bill.ID.String())
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
