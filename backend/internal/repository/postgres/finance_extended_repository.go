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

// ------------------- Payroll -------------------

func (r *financeExtendedRepository) CreatePayroll(req *domain.Payroll) error {
	return r.db.Create(req).Error
}

func (r *financeExtendedRepository) GetPayrolls(monthYear string) ([]domain.Payroll, error) {
	var payrolls []domain.Payroll
	query := r.db.Preload("User").Preload("ProcessedBy")
	if monthYear != "" {
		query = query.Where("month_year = ?", monthYear)
	}
	if err := query.Order("created_at desc").Find(&payrolls).Error; err != nil {
		return nil, err
	}
	return payrolls, nil
}

// ------------------- Cash Ledger & Daily Infaq -------------------

func (r *financeExtendedRepository) AddCashLedgerEntry(req *domain.CashLedger) error {
	return r.db.Create(req).Error
}

func (r *financeExtendedRepository) GetCashLedger() ([]domain.CashLedger, error) {
	var entries []domain.CashLedger
	if err := r.db.Order("date desc").Find(&entries).Error; err != nil {
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
	if err := r.db.Preload("HandledBy").Order("date desc").Find(&entries).Error; err != nil {
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

func (r *financeExtendedRepository) UpdatePayroll(req *domain.Payroll) error {
	return r.db.Model(&domain.Payroll{}).Where("id = ?", req.ID).Updates(map[string]interface{}{
		"user_id":      req.UserID,
		"month_year":   req.MonthYear,
		"basic_salary": req.BasicSalary,
		"allowances":   req.Allowances,
		"deductions":   req.Deductions,
		"total":        req.Total,
		"status":       req.Status,
	}).Error
}

func (r *financeExtendedRepository) DeletePayroll(id string) error {
	return r.db.Delete(&domain.Payroll{}, "id = ?", id).Error
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
