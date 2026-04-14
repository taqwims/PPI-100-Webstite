package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository"
	"ppi-100-sis/internal/repository/postgres"
	"github.com/google/uuid"
	"time"
)

type FinanceExtendedUsecase struct {
	financeRepo repository.FinanceExtendedRepository
	budgetRepo  *postgres.BudgetRepository
}

func NewFinanceExtendedUsecase(financeRepo repository.FinanceExtendedRepository, budgetRepo *postgres.BudgetRepository) *FinanceExtendedUsecase {
	return &FinanceExtendedUsecase{financeRepo: financeRepo, budgetRepo: budgetRepo}
}

// ------------------- Academic Year -------------------

func (u *FinanceExtendedUsecase) CreateAcademicYear(req *domain.AcademicYear) error {
	// If active, we might need to deactivate others before saving
	return u.financeRepo.CreateAcademicYear(req)
}

func (u *FinanceExtendedUsecase) GetAllAcademicYears() ([]domain.AcademicYear, error) {
	return u.financeRepo.GetAllAcademicYears()
}

func (u *FinanceExtendedUsecase) UpdateAcademicYear(year *domain.AcademicYear) error {
	return u.financeRepo.UpdateAcademicYear(year)
}

func (u *FinanceExtendedUsecase) DeleteAcademicYear(id uint) error {
	return u.financeRepo.DeleteAcademicYear(id)
}

func (u *FinanceExtendedUsecase) SetActiveAcademicYear(id uint) error {
	return u.financeRepo.SetActiveAcademicYear(id)
}

// ------------------- Savings -------------------

func (u *FinanceExtendedUsecase) ProcessSavingTransaction(studentID, handledByID uuid.UUID, txnType string, amount float64, notes string) error {
	return u.financeRepo.ProcessSavingTransaction(studentID, handledByID, txnType, amount, notes)
}

func (u *FinanceExtendedUsecase) GetStudentSavingAccount(studentID uuid.UUID) (*domain.SavingAccount, error) {
	return u.financeRepo.GetStudentSavingAccount(studentID)
}

func (u *FinanceExtendedUsecase) GetAllSavingAccounts(classID *uint) ([]domain.SavingAccount, error) {
	return u.financeRepo.GetAllSavingAccounts(classID)
}

func (u *FinanceExtendedUsecase) GetSavingTransactions(accountID uuid.UUID) ([]domain.SavingTransaction, error) {
	return u.financeRepo.GetSavingTransactions(accountID)
}

func (u *FinanceExtendedUsecase) TransferSavings(studentID uuid.UUID, handledByID uuid.UUID, module string, direction string, amount float64, notes string) error {
	return u.financeRepo.TransferSavings(studentID, handledByID, module, direction, amount, notes)
}

// ------------------- Payroll -------------------

func (u *FinanceExtendedUsecase) GetSavingAccountByUserID(userID uuid.UUID) (*domain.SavingAccount, error) {
	return u.financeRepo.GetSavingAccountByUserID(userID)
}

func (u *FinanceExtendedUsecase) GetSavingAccountsByParentID(parentID uuid.UUID) ([]domain.SavingAccount, error) {
	return u.financeRepo.GetSavingAccountsByParentID(parentID)
}


// ------------------- Cash Ledger & Daily Infaq -------------------

func (u *FinanceExtendedUsecase) AddCashLedgerEntry(req *domain.CashLedger) error {
	if err := u.financeRepo.AddCashLedgerEntry(req); err != nil {
		return err
	}
	// Auto-realize RKAS if transaction code is linked to a budget
	if req.TransactionCodeID != nil && *req.TransactionCodeID > 0 {
		_ = u.budgetRepo.AddRealizationByTransactionCodeID(*req.TransactionCodeID, req.Amount)
	}
	return nil
}

func (u *FinanceExtendedUsecase) GetCashLedger() ([]domain.CashLedger, error) {
	return u.financeRepo.GetCashLedger()
}

func (u *FinanceExtendedUsecase) UpdateCashLedgerEntry(req *domain.CashLedger) error {
	return u.financeRepo.UpdateCashLedgerEntry(req)
}

func (u *FinanceExtendedUsecase) DeleteCashLedgerEntry(id string) error {
	return u.financeRepo.DeleteCashLedgerEntry(id)
}

func (u *FinanceExtendedUsecase) AddDailyInfaqEntry(req *domain.DailyInfaq) error {
	if err := u.financeRepo.AddDailyInfaqEntry(req); err != nil {
		return err
	}
	// Auto-realize RKAS if transaction code is linked to a budget
	if req.TransactionCodeID != nil && *req.TransactionCodeID > 0 {
		_ = u.budgetRepo.AddRealizationByTransactionCodeID(*req.TransactionCodeID, req.Amount)
	}
	return nil
}

func (u *FinanceExtendedUsecase) GetDailyInfaq() ([]domain.DailyInfaq, error) {
	return u.financeRepo.GetDailyInfaq()
}

func (u *FinanceExtendedUsecase) UpdateDailyInfaqEntry(req *domain.DailyInfaq) error {
	return u.financeRepo.UpdateDailyInfaqEntry(req)
}

func (u *FinanceExtendedUsecase) DeleteDailyInfaqEntry(id string) error {
	return u.financeRepo.DeleteDailyInfaqEntry(id)
}

// ------------------- Analytics Dashboard -------------------

func (u *FinanceExtendedUsecase) GetDashboardAnalytics() (map[string]interface{}, error) {
	return u.financeRepo.GetDashboardAnalytics()
}

// ------------------- Savings Operational -------------------

func (u *FinanceExtendedUsecase) WithdrawSavingsOperational(handledByID uuid.UUID, amount float64, purpose string) error {
	err := u.financeRepo.WithdrawSavingsOperational(handledByID, amount, purpose)
	if err == nil {
		// Auto-sync to CashLedger: Withdrawing from savings means Kas Umum receives funds (Income)
		entry := &domain.CashLedger{
			Date:     time.Now(),
			Source:   "Mutasi Tabungan",
			ItemName: "Penarikan Dana Operasional Tabungan - " + purpose,
			Type:     "Income",
			Amount:   amount,
			Category: "Mutasi Tabungan",
			Notes:    "Otomatis dari modul Tabungan",
		}
		_ = u.financeRepo.AddCashLedgerEntry(entry)
	}
	return err
}

func (u *FinanceExtendedUsecase) ReturnSavingsOperational(withdrawalID uuid.UUID, handledByID uuid.UUID, amount float64, notes string) error {
	err := u.financeRepo.ReturnSavingsOperational(withdrawalID, handledByID, amount, notes)
	if err == nil {
		// Auto-sync to CashLedger: Returning to savings means Kas Umum spends funds (Expense)
		entry := &domain.CashLedger{
			Date:     time.Now(),
			Source:   "Mutasi Tabungan",
			ItemName: "Pengembalian Dana Operasional Tabungan",
			Type:     "Expense",
			Amount:   amount,
			Category: "Mutasi Tabungan",
			Notes:    notes,
		}
		_ = u.financeRepo.AddCashLedgerEntry(entry)
	}
	return err
}

func (u *FinanceExtendedUsecase) GetSavingsOperationalHistory() ([]domain.SavingsOperationalWithdrawal, error) {
	return u.financeRepo.GetSavingsOperationalHistory()
}

func (u *FinanceExtendedUsecase) GetSavingsOperationalReturns(withdrawalID uuid.UUID) ([]domain.SavingsOperationalReturn, error) {
	return u.financeRepo.GetSavingsOperationalReturns(withdrawalID)
}

func (u *FinanceExtendedUsecase) GetSavingsPoolSummary() (map[string]interface{}, error) {
	return u.financeRepo.GetSavingsPoolSummary()
}

func (u *FinanceExtendedUsecase) GetSavingsRecap(params domain.SavingsRecapParams) (*domain.SavingsRecapResponse, error) {
	return u.financeRepo.GetSavingsRecap(params)
}

