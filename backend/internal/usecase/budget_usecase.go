package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/google/uuid"
)

type BudgetUsecase struct {
	repo                *postgres.BudgetRepository
	notificationUsecase *NotificationUsecase
	userRepo            *postgres.UserRepository
	tcRepo              *postgres.TransactionCodeRepository
}

func NewBudgetUsecase(
	repo *postgres.BudgetRepository,
	notificationUsecase *NotificationUsecase,
	userRepo *postgres.UserRepository,
	tcRepo *postgres.TransactionCodeRepository,
) *BudgetUsecase {
	return &BudgetUsecase{
		repo:                repo,
		notificationUsecase: notificationUsecase,
		userRepo:            userRepo,
		tcRepo:              tcRepo,
	}
}

// ------------------- Category -------------------

func (u *BudgetUsecase) CreateCategory(cat *domain.BudgetCategory) error {
	return u.repo.CreateCategory(cat)
}

func (u *BudgetUsecase) GetAllCategories() ([]domain.BudgetCategory, error) {
	return u.repo.GetAllCategories()
}

func (u *BudgetUsecase) UpdateCategory(cat *domain.BudgetCategory) error {
	return u.repo.UpdateCategory(cat)
}

func (u *BudgetUsecase) DeleteCategory(id uint) error {
	return u.repo.DeleteCategory(id)
}

// ------------------- Component -------------------

func (u *BudgetUsecase) CreateComponent(comp *domain.BudgetComponent) error {
	return u.repo.CreateComponent(comp)
}

func (u *BudgetUsecase) GetComponents(categoryID uint) ([]domain.BudgetComponent, error) {
	return u.repo.GetComponents(categoryID)
}

func (u *BudgetUsecase) UpdateComponent(comp *domain.BudgetComponent) error {
	return u.repo.UpdateComponent(comp)
}

func (u *BudgetUsecase) DeleteComponent(id uint) error {
	return u.repo.DeleteComponent(id)
}

// ------------------- Budget -------------------

func (u *BudgetUsecase) CreateBudget(b *domain.Budget) error {
	return u.repo.Create(b)
}

func (u *BudgetUsecase) CreateBudgetFromTemplate(b *domain.Budget, templateCodeID uint, months []int) error {
	template, err := u.tcRepo.GetByID(templateCodeID)
	if err != nil {
		return fmt.Errorf("transaction code template not found: %w", err)
	}

	cats, err := u.repo.GetAllCategories()
	if err != nil {
		return err
	}
	
	var catID uint
	for _, c := range cats {
		if c.Name == template.Category {
			catID = c.ID
			break
		}
	}
	
	if catID == 0 && template.Category != "" {
		newCat := domain.BudgetCategory{
			Name:        template.Category,
			Description: "Kategori " + template.Type,
			IsActive:    true,
		}
		if err := u.repo.CreateCategory(&newCat); err == nil {
			catID = newCat.ID
		}
	}

	b.CategoryID = catID
	b.TransactionCodeID = &template.ID
	b.Status = "Approved"
	
	if len(months) > 0 {
		// Bulk create for multiple months
		for _, m := range months {
			newB := *b
			newB.Month = m
			newB.ID = uuid.Nil // Reset ID for new record
			if err := u.repo.Create(&newB); err != nil {
				return err
			}
		}
		return nil
	}

	return u.repo.Create(b)
}

func (u *BudgetUsecase) GetAllBudgets(academicYearID uint, status string) ([]domain.Budget, error) {
	return u.repo.GetAll(academicYearID, status)
}

func (u *BudgetUsecase) GetBudgetByID(id uuid.UUID) (*domain.Budget, error) {
	return u.repo.GetByID(id)
}

func (u *BudgetUsecase) UpdateBudget(b *domain.Budget) error {
	return u.repo.Update(b)
}

func (u *BudgetUsecase) DeleteBudget(id string) error {
	return u.repo.Delete(id)
}

// ------------------- Workflow -------------------



func (u *BudgetUsecase) RealizeBudget(id uuid.UUID, amount float64, source string, transactionCodeID uint, notes string, userID uuid.UUID) error {
	return u.repo.Realize(id, amount, source, transactionCodeID, notes, userID)
}

func (u *BudgetUsecase) GetBudgetSummary(academicYearID uint) ([]map[string]interface{}, error) {
	return u.repo.GetSummaryByYear(academicYearID)
}

func (u *BudgetUsecase) ReconcileBudgets(academicYearID uint) error {
	return u.repo.Reconcile(academicYearID)
}

