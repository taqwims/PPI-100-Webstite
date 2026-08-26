package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
)

func (u *FinanceUsecase) RecordPayment(billID uuid.UUID, amount float64, method string, proofURL string) error {
	status := "Pending"
	if method == "Cash" {
		status = "Success"
	}

	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: method,
		Status:        status,
		ProofURL:      proofURL,
		PaidAt:        time.Now(),
	}

	bill, err := u.financeRepo.GetBillByID(billID.String())
	if err != nil {
		// Fallback to basic creation if bill doesn't exist (shouldn't happen)
		return u.financeRepo.CreatePayment(payment)
	}

	totalPaid := amount
	for _, p := range bill.Payments {
		if p.Status == "Success" {
			totalPaid += p.Amount
		}
	}

	var newStatus string
	if status == "Success" {
		if totalPaid >= bill.Amount {
			newStatus = "Paid"
		} else if totalPaid > 0 {
			newStatus = "Partial"
		} else {
			newStatus = bill.Status
		}
	}

	var ledgerEntry *domain.CashLedger
	if status == "Success" && bill.BillType != "Kegiatan" {
		category := "Lain-lain"
		if bill.TransactionCode != nil {
			category = bill.TransactionCode.Category
		} else if bill.BillType != "" {
			category = bill.BillType
		}
		
		ledgerEntry = &domain.CashLedger{
			Date:              time.Now(),
			Source:            bill.Student.User.Name,
			ItemName:          "Pembayaran " + bill.Title,
			Type:              "Income",
			Amount:            amount,
			Category:          category,
			TransactionCodeID: bill.TransactionCodeID,
		}
	}

	var tcID *uint
	var realizeAmount float64
	if status == "Success" && bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 {
		tcID = bill.TransactionCodeID
		realizeAmount = amount
	}

	if err := u.financeRepo.RecordPaymentAtomically(payment, newStatus, ledgerEntry, tcID, realizeAmount); err != nil {
		return err
	}

	// Notifications
	if status == "Success" {
		var parent *domain.Parent
		if bill.Student.ParentID != nil {
			parent, _ = u.getParentByID(*bill.Student.ParentID)
		}
		u.sendPaymentInAppNotifications(&bill.Student, bill, parent, amount)
		u.triggerPaymentWA(&bill.Student, parent, bill, amount, method)
		
		// Sync obligation statuses
		u.syncObligationStatus(bill, totalPaid, amount)
	}

	return nil
}

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

	remaining := req.Amount
	payments := make([]domain.Payment, 0, len(bills))
	billStatusUpdates := make(map[string]string)

	for _, bill := range bills {
		if remaining <= 0 {
			break
		}

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

		status := "Pending"
		if req.PaymentMethod == "Cash" {
			status = "Success"
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
			var billingMonth int
			if bill.Obligation != nil {
				billingMonth = bill.Obligation.BillingMonth
			}
			_ = u.budgetRepo.AddRealizationByTransactionCodeID(*bill.TransactionCodeID, payment.Amount, billingMonth)
		}

		// 3. Sync Obligation Statuses
		alreadyPaid := float64(0)
		for _, p := range bill.Payments {
			if p.Status == "Success" {
				alreadyPaid += p.Amount
			}
		}
		
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
				u.triggerMultiPaymentWA(&student, parent, len(payments), req.Amount)
			}
		}
	}

	return &domain.MultiPaymentResult{
		Payments:      payments,
		InvoiceNumber: invoiceNumber,
	}, nil
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

	bill, err := u.financeRepo.GetBillByID(payment.BillID.String())
	if err != nil {
		return err
	}

	totalPaid := payment.Amount
	for _, p := range bill.Payments {
		if p.Status == "Success" {
			totalPaid += p.Amount
		}
	}

	var newStatus string
	if totalPaid >= bill.Amount {
		newStatus = "Paid"
	} else if totalPaid > 0 {
		newStatus = "Partial"
	} else {
		newStatus = bill.Status
	}

	var ledgerEntry *domain.CashLedger
	if bill.BillType != "Kegiatan" {
		category := "Lain-lain"
		if bill.TransactionCode != nil {
			category = bill.TransactionCode.Category
		} else if bill.BillType != "" {
			category = bill.BillType
		}

		ledgerEntry = &domain.CashLedger{
			Date:              time.Now(),
			Source:            bill.Student.User.Name,
			ItemName:          fmt.Sprintf("Approval Pembayaran %s - %s", bill.Title, payment.PaymentMethod),
			Type:              "Income",
			Amount:            payment.Amount,
			Category:          category,
			TransactionCodeID: bill.TransactionCodeID,
		}
	}

	var tcID *uint
	var realizeAmount float64
	if bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 {
		tcID = bill.TransactionCodeID
		realizeAmount = payment.Amount
	}

	if err := u.financeRepo.ApprovePaymentAtomically(payment, newStatus, ledgerEntry, tcID, realizeAmount); err != nil {
		return err
	}

	// Notify Student and Parent about successful payment
	var parent *domain.Parent
	if bill.Student.ParentID != nil {
		parent, _ = u.getParentByID(*bill.Student.ParentID)
	}
	u.sendPaymentInAppNotifications(&bill.Student, bill, parent, payment.Amount)
	u.triggerPaymentWA(&bill.Student, parent, bill, payment.Amount, payment.PaymentMethod)

	// Sync payment status back to StudentObligation or ActivityObligation
	u.syncObligationStatus(bill, totalPaid, payment.Amount)

	return nil
}

func (u *FinanceUsecase) UpdatePayment(payment *domain.Payment) error {
	return u.financeRepo.UpdatePayment(payment)
}

func (u *FinanceUsecase) DeletePayment(id string) error {
	return u.financeRepo.DeletePayment(id)
}
