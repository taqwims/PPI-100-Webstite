package repository

import (
	"ppi-100-sis/internal/domain"
	"github.com/google/uuid"
)

type FinanceExtendedRepository interface {
	CreateAcademicYear(year *domain.AcademicYear) error
	GetAllAcademicYears() ([]domain.AcademicYear, error)
	UpdateAcademicYear(year *domain.AcademicYear) error
	DeleteAcademicYear(id uint) error
	SetActiveAcademicYear(id uint) error
	GetAcademicYearByID(id uint) (*domain.AcademicYear, error)
	RolloverAcademicYear(fromYearID, toYearID uint) (int, error)
	TransferSavings(studentID, handledByID uuid.UUID, module string, direction string, amount float64, notes string) error


	ProcessSavingTransaction(studentID, handledByID uuid.UUID, txnType string, amount float64, notes string) error
	GetStudentSavingAccount(studentID uuid.UUID) (*domain.SavingAccount, error)
	GetAllSavingAccounts(classID *uint) ([]domain.SavingAccount, error)
	GetSavingTransactions(accountID uuid.UUID) ([]domain.SavingTransaction, error)
	GetSavingAccountByUserID(userID uuid.UUID) (*domain.SavingAccount, error)
	GetSavingAccountsByParentID(parentID uuid.UUID) ([]domain.SavingAccount, error)


	AddCashLedgerEntry(req *domain.CashLedger) error
	GetCashLedger() ([]domain.CashLedger, error)
	UpdateCashLedgerEntry(req *domain.CashLedger) error
	DeleteCashLedgerEntry(id string) error

	AddDailyInfaqEntry(req *domain.DailyInfaq) error
	GetDailyInfaq() ([]domain.DailyInfaq, error)
	UpdateDailyInfaqEntry(req *domain.DailyInfaq) error
	DeleteDailyInfaqEntry(id string) error


	GetDashboardAnalytics() (map[string]interface{}, error)

	// Savings Operational (Pool-level)
	WithdrawSavingsOperational(handledByID uuid.UUID, amount float64, purpose string, unitID uint) error
	ReturnSavingsOperational(withdrawalID uuid.UUID, handledByID uuid.UUID, amount float64, notes string, source string, unitID uint) error
	GetSavingsOperationalHistory() ([]domain.SavingsOperationalWithdrawal, error)
	GetSavingsOperationalReturns(withdrawalID uuid.UUID) ([]domain.SavingsOperationalReturn, error)
	GetSavingsPoolSummary() (map[string]interface{}, error)

	// Savings Recap
	GetSavingsRecap(params domain.SavingsRecapParams) (*domain.SavingsRecapResponse, error)
}
