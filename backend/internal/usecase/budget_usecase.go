package usecase

import (
	"fmt"
	"strconv"
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

// ------------------- Budget -------------------

func (u *BudgetUsecase) CreateBudget(b *domain.Budget) error {
	return u.repo.Create(b)
}

func (u *BudgetUsecase) CreateBudgetFromTemplate(b *domain.Budget, templateCodeID uint) error {
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
	
	if catID == 0 {
		newCat := domain.BudgetCategory{
			Name: template.Category,
			Description: "Auto generated from Transaction Code",
			IsActive: true,
		}
		if err := u.repo.CreateCategory(&newCat); err != nil {
			return fmt.Errorf("failed to auto-create category: %w", err)
		}
		catID = newCat.ID
	}

	lastCode, err := u.tcRepo.GetLastCodeByPrefix(template.Code)
	newCodeSuffix := 1
	if err == nil && lastCode != "" && len(lastCode) > len(template.Code) {
		suffixStr := lastCode[len(template.Code):]
		if suffixVal, err := strconv.Atoi(suffixStr); err == nil {
			newCodeSuffix = suffixVal + 1
		}
	}
	
	newCodeStr := fmt.Sprintf("%s%d", template.Code, newCodeSuffix)
	
	newTc := domain.TransactionCode{
		Code: newCodeStr,
		Name: template.Name, // Nama menggunakan standar (template)
		Type: template.Type,
		Category: template.Category,
		Description: "RKAS Item: " + b.ItemName,
		IsActive: true,
	}
	
	if err := u.tcRepo.Create(&newTc); err != nil {
		return fmt.Errorf("failed to create new transaction code: %w", err)
	}
	
	b.CategoryID = catID
	b.TransactionCodeID = &newTc.ID
	b.Status = "Approved"
	
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
