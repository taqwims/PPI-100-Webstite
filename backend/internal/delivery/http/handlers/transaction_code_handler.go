package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TransactionCodeHandler struct {
	usecase *usecase.TransactionCodeUsecase
}

func NewTransactionCodeHandler(uc *usecase.TransactionCodeUsecase) *TransactionCodeHandler {
	return &TransactionCodeHandler{usecase: uc}
}

// ------------------- Transaction Code CRUD -------------------

func (h *TransactionCodeHandler) Create(c *gin.Context) {
	var req domain.TransactionCode
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.usecase.CreateTransactionCode(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *TransactionCodeHandler) GetAll(c *gin.Context) {
	codes, err := h.usecase.GetAllTransactionCodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, codes)
}

func (h *TransactionCodeHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req domain.TransactionCode
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = uint(id)

	if err := h.usecase.UpdateTransactionCode(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *TransactionCodeHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.usecase.DeleteTransactionCode(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// ------------------- Global Transactions (Super Table) -------------------

func (h *TransactionCodeHandler) GetGlobalTransactions(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	category := c.Query("category")
	codeIDStr := c.Query("code_id")

	var codeID uint
	if codeIDStr != "" {
		id, err := strconv.ParseUint(codeIDStr, 10, 32)
		if err == nil {
			codeID = uint(id)
		}
	}

	results, err := h.usecase.GetGlobalTransactions(startDate, endDate, category, codeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}
