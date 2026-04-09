package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"strings"
	"time"

	"github.com/google/uuid"
)

type FinanceUsecase struct {
	financeRepo           *postgres.FinanceRepository
	notificationUsecase   *NotificationUsecase
	userRepo              *postgres.UserRepository
	studentRepo           *postgres.StudentRepository
	budgetRepo            *postgres.BudgetRepository
	studentObligationRepo *postgres.StudentObligationRepository
	activityRepo          *postgres.ActivityRepository
}

func NewFinanceUsecase(
	financeRepo *postgres.FinanceRepository,
	notificationUsecase *NotificationUsecase,
	userRepo *postgres.UserRepository,
	studentRepo *postgres.StudentRepository,
	budgetRepo *postgres.BudgetRepository,
	studentObligationRepo *postgres.StudentObligationRepository,
	activityRepo *postgres.ActivityRepository,
) *FinanceUsecase {
	return &FinanceUsecase{
		financeRepo:           financeRepo,
		notificationUsecase:   notificationUsecase,
		userRepo:              userRepo,
		studentRepo:           studentRepo,
		budgetRepo:            budgetRepo,
		studentObligationRepo: studentObligationRepo,
		activityRepo:          activityRepo,
	}
}

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

				// WhatsApp Auto Notification
				u.triggerAutoWA(student, parent, bill)
			}
		}
	}

	return nil
}

func (u *FinanceUsecase) triggerAutoWA(student *domain.Student, parent *domain.Parent, bill *domain.Bill) {
	if parent.Phone == "" {
		return
	}

	// Get Config for the bill type
	cfg, err := u.financeRepo.GetInvoiceConfigByType(bill.BillType)
	if err != nil || cfg == nil || !cfg.AutoNotifyWA {
		return
	}

	// Get Template
	var template *domain.WATemplate
	if cfg.WATemplateID != nil {
		template, _ = u.notificationUsecase.GetWATemplateByID(*cfg.WATemplateID)
	}
	if template == nil {
		template, _ = u.notificationUsecase.GetDefaultWATemplate()
	}

	if template == nil {
		return // No template found
	}

	// Format message
	msg := u.processWATemplate(template.BodyTemplate, student, bill)
	_ = u.notificationUsecase.SendWhatsApp(parent.Phone, msg)
}

func (u *FinanceUsecase) processWATemplate(body string, student *domain.Student, bill *domain.Bill) string {
	res := body
	res = strings.ReplaceAll(res, "{nama_siswa}", student.User.Name)
	res = strings.ReplaceAll(res, "{nis}", student.NISN)
	res = strings.ReplaceAll(res, "{kelas}", student.Class.Name)
	res = strings.ReplaceAll(res, "{total_tagihan}", fmt.Sprintf("Rp%.0f", bill.Amount))
	res = strings.ReplaceAll(res, "{rincian}", fmt.Sprintf("• %s: Rp%.0f", bill.Title, bill.Amount))
	res = strings.ReplaceAll(res, "{tanggal}", time.Now().Format("02 January 2006"))
	return res
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
		Status:        "Success",
		PaidAt:        time.Now(),
	}

	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return err
	}

	// Calculate total paid to determine status (Partial vs Paid)
	bill, err := u.financeRepo.GetBillByID(billID.String())
	if err != nil {
		// Fallback: just mark as Paid
		return u.financeRepo.UpdateBillStatus(billID.String(), "Paid")
	}

	totalPaid := float64(0)
	for _, p := range bill.Payments {
		if p.Status == "Success" {
			totalPaid += p.Amount
		}
	}

	// Sync to CashLedger
	// Only add to CashLedger if it's a new successful payment. 
	// To avoid duplicates we sync the current `amount` being paid, not `totalPaid`.
	// Skip for Kegiatan, they have their own ledger.
	if bill.BillType != "Kegiatan" {
		category := "Lain-lain"
		if bill.TransactionCode != nil {
			category = bill.TransactionCode.Category
		} else if bill.BillType != "" {
			category = bill.BillType
		}
		
		cashLedgerEntry := domain.CashLedger{
			Date:              time.Now(),
			Source:            bill.Student.User.Name,
			ItemName:          "Pembayaran " + bill.Title,
			Type:              "Income",
			Amount:            amount,
			Category:          category,
			TransactionCodeID: bill.TransactionCodeID,
		}
		_ = u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry)
	}

	// Auto-realize RKAS if transaction code is linked to a budget
	if bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 {
		_ = u.budgetRepo.AddRealizationByTransactionCodeID(*bill.TransactionCodeID, amount)
	}

	// Notify Student and Parent about successful payment
	_ = u.notificationUsecase.SendNotification(
		bill.Student.UserID,
		"Pembayaran Berhasil",
		fmt.Sprintf("Pembayaran %s sebesar Rp%.0f telah diverifikasi.", bill.Title, amount),
		"payment",
		bill.ID.String(),
	)

	if bill.Student.ParentID != nil {
		parent, err := u.getParentByID(*bill.Student.ParentID)
		if err == nil {
			_ = u.notificationUsecase.SendNotification(
				parent.UserID,
				"Pembayaran Tagihan Anak Berhasil",
				fmt.Sprintf("Pembayaran %s untuk %s sebesar Rp%.0f telah diverifikasi.", bill.Title, bill.Student.User.Name, amount),
				"payment",
				bill.ID.String(),
			)
		}
	}
	// Determine final bill status
	var newStatus string
	if totalPaid >= bill.Amount {
		newStatus = "Paid"
	} else {
		newStatus = "Partial"
	}

	if err := u.financeRepo.UpdateBillStatus(billID.String(), newStatus); err != nil {
		return err
	}

	// Sync payment status back to StudentObligation or ActivityObligation
	u.syncObligationStatus(bill, totalPaid, amount)

	return nil
}

// syncObligationStatus syncs payment status from a Bill back to the linked obligation
func (u *FinanceUsecase) syncObligationStatus(bill *domain.Bill, totalPaid float64, currentPaymentAmount float64) {
	if bill.ObligationID != nil && u.studentObligationRepo != nil {
		ob, err := u.studentObligationRepo.GetByID(*bill.ObligationID)
		if err == nil {
			ob.PaidAmount = totalPaid
			if totalPaid >= ob.Amount {
				ob.Status = "Paid"
			} else if totalPaid > 0 {
				ob.Status = "Partial"
			}
			_ = u.studentObligationRepo.Update(ob)
		}
	}

	if bill.ActivityObligationID != nil && u.activityRepo != nil {
		ob, err := u.activityRepo.GetObligationByID(*bill.ActivityObligationID)
		if err == nil {
			ob.PaidAmount = totalPaid
			if totalPaid >= ob.Amount {
				ob.Status = "Paid"
			} else if totalPaid > 0 {
				ob.Status = "Partial"
			}
			_ = u.activityRepo.UpdateObligation(ob)

			// Record Income Transaction for Activity
			if currentPaymentAmount > 0 {
				tx := &domain.ActivityTransaction{
					ActivityID:      ob.ActivityID,
					TransactionType: "Income",
					Amount:          currentPaymentAmount,
					Date:            time.Now(),
					Description:     "Pembayaran Kegiatan dari: " + bill.Student.User.Name,
					CreatedByID:     ob.CreatedByID,
				}
				_ = u.activityRepo.CreateTransaction(tx)
			}
		}
	}
}
// Update/Delete Bill
func (u *FinanceUsecase) UpdateBill(bill *domain.Bill) error {
	return u.financeRepo.UpdateBill(bill)
}

func (u *FinanceUsecase) GetBillByID(id string) (*domain.Bill, error) {
	return u.financeRepo.GetBillByID(id)
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

// NotifyBendahara sends a notification to all users with role_id 9 (Bendahara)
func (u *FinanceUsecase) NotifyBendahara(title string, message string, referenceID string) {
	// Get all bendahara users (role_id=9)
	users, err := u.userRepo.GetUsersByRole(9)
	if err != nil {
		return
	}
	for _, bendahara := range users {
		_ = u.notificationUsecase.SendNotification(
			bendahara.ID,
			title,
			message,
			"payment",
			referenceID,
		)
	}
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
