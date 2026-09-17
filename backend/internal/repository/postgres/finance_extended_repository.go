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
	if err := r.db.Order("id ASC").Find(&years).Error; err != nil {
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

func (r *financeExtendedRepository) ProcessSavingTransaction(studentID, handledByID uuid.UUID, txnType string, amount float64, notes string, date ...time.Time) error {
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

		txnDate := time.Now()
		if len(date) > 0 && !date[0].IsZero() {
			txnDate = date[0]
		}

		txn := domain.SavingTransaction{
			AccountID:   account.ID,
			Type:        txnType,
			Amount:      amount,
			Date:        txnDate,
			HandledByID: handledByID,
			Notes:       notes,
		}

		return tx.Create(&txn).Error
	})
}

func (r *financeExtendedRepository) UpdateSavingTransaction(id uuid.UUID, amount float64, notes string, date ...time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var txn domain.SavingTransaction
		if err := tx.Where("id = ?", id).First(&txn).Error; err != nil {
			return err
		}

		var account domain.SavingAccount
		if err := tx.Where("id = ?", txn.AccountID).First(&account).Error; err != nil {
			return err
		}

		// Reverse old amount
		if txn.Type == "Deposit" {
			account.Balance -= txn.Amount
		} else {
			account.Balance += txn.Amount
		}

		// Apply new amount
		if txn.Type == "Deposit" {
			account.Balance += amount
		} else {
			if account.Balance < amount {
				return gorm.ErrInvalidData // Not enough balance
			}
			account.Balance -= amount
		}

		if err := tx.Save(&account).Error; err != nil {
			return err
		}

		updates := map[string]interface{}{
			"amount": amount,
			"notes":  notes,
		}
		if len(date) > 0 && !date[0].IsZero() {
			updates["date"] = date[0]
		}

		return tx.Model(&txn).Updates(updates).Error
	})
}

func (r *financeExtendedRepository) DeleteSavingTransaction(id uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var txn domain.SavingTransaction
		if err := tx.Where("id = ?", id).First(&txn).Error; err != nil {
			return err
		}

		var account domain.SavingAccount
		if err := tx.Where("id = ?", txn.AccountID).First(&account).Error; err != nil {
			return err
		}

		// Reverse the transaction amount from balance
		if txn.Type == "Deposit" {
			if account.Balance < txn.Amount {
				return fmt.Errorf("tidak dapat menghapus setoran: saldo tidak mencukupi untuk penarikan balik")
			}
			account.Balance -= txn.Amount
		} else {
			account.Balance += txn.Amount
		}

		if err := tx.Save(&account).Error; err != nil {
			return err
		}

		return tx.Delete(&txn).Error
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
	if req.InvoiceNumber == "" {
		prefix := "BK"
		if req.TransactionCodeID != nil && *req.TransactionCodeID > 0 {
			var tc domain.TransactionCode
			if err := r.db.Preload("ParentCode").First(&tc, *req.TransactionCodeID).Error; err == nil {
				if tc.ParentCode != nil && tc.ParentCode.Code != "" {
					prefix = tc.ParentCode.Code
				} else if tc.Code != "" {
					prefix = tc.Code
				}
			}
		}
		dateVal := req.Date
		if dateVal.IsZero() {
			dateVal = time.Now()
			req.Date = dateVal
		}
		ym := dateVal.Format("200601")
		var count int64
		pattern := fmt.Sprintf("%s-%s-%%", prefix, ym)
		r.db.Model(&domain.CashLedger{}).Where("invoice_number LIKE ?", pattern).Count(&count)
		req.InvoiceNumber = fmt.Sprintf("%s-%s-%04d", prefix, ym, count+1)
	}
	return r.db.Create(req).Error
}

func (r *financeExtendedRepository) GetCashLedger() ([]domain.CashLedger, error) {
	var entries []domain.CashLedger
	if err := r.db.Preload("Responsible").Preload("TransactionCode").Preload("TransactionCode.ParentCode").Order("date desc").Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *financeExtendedRepository) GetCashLedgerByID(id string) (*domain.CashLedger, error) {
	var entry domain.CashLedger
	if err := r.db.Preload("TransactionCode").Preload("TransactionCode.ParentCode").First(&entry, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *financeExtendedRepository) UpdateCashLedgerEntry(req *domain.CashLedger) error {
	updates := map[string]interface{}{
		"source":    req.Source,
		"item_name": req.ItemName,
		"type":      req.Type,
		"amount":    req.Amount,
		"category":  req.Category,
		"notes":     req.Notes,
	}
	if req.InvoiceNumber != "" {
		updates["invoice_number"] = req.InvoiceNumber
	}
	if req.TransactionCodeID != nil {
		updates["transaction_code_id"] = req.TransactionCodeID
	}
	return r.db.Model(&domain.CashLedger{}).Where("id = ?", req.ID).Updates(updates).Error
}

func (r *financeExtendedRepository) DeleteCashLedgerEntry(id string) error {
	return r.db.Delete(&domain.CashLedger{}, "id = ?", id).Error
}

func (r *financeExtendedRepository) AddDailyInfaqEntry(req *domain.DailyInfaq) error {
	return r.db.Create(req).Error
}

func (r *financeExtendedRepository) GetDailyInfaq() ([]domain.DailyInfaq, error) {
	var entries []domain.DailyInfaq
	if err := r.db.Preload("HandledBy").Preload("Responsible").Preload("TransactionCode").Order("date desc").Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *financeExtendedRepository) GetDailyInfaqByID(id string) (*domain.DailyInfaq, error) {
	var entry domain.DailyInfaq
	if err := r.db.Preload("TransactionCode").First(&entry, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *financeExtendedRepository) UpdateDailyInfaqEntry(req *domain.DailyInfaq) error {
	updates := map[string]interface{}{
		"source": req.Source,
		"amount": req.Amount,
		"notes":  req.Notes,
	}
	if req.TransactionCodeID != nil {
		updates["transaction_code_id"] = req.TransactionCodeID
	}
	return r.db.Model(&domain.DailyInfaq{}).Where("id = ?", req.ID).Updates(updates).Error
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
	r.db.Model(&domain.Student{}).Where("deleted_at IS NULL").Count(&totalStudents)
	analytics["total_students"] = totalStudents

	var totalTeachers int64
	r.db.Model(&domain.Teacher{}).Count(&totalTeachers)
	analytics["total_teachers"] = totalTeachers

	var totalClasses int64
	r.db.Model(&domain.Class{}).Count(&totalClasses)
	analytics["total_classes"] = totalClasses

	// Real SPP / Student Obligation Statistics
	var paidSpp int64
	var unpaidSpp int64
	var totalSppPaidNominal sql.NullFloat64
	var totalSppUnpaidNominal sql.NullFloat64

	r.db.Model(&domain.StudentObligation{}).Where("status = ?", "Paid").Count(&paidSpp)
	r.db.Model(&domain.StudentObligation{}).Where("status != ?", "Paid").Count(&unpaidSpp)
	r.db.Model(&domain.StudentObligation{}).Select("COALESCE(sum(paid_amount), 0)").Row().Scan(&totalSppPaidNominal)
	r.db.Model(&domain.StudentObligation{}).Where("status != ?", "Paid").Select("COALESCE(sum(amount - paid_amount), 0)").Row().Scan(&totalSppUnpaidNominal)

	if paidSpp == 0 && unpaidSpp == 0 {
		// Fallback to bills table if student_obligations table has no data
		r.db.Model(&domain.Bill{}).Where("status = ?", "Paid").Count(&paidSpp)
		r.db.Model(&domain.Bill{}).Where("status IN ?", []string{"Unpaid", "Partial", "Overdue"}).Count(&unpaidSpp)
	}

	analytics["paid_spp_count"] = paidSpp
	analytics["unpaid_spp_count"] = unpaidSpp
	analytics["total_spp_paid_nominal"] = totalSppPaidNominal.Float64
	analytics["total_spp_unpaid_nominal"] = totalSppUnpaidNominal.Float64
	analytics["total_school_receivables"] = totalSppUnpaidNominal.Float64

	// Savings Receivables (Total Balances)
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

	// 4. Savings Receivable / Piutang
	var receivableDebtRemaining sql.NullFloat64
	r.db.Model(&domain.SavingsReceivableWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&receivableDebtRemaining)
	analytics["total_receivable_debt"] = receivableDebtRemaining.Float64

	analytics["total_school_debt"] = externalDebtRemaining.Float64 + operationalDebtRemaining.Float64 + bkuDebtRemaining + receivableDebtRemaining.Float64

	// 5. Classes Summary with Student List and Obligation Breakdown
	var classes []domain.Class
	r.db.Preload("HomeroomTeacher.User").Order("name ASC").Find(&classes)

	type studentBrief struct {
		ID                 string  `json:"id"`
		Name               string  `json:"name"`
		NISN               string  `json:"nisn"`
		Status             string  `json:"status"`
		PaidCount          int64   `json:"paid_count"`
		UnpaidCount        int64   `json:"unpaid_count"`
		TotalPaidNominal   float64 `json:"total_paid_nominal"`
		TotalUnpaidNominal float64 `json:"total_unpaid_nominal"`
	}

	type classSummary struct {
		ClassID            uint           `json:"class_id"`
		ClassName          string         `json:"class_name"`
		HomeroomTeacher    string         `json:"homeroom_teacher"`
		StudentCount       int            `json:"student_count"`
		PaidCount          int64          `json:"paid_count"`
		UnpaidCount        int64          `json:"unpaid_count"`
		TotalPaidNominal   float64        `json:"total_paid_nominal"`
		TotalUnpaidNominal float64        `json:"total_unpaid_nominal"`
		CollectionRate     float64        `json:"collection_rate"`
		Students           []studentBrief `json:"students"`
	}

	var classesSummaryList []classSummary
	for _, c := range classes {
		teacherName := "-"
		if c.HomeroomTeacher != nil && c.HomeroomTeacher.User.Name != "" {
			teacherName = c.HomeroomTeacher.User.Name
		}

		var rawStudents []struct {
			ID     uuid.UUID
			NISN   string
			Status string
			Name   string
		}
		r.db.Table("students s").
			Select("s.id, s.nisn, s.status, u.name").
			Joins("JOIN users u ON s.user_id = u.id").
			Where("s.class_id = ? AND s.deleted_at IS NULL", c.ID).
			Order("u.name ASC").
			Scan(&rawStudents)

		var classPaidCount int64
		var classUnpaidCount int64
		var classPaidNominal float64
		var classUnpaidNominal float64
		var studentBriefs []studentBrief

		for _, st := range rawStudents {
			var spPaidCount int64
			var spUnpaidCount int64
			var spPaidNominal sql.NullFloat64
			var spUnpaidNominal sql.NullFloat64

			r.db.Model(&domain.StudentObligation{}).Where("student_id = ? AND status = 'Paid'", st.ID).Count(&spPaidCount)
			r.db.Model(&domain.StudentObligation{}).Where("student_id = ? AND status != 'Paid'", st.ID).Count(&spUnpaidCount)
			r.db.Model(&domain.StudentObligation{}).Where("student_id = ?", st.ID).Select("COALESCE(sum(paid_amount), 0)").Row().Scan(&spPaidNominal)
			r.db.Model(&domain.StudentObligation{}).Where("student_id = ? AND status != 'Paid'", st.ID).Select("COALESCE(sum(amount - paid_amount), 0)").Row().Scan(&spUnpaidNominal)

			classPaidCount += spPaidCount
			classUnpaidCount += spUnpaidCount
			classPaidNominal += spPaidNominal.Float64
			classUnpaidNominal += spUnpaidNominal.Float64

			studentBriefs = append(studentBriefs, studentBrief{
				ID:                 st.ID.String(),
				Name:               st.Name,
				NISN:               st.NISN,
				Status:             st.Status,
				PaidCount:          spPaidCount,
				UnpaidCount:        spUnpaidCount,
				TotalPaidNominal:   spPaidNominal.Float64,
				TotalUnpaidNominal: spUnpaidNominal.Float64,
			})
		}

		collectionRate := 0.0
		totalTarget := classPaidNominal + classUnpaidNominal
		if totalTarget > 0 {
			collectionRate = (classPaidNominal / totalTarget) * 100
		}

		classesSummaryList = append(classesSummaryList, classSummary{
			ClassID:            c.ID,
			ClassName:          c.Name,
			HomeroomTeacher:    teacherName,
			StudentCount:       len(rawStudents),
			PaidCount:          classPaidCount,
			UnpaidCount:        classUnpaidCount,
			TotalPaidNominal:   classPaidNominal,
			TotalUnpaidNominal: classUnpaidNominal,
			CollectionRate:     collectionRate,
			Students:           studentBriefs,
		})
	}
	analytics["classes_summary"] = classesSummaryList

	// 6. Activities Summary (Kegiatan Siswa)
	var activities []domain.Activity
	r.db.Order("start_date DESC").Find(&activities)

	type activityDetailDTO struct {
		ID             string    `json:"id"`
		Name           string    `json:"name"`
		Description    string    `json:"description"`
		Status         string    `json:"status"`
		TargetAmount   float64   `json:"target_amount"`
		StartDate      time.Time `json:"start_date"`
		EndDate        time.Time `json:"end_date"`
		Participants   int64     `json:"participants"`
		TotalTarget    float64   `json:"total_target"`
		TotalCollected float64   `json:"total_collected"`
		TotalExpense   float64   `json:"total_expense"`
		Balance        float64   `json:"balance"`
		CollectionRate float64   `json:"collection_rate"`
	}

	var activeActivitiesList []activityDetailDTO
	var allActivitiesList []activityDetailDTO

	for _, act := range activities {
		var obStats struct {
			Participants   int64   `gorm:"column:participants"`
			TotalTarget    float64 `gorm:"column:total_target"`
			TotalCollected float64 `gorm:"column:total_collected"`
		}
		r.db.Table("activity_obligations").
			Where("activity_id = ?", act.ID).
			Select("count(*) as participants, COALESCE(sum(amount), 0) as total_target, COALESCE(sum(paid_amount), 0) as total_collected").
			Scan(&obStats)

		var actExpense sql.NullFloat64
		r.db.Table("activity_transactions").
			Where("activity_id = ? AND transaction_type = 'Expense'", act.ID).
			Select("COALESCE(sum(amount), 0)").Row().Scan(&actExpense)

		rate := 0.0
		if obStats.TotalTarget > 0 {
			rate = (obStats.TotalCollected / obStats.TotalTarget) * 100
		}

		item := activityDetailDTO{
			ID:             act.ID.String(),
			Name:           act.Name,
			Description:    act.Description,
			Status:         act.Status,
			TargetAmount:   act.TargetAmount,
			StartDate:      act.StartDate,
			EndDate:        act.EndDate,
			Participants:   obStats.Participants,
			TotalTarget:    obStats.TotalTarget,
			TotalCollected: obStats.TotalCollected,
			TotalExpense:   actExpense.Float64,
			Balance:        obStats.TotalCollected - actExpense.Float64,
			CollectionRate: rate,
		}

		allActivitiesList = append(allActivitiesList, item)
		if act.Status == "Active" {
			activeActivitiesList = append(activeActivitiesList, item)
		}
	}

	analytics["activities_summary"] = map[string]interface{}{
		"active_count": len(activeActivitiesList),
		"total_count":  len(allActivitiesList),
		"active_list":  activeActivitiesList,
		"all_list":     allActivitiesList,
	}

	// 7. Cash Ledger (BKU) Summary
	var totalCashIncome sql.NullFloat64
	var totalCashExpense sql.NullFloat64
	r.db.Model(&domain.CashLedger{}).Where("type = 'Income'").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalCashIncome)
	r.db.Model(&domain.CashLedger{}).Where("type = 'Expense'").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalCashExpense)

	var recentLedgers []domain.CashLedger
	r.db.Preload("TransactionCode").Order("date DESC").Limit(6).Find(&recentLedgers)

	analytics["cash_ledger"] = map[string]interface{}{
		"total_income":        totalCashIncome.Float64,
		"total_expense":       totalCashExpense.Float64,
		"current_balance":     totalCashIncome.Float64 - totalCashExpense.Float64,
		"recent_transactions": recentLedgers,
	}

	// 8. RKAS Summary
	var rkasPlannedPenerimaan sql.NullFloat64
	var rkasRealizedPenerimaan sql.NullFloat64
	var rkasPlannedPengeluaran sql.NullFloat64
	var rkasRealizedPengeluaran sql.NullFloat64

	r.db.Model(&domain.Budget{}).Where("budget_type = 'Penerimaan'").Select("COALESCE(sum(planned_amount), 0)").Row().Scan(&rkasPlannedPenerimaan)
	r.db.Model(&domain.Budget{}).Where("budget_type = 'Penerimaan'").Select("COALESCE(sum(realized_amount), 0)").Row().Scan(&rkasRealizedPenerimaan)
	r.db.Model(&domain.Budget{}).Where("budget_type = 'Pengeluaran'").Select("COALESCE(sum(planned_amount), 0)").Row().Scan(&rkasPlannedPengeluaran)
	r.db.Model(&domain.Budget{}).Where("budget_type = 'Pengeluaran'").Select("COALESCE(sum(realized_amount), 0)").Row().Scan(&rkasRealizedPengeluaran)

	serapanPct := 0.0
	if rkasPlannedPengeluaran.Float64 > 0 {
		serapanPct = (rkasRealizedPengeluaran.Float64 / rkasPlannedPengeluaran.Float64) * 100
	}

	analytics["rkas_summary"] = map[string]interface{}{
		"planned_penerimaan":      rkasPlannedPenerimaan.Float64,
		"realized_penerimaan":     rkasRealizedPenerimaan.Float64,
		"planned_pengeluaran":     rkasPlannedPengeluaran.Float64,
		"realized_pengeluaran":    rkasRealizedPengeluaran.Float64,
		"serapan_pengeluaran_pct": serapanPct,
	}

	// 9. Monthly Cash Flow Trend
	type monthlyRow struct {
		Month   string  `json:"month"`
		Income  float64 `json:"income"`
		Expense float64 `json:"expense"`
	}
	var monthlyResults []monthlyRow
	r.db.Raw(`
		SELECT 
			TO_CHAR(date, 'YYYY-MM') as month,
			COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as income,
			COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as expense
		FROM cash_ledgers
		GROUP BY TO_CHAR(date, 'YYYY-MM')
		ORDER BY month ASC
		LIMIT 12
	`).Scan(&monthlyResults)
	analytics["monthly_trend"] = monthlyResults

	// 10. Savings Detailed Summary
	var totalSavingsAccountsCount int64
	r.db.Model(&domain.SavingAccount{}).Count(&totalSavingsAccountsCount)

	var totalDepositNominal sql.NullFloat64
	r.db.Model(&domain.SavingTransaction{}).Where("LOWER(type) = 'deposit'").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalDepositNominal)

	var totalWithdrawalNominal sql.NullFloat64
	r.db.Model(&domain.SavingTransaction{}).Where("LOWER(type) = 'withdrawal'").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalWithdrawalNominal)

	type classSavingsSummary struct {
		ClassName     string  `json:"class_name"`
		AccountsCount int64   `json:"accounts_count"`
		TotalBalance  float64 `json:"total_balance"`
	}
	var classSavingsList []classSavingsSummary
	r.db.Raw(`
		SELECT c.name as class_name, count(sa.id) as accounts_count, COALESCE(sum(sa.balance), 0) as total_balance
		FROM classes c
		JOIN students s ON s.class_id = c.id
		JOIN saving_accounts sa ON sa.student_id = s.id
		GROUP BY c.id, c.name
		ORDER BY total_balance DESC
	`).Scan(&classSavingsList)

	type recentSavingTxDTO struct {
		ID          string    `json:"id"`
		StudentName string    `json:"student_name"`
		ClassName   string    `json:"class_name"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		Date        time.Time `json:"date"`
	}
	var recentSavingTxList []recentSavingTxDTO
	r.db.Raw(`
		SELECT st.id::text, u.name as student_name, c.name as class_name, st.type, st.amount, st.date
		FROM saving_transactions st
		JOIN saving_accounts sa ON st.account_id = sa.id
		JOIN students s ON sa.student_id = s.id
		JOIN users u ON s.user_id = u.id
		JOIN classes c ON s.class_id = c.id
		ORDER BY st.date DESC
		LIMIT 6
	`).Scan(&recentSavingTxList)

	analytics["savings_summary"] = map[string]interface{}{
		"total_accounts":      totalSavingsAccountsCount,
		"total_balance":       totalSavings.Float64,
		"total_deposits":      totalDepositNominal.Float64,
		"total_withdrawals":   totalWithdrawalNominal.Float64,
		"operational_debt":    operationalDebtRemaining.Float64,
		"receivable_debt":     receivableDebtRemaining.Float64,
		"available_cash":      totalSavings.Float64 - operationalDebtRemaining.Float64 - receivableDebtRemaining.Float64,
		"classes_breakdown":   classSavingsList,
		"recent_transactions": recentSavingTxList,
	}

	return analytics, nil
}

// ------------------- Savings Operational (Pool-level) -------------------

func (r *financeExtendedRepository) WithdrawSavingsOperational(handledByID uuid.UUID, amount float64, purpose string, unitID uint) error {
	// Check total pool balance first
	var totalBalance sql.NullFloat64
	r.db.Model(&domain.SavingAccount{}).Select("COALESCE(sum(balance), 0)").Row().Scan(&totalBalance)

	// Get total outstanding operational withdrawals
	var totalOpWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsOperationalWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&totalOpWithdrawn)

	// Get total outstanding receivable/piutang withdrawals
	var totalRecWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsReceivableWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&totalRecWithdrawn)

	available := totalBalance.Float64 - totalOpWithdrawn.Float64 - totalRecWithdrawn.Float64
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

	// Operational stats
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

	// Receivable / Piutang stats
	var totalRecWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsReceivableWithdrawal{}).
		Select("COALESCE(sum(amount), 0)").Row().Scan(&totalRecWithdrawn)
	summary["total_receivable_withdrawn"] = totalRecWithdrawn.Float64

	var totalRecReturned sql.NullFloat64
	r.db.Model(&domain.SavingsReceivableWithdrawal{}).
		Select("COALESCE(sum(returned_amount), 0)").Row().Scan(&totalRecReturned)
	summary["total_receivable_returned"] = totalRecReturned.Float64

	outstandingReceivable := totalRecWithdrawn.Float64 - totalRecReturned.Float64
	summary["outstanding_receivable"] = outstandingReceivable

	// Available = total pool - operational outstanding - piutang outstanding
	summary["available_balance"] = totalBalance.Float64 - outstandingDebt - outstandingReceivable

	return summary, nil
}

// ------------------- Savings Recap -------------------

func (r *financeExtendedRepository) GetSavingsRecap(params domain.SavingsRecapParams) (*domain.SavingsRecapResponse, error) {
	// Determine date range and period label
	var startDate, endDate time.Time
	var periodLabel string

	monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

	switch params.PeriodType {
	case "daily":
		startDate = time.Date(params.StartDate.Year(), params.StartDate.Month(), params.StartDate.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(params.StartDate.Year(), params.StartDate.Month(), params.StartDate.Day(), 23, 59, 59, 0, time.UTC)
		periodLabel = fmt.Sprintf("Harian: %02d %s %d", startDate.Day(), monthNames[int(startDate.Month())], startDate.Year())
	case "monthly":
		startDate = time.Date(params.Year, time.January, 1, 0, 0, 0, 0, time.UTC)
		endDate = time.Date(params.Year, time.December, 31, 23, 59, 59, 0, time.UTC)
		periodLabel = fmt.Sprintf("Tahun %d (Per Bulan)", params.Year)
	case "range":
		startDate = params.StartDate
		endDate = params.EndDate
		periodLabel = fmt.Sprintf("%02d %s %d s/d %02d %s %d", 
			startDate.Day(), monthNames[int(startDate.Month())][:3], startDate.Year(),
			endDate.Day(), monthNames[int(endDate.Month())][:3], endDate.Year())
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

// ------------------- Savings Receivable / Piutang (Pool-level) -------------------

func (r *financeExtendedRepository) WithdrawSavingsReceivable(handledByID uuid.UUID, amount float64, purpose string, description string, borrowerName string, borrowerID string, dueDate time.Time, returnMethod string, unitID uint) error {
	// Check total pool balance first
	var totalBalance sql.NullFloat64
	r.db.Model(&domain.SavingAccount{}).Select("COALESCE(sum(balance), 0)").Row().Scan(&totalBalance)

	// Get total outstanding operational withdrawals
	var totalOpWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsOperationalWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&totalOpWithdrawn)

	// Get total outstanding receivable withdrawals
	var totalRecWithdrawn sql.NullFloat64
	r.db.Model(&domain.SavingsReceivableWithdrawal{}).
		Where("status IN ?", []string{"Outstanding", "PartialReturn"}).
		Select("COALESCE(sum(amount - returned_amount), 0)").Row().Scan(&totalRecWithdrawn)

	available := totalBalance.Float64 - totalOpWithdrawn.Float64 - totalRecWithdrawn.Float64
	if amount > available {
		return gorm.ErrInvalidData
	}

	withdrawal := domain.SavingsReceivableWithdrawal{
		Amount:       amount,
		Purpose:      purpose,
		Description:  description,
		BorrowerName: borrowerName,
		BorrowerID:   borrowerID,
		DueDate:      dueDate,
		ReturnMethod: returnMethod,
		Status:       "Outstanding",
		HandledByID:  handledByID,
		UnitID:       unitID,
	}
	return r.db.Create(&withdrawal).Error
}

func (r *financeExtendedRepository) ReturnSavingsReceivable(withdrawalID uuid.UUID, handledByID uuid.UUID, amount float64, notes string, unitID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var withdrawal domain.SavingsReceivableWithdrawal
		if err := tx.Where("id = ?", withdrawalID).First(&withdrawal).Error; err != nil {
			return err
		}

		remaining := withdrawal.Amount - withdrawal.ReturnedAmount
		if amount > remaining {
			return gorm.ErrInvalidData
		}

		ret := domain.SavingsReceivableReturn{
			WithdrawalID: withdrawalID,
			Amount:       amount,
			Notes:        notes,
			HandledByID:  handledByID,
			UnitID:       unitID,
		}
		if err := tx.Create(&ret).Error; err != nil {
			return err
		}

		withdrawal.ReturnedAmount += amount
		if withdrawal.ReturnedAmount >= withdrawal.Amount {
			withdrawal.Status = "Returned"
		} else {
			withdrawal.Status = "PartialReturn"
		}
		return tx.Save(&withdrawal).Error
	})
}

func (r *financeExtendedRepository) GetSavingsReceivableHistory() ([]domain.SavingsReceivableWithdrawal, error) {
	var withdrawals []domain.SavingsReceivableWithdrawal
	if err := r.db.Preload("HandledBy").Preload("Returns").Preload("Returns.HandledBy").Order("created_at desc").Find(&withdrawals).Error; err != nil {
		return nil, err
	}
	return withdrawals, nil
}

func (r *financeExtendedRepository) GetSavingsReceivableReturns(withdrawalID uuid.UUID) ([]domain.SavingsReceivableReturn, error) {
	var returns []domain.SavingsReceivableReturn
	if err := r.db.Preload("HandledBy").Where("withdrawal_id = ?", withdrawalID).Order("created_at desc").Find(&returns).Error; err != nil {
		return nil, err
	}
	return returns, nil
}
