package usecase

import (
	"ppi-100-sis/internal/repository/postgres"
)

type FinanceUsecase struct {
	financeRepo           *postgres.FinanceRepository
	notificationUsecase   *NotificationUsecase
	userRepo              *postgres.UserRepository
	studentRepo           *postgres.StudentRepository
	budgetRepo            *postgres.BudgetRepository
	studentObligationRepo *postgres.StudentObligationRepository
	activityRepo          *postgres.ActivityRepository
	invoiceUsecase        InvoiceSignatureUsecase
	schoolSettingRepo     *postgres.SchoolSettingRepository
}

func NewFinanceUsecase(
	financeRepo *postgres.FinanceRepository,
	notificationUsecase *NotificationUsecase,
	userRepo *postgres.UserRepository,
	studentRepo *postgres.StudentRepository,
	budgetRepo *postgres.BudgetRepository,
	studentObligationRepo *postgres.StudentObligationRepository,
	activityRepo *postgres.ActivityRepository,
	invoiceUsecase InvoiceSignatureUsecase,
	schoolSettingRepo *postgres.SchoolSettingRepository,
) *FinanceUsecase {
	return &FinanceUsecase{
		financeRepo:           financeRepo,
		notificationUsecase:   notificationUsecase,
		userRepo:              userRepo,
		studentRepo:           studentRepo,
		budgetRepo:            budgetRepo,
		studentObligationRepo: studentObligationRepo,
		activityRepo:          activityRepo,
		invoiceUsecase:        invoiceUsecase,
		schoolSettingRepo:     schoolSettingRepo,
	}
}
