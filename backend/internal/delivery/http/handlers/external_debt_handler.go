package handlers

import (
	"errors"
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ExternalDebtHandler struct {
	usecase usecase.ExternalDebtUsecase
}

func NewExternalDebtHandler(uc usecase.ExternalDebtUsecase) *ExternalDebtHandler {
	return &ExternalDebtHandler{usecase: uc}
}

func (h *ExternalDebtHandler) GetAll(c *gin.Context) {
	debts, err := h.usecase.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, debts)
}

func (h *ExternalDebtHandler) Create(c *gin.Context) {
	var req struct {
		CreditorName string     `json:"creditor_name" binding:"required"`
		Description  string     `json:"description" binding:"required"`
		Amount       float64    `json:"amount" binding:"required"`
		DueDate      *time.Time `json:"due_date"`
		Notes        string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(userID.(string))

	debt, err := h.usecase.Create(usecase.CreateExternalDebtRequest{
		CreditorName: req.CreditorName,
		Description:  req.Description,
		Amount:       req.Amount,
		DueDate:      req.DueDate,
		Notes:        req.Notes,
	}, uid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, debt)
}

func (h *ExternalDebtHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		CreditorName string     `json:"creditor_name"`
		Description  string     `json:"description"`
		Amount       float64    `json:"amount"`
		DueDate      *time.Time `json:"due_date"`
		Notes        string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	debt, err := h.usecase.Update(id, usecase.UpdateExternalDebtRequest{
		CreditorName: req.CreditorName,
		Description:  req.Description,
		Amount:       req.Amount,
		DueDate:      req.DueDate,
		Notes:        req.Notes,
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, debt)
}

func (h *ExternalDebtHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.usecase.Delete(id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Hutang berhasil dihapus"})
}

func (h *ExternalDebtHandler) GetPayments(c *gin.Context) {
	debtID := c.Param("id")
	payments, err := h.usecase.GetPayments(debtID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payments)
}

func (h *ExternalDebtHandler) RecordPayment(c *gin.Context) {
	debtID := c.Param("id")
	var req struct {
		Amount     float64 `json:"amount" binding:"required"`
		FundSource string  `json:"fund_source" binding:"required"`
		Notes      string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(userID.(string))

	payment, err := h.usecase.RecordPayment(debtID, usecase.RecordDebtPaymentRequest{
		Amount:     req.Amount,
		FundSource: req.FundSource,
		Notes:      req.Notes,
	}, uid)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, payment)
}
