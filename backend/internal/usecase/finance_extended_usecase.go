package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository"
	"time"

	"github.com/google/uuid"
)

type FinanceExtendedUsecase struct {
	financeRepo repository.FinanceExtendedRepository
}

func NewFinanceExtendedUsecase(financeRepo repository.FinanceExtendedRepository) *FinanceExtendedUsecase {
	return &FinanceExtendedUsecase{financeRepo: financeRepo}
}

// ------------------- Academic Year -------------------

func (u *FinanceExtendedUsecase) CreateAcademicYear(req *domain.AcademicYear) error {
	// If active, we might need to deactivate others before saving
	return u.financeRepo.CreateAcademicYear(req)
}

func (u *FinanceExtendedUsecase) GetAllAcademicYears() ([]domain.AcademicYear, error) {
	return u.financeRepo.GetAllAcademicYears()
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

func (u *FinanceExtendedUsecase) CreatePayroll(req *domain.Payroll) error {
	req.PaymentDate = time.Now()
	return u.financeRepo.CreatePayroll(req)
}

func (u *FinanceExtendedUsecase) GetPayrolls(monthYear string) ([]domain.Payroll, error) {
	return u.financeRepo.GetPayrolls(monthYear)
}

func (u *FinanceExtendedUsecase) UpdatePayroll(req *domain.Payroll) error {
	req.Total = req.BasicSalary + req.Allowances - req.Deductions
	return u.financeRepo.UpdatePayroll(req)
}

func (u *FinanceExtendedUsecase) DeletePayroll(id string) error {
	return u.financeRepo.DeletePayroll(id)
}

// ------------------- Cash Ledger & Daily Infaq -------------------

func (u *FinanceExtendedUsecase) AddCashLedgerEntry(req *domain.CashLedger) error {
	return u.financeRepo.AddCashLedgerEntry(req)
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
	return u.financeRepo.AddDailyInfaqEntry(req)
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

