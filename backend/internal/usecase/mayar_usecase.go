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
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

type MayarUsecase struct {
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

func NewMayarUsecase(
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
) *MayarUsecase {
	return &MayarUsecase{
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

func (u *MayarUsecase) getApiKey() string {
	if u.schoolSettingRepo != nil {
		if s, err := u.schoolSettingRepo.GetByKey("mayar_api_key"); err == nil && s.Value != "" {
			return strings.TrimSpace(s.Value)
		}
	}
	return ""
}

func (u *MayarUsecase) isProduction() bool {
	if u.schoolSettingRepo != nil {
		if s, err := u.schoolSettingRepo.GetByKey("mayar_is_production"); err == nil {
			val := strings.ToLower(strings.TrimSpace(s.Value))
			return val == "true" || val == "1"
		}
	}
	return false
}

func (u *MayarUsecase) getBaseURL() string {
	if u.isProduction() {
		return "https://api.mayar.id/hl/v1"
	}
	return "https://api.mayar.io/hl/v1"
}

func (u *MayarUsecase) getWebhookToken() string {
	if u.schoolSettingRepo != nil {
		if s, err := u.schoolSettingRepo.GetByKey("mayar_webhook_token"); err == nil {
			return strings.TrimSpace(s.Value)
		}
	}
	return ""
}

func cleanPhoneNumber(phone string) string {
	re := regexp.MustCompile(`[^0-9]`)
	cleaned := re.ReplaceAllString(phone, "")
	if strings.HasPrefix(cleaned, "62") {
		cleaned = "0" + cleaned[2:]
	}
	if cleaned == "" {
		cleaned = "081234567890"
	}
	return cleaned
}

// CreateInvoice creates a Mayar Invoice for a single bill
func (u *MayarUsecase) CreateInvoice(billID uuid.UUID, amount float64) (string, string, error) {
	bill, err := u.financeRepo.GetBillByID(billID.String())
	if err != nil {
		return "", "", fmt.Errorf("bill not found: %w", err)
	}

	if bill.Status == "Paid" {
		return "", "", fmt.Errorf("tagihan sudah lunas")
	}

	// Cancel any old pending online payments for this bill
	if bill.Payments != nil {
		for _, p := range bill.Payments {
			if (p.PaymentMethod == "Mayar" || p.PaymentMethod == "Xendit" || p.PaymentMethod == "Midtrans") && p.Status == "Pending" && p.TransactionID != "" {
				_ = u.CancelTransaction(p.TransactionID)
			}
		}
	}

	orderID := fmt.Sprintf("MAY-%s-%d", billID.String()[:8], time.Now().UnixMilli())

	apiKey := u.getApiKey()
	if apiKey == "" {
		return "", "", fmt.Errorf("Mayar API Key belum dikonfigurasi oleh Admin")
	}

	customerName := "Siswa"
	customerEmail := "siswa@sekolah.sch.id"
	customerPhone := "081234567890"

	if bill.Student.User.Name != "" {
		customerName = bill.Student.User.Name
	}
	if bill.Student.User.Email != "" {
		customerEmail = bill.Student.User.Email
	}
	if bill.Student.User.Phone != "" {
		customerPhone = cleanPhoneNumber(bill.Student.User.Phone)
	}

	expireTime := time.Now().Add(24 * time.Hour).Format(time.RFC3339)

	reqBody := map[string]interface{}{
		"name":        customerName,
		"email":       customerEmail,
		"mobile":      customerPhone,
		"description": fmt.Sprintf("Pembayaran Tagihan %s", bill.Title),
		"expiredAt":   expireTime,
		"items": []map[string]interface{}{
			{
				"quantity":    1,
				"rate":        amount,
				"description": bill.Title,
			},
		},
		"extraData": map[string]interface{}{
			"order_id": orderID,
			"bill_id":  billID.String(),
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	endpoint := fmt.Sprintf("%s/invoice/create", u.getBaseURL())
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", "", fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to call Mayar API (%s): %w", endpoint, err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", "", fmt.Errorf("Mayar API error (%d): %s", resp.StatusCode, string(respBytes))
	}

	var mayarResp struct {
		StatusCode int    `json:"statusCode"`
		Messages   string `json:"messages"`
		Data       struct {
			ID            string                 `json:"id"`
			TransactionID string                 `json:"transactionId"`
			Link          string                 `json:"link"`
			PaymentURL    string                 `json:"paymentUrl"`
			URL           string                 `json:"url"`
			ExpiredAt     interface{}            `json:"expiredAt"`
			ExtraData     map[string]interface{} `json:"extraData"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBytes, &mayarResp); err != nil {
		return "", "", fmt.Errorf("failed to parse Mayar response: %w", err)
	}

	paymentURL := mayarResp.Data.Link
	if paymentURL == "" {
		paymentURL = mayarResp.Data.PaymentURL
	}
	if paymentURL == "" {
		paymentURL = mayarResp.Data.URL
	}

	if paymentURL == "" {
		return "", "", fmt.Errorf("Mayar API tidak mengembalikan payment URL")
	}

	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: "Mayar",
		Status:        "Pending",
		TransactionID: orderID,
		ProofURL:      paymentURL,
	}
	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return "", "", fmt.Errorf("failed to create payment record: %w", err)
	}

	return paymentURL, orderID, nil
}

// CreateMultiInvoice creates a Mayar Invoice for multiple bills
func (u *MayarUsecase) CreateMultiInvoice(orderID string, totalAmount float64, student *domain.Student, billIDs []string) (string, string, error) {
	apiKey := u.getApiKey()
	if apiKey == "" {
		return "", "", fmt.Errorf("Mayar API Key belum dikonfigurasi oleh Admin")
	}

	customerName := "Siswa"
	customerEmail := "siswa@sekolah.sch.id"
	customerPhone := "081234567890"

	if student != nil {
		if student.User.Name != "" {
			customerName = student.User.Name
		}
		if student.User.Email != "" {
			customerEmail = student.User.Email
		}
		if student.User.Phone != "" {
			customerPhone = cleanPhoneNumber(student.User.Phone)
		}
	}

	expireTime := time.Now().Add(24 * time.Hour).Format(time.RFC3339)

	reqBody := map[string]interface{}{
		"name":        customerName,
		"email":       customerEmail,
		"mobile":      customerPhone,
		"description": fmt.Sprintf("Pembayaran Multi-Tagihan (%d tagihan)", len(billIDs)),
		"expiredAt":   expireTime,
		"items": []map[string]interface{}{
			{
				"quantity":    1,
				"rate":        totalAmount,
				"description": fmt.Sprintf("Multi-Tagihan (%d item)", len(billIDs)),
			},
		},
		"extraData": map[string]interface{}{
			"order_id": orderID,
			"bill_ids": strings.Join(billIDs, ","),
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	endpoint := fmt.Sprintf("%s/invoice/create", u.getBaseURL())
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", "", fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to call Mayar API (%s): %w", endpoint, err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", "", fmt.Errorf("Mayar API error (%d): %s", resp.StatusCode, string(respBytes))
	}

	var mayarResp struct {
		StatusCode int    `json:"statusCode"`
		Messages   string `json:"messages"`
		Data       struct {
			ID            string                 `json:"id"`
			TransactionID string                 `json:"transactionId"`
			Link          string                 `json:"link"`
			PaymentURL    string                 `json:"paymentUrl"`
			URL           string                 `json:"url"`
			ExpiredAt     interface{}            `json:"expiredAt"`
			ExtraData     map[string]interface{} `json:"extraData"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBytes, &mayarResp); err != nil {
		return "", "", fmt.Errorf("failed to parse Mayar response: %w", err)
	}

	paymentURL := mayarResp.Data.Link
	if paymentURL == "" {
		paymentURL = mayarResp.Data.PaymentURL
	}
	if paymentURL == "" {
		paymentURL = mayarResp.Data.URL
	}

	if paymentURL == "" {
		return "", "", fmt.Errorf("Mayar API tidak mengembalikan payment URL")
	}

	return paymentURL, orderID, nil
}

// CheckTransactionStatus checks status of Mayar transaction
func (u *MayarUsecase) CheckTransactionStatus(orderID string) (map[string]interface{}, error) {
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
		"redirect_url":   payment.ProofURL,
		"invoice_url":    payment.ProofURL,
	}

	if payment.Status == "Success" || payment.Status == "Paid" {
		res["status"] = "Success"
		return res, nil
	}

	return res, nil
}

// CancelTransaction cancels a pending Mayar transaction in DB
func (u *MayarUsecase) CancelTransaction(orderID string) error {
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil || len(payments) == 0 {
		return nil
	}

	return u.updatePaymentStatus(orderID, "Failed")
}

// HandleNotification handles Mayar webhook callback
func (u *MayarUsecase) HandleNotification(payload map[string]interface{}, tokenHeader string, tokenQuery string) error {
	expectedToken := u.getWebhookToken()
	if expectedToken != "" {
		tokenMatch := false
		if tokenHeader != "" && tokenHeader == expectedToken {
			tokenMatch = true
		}
		if tokenQuery != "" && tokenQuery == expectedToken {
			tokenMatch = true
		}
		if !tokenMatch {
			return fmt.Errorf("unauthorized: invalid webhook verification token")
		}
	}

	// Extract event name if present
	event, _ := payload["event"].(string)

	// Extract data object
	data, _ := payload["data"].(map[string]interface{})
	if data == nil {
		data = payload
	}

	// Search for orderID in extraData or metadata or root fields
	var orderID string
	if extraData, ok := data["extraData"].(map[string]interface{}); ok && extraData != nil {
		if oid, ok := extraData["order_id"].(string); ok && oid != "" {
			orderID = oid
		}
	}
	if orderID == "" {
		if metadata, ok := data["metadata"].(map[string]interface{}); ok && metadata != nil {
			if oid, ok := metadata["order_id"].(string); ok && oid != "" {
				orderID = oid
			}
		}
	}
	if orderID == "" {
		if oid, ok := data["order_id"].(string); ok && oid != "" {
			orderID = oid
		} else if oid, ok := payload["order_id"].(string); ok && oid != "" {
			orderID = oid
		}
	}

	// If orderID is still empty, look up transaction by transactionId or id
	if orderID == "" {
		if tid, ok := data["transactionId"].(string); ok && tid != "" {
			orderID = tid
		} else if id, ok := data["id"].(string); ok && id != "" {
			orderID = id
		}
	}

	if orderID == "" {
		return fmt.Errorf("missing order_id or transaction identifier in Mayar webhook payload")
	}

	// Extract status
	status, _ := data["status"].(string)
	txStatus, _ := data["transactionStatus"].(string)

	isSuccess := strings.EqualFold(status, "paid") ||
		strings.EqualFold(status, "settled") ||
		strings.EqualFold(status, "success") ||
		strings.EqualFold(txStatus, "paid") ||
		strings.EqualFold(txStatus, "settled") ||
		strings.EqualFold(txStatus, "success") ||
		strings.EqualFold(event, "payment.received") ||
		strings.EqualFold(event, "invoice.paid")

	isFailed := strings.EqualFold(status, "expired") ||
		strings.EqualFold(status, "failed") ||
		strings.EqualFold(status, "cancelled") ||
		strings.EqualFold(txStatus, "expired") ||
		strings.EqualFold(txStatus, "failed") ||
		strings.EqualFold(txStatus, "cancelled")

	if isSuccess {
		return u.processPaymentSuccess(orderID)
	} else if isFailed {
		return u.updatePaymentStatus(orderID, "Failed")
	}

	return nil
}

func (u *MayarUsecase) updatePaymentStatus(orderID string, status string) error {
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

func (u *MayarUsecase) processPaymentSuccess(orderID string) error {
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
			ItemName:          "Pembayaran Mayar - " + bill.Title,
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

			if parent != nil {
				u.financeUsecase.triggerPaymentWA(&bill.Student, parent, bill, payment.Amount, "Mayar")
			}

			u.financeUsecase.syncObligationStatus(bill, totalPaid, payment.Amount)
		}
	}
	return nil
}
