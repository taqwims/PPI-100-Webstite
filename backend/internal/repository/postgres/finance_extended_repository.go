package postgres

import (
	"database/sql"
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

func (r *financeExtendedRepository) GetAllSavingAccounts() ([]domain.SavingAccount, error) {
	var accounts []domain.SavingAccount
	if err := r.db.Preload("Student").Preload("Student.User").Preload("Student.Class").Order("updated_at desc").Find(&accounts).Error; err != nil {
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

	// SPP Statistics (Simplified)
	var paidSpp int64
	r.db.Model(&domain.Bill{}).Where("bill_type = ? AND status = ?", "SPP", "Paid").Count(&paidSpp)
	analytics["paid_spp_count"] = paidSpp

	var unpaidSpp int64
	r.db.Model(&domain.Bill{}).Where("bill_type = ? AND status = ?", "SPP", "Unpaid").Count(&unpaidSpp)
	analytics["unpaid_spp_count"] = unpaidSpp

	// Savings Receivables (Total Balances) — use NullFloat64 to handle empty table
	var totalSavings sql.NullFloat64
	r.db.Model(&domain.SavingAccount{}).Select("COALESCE(sum(balance), 0)").Row().Scan(&totalSavings)
	analytics["total_student_savings"] = totalSavings.Float64

	// Cash Ledger Hutang (Debt to third parties) — use NullFloat64 to handle empty table
	var totalDebt sql.NullFloat64
	r.db.Model(&domain.CashLedger{}).Where("category = ? AND type = ?", "Hutang", "Income").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalDebt)

	var totalDebtPaid sql.NullFloat64
	r.db.Model(&domain.CashLedger{}).Where("category = ? AND type = ?", "Hutang", "Expense").Select("COALESCE(sum(amount), 0)").Row().Scan(&totalDebtPaid)

	analytics["total_school_debt"] = totalDebt.Float64 - totalDebtPaid.Float64

	return analytics, nil
}

// ------------------- Savings Operational (Pool-level) -------------------

func (r *financeExtendedRepository) WithdrawSavingsOperational(handledByID uuid.UUID, amount float64, purpose string) error {
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
	}
	return r.db.Create(&withdrawal).Error
}

func (r *financeExtendedRepository) ReturnSavingsOperational(withdrawalID uuid.UUID, handledByID uuid.UUID, amount float64, notes string) error {
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
			Notes:        notes,
			HandledByID:  handledByID,
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

