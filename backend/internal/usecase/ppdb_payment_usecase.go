package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/google/uuid"
)

type PPDBPaymentUsecase struct {
	ppdbPaymentRepo *postgres.PPDBPaymentRepository
	publicRepo      *postgres.PublicRepository
	invoiceUsecase  InvoiceSignatureUsecase
}

func NewPPDBPaymentUsecase(
	ppdbPaymentRepo *postgres.PPDBPaymentRepository,
	publicRepo *postgres.PublicRepository,
	invoiceUsecase InvoiceSignatureUsecase,
) *PPDBPaymentUsecase {
	return &PPDBPaymentUsecase{
		ppdbPaymentRepo: ppdbPaymentRepo,
		publicRepo:      publicRepo,
		invoiceUsecase:  invoiceUsecase,
	}
}

// CreatePayment creates a new PPDB payment with DP validation
func (u *PPDBPaymentUsecase) CreatePayment(payment *domain.PPDBPayment) error {
	// Generate unique invoice number
	invoiceNumber, err := u.invoiceUsecase.GenerateNumber("PPDBPayment")
	if err != nil {
		return fmt.Errorf("failed to generate invoice number: %w", err)
	}
	payment.InvoiceNumber = invoiceNumber

	// Calculate totals and validate DP
	if err := u.validateAndCalculatePayment(payment); err != nil {
		return err
	}

	// Create payment
	if err := u.ppdbPaymentRepo.Create(payment); err != nil {
		return fmt.Errorf("failed to create payment: %w", err)
	}

	// Auto-accept registration if DP >= 50%
	if err := u.checkAndUpdateRegistrationStatus(payment); err != nil {
		return fmt.Errorf("failed to update registration status: %w", err)
	}

	return nil
}

// UpdatePayment updates an existing PPDB payment with DP validation
func (u *PPDBPaymentUsecase) UpdatePayment(payment *domain.PPDBPayment) error {
	// Validate and calculate payment
	if err := u.validateAndCalculatePayment(payment); err != nil {
		return err
	}

	// Update payment
	if err := u.ppdbPaymentRepo.Update(payment); err != nil {
		return fmt.Errorf("failed to update payment: %w", err)
	}

	// Auto-accept registration if DP >= 50%
	if err := u.checkAndUpdateRegistrationStatus(payment); err != nil {
		return fmt.Errorf("failed to update registration status: %w", err)
	}

	return nil
}

// validateAndCalculatePayment validates DP requirement and calculates payment status
func (u *PPDBPaymentUsecase) validateAndCalculatePayment(payment *domain.PPDBPayment) error {
	var totalAmount float64
	var totalPaid float64
	var uangBangunanItem *domain.PPDBPaymentItem

	// Find Uang Bangunan item and calculate totals
	for i := range payment.Items {
		item := &payment.Items[i]
		totalAmount += item.ExpectedAmount
		totalPaid += item.PaidAmount

		if item.ItemName == "Uang Bangunan" {
			uangBangunanItem = item
		}
	}

	// Validate DP requirement for Uang Bangunan
	if uangBangunanItem != nil && uangBangunanItem.ExpectedAmount > 0 {
		dpPercentage := uangBangunanItem.PaidAmount / uangBangunanItem.ExpectedAmount

		// Requirement 1.6: If DP < 50%, return error with shortage amount
		if dpPercentage < 0.5 {
			shortage := (uangBangunanItem.ExpectedAmount * 0.5) - uangBangunanItem.PaidAmount
			return fmt.Errorf("DP Uang Bangunan kurang dari 50%%. Kekurangan: Rp %.0f", shortage)
		}
	}

	// Update payment totals
	payment.TotalAmount = totalAmount
	payment.PaidAmount = totalPaid

	// Calculate payment status
	payment.Status = u.calculatePaymentStatus(payment.Items)

	return nil
}

// calculatePaymentStatus determines payment status based on items
func (u *PPDBPaymentUsecase) calculatePaymentStatus(items []domain.PPDBPaymentItem) string {
	if len(items) == 0 {
		return "Belum Bayar"
	}

	allPaid := true
	anyPaid := false
	dpTerpenuhi := false

	for _, item := range items {
		if item.PaidAmount > 0 {
			anyPaid = true
		}

		if item.PaidAmount < item.ExpectedAmount {
			allPaid = false
		}

		// Check if Uang Bangunan DP is fulfilled
		if item.ItemName == "Uang Bangunan" && item.ExpectedAmount > 0 {
			dpPercentage := item.PaidAmount / item.ExpectedAmount
			if dpPercentage >= 0.5 {
				dpTerpenuhi = true
			}
		}
	}

	if allPaid {
		return "Lunas"
	}

	if dpTerpenuhi {
		return "DP Terpenuhi"
	}

	if anyPaid {
		return "DP Terpenuhi" // Any payment means at least partial payment
	}

	return "Belum Bayar"
}

// checkAndUpdateRegistrationStatus auto-accepts registration if DP >= 50%
func (u *PPDBPaymentUsecase) checkAndUpdateRegistrationStatus(payment *domain.PPDBPayment) error {
	// Find Uang Bangunan item
	var uangBangunanItem *domain.PPDBPaymentItem
	for i := range payment.Items {
		if payment.Items[i].ItemName == "Uang Bangunan" {
			uangBangunanItem = &payment.Items[i]
			break
		}
	}

	if uangBangunanItem == nil {
		return nil // No Uang Bangunan item, skip
	}

	// Calculate DP percentage
	dpPercentage := 0.0
	if uangBangunanItem.ExpectedAmount > 0 {
		dpPercentage = uangBangunanItem.PaidAmount / uangBangunanItem.ExpectedAmount
	}

	// Requirement 1.5: Auto-accept if DP >= 50%
	if dpPercentage >= 0.5 {
		if err := u.publicRepo.UpdatePPDBStatus(payment.PPDBRegistrationID.String(), "Accepted"); err != nil {
			return fmt.Errorf("failed to update PPDB status: %w", err)
		}
	}

	return nil
}

// GetByID retrieves a payment by ID
func (u *PPDBPaymentUsecase) GetByID(id string) (*domain.PPDBPayment, error) {
	return u.ppdbPaymentRepo.GetByID(id)
}

// GetByRegistrationID retrieves a payment by registration ID
func (u *PPDBPaymentUsecase) GetByRegistrationID(registrationID uuid.UUID) (*domain.PPDBPayment, error) {
	return u.ppdbPaymentRepo.GetByRegistrationID(registrationID)
}

// GetAll retrieves all payments
func (u *PPDBPaymentUsecase) GetAll() ([]domain.PPDBPayment, error) {
	return u.ppdbPaymentRepo.GetAll()
}

// Delete deletes a payment by ID
func (u *PPDBPaymentUsecase) Delete(id string) error {
	return u.ppdbPaymentRepo.Delete(id)
}
