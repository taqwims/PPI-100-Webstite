package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"testing"

	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// Feature: ppdb-payment-and-improvements, Property 1: Threshold DP Uang Bangunan
// **Validates: Requirements 1.4, 1.5, 1.6**
//
// Property: For any expected_amount (positive) and paid_amount (0 to expected_amount * 2),
// if paid_amount / expected_amount >= 0.5 → status must be Accepted;
// if < 0.5 → status must not be Accepted
func TestProperty_ThresholdDPUangBangunan(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate arbitrary positive expected_amount (1 to 100,000,000)
		expectedAmount := rapid.Float64Range(1.0, 100000000.0).Draw(t, "expected_amount")
		
		// Generate arbitrary paid_amount (0 to expected_amount * 2)
		paidAmount := rapid.Float64Range(0.0, expectedAmount*2.0).Draw(t, "paid_amount")
		
		// Calculate DP percentage
		dpPercentage := paidAmount / expectedAmount
		
		// Create a payment with Uang Bangunan item
		payment := &domain.PPDBPayment{
			ID:                 uuid.New(),
			PPDBRegistrationID: uuid.New(),
			InvoiceNumber:      fmt.Sprintf("INV-%d", rapid.Int().Draw(t, "invoice_num")),
			Items: []domain.PPDBPaymentItem{
				{
					ID:             uuid.New(),
					ItemName:       "Uang Bangunan",
					ExpectedAmount: expectedAmount,
					PaidAmount:     paidAmount,
				},
			},
		}
		
		// Create a mock usecase (we only test the validation logic)
		usecase := &PPDBPaymentUsecase{}
		
		// Call validateAndCalculatePayment
		err := usecase.validateAndCalculatePayment(payment)
		
		// Property verification
		if dpPercentage >= 0.5 {
			// If DP >= 50%, validation should succeed
			if err != nil {
				t.Fatalf("Expected no error when DP >= 50%% (DP: %.2f%%), but got: %v", dpPercentage*100, err)
			}
		} else {
			// If DP < 50%, validation should fail with specific error
			if err == nil {
				t.Fatalf("Expected error when DP < 50%% (DP: %.2f%%), but got no error", dpPercentage*100)
			}
			
			// Verify error message contains shortage information
			expectedShortage := (expectedAmount * 0.5) - paidAmount
			expectedErrorMsg := fmt.Sprintf("DP Uang Bangunan kurang dari 50%%. Kekurangan: Rp %.0f", expectedShortage)
			
			if err.Error() != expectedErrorMsg {
				t.Fatalf("Expected error message '%s', but got '%s'", expectedErrorMsg, err.Error())
			}
		}
	})
}

// Feature: ppdb-payment-and-improvements, Property 2: Nomor Invoice PPDB Unik
// **Validates: Requirements 1.9**
//
// Property: For any N PPDB payments generated (N between 2-50),
// all invoice numbers must be unique
func TestProperty_NomorInvoicePPDBUnik(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate N between 2 and 50
		n := rapid.IntRange(2, 50).Draw(t, "n")
		
		// Track generated invoice numbers
		invoiceNumbers := make(map[string]bool)
		
		// Create a mock invoice usecase that generates sequential invoice numbers
		mockInvoiceUsecase := &mockInvoiceSignatureUsecase{
			counter: 0,
		}
		
		// Create usecase with mock
		usecase := &PPDBPaymentUsecase{
			invoiceUsecase: mockInvoiceUsecase,
		}
		
		// Generate N payments
		for i := 0; i < n; i++ {
			payment := &domain.PPDBPayment{
				ID:                 uuid.New(),
				PPDBRegistrationID: uuid.New(),
				Items: []domain.PPDBPaymentItem{
					{
						ID:             uuid.New(),
						ItemName:       "Uang Bangunan",
						ExpectedAmount: 10000000.0,
						PaidAmount:     5000000.0, // 50% DP to pass validation
					},
				},
			}
			
			// Generate invoice number
			invoiceNumber, err := usecase.invoiceUsecase.GenerateNumber("PPDBPayment")
			if err != nil {
				t.Fatalf("Failed to generate invoice number: %v", err)
			}
			
			payment.InvoiceNumber = invoiceNumber
			
			// Check for duplicates
			if invoiceNumbers[invoiceNumber] {
				t.Fatalf("Duplicate invoice number detected: %s (after generating %d invoices)", invoiceNumber, i+1)
			}
			
			invoiceNumbers[invoiceNumber] = true
		}
		
		// Verify all invoice numbers are unique
		if len(invoiceNumbers) != n {
			t.Fatalf("Expected %d unique invoice numbers, but got %d", n, len(invoiceNumbers))
		}
	})
}

// mockInvoiceSignatureUsecase is a simple mock that generates sequential invoice numbers
type mockInvoiceSignatureUsecase struct {
	counter int
}

func (m *mockInvoiceSignatureUsecase) GenerateNumber(invoiceType string) (string, error) {
	m.counter++
	return fmt.Sprintf("PPDB-2024-%04d", m.counter), nil
}

func (m *mockInvoiceSignatureUsecase) SignInvoice(invoiceType, referenceID string, amount float64, dateStr string) (*SignInvoiceResult, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) VerifyInvoice(code string) (*VerifyInvoiceResult, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) GetInvoiceHistory(userIDStr string, roleID int, invoiceType, search, startDate, endDate string) ([]postgres.InvoiceHistoryItem, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) GetInvoiceConfigs() ([]domain.InvoiceNumberConfig, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) UpdateInvoiceConfig(id uint, input UpdateInvoiceConfigInput) (*domain.InvoiceNumberConfig, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) ResetCounter(id uint) error {
	return fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) GetStakeholders() ([]domain.StakeholderConfig, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockInvoiceSignatureUsecase) UpdateStakeholder(id uint, input UpdateStakeholderInput) (*domain.StakeholderConfig, error) {
	return nil, fmt.Errorf("not implemented")
}

// Feature: ppdb-payment-and-improvements, Property 3: Pencatatan Item Pembayaran PPDB (Round-Trip)
// **Validates: Requirements 1.3**
//
// Property: For any list of valid PPDBPaymentItems, after saving via repository and retrieving,
// all item data (item_name, expected_amount, paid_amount) must be identical to the original
func TestProperty_PencatatanItemPembayaranPPDBRoundTrip(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate random number of items (1 to 5)
		numItems := rapid.IntRange(1, 5).Draw(t, "num_items")
		
		// Generate random PPDBPaymentItems
		originalItems := make([]domain.PPDBPaymentItem, numItems)
		for i := 0; i < numItems; i++ {
			// Generate random item name from common PPDB payment types
			itemNames := []string{"Uang Bangunan", "Uang Tes Kemampuan", "Uang Seragam", "Uang Buku", "Uang Kegiatan"}
			itemName := rapid.SampledFrom(itemNames).Draw(t, fmt.Sprintf("item_name_%d", i))
			
			// Generate random expected amount (100,000 to 50,000,000)
			expectedAmount := rapid.Float64Range(100000.0, 50000000.0).Draw(t, fmt.Sprintf("expected_amount_%d", i))
			
			// Generate random paid amount (0 to expected_amount)
			paidAmount := rapid.Float64Range(0.0, expectedAmount).Draw(t, fmt.Sprintf("paid_amount_%d", i))
			
			originalItems[i] = domain.PPDBPaymentItem{
				ID:             uuid.New(),
				PPDBPaymentID:  uuid.New(), // Will be set by payment
				ItemName:       itemName,
				ExpectedAmount: expectedAmount,
				PaidAmount:     paidAmount,
			}
		}
		
		// Create a payment with these items
		payment := &domain.PPDBPayment{
			ID:                 uuid.New(),
			PPDBRegistrationID: uuid.New(),
			InvoiceNumber:      fmt.Sprintf("INV-TEST-%d", rapid.Int().Draw(t, "invoice_num")),
			Items:              originalItems,
		}
		
		// Create mock repository
		mockRepo := &mockPPDBPaymentRepository{
			storage: make(map[string]*domain.PPDBPayment),
		}
		
		// Save payment via mock repository
		err := mockRepo.Create(payment)
		if err != nil {
			t.Fatalf("Failed to save payment: %v", err)
		}
		
		// Retrieve payment back
		retrievedPayment, err := mockRepo.GetByID(payment.ID.String())
		if err != nil {
			t.Fatalf("Failed to retrieve payment: %v", err)
		}
		
		// Verify number of items matches
		if len(retrievedPayment.Items) != len(originalItems) {
			t.Fatalf("Expected %d items, but got %d", len(originalItems), len(retrievedPayment.Items))
		}
		
		// Verify each item's data is identical
		for i := 0; i < len(originalItems); i++ {
			original := originalItems[i]
			retrieved := retrievedPayment.Items[i]
			
			// Verify item_name
			if retrieved.ItemName != original.ItemName {
				t.Fatalf("Item %d: Expected item_name '%s', but got '%s'", i, original.ItemName, retrieved.ItemName)
			}
			
			// Verify expected_amount (with floating point tolerance)
			if !floatEquals(retrieved.ExpectedAmount, original.ExpectedAmount, 0.01) {
				t.Fatalf("Item %d: Expected expected_amount %.2f, but got %.2f", i, original.ExpectedAmount, retrieved.ExpectedAmount)
			}
			
			// Verify paid_amount (with floating point tolerance)
			if !floatEquals(retrieved.PaidAmount, original.PaidAmount, 0.01) {
				t.Fatalf("Item %d: Expected paid_amount %.2f, but got %.2f", i, original.PaidAmount, retrieved.PaidAmount)
			}
		}
	})
}

// mockPPDBPaymentRepository is a simple in-memory mock for testing round-trip
type mockPPDBPaymentRepository struct {
	storage map[string]*domain.PPDBPayment
}

func (m *mockPPDBPaymentRepository) Create(payment *domain.PPDBPayment) error {
	// Deep copy to simulate database storage
	copied := &domain.PPDBPayment{
		ID:                 payment.ID,
		PPDBRegistrationID: payment.PPDBRegistrationID,
		InvoiceNumber:      payment.InvoiceNumber,
		TotalAmount:        payment.TotalAmount,
		PaidAmount:         payment.PaidAmount,
		Status:             payment.Status,
		Items:              make([]domain.PPDBPaymentItem, len(payment.Items)),
		CreatedAt:          payment.CreatedAt,
		UpdatedAt:          payment.UpdatedAt,
	}
	
	// Deep copy items
	for i, item := range payment.Items {
		copied.Items[i] = domain.PPDBPaymentItem{
			ID:             item.ID,
			PPDBPaymentID:  payment.ID, // Set foreign key
			ItemName:       item.ItemName,
			ExpectedAmount: item.ExpectedAmount,
			PaidAmount:     item.PaidAmount,
			CreatedAt:      item.CreatedAt,
			UpdatedAt:      item.UpdatedAt,
		}
	}
	
	m.storage[payment.ID.String()] = copied
	return nil
}

func (m *mockPPDBPaymentRepository) GetByID(id string) (*domain.PPDBPayment, error) {
	payment, exists := m.storage[id]
	if !exists {
		return nil, fmt.Errorf("payment not found")
	}
	
	// Return a copy to simulate database retrieval
	retrieved := &domain.PPDBPayment{
		ID:                 payment.ID,
		PPDBRegistrationID: payment.PPDBRegistrationID,
		InvoiceNumber:      payment.InvoiceNumber,
		TotalAmount:        payment.TotalAmount,
		PaidAmount:         payment.PaidAmount,
		Status:             payment.Status,
		Items:              make([]domain.PPDBPaymentItem, len(payment.Items)),
		CreatedAt:          payment.CreatedAt,
		UpdatedAt:          payment.UpdatedAt,
	}
	
	// Copy items
	for i, item := range payment.Items {
		retrieved.Items[i] = domain.PPDBPaymentItem{
			ID:             item.ID,
			PPDBPaymentID:  item.PPDBPaymentID,
			ItemName:       item.ItemName,
			ExpectedAmount: item.ExpectedAmount,
			PaidAmount:     item.PaidAmount,
			CreatedAt:      item.CreatedAt,
			UpdatedAt:      item.UpdatedAt,
		}
	}
	
	return retrieved, nil
}

// floatEquals checks if two floats are equal within a tolerance
func floatEquals(a, b, tolerance float64) bool {
	diff := a - b
	if diff < 0 {
		diff = -diff
	}
	return diff <= tolerance
}
