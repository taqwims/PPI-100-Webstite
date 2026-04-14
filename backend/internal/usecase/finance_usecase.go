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
	invoiceUsecase        InvoiceSignatureUsecase
}

func NewFinanceUsecase(
	financeRepo *postgres.FinanceRepository,
	notificationUsecase *NotificationUsecase,
	userRepo *postgres.UserRepository,
	studentRepo *postgres.StudentRepository,
	budgetRepo *postgres.BudgetRepository,
	studentObligationRepo *postgres.StudentObligationRepository,
	activityRepo *postgres.ActivityRepository,
	invoiceUsecase InvoiceSignatureUsecase,
) *FinanceUsecase {
	return &FinanceUsecase{
		financeRepo:           financeRepo,
		notificationUsecase:   notificationUsecase,
		userRepo:              userRepo,
		studentRepo:           studentRepo,
		budgetRepo:            budgetRepo,
		studentObligationRepo: studentObligationRepo,
		activityRepo:          activityRepo,
		invoiceUsecase:        invoiceUsecase,
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

func (u *FinanceUsecase) RecordPayment(billID uuid.UUID, amount float64, method string, proofURL string) error {
	status := "Success"
	if method == "Transfer" {
		status = "Pending"
	}

	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: method,
		Status:        status,
		ProofURL:      proofURL,
		PaidAt:        time.Now(),
	}

	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return err
	}

	// Calculate total paid to determine status (Partial vs Paid)
	bill, err := u.financeRepo.GetBillByID(billID.String())
	if err != nil {
		// Fallback: just mark as Paid (only if success)
		if status == "Success" {
			return u.financeRepo.UpdateBillStatus(billID.String(), "Paid")
		}
		return nil
	}

	totalPaid := float64(0)
	for _, p := range bill.Payments {
		if p.Status == "Success" {
			totalPaid += p.Amount
		}
	}

	// For Pending payments, we don't sync to Ledger/RKAS yet
	if status == "Pending" {
		return nil
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
	} else if totalPaid > 0 {
		newStatus = "Partial"
	} else {
		newStatus = bill.Status // No change
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

// ProcessMultiPayment processes payment for multiple bills in a single atomic transaction.
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9
func (u *FinanceUsecase) ProcessMultiPayment(req *domain.MultiBillPaymentRequest) (*domain.MultiPaymentResult, error) {
	// Fetch all bills (can be by Bill ID or Obligation ID)
	bills, err := u.financeRepo.GetBillsByIDsOrObligationIDs(req.BillIDs)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data tagihan: %w", err)
	}

	if len(bills) != len(req.BillIDs) {
		return nil, fmt.Errorf("satu atau lebih tagihan tidak ditemukan")
	}

	// Req 3.3: Validate all bills belong to the same student
	var studentID uuid.UUID
	for i, bill := range bills {
		if i == 0 {
			studentID = bill.StudentID
		} else if bill.StudentID != studentID {
			return nil, fmt.Errorf("semua tagihan harus milik siswa yang sama")
		}
	}

	// Req 3.4: Validate no bill is already Paid
	for _, bill := range bills {
		if bill.Status == "Paid" {
			return nil, fmt.Errorf("tagihan %s sudah berstatus Paid", bill.ID.String())
		}
	}

	// Req 3.5: Generate a combined invoice number using InvoiceNumberConfig type "MultiBill"
	invoiceNumber := ""
	if u.invoiceUsecase != nil {
		invoiceNumber, err = u.invoiceUsecase.GenerateNumber("MultiBill")
		if err != nil {
			// Fallback to default format
			invoiceNumber = fmt.Sprintf("MULTI-%s-%d", time.Now().Format("200601"), time.Now().UnixMilli()%10000)
		}
	} else {
		invoiceNumber = fmt.Sprintf("MULTI-%s-%d", time.Now().Format("200601"), time.Now().UnixMilli()%10000)
	}

	// Distribute amount across bills proportionally (or per-bill full amount)
	// Each bill gets paid up to its remaining amount; leftover goes to next bill
	remaining := req.Amount
	payments := make([]domain.Payment, 0, len(bills))
	billStatusUpdates := make(map[string]string)

	for _, bill := range bills {
		if remaining <= 0 {
			break
		}

		// Calculate already paid for this bill
		alreadyPaid := float64(0)
		for _, p := range bill.Payments {
			if p.Status == "Success" {
				alreadyPaid += p.Amount
			}
		}

		outstanding := bill.Amount - alreadyPaid
		if outstanding <= 0 {
			continue
		}

		payAmount := outstanding
		if remaining < outstanding {
			payAmount = remaining
		}
		remaining -= payAmount

		status := "Success"
		if req.PaymentMethod == "Midtrans" || req.PaymentMethod == "Transfer" {
			status = "Pending"
		}

		payment := domain.Payment{
			BillID:        bill.ID,
			Amount:        payAmount,
			PaymentMethod: req.PaymentMethod,
			Status:        status,
			TransactionID: invoiceNumber,
			PaidAt:        time.Now(),
		}
		payments = append(payments, payment)

		// Determine new bill status
		// For Pending payments, we don't update the bill status yet until it's Success
		if status == "Success" {
			totalPaid := alreadyPaid + payAmount
			if totalPaid >= bill.Amount {
				billStatusUpdates[bill.ID.String()] = "Paid"
			} else {
				billStatusUpdates[bill.ID.String()] = "Partial"
			}
		}
	}

	// Create all payment records atomically
	if err := u.financeRepo.CreatePaymentsInTransaction(payments, billStatusUpdates); err != nil {
		return nil, fmt.Errorf("gagal menyimpan pembayaran: %w", err)
	}

	// Post-transaction tasks (CashLedger, RKAS, Obligations, Notifications)
	for _, payment := range payments {
		var bill *domain.Bill
		for i := range bills {
			if bills[i].ID == payment.BillID {
				bill = &bills[i]
				break
			}
		}
		
		if bill == nil { continue }

		// 1. Sync to CashLedger (Skip for Kegiatan)
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
				Amount:            payment.Amount,
				Category:          category,
				TransactionCodeID: bill.TransactionCodeID,
			}
			_ = u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry)
		}

		// 2. Auto-realize RKAS
		if bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 {
			_ = u.budgetRepo.AddRealizationByTransactionCodeID(*bill.TransactionCodeID, payment.Amount)
		}

		// 3. Sync Obligation Statuses
		// We need to calculate totalPaid for this bill to sync back to obligations
		alreadyPaid := float64(0)
		for _, p := range bill.Payments {
			if p.Status == "Success" {
				alreadyPaid += p.Amount
			}
		}
		// totalPaid including the new payment (which might already be in bill.Payments if the repo refreshed it, 
		// but typically it's not until next fetch. However, in this transaction context,
		// we know the current payment amount.)
		// If payment.Amount is already in bill.Payments, we don't add it again.
		// For safety, let's use the totalPaid calculation from the first loop if possible, 
		// or just recalculate here from the current state.
		
		u.syncObligationStatus(bill, alreadyPaid + payment.Amount, payment.Amount)
	}

	// 4. Notifications (Send once for the multi-payment)
	if len(bills) > 0 {
		student := bills[0].Student
		_ = u.notificationUsecase.SendNotification(
			student.UserID,
			"Pembayaran Multi-Tagihan Berhasil",
			fmt.Sprintf("Pembayaran %d tagihan sebesar Rp%.0f telah diverifikasi.", len(payments), req.Amount),
			"payment",
			invoiceNumber,
		)
		if student.ParentID != nil {
			if parent, err := u.getParentByID(*student.ParentID); err == nil {
				_ = u.notificationUsecase.SendNotification(
					parent.UserID,
					"Pembayaran Tagihan Anak Berhasil",
					fmt.Sprintf("Pembayaran %d tagihan untuk %s sebesar Rp%.0f telah diverifikasi.", len(payments), student.User.Name, req.Amount),
					"payment",
					invoiceNumber,
				)
			}
		}
	}

	return &domain.MultiPaymentResult{
		Payments:      payments,
		InvoiceNumber: invoiceNumber,
	}, nil
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
func (u *FinanceUsecase) GetPendingPayments() ([]domain.Payment, error) {
	return u.financeRepo.GetPendingPayments()
}

func (u *FinanceUsecase) ApprovePayment(paymentID uuid.UUID) error {
	payment, err := u.financeRepo.GetPaymentByID(paymentID.String())
	if err != nil {
		return err
	}

	if payment.Status == "Success" {
		return nil
	}

	payment.Status = "Success"
	payment.PaidAt = time.Now()

	if err := u.financeRepo.UpdatePayment(payment); err != nil {
		return err
	}

	// Update Bill status
	bill, err := u.financeRepo.GetBillByID(payment.BillID.String())
	if err != nil {
		return err
	}

	totalPaid := float64(0)
	for _, p := range bill.Payments {
		if p.Status == "Success" {
			totalPaid += p.Amount
		}
	}

	newStatus := "Partial"
	if totalPaid >= bill.Amount {
		newStatus = "Paid"
	}
	_ = u.financeRepo.UpdateBillStatus(bill.ID.String(), newStatus)

	// Sync to cash ledger
	category := "Lain-lain"
	if bill.TransactionCode != nil {
		category = bill.TransactionCode.Category
	} else if bill.BillType != "" {
		category = bill.BillType
	}

	entry := &domain.CashLedger{
		Date:              time.Now(),
		Source:            bill.Student.User.Name,
		ItemName:          fmt.Sprintf("Hapus / Approval Pembayaran %s - %s", bill.Title, payment.PaymentMethod),
		Type:              "Income",
		Amount:            payment.Amount,
		Category:          category,
		TransactionCodeID: bill.TransactionCodeID,
	}
	_ = u.financeRepo.AddCashLedgerEntry(entry)

	// Auto-realize RKAS if transaction code is linked to a budget
	if bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 {
		_ = u.budgetRepo.AddRealizationByTransactionCodeID(*bill.TransactionCodeID, payment.Amount)
	}

	// Notify Student and Parent about successful payment
	_ = u.notificationUsecase.SendNotification(
		bill.Student.UserID,
		"Pembayaran Berhasil Diverifikasi",
		fmt.Sprintf("Pembayaran %s sebesar Rp%.0f telah diverifikasi oleh Bendahara.", bill.Title, payment.Amount),
		"payment",
		bill.ID.String(),
	)

	if bill.Student.ParentID != nil {
		parent, err := u.getParentByID(*bill.Student.ParentID)
		if err == nil {
			_ = u.notificationUsecase.SendNotification(
				parent.UserID,
				"Pembayaran Tagihan Anak Diverifikasi",
				fmt.Sprintf("Pembayaran %s untuk %s sebesar Rp%.0f telah diverifikasi oleh Bendahara.", bill.Title, bill.Student.User.Name, payment.Amount),
				"payment",
				bill.ID.String(),
			)
		}
	}

	// Sync payment status back to StudentObligation or ActivityObligation
	u.syncObligationStatus(bill, totalPaid, payment.Amount)

	return nil
}
