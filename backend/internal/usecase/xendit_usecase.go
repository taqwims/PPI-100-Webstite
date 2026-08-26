package usecase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"strings"
	"time"

	"github.com/google/uuid"
)

type XenditUsecase struct {
	cfg                   *config.Config
	schoolSettingRepo     *postgres.SchoolSettingRepository
	financeRepo           *postgres.FinanceRepository
	studentRepo           *postgres.StudentRepository
	userRepo              *postgres.UserRepository
	notificationUsecase   *NotificationUsecase
	financeUsecase        *FinanceUsecase
	studentObligationRepo *postgres.StudentObligationRepository
	activityRepo          *postgres.ActivityRepository
	budgetRepo            *postgres.BudgetRepository
}

func NewXenditUsecase(
	cfg *config.Config,
	schoolSettingRepo *postgres.SchoolSettingRepository,
	financeRepo *postgres.FinanceRepository,
	studentRepo *postgres.StudentRepository,
	userRepo *postgres.UserRepository,
	notificationUsecase *NotificationUsecase,
	financeUsecase *FinanceUsecase,
	studentObligationRepo *postgres.StudentObligationRepository,
	activityRepo *postgres.ActivityRepository,
	budgetRepo *postgres.BudgetRepository,
) *XenditUsecase {
	return &XenditUsecase{
		cfg:                   cfg,
		schoolSettingRepo:     schoolSettingRepo,
		financeRepo:           financeRepo,
		studentRepo:           studentRepo,
		userRepo:              userRepo,
		notificationUsecase:   notificationUsecase,
		financeUsecase:        financeUsecase,
		studentObligationRepo: studentObligationRepo,
		activityRepo:          activityRepo,
		budgetRepo:            budgetRepo,
	}
}

func (u *XenditUsecase) getSecretKey() string {
	if u.schoolSettingRepo != nil {
		if s, err := u.schoolSettingRepo.GetByKey("xendit_secret_key"); err == nil && s.Value != "" {
			return strings.TrimSpace(s.Value)
		}
	}
	return ""
}

func (u *XenditUsecase) getWebhookToken() string {
	if u.schoolSettingRepo != nil {
		if s, err := u.schoolSettingRepo.GetByKey("xendit_webhook_token"); err == nil {
			return strings.TrimSpace(s.Value)
		}
	}
	return ""
}

// CreateInvoice creates a Xendit Invoice for a single bill
func (u *XenditUsecase) CreateInvoice(billID uuid.UUID, amount float64) (string, string, error) {
	bill, err := u.financeRepo.GetBillByID(billID.String())
	if err != nil {
		return "", "", fmt.Errorf("bill not found: %w", err)
	}

	if bill.Status == "Paid" {
		return "", "", fmt.Errorf("tagihan sudah lunas")
	}

	// Cancel any old pending online payments (Xendit, Midtrans, Mayar) for this bill
	if bill.Payments != nil {
		for _, p := range bill.Payments {
			if (p.PaymentMethod == "Xendit" || p.PaymentMethod == "Midtrans" || p.PaymentMethod == "Mayar") && p.Status == "Pending" && p.TransactionID != "" {
				_ = u.CancelTransaction(p.TransactionID)
			}
		}
	}

	orderID := fmt.Sprintf("XEN-%s-%d", billID.String()[:8], time.Now().UnixMilli())

	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: "Xendit",
		Status:        "Pending",
		TransactionID: orderID,
	}
	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return "", "", fmt.Errorf("failed to create payment record: %w", err)
	}

	secretKey := u.getSecretKey()
	if secretKey == "" {
		return "", "", fmt.Errorf("Xendit Secret Key belum dikonfigurasi oleh Admin")
	}

	customerName := "Siswa"
	if bill.Student.User.Name != "" {
		customerName = bill.Student.User.Name
	}

	reqBody := map[string]interface{}{
		"external_id":      orderID,
		"amount":           amount,
		"description":      fmt.Sprintf("Pembayaran Tagihan %s", bill.Title),
		"invoice_duration": 86400,
		"customer": map[string]interface{}{
			"given_names": customerName,
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "https://api.xendit.co/v2/invoices", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", "", fmt.Errorf("failed to create http request: %w", err)
	}
	req.SetBasicAuth(secretKey, "")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to call Xendit API: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		if resp.StatusCode == 403 {
			return "", "", fmt.Errorf("Xendit API Key (Secret Key) tidak memiliki izin untuk Invoices. Buka Dashboard Xendit > Settings > API Keys, lalu aktifkan izin 'Invoices: Write'")
		}
		return "", "", fmt.Errorf("Xendit API error (%d): %s", resp.StatusCode, string(respBytes))
	}

	var xenditResp struct {
		ID         string `json:"id"`
		InvoiceURL string `json:"invoice_url"`
		Status     string `json:"status"`
	}
	if err := json.Unmarshal(respBytes, &xenditResp); err != nil {
		return "", "", fmt.Errorf("failed to parse Xendit response: %w", err)
	}

	return xenditResp.InvoiceURL, orderID, nil
}

// CreateMultiInvoice creates a Xendit Invoice for multiple bills
func (u *XenditUsecase) CreateMultiInvoice(orderID string, totalAmount float64, student *domain.Student, billIDs []string) (string, string, error) {
	secretKey := u.getSecretKey()
	if secretKey == "" {
		return "", "", fmt.Errorf("Xendit Secret Key belum dikonfigurasi oleh Admin")
	}

	customerName := "Siswa"
	if student != nil && student.User.Name != "" {
		customerName = student.User.Name
	}

	reqBody := map[string]interface{}{
		"external_id":      orderID,
		"amount":           totalAmount,
		"description":      fmt.Sprintf("Pembayaran Multi-Tagihan (%d tagihan)", len(billIDs)),
		"invoice_duration": 86400,
		"customer": map[string]interface{}{
			"given_names": customerName,
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "https://api.xendit.co/v2/invoices", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", "", fmt.Errorf("failed to create http request: %w", err)
	}
	req.SetBasicAuth(secretKey, "")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to call Xendit API: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		if resp.StatusCode == 403 {
			return "", "", fmt.Errorf("Xendit API Key (Secret Key) tidak memiliki izin untuk Invoices. Buka Dashboard Xendit > Settings > API Keys, lalu aktifkan izin 'Invoices: Write'")
		}
		return "", "", fmt.Errorf("Xendit API error (%d): %s", resp.StatusCode, string(respBytes))
	}

	var xenditResp struct {
		ID         string `json:"id"`
		InvoiceURL string `json:"invoice_url"`
		Status     string `json:"status"`
	}
	if err := json.Unmarshal(respBytes, &xenditResp); err != nil {
		return "", "", fmt.Errorf("failed to parse Xendit response: %w", err)
	}

	return xenditResp.InvoiceURL, orderID, nil
}

// CheckTransactionStatus checks status of Xendit transaction
func (u *XenditUsecase) CheckTransactionStatus(orderID string) (map[string]interface{}, error) {
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil || len(payments) == 0 {
		return nil, fmt.Errorf("payment not found for order_id: %s", orderID)
	}

	payment := payments[0]
	res := map[string]interface{}{
		"order_id":       orderID,
		"status":         payment.Status,
		"payment_method": payment.PaymentMethod,
		"amount":         payment.Amount,
	}

	if payment.Status == "Success" || payment.Status == "Paid" {
		res["status"] = "Success"
		return res, nil
	}

	secretKey := u.getSecretKey()
	if secretKey != "" {
		req, err := http.NewRequest("GET", fmt.Sprintf("https://api.xendit.co/v2/invoices?external_id=%s", orderID), nil)
		if err == nil {
			req.SetBasicAuth(secretKey, "")
			client := &http.Client{Timeout: 5 * time.Second}
			resp, err := client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				var invoices []struct {
					ID         string `json:"id"`
					Status     string `json:"status"`
					InvoiceURL string `json:"invoice_url"`
					ExpiryDate string `json:"expiry_date"`
				}
				if json.NewDecoder(resp.Body).Decode(&invoices) == nil && len(invoices) > 0 {
					inv := invoices[0]
					res["invoice_url"] = inv.InvoiceURL
					res["expiry_time"] = inv.ExpiryDate

					if inv.Status == "PAID" || inv.Status == "SETTLED" {
						_ = u.processPaymentSuccess(orderID)
						res["status"] = "Success"
					} else if inv.Status == "EXPIRED" {
						_ = u.updatePaymentStatus(orderID, "Failed")
						res["status"] = "Failed"
					}
				}
			}
		}
	}

	return res, nil
}

// CancelTransaction cancels a pending Xendit invoice
func (u *XenditUsecase) CancelTransaction(orderID string) error {
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil || len(payments) == 0 {
		return nil
	}

	secretKey := u.getSecretKey()
	if secretKey != "" {
		req, err := http.NewRequest("GET", fmt.Sprintf("https://api.xendit.co/v2/invoices?external_id=%s", orderID), nil)
		if err == nil {
			req.SetBasicAuth(secretKey, "")
			client := &http.Client{Timeout: 5 * time.Second}
			resp, err := client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				var invoices []struct {
					ID string `json:"id"`
				}
				if json.NewDecoder(resp.Body).Decode(&invoices) == nil && len(invoices) > 0 {
					invID := invoices[0].ID
					expireReq, _ := http.NewRequest("POST", fmt.Sprintf("https://api.xendit.co/invoices/%s/expire!", invID), nil)
					expireReq.SetBasicAuth(secretKey, "")
					_, _ = client.Do(expireReq)
				}
			}
		}
	}

	return u.updatePaymentStatus(orderID, "Failed")
}

// HandleNotification handles Xendit webhook callback
func (u *XenditUsecase) HandleNotification(payload map[string]interface{}, tokenHeader string) error {
	expectedToken := u.getWebhookToken()
	if expectedToken != "" && tokenHeader != "" && tokenHeader != expectedToken {
		return fmt.Errorf("unauthorized: invalid webhook verification token")
	}

	externalID, ok := payload["external_id"].(string)
	if !ok || externalID == "" {
		return fmt.Errorf("missing external_id in webhook payload")
	}

	status, ok := payload["status"].(string)
	if !ok {
		return fmt.Errorf("missing status in webhook payload")
	}

	if status == "PAID" || status == "SETTLED" {
		return u.processPaymentSuccess(externalID)
	} else if status == "EXPIRED" {
		return u.updatePaymentStatus(externalID, "Failed")
	}

	return nil
}

func (u *XenditUsecase) updatePaymentStatus(orderID string, status string) error {
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil {
		return err
	}
	for i := range payments {
		payments[i].Status = status
		_ = u.financeRepo.UpdatePayment(&payments[i])
	}
	return nil
}

func (u *XenditUsecase) processPaymentSuccess(orderID string) error {
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil || len(payments) == 0 {
		return fmt.Errorf("payments not found for orderID: %s", orderID)
	}

	for i := range payments {
		payment := &payments[i]

		if payment.Status == "Success" {
			continue
		}

		payment.Status = "Success"
		payment.PaidAt = time.Now()

		if err := u.financeRepo.UpdatePayment(payment); err != nil {
			log.Printf("failed to update payment %s: %v", payment.ID, err)
			continue
		}

		bill, err := u.financeRepo.GetBillByID(payment.BillID.String())
		if err != nil {
			log.Printf("failed to get bill for payment %s: %v", payment.ID, err)
			continue
		}

		totalPaid := float64(0)
		for _, p := range bill.Payments {
			if p.Status == "Success" || p.ID == payment.ID {
				totalPaid += p.Amount
			}
		}

		newBillStatus := "Partial"
		if totalPaid >= bill.Amount {
			newBillStatus = "Paid"
		}
		_ = u.financeRepo.UpdateBillStatus(payment.BillID.String(), newBillStatus)

		category := "Lain-lain"
		if bill.TransactionCode != nil {
			category = bill.TransactionCode.Category
		} else if bill.BillType != "" {
			category = bill.BillType
		}

		cashLedgerEntry := domain.CashLedger{
			Date:              time.Now(),
			Source:            bill.Student.User.Name,
			ItemName:          "Pembayaran Xendit - " + bill.Title,
			Type:              "Income",
			Amount:            payment.Amount,
			Category:          category,
			TransactionCodeID: bill.TransactionCodeID,
		}
		_ = u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry)

		// Auto-realize RKAS
		if bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 && u.budgetRepo != nil {
			var billingMonth int
			if bill.Obligation != nil {
				billingMonth = bill.Obligation.BillingMonth
			}
			_ = u.budgetRepo.AddRealizationByTransactionCodeID(*bill.TransactionCodeID, payment.Amount, billingMonth)
		}

		var parent *domain.Parent
		if bill.Student.ParentID != nil {
			parent, _ = u.studentRepo.GetParentByID(bill.Student.ParentID.String())
		}

		if u.financeUsecase != nil {
			u.financeUsecase.sendPaymentInAppNotifications(&bill.Student, bill, parent, payment.Amount)

			u.financeUsecase.triggerPaymentWA(&bill.Student, parent, bill, payment.Amount, "Xendit")
			u.financeUsecase.syncObligationStatus(bill, totalPaid, payment.Amount)
		}
	}
	return nil
}
