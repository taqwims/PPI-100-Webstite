package repository

import (
	"ppi-100-sis/internal/domain"
	"github.com/google/uuid"
)

type FinanceExtendedRepository interface {
	CreateAcademicYear(year *domain.AcademicYear) error
	GetAllAcademicYears() ([]domain.AcademicYear, error)

	ProcessSavingTransaction(studentID, handledByID uuid.UUID, txnType string, amount float64, notes string) error
	GetStudentSavingAccount(studentID uuid.UUID) (*domain.SavingAccount, error)
	GetAllSavingAccounts() ([]domain.SavingAccount, error)
	GetSavingTransactions(accountID uuid.UUID) ([]domain.SavingTransaction, error)

	CreatePayroll(req *domain.Payroll) error
	GetPayrolls(monthYear string) ([]domain.Payroll, error)

	AddCashLedgerEntry(req *domain.CashLedger) error
	GetCashLedger() ([]domain.CashLedger, error)
	UpdateCashLedgerEntry(req *domain.CashLedger) error
	DeleteCashLedgerEntry(id string) error

	AddDailyInfaqEntry(req *domain.DailyInfaq) error
	GetDailyInfaq() ([]domain.DailyInfaq, error)
	UpdateDailyInfaqEntry(req *domain.DailyInfaq) error
	DeleteDailyInfaqEntry(id string) error

	UpdatePayroll(req *domain.Payroll) error
	DeletePayroll(id string) error

	GetDashboardAnalytics() (map[string]interface{}, error)
}
