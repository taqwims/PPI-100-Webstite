package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BudgetHandler struct {
	usecase *usecase.BudgetUsecase
}

func NewBudgetHandler(uc *usecase.BudgetUsecase) *BudgetHandler {
	return &BudgetHandler{usecase: uc}
}

// ------------------- Budget Category -------------------

func (h *BudgetHandler) CreateCategory(c *gin.Context) {
	var req domain.BudgetCategory
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.usecase.CreateCategory(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *BudgetHandler) GetAllCategories(c *gin.Context) {
	cats, err := h.usecase.GetAllCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cats)
}

func (h *BudgetHandler) UpdateCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req domain.BudgetCategory
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = uint(id)

	if err := h.usecase.UpdateCategory(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *BudgetHandler) DeleteCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.usecase.DeleteCategory(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// ------------------- Budget CRUD -------------------

func (h *BudgetHandler) Create(c *gin.Context) {
	var body struct {
		AcademicYearID  uint    `json:"academic_year_id" binding:"required"`
		ItemName        string  `json:"item_name" binding:"required"`
		PlannedAmount   float64 `json:"planned_amount" binding:"required"`
		Notes           string  `json:"notes"`
		TemplateCodeID  uint    `json:"template_code_id" binding:"required"`
		BudgetType      string  `json:"budget_type"`
		Quantity        int     `json:"quantity"`
		UnitPrice       float64 `json:"unit_price"`
		Period          string  `json:"period"`
		Month           int     `json:"month"`
		Months          []int   `json:"months"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	budgetType := body.BudgetType
	if budgetType == "" {
		budgetType = "Pengeluaran"
	}

	budget := domain.Budget{
		AcademicYearID: body.AcademicYearID,
		ItemName:       body.ItemName,
		PlannedAmount:  body.PlannedAmount,
		Notes:          body.Notes,
		CreatedByID:    userID,
		BudgetType:     budgetType,
		Quantity:       body.Quantity,
		UnitPrice:      body.UnitPrice,
		Period:         body.Period,
		Month:          body.Month,
	}

	if err := h.usecase.CreateBudgetFromTemplate(&budget, body.TemplateCodeID, body.Months); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, budget)
}

func (h *BudgetHandler) GetAll(c *gin.Context) {
	yearStr := c.Query("academic_year_id")
	status := c.Query("status")

	var yearID uint
	if yearStr != "" {
		id, err := strconv.ParseUint(yearStr, 10, 32)
		if err == nil {
			yearID = uint(id)
		}
	}

	budgets, err := h.usecase.GetAllBudgets(yearID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, budgets)
}

func (h *BudgetHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req domain.Budget
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id
	// CategoryID won't be sent from frontend update form anymore, we retain the old one
	existing, err := h.usecase.GetBudgetByID(id)
	if err == nil && req.CategoryID == 0 {
		req.CategoryID = existing.CategoryID
	}

	if err := h.usecase.UpdateBudget(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *BudgetHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.usecase.DeleteBudget(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// ------------------- Budget Workflow -------------------

func (h *BudgetHandler) Realize(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Amount            float64 `json:"amount" binding:"required"`
		Source            string  `json:"source" binding:"required"` // 'Kas Umum' or 'Infaq'
		TransactionCodeID uint    `json:"transaction_code_id" binding:"required"`
		Notes             string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	if err := h.usecase.RealizeBudget(id, req.Amount, req.Source, req.TransactionCodeID, req.Notes, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "realization recorded"})
}

func (h *BudgetHandler) GetSummary(c *gin.Context) {
	yearStr := c.Query("academic_year_id")
	var yearID uint
	if yearStr != "" {
		id, err := strconv.ParseUint(yearStr, 10, 32)
		if err == nil {
			yearID = uint(id)
		}
	}

	summary, err := h.usecase.GetBudgetSummary(yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}
