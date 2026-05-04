package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BudgetRepository struct {
	db *gorm.DB
}

func NewBudgetRepository(db *gorm.DB) *BudgetRepository {
	return &BudgetRepository{db: db}
}

// ------------------- Budget Category CRUD -------------------

func (r *BudgetRepository) CreateCategory(cat *domain.BudgetCategory) error {
	return r.db.Create(cat).Error
}

func (r *BudgetRepository) GetAllCategories() ([]domain.BudgetCategory, error) {
	var cats []domain.BudgetCategory
	if err := r.db.Order("name asc").Find(&cats).Error; err != nil {
		return nil, err
	}
	return cats, nil
}

func (r *BudgetRepository) UpdateCategory(cat *domain.BudgetCategory) error {
	return r.db.Model(&domain.BudgetCategory{}).Where("id = ?", cat.ID).Updates(map[string]interface{}{
		"name":        cat.Name,
		"description": cat.Description,
		"is_active":   cat.IsActive,
	}).Error
}

func (r *BudgetRepository) DeleteCategory(id uint) error {
	return r.db.Delete(&domain.BudgetCategory{}, "id = ?", id).Error
}

// ------------------- Budget CRUD -------------------

func (r *BudgetRepository) Create(b *domain.Budget) error {
	return r.db.Create(b).Error
}

func (r *BudgetRepository) GetAll(academicYearID uint, status string) ([]domain.Budget, error) {
	var budgets []domain.Budget
	query := r.db.Preload("AcademicYear").Preload("Category").Preload("CreatedBy").Preload("ApprovedBy").Preload("TransactionCode")

	if academicYearID > 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at desc").Find(&budgets).Error; err != nil {
		return nil, err
	}
	return budgets, nil
}

func (r *BudgetRepository) GetByID(id uuid.UUID) (*domain.Budget, error) {
	var budget domain.Budget
	if err := r.db.Preload("AcademicYear").Preload("Category").Preload("CreatedBy").Preload("ApprovedBy").Preload("TransactionCode").
		Where("id = ?", id).First(&budget).Error; err != nil {
		return nil, err
	}
	return &budget, nil
}

func (r *BudgetRepository) Update(b *domain.Budget) error {
	return r.db.Model(&domain.Budget{}).Where("id = ?", b.ID).Updates(map[string]interface{}{
		"category_id":    b.CategoryID,
		"item_name":      b.ItemName,
		"planned_amount": b.PlannedAmount,
		"notes":          b.Notes,
	}).Error
}

func (r *BudgetRepository) Delete(id string) error {
	return r.db.Delete(&domain.Budget{}, "id = ?", id).Error
}

// ------------------- Budget Workflow -------------------

func (r *BudgetRepository) Submit(id uuid.UUID) error {
	return r.db.Model(&domain.Budget{}).Where("id = ?", id).Update("status", "Pending").Error
}

func (r *BudgetRepository) Approve(id uuid.UUID, approvedByID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&domain.Budget{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":        "Approved",
		"approved_by_id": approvedByID,
		"approved_at":   now,
	}).Error
}

func (r *BudgetRepository) Reject(id uuid.UUID, approvedByID uuid.UUID, notes string) error {
	return r.db.Model(&domain.Budget{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":        "Rejected",
		"approved_by_id": approvedByID,
		"notes":         notes,
	}).Error
}

func (r *BudgetRepository) Realize(id uuid.UUID, amount float64, source string, transactionCodeID uint, notes string, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var b domain.Budget
		if err := tx.First(&b, "id = ?", id).Error; err != nil {
			return err
		}

		if err := tx.Model(&b).Update("realized_amount", gorm.Expr("realized_amount + ?", amount)).Error; err != nil {
			return err
		}

		var tcID *uint
		if transactionCodeID > 0 {
			tcID = &transactionCodeID
		}

		itemDesc := "Realisasi RKAS: " + b.ItemName

		if source == "Kas Umum" {
			entry := domain.CashLedger{
				Date:              time.Now(),
				Type:              "Expense",
				Category:          "RKAS",
				ItemName:          itemDesc,
				Source:            "RKAS",
				Amount:            amount,
				TransactionCodeID: tcID,
				Notes:             notes,
				CreatedBy:         userID,
			}
			if err := tx.Create(&entry).Error; err != nil {
				return err
			}
		} else if source == "Infaq" {
			noteDesc := itemDesc
			if notes != "" {
				noteDesc += " (" + notes + ")"
			}
			entry := domain.DailyInfaq{
				Date:              time.Now(),
				Type:              "Expense",
				Source:            "RKAS",
				Amount:            amount,
				TransactionCodeID: tcID,
				Notes:             noteDesc,
				HandledByID:       userID,
			}
			if err := tx.Create(&entry).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// ------------------- Auto Realization -------------------

func (r *BudgetRepository) AddRealizationByTransactionCodeID(tcID uint, amount float64, billingMonth int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Step 1: Get the transaction code itself
		var tc domain.TransactionCode
		if err := tx.First(&tc, "id = ?", tcID).Error; err != nil {
			return nil // Transaction code not found, skip silently
		}

		// Step 2: Find all related transaction code IDs
		// Strategy A: Direct match + children via parent_code_id
		var tcIDs []uint
		tx.Model(&domain.TransactionCode{}).Where("id = ? OR parent_code_id = ?", tcID, tcID).Pluck("id", &tcIDs)

		// Step 3: Find budgets using those transaction code IDs
		var budgets []domain.Budget
		tx.Where("transaction_code_id IN ?", tcIDs).Order("month asc, created_at asc").Find(&budgets)

		// Strategy B (fallback): If no budgets found, search by code prefix pattern
		// e.g., if tc.Code = "C11", find budgets whose transaction_code has code LIKE "C11%"
		if len(budgets) == 0 {
			var prefixTCIDs []uint
			tx.Model(&domain.TransactionCode{}).Where("code LIKE ?", tc.Code+"%").Pluck("id", &prefixTCIDs)
			if len(prefixTCIDs) > 0 {
				tx.Where("transaction_code_id IN ?", prefixTCIDs).Order("month asc, created_at asc").Find(&budgets)
			}
		}

		if len(budgets) == 0 {
			return nil // No budgets to realize
		}

		// Step 4: Distribute the amount
		// If billingMonth is specified, try exact month match first (Precise mode)
		var targetBudget *domain.Budget
		if billingMonth > 0 {
			for i := range budgets {
				if budgets[i].Month == billingMonth {
					targetBudget = &budgets[i]
					break
				}
			}
		}

		if targetBudget != nil {
			tx.Model(&domain.Budget{}).Where("id = ?", targetBudget.ID).Update("realized_amount", gorm.Expr("realized_amount + ?", amount))
		} else {
			// Fallback: Waterfall distribution
			remaining := amount
			for _, b := range budgets {
				if remaining <= 0 {
					break
				}
				space := b.PlannedAmount - b.RealizedAmount
				if space > 0 {
					toAdd := remaining
					if toAdd > space {
						toAdd = space
					}
					tx.Model(&domain.Budget{}).Where("id = ?", b.ID).Update("realized_amount", gorm.Expr("realized_amount + ?", toAdd))
					remaining -= toAdd
				}
			}
			if remaining > 0 {
				tx.Model(&domain.Budget{}).Where("id = ?", budgets[len(budgets)-1].ID).Update("realized_amount", gorm.Expr("realized_amount + ?", remaining))
			}
		}

		return nil
	})
}

// ------------------- Budget Summary -------------------

func (r *BudgetRepository) GetSummaryByYear(academicYearID uint) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	rows, err := r.db.Model(&domain.Budget{}).
		Select("budget_categories.name as category, SUM(planned_amount) as planned, SUM(realized_amount) as realized").
		Joins("LEFT JOIN budget_categories ON budgets.category_id = budget_categories.id").
		Where("academic_year_id = ? AND status = ?", academicYearID, "Approved").
		Group("budget_categories.name").
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var category string
		var planned, realized float64
		if err := rows.Scan(&category, &planned, &realized); err != nil {
			continue
		}
		percentage := float64(0)
		if planned > 0 {
			percentage = (realized / planned) * 100
		}
		results = append(results, map[string]interface{}{
			"category":   category,
			"planned":    planned,
			"realized":   realized,
			"percentage": percentage,
		})
	}
	return results, nil
}
