package postgres

import (
	"database/sql"
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type financeExtendedRepository struct {
	db *gorm.DB
}

func NewFinanceExtendedRepository(db *gorm.DB) repository.FinanceExtendedRepository {
	return &financeExtendedRepository{db: db}
}

// ------------------- Academic Year -------------------

func (r *financeExtendedRepository) CreateAcademicYear(year *domain.AcademicYear) error {
	if year.IsActive {
		r.db.Model(&domain.AcademicYear{}).Where("is_active = ?", true).Update("is_active", false)
	}
	return r.db.Create(year).Error
}

func (r *financeExtendedRepository) GetAllAcademicYears() ([]domain.AcademicYear, error) {
	var years []domain.AcademicYear
	if err := r.db.Order("start_date desc").Find(&years).Error; err != nil {
		return nil, err
	}
	return years, nil
}

func (r *financeExtendedRepository) UpdateAcademicYear(year *domain.AcademicYear) error {
	return r.db.Save(year).Error
}

func (r *financeExtendedRepository) DeleteAcademicYear(id uint) error {
	return r.db.Delete(&domain.AcademicYear{}, id).Error
}

func (r *financeExtendedRepository) SetActiveAcademicYear(id uint) error {
	// Deactivate all first
	r.db.Model(&domain.AcademicYear{}).Where("is_active = ?", true).Update("is_active", false)
	// Activate the specified one
	return r.db.Model(&domain.AcademicYear{}).Where("id = ?", id).Update("is_active", true).Error
}

func (r *financeExtendedRepository) GetAcademicYearByID(id uint) (*domain.AcademicYear, error) {
	var year domain.AcademicYear
	if err := r.db.Where("id = ?", id).First(&year).Error; err != nil {
		return nil, err
	}
	return &year, nil
}

// RolloverAcademicYear copies all unpaid/partial student obligations from the old year to the new year
// as "Tunggakan" (arrears). Only the remaining unpaid amount is carried over.
func (r *financeExtendedRepository) RolloverAcademicYear(fromYearID, toYearID uint) (int, error) {
	var unpaidObligations []domain.StudentObligation
	if err := r.db.
		Preload("PaymentType").
		Where("academic_year_id = ? AND status IN ?", fromYearID, []string{"Unpaid", "Partial"}).
		Find(&unpaidObligations).Error; err != nil {
		return 0, err
	}

	if len(unpaidObligations) == 0 {
		return 0, nil
	}

	var newObligations []domain.StudentObligation
	now := time.Now()
	dueDate := now.AddDate(0, 1, 0)

	for _, ob := range unpaidObligations {
		remaining := ob.Amount - ob.PaidAmount
		if remaining <= 0 {
			continue
		}

		newOb := domain.StudentObligation{
			StudentID:      ob.StudentID,
			PaymentTypeID:  ob.PaymentTypeID,
			AcademicYearID: toYearID,
			Amount:         remaining,
			PaidAmount:     0,
			Status:         "Unpaid",
			BillingMonth:   ob.BillingMonth,
			DueDate:        &dueDate,
			Notes:          fmt.Sprintf("Tunggakan dari tahun ajaran sebelumnya (sisa: Rp %.0f)", remaining),
		}
		newObligations = append(newObligations, newOb)
	}

	if len(newObligations) == 0 {
		return 0, nil
	}

	if err := r.db.Create(&newObligations).Error; err != nil {
		return 0, err
	}

	return len(newObligations), nil
}

// ------------------- Savings -------------------

func (r *financeExtendedRepository) ProcessSavingTransaction(studentID, handledByID uuid.UUID, txnType string, amount float64, notes string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var account domain.SavingAccount
		err := tx.Where("student_id = ?", studentID).First(&account).Error

		if err == gorm.ErrRecordNotFound {
			// Create new account if not exists
			account = domain.SavingAccount{
				StudentID: studentID,
				Balance:   0,
			}
			if err := tx.Create(&account).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		}

		if txnType == "Deposit" {
			account.Balance += amount
		} else if txnType == "Withdrawal" {
			if account.Balance < amount {
				return gorm.ErrInvalidData // Not enough balance
			}
			account.Balance -= amount
		}

		if err := tx.Save(&account).Error; err != nil {
			return err
		}

		txn := domain.SavingTransaction{
			AccountID:   account.ID,
			Type:        txnType,
			Amount:      amount,
			Date:        time.Now(),
			HandledByID: handledByID,
			Notes:       notes,
		}

		return tx.Create(&txn).Error
	})
}

func (r *financeExtendedRepository) GetStudentSavingAccount(studentID uuid.UUID) (*domain.SavingAccount, error) {
	var account domain.SavingAccount
	if err := r.db.Preload("Student").Where("student_id = ?", studentID).First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *financeExtendedRepository) TransferSavings(studentID, handledByID uuid.UUID, module string, direction string, amount float64, notes string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var account domain.SavingAccount
		if err := tx.Where("student_id = ?", studentID).First(&account).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				account = domain.SavingAccount{StudentID: studentID, Balance: 0}
				if err := tx.Create(&account).Error; err != nil { return err }
			} else {
				return err
			}
		}

		// Saving side
		txnType := "Deposit"
		if direction == "FromSaving" {
			txnType = "Withdrawal"
			if account.Balance < amount {
				return gorm.ErrInvalidData // Not enough balance
			}
			account.Balance -= amount
		} else {
			account.Balance += amount
		}

		if err := tx.Save(&account).Error; err != nil { return err }
		savingTxn := domain.SavingTransaction{
			AccountID: account.ID, Type: txnType, Amount: amount,
			Date: time.Now(), HandledByID: handledByID, Notes: notes + " (" + module + ")",
		}
		if err := tx.Create(&savingTxn).Error; err != nil { return err }

		// Module side
		var student domain.Student
		if err := tx.Preload("User").Where("id = ?", studentID).First(&student).Error; err == nil && student.User.Name != "" {
			notes = notes + " - " + student.User.Name
		}

		if module == "CashLedger" {
			ledgerType := "Expense"
			if direction == "FromSaving" { ledgerType = "Income" }
			entry := domain.CashLedger{
				Date: time.Now(), Type: ledgerType, Amount: amount,
				Source: "Pindah Dana Tabungan", ItemName: notes,
				Category: "Transfer", CreatedBy: handledByID, Notes: notes,
			}
			if err := tx.Create(&entry).Error; err != nil { return err }
		} else if module == "Infaq" {
			if direction == "FromSaving" {
				entry := domain.DailyInfaq{
					Date: time.Now(), Amount: amount, Source: "Pindah Dana Tabungan",
					HandledByID: handledByID, Notes: notes,
				}
				if err := tx.Create(&entry).Error; err != nil { return err }
			}
		}

		return nil
	})
}


// ------------------- Cash Ledger & Daily Infaq -------------------

func (r *financeExtendedRepository) AddCashLedgerEntry(req *domain.CashLedger) error {
	return r.db.Create(req).Error
}

func (r *financeExtendedRepository) GetCashLedger() ([]domain.CashLedger, error) {
	var entries []domain.CashLedger
	if err := r.db.Preload("Responsible").Order("date desc").Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *financeExtendedRepository) UpdateCashLedgerEntry(req *domain.CashLedger) error {
	return r.db.Model(&domain.CashLedger{}).Where("id = ?", req.ID).Updates(map[string]interface{}{
		"source":    req.Source,
		"item_name": req.ItemName,
		"type":      req.Type,
		"amount":    req.Amount,
		"category":  req.Category,
		"notes":     req.Notes,
	}).Error
}

func (r *financeExtendedRepository) DeleteCashLedgerEntry(id string) error {
	return r.db.Delete(&domain.CashLedger{}, "id = ?", id).Error
}

func (r *financeExtendedRepository) AddDailyInfaqEntry(req *domain.DailyInfaq) error {
	return r.db.Create(req).Error
}

func (r *financeExtendedRepository) GetDailyInfaq() ([]domain.DailyInfaq, error) {
	var entries []domain.DailyInfaq
	if err := r.db.Preload("HandledBy").Preload("Responsible").Order("date desc").Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *financeExtendedRepository) UpdateDailyInfaqEntry(req *domain.DailyInfaq) error {
	return r.db.Model(&domain.DailyInfaq{}).Where("id = ?", req.ID).Updates(map[string]interface{}{
		"source": req.Source,
		"amount": req.Amount,
		"notes":  req.Notes,
	}).Error
}

func (r *financeExtendedRepository) DeleteDailyInfaqEntry(id string) error {
	return r.db.Delete(&domain.DailyInfaq{}, "id = ?", id).Error
}


// ------------------- Savings (Extended) -------------------

func (r *financeExtendedRepository) GetAllSavingAccounts(classID *uint) ([]domain.SavingAccount, error) {
	var accounts []domain.SavingAccount
	query := r.db.Preload("Student").Preload("Student.User").Preload("Student.Class")
	if classID != nil {
		query = query.Select("saving_accounts.*").Joins("JOIN students ON students.id = saving_accounts.student_id").
			Where("students.class_id = ?", *classID)
	}
	if err := query.Order("saving_accounts.updated_at desc").Find(&accounts).Error; err != nil {
		return nil, err
	}
	return accounts, nil
}

func (r *financeExtendedRepository) GetSavingTransactions(accountID uuid.UUID) ([]domain.SavingTransaction, error) {
	var txns []domain.SavingTransaction
	if err := r.db.Preload("HandledBy").Where("account_id = ?", accountID).Order("date desc").Find(&txns).Error; err != nil {
		return nil, err
	}
	return txns, nil
}

func (r *financeExtendedRepository) GetSavingAccountByUserID(userID uuid.UUID) (*domain.SavingAccount, error) {
	// Find student by user ID first
	var student domain.Student
	if err := r.db.Where("user_id = ?", userID).First(&student).Error; err != nil {
		return nil, err
	}

	var account domain.SavingAccount
	if err := r.db.Preload("Student").Preload("Student.User").Preload("Student.Class").
		Where("student_id = ?", student.ID).First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *financeExtendedRepository) GetSavingAccountsByParentID(userID uuid.UUID) ([]domain.SavingAccount, error) {
	// First, find the Parent record from the user ID
	var parent domain.Parent
	if err := r.db.Where("user_id = ?", userID).First(&parent).Error; err != nil {
		return nil, err
	}

	// Find all students belonging to this parent (using Parent table ID)
	var students []domain.Student
	if err := r.db.Where("parent_id = ?", parent.ID).Find(&students).Error; err != nil {
		return nil, err
	}

	if len(students) == 0 {
		return []domain.SavingAccount{}, nil
	}

	var studentIDs []uuid.UUID
	for _, s := range students {
		studentIDs = append(studentIDs, s.ID)
	}

	var accounts []domain.SavingAccount
	if err := r.db.Preload("Student").Preload("Student.User").Preload("Student.Class").
		Where("student_id IN ?", studentIDs).Find(&accounts).Error; err != nil {
		return nil, err
	}
	return accounts, nil
}

// ------------------- Analytics Dashboard -------------------

func (r *financeExtendedRepository) GetDashboardAnalytics() (map[string]interface{}, error) {
	analytics := make(map[string]interface{})

	var totalStudents int64
	r.db.Model(&domain.Student{}).Count(&totalStudents)
	analytics["total_students"] = totalStudents

	var totalTeachers int64
	r.db.Model(&domain.Teacher{}).Count(&totalTeachers)
	analytics["total_teachers"] = totalTeachers

	// SPP Statistics
	var paidSpp int64
	r.db.Model(&domain.Bill{}).Where("bill_type = ? AND status = ?", "SPP", "Paid").Count(&paidSpp)
	analytics["paid_spp_count"] = paidSpp

	var unpaidSpp int64
	r.db.Model(&domain.Bill{}).Where("bill_type = ? AND status IN ?", "SPP", []string{"Unpaid", "Partial", "Overdue"}).Count(&unpaidSpp)
	analytics["unpaid_spp_count"] = unpaidSpp

	// PIUTANG NOMINAL (Total Unpaid Bills)
	var totalUnpaidBills sql.NullFloat64
	r.db.Table("bills b").
		Joins("LEFT JOIN (SELECT bill_id, sum(amount) as total_paid FROM payments WHERE status = 'Success' GROUP BY bill_id) p ON b.id = p.bill_id").
		Where("b.status != ?", "Paid").
		Select("COALESCE(sum(b.amount - COALESCE(p.total_paid, 0)), 0)").
		Row().Scan(&totalUnpaidBills)
	analytics["total_school_receivables"] = totalUnpaidBills.Float64

	// Savings Receivables (Total Balances) — use NullFloat64 to handle empty table
	var totalSavings sql.NullFloat64
	r.db.Model(&domain.SavingAccount{}).Select("COALESCE(sum(balance), 0)").Row().Scan(&totalSavings)
	analytics["total_student_savings"] = totalSavings.Float64

	// 1. External Debt (Catatan Hutang)
	var externalDebtRemaining sql.NullFloat64
	r.db.Model(&domain.ExternalDebt{}).Select("COALESCE(sum(amount - paid_amount), 0)").Row().Scan(&externalDebtRemaining)

	// 2. Savings Operational (Tabungan Operasional)
	var operationalDebtRemaining sql.NullFloat64
	r.db.Model(&domain.SavingsOperationalWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&operationalDebtRemaining)

	// 3. Cash Ledger Hutang (BKU) - Avoid double counting external debt payments
	var totalDebtIncome sql.NullFloat64
	r.db.Model(&domain.CashLedger{}).Where("category = ? AND type = ?", "Hutang", "Income").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalDebtIncome)

	var totalDebtExpense sql.NullFloat64
	r.db.Model(&domain.CashLedger{}).Where("category = ? AND type = ?", "Hutang", "Expense").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalDebtExpense)

	var externalDebtPaidKas sql.NullFloat64
	r.db.Model(&domain.ExternalDebtPayment{}).Where("fund_source = ?", "Kas Umum").Select("COALESCE(sum(amount), 0)").Row().Scan(&externalDebtPaidKas)

	bkuDebtRemaining := totalDebtIncome.Float64 - (totalDebtExpense.Float64 - externalDebtPaidKas.Float64)
	if bkuDebtRemaining < 0 {
		bkuDebtRemaining = 0
	}

	analytics["total_school_debt"] = externalDebtRemaining.Float64 + operationalDebtRemaining.Float64 + bkuDebtRemaining

	return analytics, nil
}

// ------------------- Savings Operational (Pool-level) -------------------

func (r *financeExtendedRepository) WithdrawSavingsOperational(handledByID uuid.UUID, amount float64, purpose string, unitID uint) error {
	// Check total pool balance first
	var totalBalance sql.NullFloat64
	r.db.Model(&domain.SavingAccount{}).Select("COALESCE(sum(balance), 0)").Row().Scan(&totalBalance)

	// Get total outstanding withdrawals
	var totalWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsOperationalWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&totalWithdrawn)

	available := totalBalance.Float64 - totalWithdrawn.Float64
	if amount > available {
		return gorm.ErrInvalidData // Not enough available funds
	}

	withdrawal := domain.SavingsOperationalWithdrawal{
		Amount:      amount,
		Purpose:     purpose,
		Status:      "Outstanding",
		HandledByID: handledByID,
		UnitID:      unitID,
	}
	return r.db.Create(&withdrawal).Error
}

func (r *financeExtendedRepository) ReturnSavingsOperational(withdrawalID uuid.UUID, handledByID uuid.UUID, amount float64, notes string, source string, unitID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var withdrawal domain.SavingsOperationalWithdrawal
		if err := tx.Where("id = ?", withdrawalID).First(&withdrawal).Error; err != nil {
			return err
		}

		remaining := withdrawal.Amount - withdrawal.ReturnedAmount
		if amount > remaining {
			return gorm.ErrInvalidData // Cannot return more than outstanding
		}

		// Record the return
		ret := domain.SavingsOperationalReturn{
			WithdrawalID: withdrawalID,
			Amount:       amount,
			ReturnSource: source,
			Notes:        notes,
			HandledByID:  handledByID,
			UnitID:       unitID,
		}
		if err := tx.Create(&ret).Error; err != nil {
			return err
		}

		// Update withdrawal
		withdrawal.ReturnedAmount += amount
		if withdrawal.ReturnedAmount >= withdrawal.Amount {
			withdrawal.Status = "Returned"
		} else {
			withdrawal.Status = "PartialReturn"
		}
		return tx.Save(&withdrawal).Error
	})
}

func (r *financeExtendedRepository) GetSavingsOperationalHistory() ([]domain.SavingsOperationalWithdrawal, error) {
	var withdrawals []domain.SavingsOperationalWithdrawal
	if err := r.db.Preload("HandledBy").Order("created_at desc").Find(&withdrawals).Error; err != nil {
		return nil, err
	}
	return withdrawals, nil
}

func (r *financeExtendedRepository) GetSavingsOperationalReturns(withdrawalID uuid.UUID) ([]domain.SavingsOperationalReturn, error) {
	var returns []domain.SavingsOperationalReturn
	if err := r.db.Preload("HandledBy").Where("withdrawal_id = ?", withdrawalID).Order("created_at desc").Find(&returns).Error; err != nil {
		return nil, err
	}
	return returns, nil
}

func (r *financeExtendedRepository) GetSavingsPoolSummary() (map[string]interface{}, error) {
	summary := make(map[string]interface{})

	var totalBalance sql.NullFloat64
	r.db.Model(&domain.SavingAccount{}).Select("COALESCE(sum(balance), 0)").Row().Scan(&totalBalance)
	summary["total_balance"] = totalBalance.Float64

	var totalWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsOperationalWithdrawal{}).
		Select("COALESCE(sum(amount), 0)").Row().Scan(&totalWithdrawn)
	summary["total_withdrawn"] = totalWithdrawn.Float64

	var totalReturned sql.NullFloat64
	r.db.Model(&domain.SavingsOperationalWithdrawal{}).
		Select("COALESCE(sum(returned_amount), 0)").Row().Scan(&totalReturned)
	summary["total_returned"] = totalReturned.Float64

	outstandingDebt := totalWithdrawn.Float64 - totalReturned.Float64
	summary["outstanding_debt"] = outstandingDebt
	summary["available_balance"] = totalBalance.Float64 - outstandingDebt

	return summary, nil
}

// ------------------- Savings Recap -------------------

func (r *financeExtendedRepository) GetSavingsRecap(params domain.SavingsRecapParams) (*domain.SavingsRecapResponse, error) {
	// Determine date range and period label
	var startDate, endDate time.Time
	var periodLabel string

	switch params.PeriodType {
	case "daily":
		startDate = time.Date(params.StartDate.Year(), params.StartDate.Month(), params.StartDate.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(params.StartDate.Year(), params.StartDate.Month(), params.StartDate.Day(), 23, 59, 59, 0, time.UTC)
		periodLabel = fmt.Sprintf("Harian: %s", startDate.Format("02 Januari 2006"))
	case "monthly":
		startDate = time.Date(params.Year, time.January, 1, 0, 0, 0, 0, time.UTC)
		endDate = time.Date(params.Year, time.December, 31, 23, 59, 59, 0, time.UTC)
		periodLabel = fmt.Sprintf("Tahun %d (Per Bulan)", params.Year)
	case "range":
		startDate = params.StartDate
		endDate = params.EndDate
		periodLabel = fmt.Sprintf("%s s/d %s", startDate.Format("02 Jan 2006"), endDate.Format("02 Jan 2006"))
	case "semester":
		if params.Semester == 1 {
			// Semester 1 = Juli–Desember
			startDate = time.Date(params.Year, time.July, 1, 0, 0, 0, 0, time.UTC)
			endDate = time.Date(params.Year, time.December, 31, 23, 59, 59, 0, time.UTC)
			periodLabel = fmt.Sprintf("Semester 1 (Juli–Desember %d)", params.Year)
		} else {
			// Semester 2 = Januari–Juni
			startDate = time.Date(params.Year, time.January, 1, 0, 0, 0, 0, time.UTC)
			endDate = time.Date(params.Year, time.June, 30, 23, 59, 59, 0, time.UTC)
			periodLabel = fmt.Sprintf("Semester 2 (Januari–Juni %d)", params.Year)
		}
	case "yearly":
		startDate = time.Date(params.Year, time.January, 1, 0, 0, 0, 0, time.UTC)
		endDate = time.Date(params.Year, time.December, 31, 23, 59, 59, 0, time.UTC)
		periodLabel = fmt.Sprintf("Tahun %d", params.Year)
	default:
		return nil, fmt.Errorf("period_type tidak valid: %s", params.PeriodType)
	}

	type recapRow struct {
		StudentID     string  `gorm:"column:student_id"`
		StudentName   string  `gorm:"column:student_name"`
		ClassName     string  `gorm:"column:class_name"`
		TotalDeposit  float64 `gorm:"column:total_deposit"`
		TotalWithdraw float64 `gorm:"column:total_withdraw"`
		EndBalance    float64 `gorm:"column:end_balance"`
	}

	query := r.db.Table("saving_transactions st").
		Select(`
			sa.student_id::text AS student_id,
			u.name AS student_name,
			c.name AS class_name,
			COALESCE(SUM(CASE WHEN st.type = 'Deposit' THEN st.amount ELSE 0 END), 0) AS total_deposit,
			COALESCE(SUM(CASE WHEN st.type = 'Withdrawal' THEN st.amount ELSE 0 END), 0) AS total_withdraw,
			MAX(sa.balance) AS end_balance
		`).
		Joins("JOIN saving_accounts sa ON sa.id = st.account_id").
		Joins("JOIN students s ON s.id = sa.student_id").
		Joins("JOIN users u ON u.id = s.user_id").
		Joins("JOIN classes c ON c.id = s.class_id").
		Where("st.date >= ? AND st.date <= ?", startDate, endDate).
		Group("sa.student_id, u.name, c.name, sa.balance").
		Order("c.name, u.name")

	if params.ClassID != nil {
		query = query.Where("s.class_id = ?", *params.ClassID)
	}

	var rows []recapRow
	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}

	recapRows := make([]domain.SavingsRecapRow, 0, len(rows))
	var grandDeposit, grandWithdraw float64

	for _, row := range rows {
		studentUUID, _ := uuid.Parse(row.StudentID)
		recapRows = append(recapRows, domain.SavingsRecapRow{
			StudentID:     studentUUID,
			StudentName:   row.StudentName,
			ClassName:     row.ClassName,
			TotalDeposit:  row.TotalDeposit,
			TotalWithdraw: row.TotalWithdraw,
			EndBalance:    row.EndBalance,
		})
		grandDeposit += row.TotalDeposit
		grandWithdraw += row.TotalWithdraw
	}

	return &domain.SavingsRecapResponse{
		Period:        periodLabel,
		Rows:          recapRows,
		GrandDeposit:  grandDeposit,
		GrandWithdraw: grandWithdraw,
		GrandBalance:  grandDeposit - grandWithdraw,
	}, nil
}

