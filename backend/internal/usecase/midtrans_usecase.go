package usecase

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
	"github.com/midtrans/midtrans-go/snap"
)

type MidtransUsecase struct {
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

func NewMidtransUsecase(
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
) *MidtransUsecase {
	return &MidtransUsecase{
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

// getClients dynamically fetches the active Midtrans Server Key and Environment from DB (school_settings) or .env fallback
func (u *MidtransUsecase) getClients() (snap.Client, coreapi.Client, bool) {
	serverKey := strings.TrimSpace(u.cfg.MidtransServerKey)
	isProduction := u.cfg.MidtransIsProduction

	if u.schoolSettingRepo != nil {
		if s, err := u.schoolSettingRepo.GetByKey("midtrans_server_key"); err == nil && strings.TrimSpace(s.Value) != "" {
			serverKey = strings.TrimSpace(s.Value)
		}
		if s, err := u.schoolSettingRepo.GetByKey("midtrans_is_production"); err == nil {
			isProduction = strings.TrimSpace(s.Value) == "true" || strings.TrimSpace(s.Value) == "1"
		}
	}

	env := midtrans.Sandbox
	if isProduction {
		env = midtrans.Production
	}

	var s snap.Client
	s.New(serverKey, env)

	var c coreapi.Client
	c.New(serverKey, env)

	return s, c, isProduction
}

// CreateSnapTransaction creates a Midtrans Snap token for a bill payment
func (u *MidtransUsecase) CreateSnapTransaction(billID uuid.UUID, amount float64) (string, string, string, error) {
	// Get the bill with student info
	bill, err := u.financeRepo.GetBillByID(billID.String())
	if err != nil {
		return "", "", "", fmt.Errorf("bill not found: %w", err)
	}

	if bill.Status == "Paid" {
		return "", "", "", fmt.Errorf("tagihan sudah lunas")
	}

	// Cancel any old pending online payments for this bill to avoid transaction confusion
	if bill.Payments != nil {
		for _, p := range bill.Payments {
			if (p.PaymentMethod == "Midtrans" || p.PaymentMethod == "Xendit" || p.PaymentMethod == "Mayar") && p.Status == "Pending" && p.TransactionID != "" {
				_ = u.CancelTransaction(p.TransactionID)
			}
		}
	}

	// Generate a unique order ID using bill ID + timestamp to avoid duplicate order_id
	orderID := fmt.Sprintf("BILL-%s-%d", billID.String()[:8], time.Now().UnixMilli())

	// Build Snap request
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: int64(amount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: bill.Student.User.Name,
			Email: bill.Student.User.Email,
		},
		Items: &[]midtrans.ItemDetails{
			{
				ID:    bill.ID.String()[:8],
				Price: int64(amount),
				Qty:   1,
				Name:  bill.Title,
			},
		},
	}

	snapClient, _, _ := u.getClients()
	snapResp, midErr := snapClient.CreateTransaction(req)
	if midErr != nil {
		log.Printf("Midtrans Snap error: %v", midErr.GetMessage())
		msg := midErr.GetMessage()
		if strings.Contains(msg, "timeout") || strings.Contains(msg, "dial tcp") || strings.Contains(msg, "HttpClient") {
			return "", "", "", fmt.Errorf("Jaringan server VPS ke Midtrans Sandbox timeout (dial tcp 8.215.152.185:443). Silakan periksa DNS/Firewall VPS Anda atau switch ke Mode Production / Xendit di Pengaturan Sekolah.")
		}
		return "", "", "", fmt.Errorf("Gagal membuat transaksi Midtrans: %s", msg)
	}

	// Create a pending payment record storing RedirectURL in ProofURL
	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: "Midtrans",
		Status:        "Pending",
		TransactionID: orderID,
		ProofURL:      snapResp.RedirectURL,
	}
	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return "", "", "", fmt.Errorf("failed to create payment record: %w", err)
	}

	return snapResp.Token, snapResp.RedirectURL, orderID, nil
}

func (u *MidtransUsecase) HandleNotification(notificationPayload map[string]interface{}) error {
	orderID, ok := notificationPayload["order_id"].(string)
	if !ok || orderID == "" {
		return fmt.Errorf("order_id not found in notification payload")
	}

	_, coreClient, _ := u.getClients()
	transactionStatusResp, midErr := coreClient.CheckTransaction(orderID)
	if midErr != nil {
		return fmt.Errorf("failed to check transaction: %s", midErr.GetMessage())
	}

	log.Printf("Midtrans notification - OrderID: %s, Status: %s, FraudStatus: %s",
		orderID, transactionStatusResp.TransactionStatus, transactionStatusResp.FraudStatus)

	return u.processPaymentStatus(orderID, transactionStatusResp.TransactionStatus, transactionStatusResp.FraudStatus)
}

// CreateMultiSnapTransaction creates a Midtrans Snap transaction for multiple bills
func (u *MidtransUsecase) CreateMultiSnapTransaction(orderID string, totalAmount float64, student *domain.Student, billIDs []string) (string, string, string, error) {
	if student == nil {
		return "", "", "", fmt.Errorf("student data missing")
	}

	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: int64(totalAmount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: student.User.Name,
			Email: student.User.Email,
		},
	}

	// Add item details for each bill (summarized or descriptive)
	itemDetails := []midtrans.ItemDetails{
		{
			ID:    "MULTI",
			Price: int64(totalAmount),
			Qty:   1,
			Name:  fmt.Sprintf("Pembayaran %d Tagihan", len(billIDs)),
		},
	}
	req.Items = &itemDetails

	snapClient, _, _ := u.getClients()
	snapResp, midErr := snapClient.CreateTransaction(req)
	if midErr != nil {
		log.Printf("Midtrans Snap error: %v", midErr.GetMessage())
		return "", "", "", fmt.Errorf("failed to create Midtrans multi-transaction: %s", midErr.GetMessage())
	}

	// Save RedirectURL for multi-payment records
	payments, _ := u.financeRepo.GetPaymentsByTransactionID(orderID)
	for i := range payments {
		payments[i].ProofURL = snapResp.RedirectURL
		_ = u.financeRepo.UpdatePayment(&payments[i])
	}

	return snapResp.Token, snapResp.RedirectURL, orderID, nil
}

// CancelTransaction cancels a pending transaction in Midtrans and updates the local payment status
func (u *MidtransUsecase) CancelTransaction(orderID string) error {
	_, coreClient, _ := u.getClients()
	_, midErr := coreClient.CancelTransaction(orderID)
	if midErr != nil {
		log.Printf("Midtrans cancel warning/error for OrderID %s: %v", orderID, midErr.GetMessage())
	}

	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil {
		return fmt.Errorf("payments not found for order_id %s: %w", orderID, err)
	}

	for i := range payments {
		p := &payments[i]
		if p.Status == "Pending" {
			p.Status = "Failed"
			if err := u.financeRepo.UpdatePayment(p); err != nil {
				log.Printf("Failed to update payment status to Failed for order_id %s: %v", orderID, err)
			}
		}
	}
	return nil
}

type DetailedTransactionStatus struct {
	Status            string      `json:"status"`
	TransactionStatus string      `json:"transaction_status"`
	PaymentType       string      `json:"payment_type"`
	GrossAmount       string      `json:"gross_amount"`
	VANumbers         []VANumber  `json:"va_numbers,omitempty"`
	PermataVANumber   string      `json:"permata_va_number,omitempty"`
	BillKey           string      `json:"bill_key,omitempty"`
	BillerCode        string      `json:"biller_code,omitempty"`
	QRCodeURL         string      `json:"qr_code_url,omitempty"`
	ExpiryTime        string      `json:"expiry_time,omitempty"`
	InvoiceURL        string      `json:"invoice_url,omitempty"`
	RedirectURL       string      `json:"redirect_url,omitempty"`
	SnapToken         string      `json:"snap_token,omitempty"`
}

type VANumber struct {
	Bank     string `json:"bank"`
	VANumber string `json:"va_number"`
}

type ActionURL struct {
	Name   string `json:"name"`
	Method string `json:"method"`
	URL    string `json:"url"`
}

// CheckTransactionStatus checks payment status directly with Midtrans API
func (u *MidtransUsecase) CheckTransactionStatus(orderID string) (*DetailedTransactionStatus, error) {
	_, coreClient, isProd := u.getClients()
	transactionStatusResp, midErr := coreClient.CheckTransaction(orderID)
	if midErr != nil {
		payment, _ := u.financeRepo.GetPaymentByTransactionID(orderID)
		localStatus := "Pending"
		if payment != nil {
			localStatus = payment.Status
		}
		return &DetailedTransactionStatus{Status: localStatus}, nil
	}

	// Always process and update payment status in local database based on Midtrans response
	_ = u.processPaymentStatus(orderID, transactionStatusResp.TransactionStatus, transactionStatusResp.FraudStatus)

	payment, err := u.financeRepo.GetPaymentByTransactionID(orderID)
	if err != nil {
		return nil, err
	}

	// Extract QR Code URL
	qrCodeURL := ""
	baseURL := "https://api.sandbox.midtrans.com"
	if isProd {
		baseURL = "https://api.midtrans.com"
	}

	if transactionStatusResp.PaymentType == "qris" || transactionStatusResp.PaymentType == "gopay" || transactionStatusResp.PaymentType == "other_qris" {
		qrCodeURL = fmt.Sprintf("%s/v2/qris/%s/qr-code", baseURL, orderID)
	}
	if qrCodeURL == "" && len(transactionStatusResp.VaNumbers) == 0 && transactionStatusResp.BillKey == "" && transactionStatusResp.PermataVaNumber == "" {
		qrCodeURL = fmt.Sprintf("%s/v2/qris/%s/qr-code", baseURL, orderID)
	}

	redirectURL := payment.ProofURL
	snapToken := ""
	if redirectURL != "" {
		parts := strings.Split(redirectURL, "/")
		last := parts[len(parts)-1]
		if !strings.HasPrefix(last, "BILL-") && len(last) > 10 {
			snapToken = last
		}
	}

	res := &DetailedTransactionStatus{
		Status:            payment.Status,
		TransactionStatus: transactionStatusResp.TransactionStatus,
		PaymentType:       transactionStatusResp.PaymentType,
		GrossAmount:       transactionStatusResp.GrossAmount,
		ExpiryTime:        transactionStatusResp.ExpiryTime,
		PermataVANumber:   transactionStatusResp.PermataVaNumber,
		BillKey:           transactionStatusResp.BillKey,
		BillerCode:        transactionStatusResp.BillerCode,
		QRCodeURL:         qrCodeURL,
		InvoiceURL:        redirectURL,
		RedirectURL:       redirectURL,
		SnapToken:         snapToken,
	}

	for _, va := range transactionStatusResp.VaNumbers {
		res.VANumbers = append(res.VANumbers, VANumber{
			Bank:     va.Bank,
			VANumber: va.VANumber,
		})
	}

	return res, nil
}

func (u *MidtransUsecase) processPaymentStatus(orderID, transactionStatus, fraudStatus string) error {
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil {
		return fmt.Errorf("payments not found for order_id %s: %w", orderID, err)
	}
	if len(payments) == 0 {
		return fmt.Errorf("no payment records found for order_id %s", orderID)
	}

	newStatus := "Pending"
	switch transactionStatus {
	case "capture":
		if fraudStatus == "challenge" {
			newStatus = "Pending"
		} else if fraudStatus == "accept" {
			newStatus = "Success"
		}
	case "settlement":
		newStatus = "Success"
	case "cancel", "deny", "expire":
		newStatus = "Failed"
	case "pending":
		newStatus = "Pending"
	}

	for i := range payments {
		p := &payments[i]
		if p.Status == "Success" {
			continue // Already processed, skip to avoid double processing
		}

		p.Status = newStatus
		if newStatus == "Success" {
			now := time.Now()
			p.PaidAt = now

			bill, err := u.financeRepo.GetBillByID(p.BillID.String())
			if err == nil && bill != nil {
				totalPaid := float64(0)
				for _, pay := range bill.Payments {
					if pay.Status == "Success" || pay.ID == p.ID {
						totalPaid += pay.Amount
					}
				}
				newBillStatus := "Partial"
				if totalPaid >= bill.Amount {
					newBillStatus = "Paid"
				}
				_ = u.financeRepo.UpdateBillStatus(p.BillID.String(), newBillStatus)

				// 1. Sync CashLedger entry (Skip for Kegiatan)
				if bill.BillType != "Kegiatan" {
					category := "Lain-lain"
					if bill.TransactionCode != nil {
						category = bill.TransactionCode.Category
					} else if bill.BillType != "" {
						category = bill.BillType
					}

					cashLedgerEntry := domain.CashLedger{
						Date:              now,
						Source:            bill.Student.User.Name,
						ItemName:          "Pembayaran " + bill.Title + " (Midtrans)",
						Type:              "Income",
						Amount:            p.Amount,
						Category:          category,
						TransactionCodeID: bill.TransactionCodeID,
					}
					_ = u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry)
				}

				// 2. Auto-realize RKAS
				if bill.TransactionCodeID != nil && *bill.TransactionCodeID > 0 && u.budgetRepo != nil {
					var billingMonth int
					if bill.Obligation != nil {
						billingMonth = bill.Obligation.BillingMonth
					}
					_ = u.budgetRepo.AddRealizationByTransactionCodeID(*bill.TransactionCodeID, p.Amount, billingMonth)
				}

				var parent *domain.Parent
				if bill.Student.ParentID != nil {
					parent, _ = u.studentRepo.GetParentByID(bill.Student.ParentID.String())
				}

				if u.financeUsecase != nil {
					u.financeUsecase.sendPaymentInAppNotifications(&bill.Student, bill, parent, p.Amount)
					u.financeUsecase.triggerPaymentWA(&bill.Student, parent, bill, p.Amount, "Midtrans")
					u.financeUsecase.syncObligationStatus(bill, totalPaid, p.Amount)
				}
			}
		}

		if err := u.financeRepo.UpdatePayment(p); err != nil {
			log.Printf("Failed to update payment status for order_id %s: %v", orderID, err)
		}
	}

	return nil
}
