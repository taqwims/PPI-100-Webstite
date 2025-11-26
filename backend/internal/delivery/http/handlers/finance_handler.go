package handlers

import (
	"net/http"
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
	StudentID string  `json:"student_id" binding:"required"`
	Title     string  `json:"title" binding:"required"`
	Amount    float64 `json:"amount" binding:"required"`
	DueDate   string  `json:"due_date" binding:"required"`
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

	if err := h.financeUsecase.CreateBill(studentUUID, req.Title, req.Amount, dueDate); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Bill created successfully"})
}

func (h *FinanceHandler) GetAllBills(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	bills, err := h.financeUsecase.GetAllBills(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bills)
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
