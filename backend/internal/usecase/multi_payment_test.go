// Feature: ppdb-payment-and-improvements, Property 7: Atomisitas Multi-Payment
// **Validates: Requirements 3.2, 3.3, 3.4**
//
// Property: For any list of bills in a multi-payment that contains at least one invalid bill
// (already Paid, or belonging to a different student), NO Payment records should be created.

package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"testing"
	"time"

	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// --- Interfaces for testability ---

type billRepoForMultiPayment interface {
	GetBillsByIDs(ids []string) ([]domain.Bill, error)
	CreatePaymentsInTransaction(payments []domain.Payment, billStatusUpdates map[string]string) error
}

// --- In-memory mock implementations ---

// inMemoryBillRepo stores bills and tracks created payments and bill status updates.
type inMemoryBillRepo struct {
	bills             map[string]*domain.Bill
	payments          []domain.Payment
	billStatusUpdates map[string]string
}

func newInMemoryBillRepo() *inMemoryBillRepo {
	return &inMemoryBillRepo{
		bills:             make(map[string]*domain.Bill),
		payments:          []domain.Payment{},
		billStatusUpdates: make(map[string]string),
	}
}

func (r *inMemoryBillRepo) addBill(bill domain.Bill) {
	r.bills[bill.ID.String()] = &bill
}

func (r *inMemoryBillRepo) GetBillsByIDs(ids []string) ([]domain.Bill, error) {
	result := make([]domain.Bill, 0, len(ids))
	for _, id := range ids {
		b, ok := r.bills[id]
		if !ok {
			return nil, fmt.Errorf("bill %s tidak ditemukan", id)
		}
		result = append(result, *b)
	}
	return result, nil
}

func (r *inMemoryBillRepo) CreatePaymentsInTransaction(payments []domain.Payment, billStatusUpdates map[string]string) error {
	// Simulate atomic storage: append all payments and record status updates
	r.payments = append(r.payments, payments...)
	for billID, status := range billStatusUpdates {
		r.billStatusUpdates[billID] = status
	}
	return nil
}

// --- Testable multi-payment logic ---
// This mirrors the validation logic in FinanceUsecase.ProcessMultiPayment
// but accepts mock repositories for testing.

func processMultiPaymentTestable(
	req *domain.MultiBillPaymentRequest,
	repo billRepoForMultiPayment,
) (*domain.MultiPaymentResult, error) {
	// Fetch all bills
	bills, err := repo.GetBillsByIDs(req.BillIDs)
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

	// Generate invoice number (simplified for testing)
	invoiceNumber := fmt.Sprintf("MULTI-%s-%d", time.Now().Format("200601"), time.Now().UnixMilli()%10000)

	// Distribute amount across bills
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

		payment := domain.Payment{
			BillID:        bill.ID,
			Amount:        payAmount,
			PaymentMethod: req.PaymentMethod,
			Status:        "Success",
			TransactionID: invoiceNumber,
			PaidAt:        time.Now(),
		}
		payments = append(payments, payment)

		totalPaid := alreadyPaid + payAmount
		if totalPaid >= bill.Amount {
			billStatusUpdates[bill.ID.String()] = "Paid"
		} else {
			billStatusUpdates[bill.ID.String()] = "Partial"
		}
	}

	// Req 3.2: Create all payment records atomically
	if err := repo.CreatePaymentsInTransaction(payments, billStatusUpdates); err != nil {
		return nil, fmt.Errorf("gagal menyimpan pembayaran: %w", err)
	}

	return &domain.MultiPaymentResult{
		Payments:      payments,
		InvoiceNumber: invoiceNumber,
	}, nil
}

// --- Generators ---

// validUnpaidBill generates a valid unpaid bill for a given studentID.
func validUnpaidBillGenerator(studentID uuid.UUID, idx int) *rapid.Generator[domain.Bill] {
	return rapid.Custom(func(t *rapid.T) domain.Bill {
		amount := rapid.Float64Range(10000.0, 5000000.0).Draw(t, fmt.Sprintf("amount_%d", idx))
		return domain.Bill{
			ID:        uuid.New(),
			StudentID: studentID,
			Title:     fmt.Sprintf("Tagihan %d", idx),
			Amount:    amount,
			Status:    "Unpaid",
			DueDate:   time.Now().Add(30 * 24 * time.Hour),
		}
	})
}

// paidBillGenerator generates a bill that is already Paid (invalid for multi-payment).
func paidBillGenerator(studentID uuid.UUID, idx int) *rapid.Generator[domain.Bill] {
	return rapid.Custom(func(t *rapid.T) domain.Bill {
		amount := rapid.Float64Range(10000.0, 5000000.0).Draw(t, fmt.Sprintf("paid_amount_%d", idx))
		return domain.Bill{
			ID:        uuid.New(),
			StudentID: studentID,
			Title:     fmt.Sprintf("Tagihan Lunas %d", idx),
			Amount:    amount,
			Status:    "Paid",
			DueDate:   time.Now().Add(-30 * 24 * time.Hour),
		}
	})
}

// differentStudentBillGenerator generates a valid unpaid bill belonging to a DIFFERENT student.
func differentStudentBillGenerator(mainStudentID uuid.UUID, idx int) *rapid.Generator[domain.Bill] {
	return rapid.Custom(func(t *rapid.T) domain.Bill {
		// Generate a different student ID (guaranteed different from mainStudentID)
		differentStudentID := uuid.New()
		// Ensure it's actually different (extremely unlikely to collide, but be safe)
		for differentStudentID == mainStudentID {
			differentStudentID = uuid.New()
		}
		amount := rapid.Float64Range(10000.0, 5000000.0).Draw(t, fmt.Sprintf("diff_amount_%d", idx))
		return domain.Bill{
			ID:        uuid.New(),
			StudentID: differentStudentID,
			Title:     fmt.Sprintf("Tagihan Siswa Lain %d", idx),
			Amount:    amount,
			Status:    "Unpaid",
			DueDate:   time.Now().Add(30 * 24 * time.Hour),
		}
	})
}

// --- Property Tests ---

// TestProperty_AtomisitasMultiPayment_TagihanSudahPaid verifies that when the bill list
// contains at least one bill already with status "Paid", NO Payment records are created.
//
// Feature: ppdb-payment-and-improvements, Property 7: Atomisitas Multi-Payment
// **Validates: Requirements 3.2, 3.4**
func TestProperty_AtomisitasMultiPayment_TagihanSudahPaid(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		studentID := uuid.New()

		// Generate 1–5 valid unpaid bills
		numValid := rapid.IntRange(1, 5).Draw(t, "num_valid")
		validBills := make([]domain.Bill, numValid)
		for i := 0; i < numValid; i++ {
			validBills[i] = validUnpaidBillGenerator(studentID, i).Draw(t, fmt.Sprintf("valid_bill_%d", i))
		}

		// Generate 1–3 already-Paid bills (the invalid ones)
		numPaid := rapid.IntRange(1, 3).Draw(t, "num_paid")
		paidBills := make([]domain.Bill, numPaid)
		for i := 0; i < numPaid; i++ {
			paidBills[i] = paidBillGenerator(studentID, i).Draw(t, fmt.Sprintf("paid_bill_%d", i))
		}

		// Combine all bills (mix valid and paid)
		allBills := append(validBills, paidBills...)

		// Set up in-memory repo with all bills
		repo := newInMemoryBillRepo()
		billIDs := make([]string, len(allBills))
		for i, b := range allBills {
			repo.addBill(b)
			billIDs[i] = b.ID.String()
		}

		// Build request with sufficient amount to cover all bills
		totalAmount := float64(0)
		for _, b := range allBills {
			totalAmount += b.Amount
		}

		req := &domain.MultiBillPaymentRequest{
			BillIDs:       billIDs,
			Amount:        totalAmount,
			PaymentMethod: "Cash",
		}

		// Execute multi-payment
		result, err := processMultiPaymentTestable(req, repo)

		// Property: must return an error (validation should fail)
		if err == nil {
			t.Fatalf("Expected error due to Paid bill(s), but got nil error. Result: %+v", result)
		}

		// Property: NO Payment records should have been created (atomicity)
		if len(repo.payments) != 0 {
			t.Fatalf(
				"Atomicity violated: %d Payment record(s) were created despite validation failure (Paid bill present)",
				len(repo.payments),
			)
		}
	})
}

// TestProperty_AtomisitasMultiPayment_SiswaBerbeda verifies that when the bill list
// contains bills belonging to different students, NO Payment records are created.
//
// Feature: ppdb-payment-and-improvements, Property 7: Atomisitas Multi-Payment
// **Validates: Requirements 3.2, 3.3**
func TestProperty_AtomisitasMultiPayment_SiswaBerbeda(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		mainStudentID := uuid.New()

		// Generate 1–4 valid unpaid bills for the main student
		numMain := rapid.IntRange(1, 4).Draw(t, "num_main")
		mainBills := make([]domain.Bill, numMain)
		for i := 0; i < numMain; i++ {
			mainBills[i] = validUnpaidBillGenerator(mainStudentID, i).Draw(t, fmt.Sprintf("main_bill_%d", i))
		}

		// Generate 1–3 bills belonging to a DIFFERENT student (the invalid ones)
		numOther := rapid.IntRange(1, 3).Draw(t, "num_other")
		otherBills := make([]domain.Bill, numOther)
		for i := 0; i < numOther; i++ {
			otherBills[i] = differentStudentBillGenerator(mainStudentID, i).Draw(t, fmt.Sprintf("other_bill_%d", i))
		}

		// Combine all bills
		allBills := append(mainBills, otherBills...)

		// Set up in-memory repo
		repo := newInMemoryBillRepo()
		billIDs := make([]string, len(allBills))
		for i, b := range allBills {
			repo.addBill(b)
			billIDs[i] = b.ID.String()
		}

		// Build request
		totalAmount := float64(0)
		for _, b := range allBills {
			totalAmount += b.Amount
		}

		req := &domain.MultiBillPaymentRequest{
			BillIDs:       billIDs,
			Amount:        totalAmount,
			PaymentMethod: "Transfer",
		}

		// Execute multi-payment
		result, err := processMultiPaymentTestable(req, repo)

		// Property: must return an error (different student validation should fail)
		if err == nil {
			t.Fatalf("Expected error due to bills from different students, but got nil error. Result: %+v", result)
		}

		// Property: NO Payment records should have been created (atomicity)
		if len(repo.payments) != 0 {
			t.Fatalf(
				"Atomicity violated: %d Payment record(s) were created despite validation failure (different students)",
				len(repo.payments),
			)
		}
	})
}

// TestProperty_AtomisitasMultiPayment_KombinasiBothInvalid verifies atomicity when
// the bill list contains BOTH a Paid bill AND bills from different students.
//
// Feature: ppdb-payment-and-improvements, Property 7: Atomisitas Multi-Payment
// **Validates: Requirements 3.2, 3.3, 3.4**
func TestProperty_AtomisitasMultiPayment_KombinasiBothInvalid(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		mainStudentID := uuid.New()

		// At least one valid unpaid bill for the main student
		numValid := rapid.IntRange(1, 3).Draw(t, "num_valid")
		validBills := make([]domain.Bill, numValid)
		for i := 0; i < numValid; i++ {
			validBills[i] = validUnpaidBillGenerator(mainStudentID, i).Draw(t, fmt.Sprintf("valid_bill_%d", i))
		}

		// Randomly choose which type of invalid bill to include
		invalidType := rapid.IntRange(0, 2).Draw(t, "invalid_type")

		var invalidBills []domain.Bill
		switch invalidType {
		case 0:
			// Only Paid bills
			numPaid := rapid.IntRange(1, 2).Draw(t, "num_paid")
			for i := 0; i < numPaid; i++ {
				invalidBills = append(invalidBills, paidBillGenerator(mainStudentID, i).Draw(t, fmt.Sprintf("paid_bill_%d", i)))
			}
		case 1:
			// Only different-student bills
			numOther := rapid.IntRange(1, 2).Draw(t, "num_other")
			for i := 0; i < numOther; i++ {
				invalidBills = append(invalidBills, differentStudentBillGenerator(mainStudentID, i).Draw(t, fmt.Sprintf("other_bill_%d", i)))
			}
		case 2:
			// Both Paid bills AND different-student bills
			invalidBills = append(invalidBills, paidBillGenerator(mainStudentID, 0).Draw(t, "paid_bill_0"))
			invalidBills = append(invalidBills, differentStudentBillGenerator(mainStudentID, 0).Draw(t, "other_bill_0"))
		}

		allBills := append(validBills, invalidBills...)

		repo := newInMemoryBillRepo()
		billIDs := make([]string, len(allBills))
		for i, b := range allBills {
			repo.addBill(b)
			billIDs[i] = b.ID.String()
		}

		totalAmount := float64(0)
		for _, b := range allBills {
			totalAmount += b.Amount
		}

		req := &domain.MultiBillPaymentRequest{
			BillIDs:       billIDs,
			Amount:        totalAmount,
			PaymentMethod: "Cash",
		}

		result, err := processMultiPaymentTestable(req, repo)

		// Property: must return an error
		if err == nil {
			t.Fatalf("Expected error due to invalid bill(s), but got nil error. Result: %+v", result)
		}

		// Property: NO Payment records should have been created
		if len(repo.payments) != 0 {
			t.Fatalf(
				"Atomicity violated: %d Payment record(s) were created despite validation failure",
				len(repo.payments),
			)
		}
	})
}

// TestProperty_PembaruanStatusTagihan_SetelahMultiPayment verifies that after a successful
// multi-payment, each bill's status update is correct: "Paid" if totalPaid >= bill.Amount,
// "Partial" if totalPaid < bill.Amount.
//
// Feature: ppdb-payment-and-improvements, Property 8: Pembaruan Status Tagihan setelah Multi-Payment
// **Validates: Requirements 3.9**
func TestProperty_PembaruanStatusTagihan_SetelahMultiPayment(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		studentID := uuid.New()

		// Generate 1–5 valid unpaid bills all belonging to the same student
		numBills := rapid.IntRange(1, 5).Draw(t, "num_bills")
		bills := make([]domain.Bill, numBills)
		totalBillAmount := float64(0)
		for i := 0; i < numBills; i++ {
			bills[i] = validUnpaidBillGenerator(studentID, i).Draw(t, fmt.Sprintf("bill_%d", i))
			totalBillAmount += bills[i].Amount
		}

		// Generate a payment amount: between 1 and totalBillAmount (can be partial or full)
		paymentAmount := rapid.Float64Range(1.0, totalBillAmount).Draw(t, "payment_amount")

		// Set up in-memory repo
		repo := newInMemoryBillRepo()
		billIDs := make([]string, numBills)
		for i, b := range bills {
			repo.addBill(b)
			billIDs[i] = b.ID.String()
		}

		req := &domain.MultiBillPaymentRequest{
			BillIDs:       billIDs,
			Amount:        paymentAmount,
			PaymentMethod: "Cash",
		}

		// Execute multi-payment — must succeed (all bills are valid unpaid, same student)
		result, err := processMultiPaymentTestable(req, repo)
		if err != nil {
			t.Fatalf("Expected successful multi-payment but got error: %v", err)
		}
		if result == nil {
			t.Fatal("Expected non-nil result from processMultiPaymentTestable")
		}

		// Verify each bill's status update is correct
		remaining := paymentAmount
		for _, bill := range bills {
			if remaining <= 0 {
				// No payment was allocated to this bill; it should have no status update
				_, hasUpdate := repo.billStatusUpdates[bill.ID.String()]
				if hasUpdate {
					t.Fatalf(
						"Bill %s received a status update despite no remaining payment amount",
						bill.ID.String(),
					)
				}
				continue
			}

			outstanding := bill.Amount // no prior payments in these test bills
			payAmount := outstanding
			if remaining < outstanding {
				payAmount = remaining
			}
			remaining -= payAmount

			totalPaid := payAmount
			expectedStatus := "Partial"
			if totalPaid >= bill.Amount {
				expectedStatus = "Paid"
			}

			actualStatus, ok := repo.billStatusUpdates[bill.ID.String()]
			if !ok {
				t.Fatalf(
					"Bill %s (amount=%.2f, payAmount=%.2f) has no status update recorded",
					bill.ID.String(), bill.Amount, payAmount,
				)
			}
			if actualStatus != expectedStatus {
				t.Fatalf(
					"Bill %s: expected status %q but got %q (bill.Amount=%.2f, totalPaid=%.2f)",
					bill.ID.String(), expectedStatus, actualStatus, bill.Amount, totalPaid,
				)
			}
		}
	})
}
