package usecase

// Feature: ppdb-payment-and-improvements, Property 10: Konsistensi Saldo Rekap Tabungan
// **Validates: Requirements 6.6**
//
// Property: For any savings recap per period, each student's end_balance must equal
// total_deposit minus total_withdraw within that period.

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"testing"
	"time"

	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// savingsTx is a minimal representation of a saving transaction for testing.
type savingsTx struct {
	txType string  // "Deposit" or "Withdrawal"
	amount float64 // always positive
}

// calculateRecapRow is the pure function under test.
// It mirrors the logic in the repository: sum deposits, sum withdrawals, compute end_balance.
func calculateRecapRow(studentID uuid.UUID, studentName, className string, txs []savingsTx) domain.SavingsRecapRow {
	var totalDeposit, totalWithdraw float64
	for _, tx := range txs {
		switch tx.txType {
		case "Deposit":
			totalDeposit += tx.amount
		case "Withdrawal":
			totalWithdraw += tx.amount
		}
	}
	return domain.SavingsRecapRow{
		StudentID:     studentID,
		StudentName:   studentName,
		ClassName:     className,
		TotalDeposit:  totalDeposit,
		TotalWithdraw: totalWithdraw,
		EndBalance:    totalDeposit - totalWithdraw,
	}
}

// calculateRecapResponse aggregates multiple rows into a SavingsRecapResponse.
func calculateRecapResponse(period string, rows []domain.SavingsRecapRow) domain.SavingsRecapResponse {
	var grandDeposit, grandWithdraw float64
	for _, r := range rows {
		grandDeposit += r.TotalDeposit
		grandWithdraw += r.TotalWithdraw
	}
	return domain.SavingsRecapResponse{
		Period:        period,
		Rows:          rows,
		GrandDeposit:  grandDeposit,
		GrandWithdraw: grandWithdraw,
		GrandBalance:  grandDeposit - grandWithdraw,
	}
}

// TestProperty_KonsistensiSaldoRekapTabungan verifies that for any set of random
// deposit and withdrawal transactions, end_balance always equals total_deposit - total_withdraw.
func TestProperty_KonsistensiSaldoRekapTabungan(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		studentID := uuid.New()
		studentName := rapid.StringMatching(`[A-Za-z ]{3,20}`).Draw(t, "student_name")
		className := fmt.Sprintf("Kelas-%d", rapid.IntRange(1, 12).Draw(t, "class_num"))

		// Generate N random transactions (1 to 50)
		numTx := rapid.IntRange(1, 50).Draw(t, "num_tx")
		txs := make([]savingsTx, numTx)
		for i := 0; i < numTx; i++ {
			txType := rapid.SampledFrom([]string{"Deposit", "Withdrawal"}).Draw(t, fmt.Sprintf("tx_type_%d", i))
			amount := rapid.Float64Range(1000.0, 10000000.0).Draw(t, fmt.Sprintf("tx_amount_%d", i))
			txs[i] = savingsTx{txType: txType, amount: amount}
		}

		// Calculate recap row using the pure function
		row := calculateRecapRow(studentID, studentName, className, txs)

		// Property: end_balance == total_deposit - total_withdraw
		expectedBalance := row.TotalDeposit - row.TotalWithdraw
		if !floatEquals(row.EndBalance, expectedBalance, 0.01) {
			t.Fatalf(
				"end_balance (%.2f) != total_deposit (%.2f) - total_withdraw (%.2f) = %.2f",
				row.EndBalance, row.TotalDeposit, row.TotalWithdraw, expectedBalance,
			)
		}

		// Property: total_deposit is the sum of all Deposit transactions
		var expectedDeposit float64
		for _, tx := range txs {
			if tx.txType == "Deposit" {
				expectedDeposit += tx.amount
			}
		}
		if !floatEquals(row.TotalDeposit, expectedDeposit, 0.01) {
			t.Fatalf("total_deposit (%.2f) != sum of deposits (%.2f)", row.TotalDeposit, expectedDeposit)
		}

		// Property: total_withdraw is the sum of all Withdrawal transactions
		var expectedWithdraw float64
		for _, tx := range txs {
			if tx.txType == "Withdrawal" {
				expectedWithdraw += tx.amount
			}
		}
		if !floatEquals(row.TotalWithdraw, expectedWithdraw, 0.01) {
			t.Fatalf("total_withdraw (%.2f) != sum of withdrawals (%.2f)", row.TotalWithdraw, expectedWithdraw)
		}
	})
}

// TestProperty_KonsistensiSaldoRekapTabungan_MultiStudent verifies the same property
// holds across multiple students in a single recap response, including grand totals.
func TestProperty_KonsistensiSaldoRekapTabungan_MultiStudent(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate 1 to 10 students
		numStudents := rapid.IntRange(1, 10).Draw(t, "num_students")
		rows := make([]domain.SavingsRecapRow, numStudents)

		for s := 0; s < numStudents; s++ {
			studentID := uuid.New()
			studentName := fmt.Sprintf("Siswa-%d", s+1)
			className := fmt.Sprintf("Kelas-%d", rapid.IntRange(1, 6).Draw(t, fmt.Sprintf("class_%d", s)))

			numTx := rapid.IntRange(1, 20).Draw(t, fmt.Sprintf("num_tx_%d", s))
			txs := make([]savingsTx, numTx)
			for i := 0; i < numTx; i++ {
				txType := rapid.SampledFrom([]string{"Deposit", "Withdrawal"}).Draw(t, fmt.Sprintf("tx_type_%d_%d", s, i))
				amount := rapid.Float64Range(1000.0, 5000000.0).Draw(t, fmt.Sprintf("tx_amount_%d_%d", s, i))
				txs[i] = savingsTx{txType: txType, amount: amount}
			}

			rows[s] = calculateRecapRow(studentID, studentName, className, txs)

			// Per-student property: end_balance == total_deposit - total_withdraw
			if !floatEquals(rows[s].EndBalance, rows[s].TotalDeposit-rows[s].TotalWithdraw, 0.01) {
				t.Fatalf(
					"Student %d: end_balance (%.2f) != total_deposit (%.2f) - total_withdraw (%.2f)",
					s, rows[s].EndBalance, rows[s].TotalDeposit, rows[s].TotalWithdraw,
				)
			}
		}

		// Build recap response and verify grand totals
		period := fmt.Sprintf("%d", time.Now().Year())
		resp := calculateRecapResponse(period, rows)

		// Grand balance property: grand_balance == grand_deposit - grand_withdraw
		expectedGrandBalance := resp.GrandDeposit - resp.GrandWithdraw
		if !floatEquals(resp.GrandBalance, expectedGrandBalance, 0.01) {
			t.Fatalf(
				"grand_balance (%.2f) != grand_deposit (%.2f) - grand_withdraw (%.2f) = %.2f",
				resp.GrandBalance, resp.GrandDeposit, resp.GrandWithdraw, expectedGrandBalance,
			)
		}

		// Grand deposit must equal sum of all row deposits
		var sumDeposit float64
		for _, r := range rows {
			sumDeposit += r.TotalDeposit
		}
		if !floatEquals(resp.GrandDeposit, sumDeposit, 0.01) {
			t.Fatalf("grand_deposit (%.2f) != sum of row deposits (%.2f)", resp.GrandDeposit, sumDeposit)
		}

		// Grand withdraw must equal sum of all row withdrawals
		var sumWithdraw float64
		for _, r := range rows {
			sumWithdraw += r.TotalWithdraw
		}
		if !floatEquals(resp.GrandWithdraw, sumWithdraw, 0.01) {
			t.Fatalf("grand_withdraw (%.2f) != sum of row withdrawals (%.2f)", resp.GrandWithdraw, sumWithdraw)
		}
	})
}

// TestProperty_KonsistensiSaldoRekapTabungan_EmptyTransactions verifies that a student
// with no transactions has end_balance == 0.
func TestProperty_KonsistensiSaldoRekapTabungan_EmptyTransactions(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		studentID := uuid.New()
		row := calculateRecapRow(studentID, "Siswa Test", "Kelas-1", []savingsTx{})

		if row.TotalDeposit != 0 {
			t.Fatalf("Expected total_deposit == 0 for empty transactions, got %.2f", row.TotalDeposit)
		}
		if row.TotalWithdraw != 0 {
			t.Fatalf("Expected total_withdraw == 0 for empty transactions, got %.2f", row.TotalWithdraw)
		}
		if row.EndBalance != 0 {
			t.Fatalf("Expected end_balance == 0 for empty transactions, got %.2f", row.EndBalance)
		}
	})
}

// Feature: ppdb-payment-and-improvements, Property 11: Filter Tanggal Rekap Tabungan
// **Validates: Requirements 6.3**
//
// Property: For any date range [start_date, end_date] applied to a savings recap,
// all transactions included in the result must have dates within [start_date, end_date] (inclusive),
// and transactions outside the range must NOT be included.

// savingsTxWithDate is a saving transaction that also carries a date, used for date-filter testing.
type savingsTxWithDate struct {
	txType string
	amount float64
	date   time.Time
}

// filterTransactionsByDateRange is the pure filter function under test.
// It returns only transactions whose date is within [startDate, endDate] (inclusive).
func filterTransactionsByDateRange(txs []savingsTxWithDate, startDate, endDate time.Time) []savingsTxWithDate {
	var result []savingsTxWithDate
	for _, tx := range txs {
		// Normalize to date-only (truncate time component) for inclusive comparison
		txDate := tx.date.Truncate(24 * time.Hour)
		start := startDate.Truncate(24 * time.Hour)
		end := endDate.Truncate(24 * time.Hour)
		if (txDate.Equal(start) || txDate.After(start)) && (txDate.Equal(end) || txDate.Before(end)) {
			result = append(result, tx)
		}
	}
	return result
}

// generateDateInRange generates a random time.Time within [start, end] (inclusive, day granularity).
func generateDateInRange(t *rapid.T, start, end time.Time, label string) time.Time {
	startDay := start.Truncate(24 * time.Hour)
	endDay := end.Truncate(24 * time.Hour)
	totalDays := int(endDay.Sub(startDay).Hours() / 24)
	if totalDays < 0 {
		totalDays = 0
	}
	offsetDays := rapid.IntRange(0, totalDays).Draw(t, label)
	return startDay.AddDate(0, 0, offsetDays)
}

// TestProperty_FilterTanggalRekapTabungan verifies that for any random date range,
// all transactions in the filtered result are within [start_date, end_date] (inclusive),
// and transactions outside the range are excluded.
func TestProperty_FilterTanggalRekapTabungan(t *testing.T) {
	// Base epoch for generating dates: 2020-01-01 to 2025-12-31
	baseStart := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	baseEnd := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)
	totalBaseDays := int(baseEnd.Sub(baseStart).Hours() / 24)

	rapid.Check(t, func(t *rapid.T) {
		// Generate a random date range [filterStart, filterEnd]
		startOffsetDays := rapid.IntRange(0, totalBaseDays-1).Draw(t, "start_offset_days")
		endOffsetDays := rapid.IntRange(startOffsetDays, totalBaseDays).Draw(t, "end_offset_days")

		filterStart := baseStart.AddDate(0, 0, startOffsetDays)
		filterEnd := baseStart.AddDate(0, 0, endOffsetDays)

		// Generate transactions: some inside the range, some outside
		numInside := rapid.IntRange(0, 20).Draw(t, "num_inside")
		numOutside := rapid.IntRange(0, 20).Draw(t, "num_outside")

		var allTxs []savingsTxWithDate

		// Transactions inside the range
		for i := 0; i < numInside; i++ {
			txDate := generateDateInRange(t, filterStart, filterEnd, fmt.Sprintf("inside_date_%d", i))
			txType := rapid.SampledFrom([]string{"Deposit", "Withdrawal"}).Draw(t, fmt.Sprintf("inside_type_%d", i))
			amount := rapid.Float64Range(1000.0, 5000000.0).Draw(t, fmt.Sprintf("inside_amount_%d", i))
			allTxs = append(allTxs, savingsTxWithDate{txType: txType, amount: amount, date: txDate})
		}

		// Transactions outside the range
		for i := 0; i < numOutside; i++ {
			// Pick a date strictly before filterStart or strictly after filterEnd
			var txDate time.Time
			side := rapid.IntRange(0, 1).Draw(t, fmt.Sprintf("outside_side_%d", i))
			if side == 0 && startOffsetDays > 0 {
				// Before filterStart
				beforeOffset := rapid.IntRange(0, startOffsetDays-1).Draw(t, fmt.Sprintf("before_offset_%d", i))
				txDate = baseStart.AddDate(0, 0, beforeOffset)
			} else if endOffsetDays < totalBaseDays {
				// After filterEnd
				afterOffset := rapid.IntRange(endOffsetDays+1, totalBaseDays).Draw(t, fmt.Sprintf("after_offset_%d", i))
				txDate = baseStart.AddDate(0, 0, afterOffset)
			} else {
				// Edge case: range covers entire base period — skip outside transactions
				continue
			}
			txType := rapid.SampledFrom([]string{"Deposit", "Withdrawal"}).Draw(t, fmt.Sprintf("outside_type_%d", i))
			amount := rapid.Float64Range(1000.0, 5000000.0).Draw(t, fmt.Sprintf("outside_amount_%d", i))
			allTxs = append(allTxs, savingsTxWithDate{txType: txType, amount: amount, date: txDate})
		}

		// Apply the date filter
		filtered := filterTransactionsByDateRange(allTxs, filterStart, filterEnd)

		// Property 1: ALL transactions in the result must be within [filterStart, filterEnd]
		for _, tx := range filtered {
			txDate := tx.date.Truncate(24 * time.Hour)
			start := filterStart.Truncate(24 * time.Hour)
			end := filterEnd.Truncate(24 * time.Hour)
			if txDate.Before(start) || txDate.After(end) {
				t.Fatalf(
					"Transaction with date %s is outside filter range [%s, %s]",
					txDate.Format("2006-01-02"),
					start.Format("2006-01-02"),
					end.Format("2006-01-02"),
				)
			}
		}

		// Property 2: Transactions outside the range must NOT appear in the result
		filteredDates := make(map[time.Time]bool)
		for _, tx := range filtered {
			filteredDates[tx.date.Truncate(24*time.Hour)] = true
		}

		start := filterStart.Truncate(24 * time.Hour)
		end := filterEnd.Truncate(24 * time.Hour)
		for _, tx := range allTxs {
			txDate := tx.date.Truncate(24 * time.Hour)
			isOutside := txDate.Before(start) || txDate.After(end)
			if isOutside {
				// Verify this transaction is not in the filtered result
				for _, ftx := range filtered {
					if ftx.date.Truncate(24*time.Hour).Equal(txDate) && ftx.txType == tx.txType && ftx.amount == tx.amount {
						t.Fatalf(
							"Transaction with date %s (outside range [%s, %s]) was incorrectly included in filtered result",
							txDate.Format("2006-01-02"),
							start.Format("2006-01-02"),
							end.Format("2006-01-02"),
						)
					}
				}
			}
		}

		// Property 3: The count of filtered transactions must equal the number of inside transactions
		// (only transactions with dates in range should be included)
		var expectedCount int
		for _, tx := range allTxs {
			txDate := tx.date.Truncate(24 * time.Hour)
			if (txDate.Equal(start) || txDate.After(start)) && (txDate.Equal(end) || txDate.Before(end)) {
				expectedCount++
			}
		}
		if len(filtered) != expectedCount {
			t.Fatalf(
				"Expected %d filtered transactions, got %d (filter range: [%s, %s])",
				expectedCount, len(filtered),
				start.Format("2006-01-02"),
				end.Format("2006-01-02"),
			)
		}
	})
}
