package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository"
	"ppi-100-sis/internal/repository/postgres"
	"github.com/google/uuid"
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

func (u *FinanceExtendedUsecase) GetAllSavingAccounts() ([]domain.SavingAccount, error) {
	return u.financeRepo.GetAllSavingAccounts()
}

func (u *FinanceExtendedUsecase) GetSavingTransactions(accountID uuid.UUID) ([]domain.SavingTransaction, error) {
	return u.financeRepo.GetSavingTransactions(accountID)
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

