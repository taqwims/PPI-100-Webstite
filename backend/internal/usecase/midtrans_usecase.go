package usecase

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
	"github.com/midtrans/midtrans-go/snap"
)

type MidtransUsecase struct {
	snapClient            snap.Client
	coreClient            coreapi.Client
	financeRepo           *postgres.FinanceRepository
	studentRepo           *postgres.StudentRepository
	userRepo              *postgres.UserRepository
	notificationUsecase   *NotificationUsecase
	financeUsecase        *FinanceUsecase
	studentObligationRepo *postgres.StudentObligationRepository
	activityRepo          *postgres.ActivityRepository
}

func NewMidtransUsecase(
	cfg *config.Config,
	financeRepo *postgres.FinanceRepository,
	studentRepo *postgres.StudentRepository,
	userRepo *postgres.UserRepository,
	notificationUsecase *NotificationUsecase,
	financeUsecase *FinanceUsecase,
	studentObligationRepo *postgres.StudentObligationRepository,
	activityRepo *postgres.ActivityRepository,
) *MidtransUsecase {
	var env midtrans.EnvironmentType
	if cfg.MidtransIsProduction {
		env = midtrans.Production
	} else {
		env = midtrans.Sandbox
	}

	var s snap.Client
	s.New(cfg.MidtransServerKey, env)

	var c coreapi.Client
	c.New(cfg.MidtransServerKey, env)

	return &MidtransUsecase{
		snapClient:            s,
		coreClient:            c,
		financeRepo:           financeRepo,
		studentRepo:           studentRepo,
		userRepo:              userRepo,
		notificationUsecase:   notificationUsecase,
		financeUsecase:        financeUsecase,
		studentObligationRepo: studentObligationRepo,
		activityRepo:          activityRepo,
	}
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

	// Generate a unique order ID using bill ID + timestamp to avoid duplicate order_id
	orderID := fmt.Sprintf("BILL-%s-%d", billID.String()[:8], time.Now().UnixMilli())

	// Create a pending payment record
	payment := &domain.Payment{
		BillID:        billID,
		Amount:        amount,
		PaymentMethod: "Midtrans",
		Status:        "Pending",
		TransactionID: orderID,
	}
	if err := u.financeRepo.CreatePayment(payment); err != nil {
		return "", "", "", fmt.Errorf("failed to create payment record: %w", err)
	}

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

	// Call Midtrans Snap API
	snapResp, midErr := u.snapClient.CreateTransaction(req)
	if midErr != nil {
		log.Printf("Midtrans Snap error: %v", midErr.GetMessage())
		return "", "", "", fmt.Errorf("failed to create Midtrans transaction: %s", midErr.GetMessage())
	}

	return snapResp.Token, snapResp.RedirectURL, orderID, nil
}

func (u *MidtransUsecase) HandleNotification(notificationPayload map[string]interface{}) error {
	orderID, ok := notificationPayload["order_id"].(string)
	if !ok || orderID == "" {
		return fmt.Errorf("order_id not found in notification payload")
	}

	// Verify transaction status with Midtrans
	transactionStatusResp, midErr := u.coreClient.CheckTransaction(orderID)
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

	snapResp, midErr := u.snapClient.CreateTransaction(req)
	if midErr != nil {
		log.Printf("Midtrans Snap error: %v", midErr.GetMessage())
		return "", "", "", fmt.Errorf("failed to create Midtrans multi-transaction: %s", midErr.GetMessage())
	}

	return snapResp.Token, snapResp.RedirectURL, orderID, nil
}

// CheckTransactionStatus checks payment status directly with Midtrans API
// This is called from the frontend after Snap popup completes, to handle cases
// where the webhook can't reach the server (e.g. localhost development)
func (u *MidtransUsecase) CheckTransactionStatus(orderID string) (string, error) {
	// Verify transaction status with Midtrans
	transactionStatusResp, midErr := u.coreClient.CheckTransaction(orderID)
	if midErr != nil {
		// Handle 404/Not Found from Midtrans gracefully to avoid 500 errors on UX
		if midErr.GetMessage() == "Transaction doesn't exist." {
			log.Printf("Midtrans status check - OrderID %s not found in Midtrans (Uninitiated)", orderID)
			return "Uninitiated", nil
		}
		return "", fmt.Errorf("failed to check transaction: %s", midErr.GetMessage())
	}

	log.Printf("Midtrans status check - OrderID: %s, Status: %s, FraudStatus: %s",
		orderID, transactionStatusResp.TransactionStatus, transactionStatusResp.FraudStatus)

	err := u.processPaymentStatus(orderID, transactionStatusResp.TransactionStatus, transactionStatusResp.FraudStatus)
	if err != nil {
		return "", err
	}

	// Return the resolved status
	payment, err := u.financeRepo.GetPaymentByTransactionID(orderID)
	if err != nil {
		return "", err
	}

	return payment.Status, nil
}

// processPaymentStatus is the shared logic for updating payment and bill status
func (u *MidtransUsecase) processPaymentStatus(orderID string, transactionStatus string, fraudStatus string) error {
	// Find all payment records by transaction_id (order_id)
	payments, err := u.financeRepo.GetPaymentsByTransactionID(orderID)
	if err != nil {
		return fmt.Errorf("payments not found for order_id %s: %w", orderID, err)
	}

	if len(payments) == 0 {
		return fmt.Errorf("no payments found for order_id %s", orderID)
	}

	for i := range payments {
		payment := &payments[i]

		// If already processed as Success, skip this individual payment
		if payment.Status == "Success" {
			continue
		}

		// Update payment status based on Midtrans response
		switch transactionStatus {
		case "capture":
			if fraudStatus == "accept" {
				payment.Status = "Success"
				payment.PaidAt = time.Now()
			} else if fraudStatus == "challenge" {
				payment.Status = "Pending"
			}
		case "settlement":
			payment.Status = "Success"
			payment.PaidAt = time.Now()
		case "pending":
			payment.Status = "Pending"
		case "cancel", "expire":
			payment.Status = "Failed"
		case "deny":
			payment.Status = "Failed"
		default:
			log.Printf("Unknown transaction status: %s", transactionStatus)
			continue
		}

		// Save updated payment
		if err := u.financeRepo.UpdatePayment(payment); err != nil {
			log.Printf("failed to update payment %s: %v", payment.ID, err)
			continue
		}

		// If payment is successful, update bill status and sync to CashLedger
		if payment.Status == "Success" {
			bill, err := u.financeRepo.GetBillByID(payment.BillID.String())
			if err != nil {
				log.Printf("failed to get bill for payment %s: %v", payment.ID, err)
				continue
			}

			// Calculate total paid across all successful payments for this bill
			totalPaid := float64(0)
			for _, p := range bill.Payments {
				if p.Status == "Success" || p.ID == payment.ID { // Include current payment
					totalPaid += p.Amount
				}
			}

			// Update bill status
			newBillStatus := "Partial"
			if totalPaid >= bill.Amount {
				newBillStatus = "Paid"
			}
			_ = u.financeRepo.UpdateBillStatus(payment.BillID.String(), newBillStatus)

			// Sync to CashLedger
			category := "Lain-lain"
			if bill.TransactionCode != nil {
				category = bill.TransactionCode.Category
			} else if bill.BillType != "" {
				category = bill.BillType
			}

			cashLedgerEntry := domain.CashLedger{
				Date:              time.Now(),
				Source:            bill.Student.User.Name,
				ItemName:          "Pembayaran Midtrans - " + bill.Title,
				Type:              "Income",
				Amount:            payment.Amount,
				Category:          category,
				TransactionCodeID: bill.TransactionCodeID,
			}
			_ = u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry)

			// Send notifications
			var parent *domain.Parent
			if bill.Student.ParentID != nil {
				parent, _ = u.studentRepo.GetParentByID(bill.Student.ParentID.String())
			}
			u.financeUsecase.sendPaymentInAppNotifications(&bill.Student, bill, parent, payment.Amount)

			if parent != nil {
				u.financeUsecase.triggerPaymentWA(&bill.Student, parent, bill, payment.Amount)
			}

			// Sync payment status back to StudentObligation or ActivityObligation
			u.financeUsecase.syncObligationStatus(bill, totalPaid, payment.Amount)
		}
	}

	return nil
}

