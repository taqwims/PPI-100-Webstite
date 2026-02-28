package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FinanceHandler struct {
	financeUsecase *usecase.FinanceUsecase
}

func NewFinanceHandler(financeUsecase *usecase.FinanceUsecase) *FinanceHandler {
	return &FinanceHandler{financeUsecase: financeUsecase}
}

type CreateBillRequest struct {
	StudentID      string  `json:"student_id" binding:"required"`
	Title          string  `json:"title" binding:"required"`
	Amount         float64 `json:"amount" binding:"required"`
	DueDate        string  `json:"due_date" binding:"required"`
	BillType       string  `json:"bill_type"`
	AcademicYearID *uint   `json:"academic_year_id"`
}

func (h *FinanceHandler) CreateBill(c *gin.Context) {
	var req CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
		return
	}

	if err := h.financeUsecase.CreateBill(studentUUID, req.Title, req.Amount, dueDate, req.BillType, req.AcademicYearID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Bill created successfully"})
}

func (h *FinanceHandler) GetAllBills(c *gin.Context) {
	studentID := c.Query("student_id")
	if studentID != "" {
		bills, err := h.financeUsecase.GetStudentBills(studentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, bills)
		return
	}

	unitIDStr := c.Query("unit_id")
	if unitIDStr != "" {
		unitID, _ := strconv.Atoi(unitIDStr)
		bills, err := h.financeUsecase.GetAllBills(uint(unitID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, bills)
		return
	}

	// Check user role for implicit fetching
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unit_id or student_id is required"})
		return
	}

	var userID string
	if id, ok := userIDVal.(string); ok {
		userID = id
	} else if id, ok := userIDVal.(uuid.UUID); ok {
		userID = id.String()
	}

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unit_id or student_id is required"})
		return
	}

	// Check role from context
	roleIDVal, _ := c.Get("roleID")
	var roleID uint
	switch v := roleIDVal.(type) {
	case float64:
		roleID = uint(v)
	case uint:
		roleID = v
	case int:
		roleID = uint(v)
	}

	// Parent role = 7
	if roleID == 7 {
		bills, err := h.financeUsecase.GetParentBills(userID)
		if err != nil {
			c.JSON(http.StatusOK, []domain.Bill{}) // Return empty if no children linked
			return
		}
		c.JSON(http.StatusOK, bills)
		return
	}

	// Student role = 6
	if roleID == 6 {
		bills, err := h.financeUsecase.GetStudentBillsByUserID(userID)
		if err != nil {
			c.JSON(http.StatusOK, []domain.Bill{})
			return
		}
		c.JSON(http.StatusOK, bills)
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "unit_id or student_id is required"})
}

type PaymentRequest struct {
	BillID string  `json:"bill_id" binding:"required"`
	Amount float64 `json:"amount" binding:"required"`
	Method string  `json:"method" binding:"required"`
}

func (h *FinanceHandler) RecordPayment(c *gin.Context) {
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	billUUID, err := uuid.Parse(req.BillID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bill ID"})
		return
	}

	if err := h.financeUsecase.RecordPayment(billUUID, req.Amount, req.Method); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Payment recorded successfully"})
}

// Update/Delete Bill
func (h *FinanceHandler) UpdateBill(c *gin.Context) {
	id := c.Param("id")
	var req CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	billUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bill ID"})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
		return
	}

	bill := &domain.Bill{
		ID:        billUUID,
		StudentID: studentUUID,
		Title:     req.Title,
		Amount:    req.Amount,
		DueDate:   dueDate,
	}

	if err := h.financeUsecase.UpdateBill(bill); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bill updated successfully"})
}

func (h *FinanceHandler) DeleteBill(c *gin.Context) {
	id := c.Param("id")
	if err := h.financeUsecase.DeleteBill(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bill deleted successfully"})
}

// Update/Delete Payment
func (h *FinanceHandler) UpdatePayment(c *gin.Context) {
	id := c.Param("id")
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment ID"})
		return
	}

	billUUID, err := uuid.Parse(req.BillID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bill ID"})
		return
	}

	payment := &domain.Payment{
		ID:            paymentUUID,
		BillID:        billUUID,
		Amount:        req.Amount,
		PaymentMethod: req.Method,
	}

	if err := h.financeUsecase.UpdatePayment(payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment updated successfully"})
}

func (h *FinanceHandler) DeletePayment(c *gin.Context) {
	id := c.Param("id")
	if err := h.financeUsecase.DeletePayment(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment deleted successfully"})
}
