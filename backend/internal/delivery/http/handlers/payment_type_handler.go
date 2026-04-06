package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PaymentTypeHandler struct {
	usecase *usecase.PaymentTypeUsecase
}

func NewPaymentTypeHandler(usecase *usecase.PaymentTypeUsecase) *PaymentTypeHandler {
	return &PaymentTypeHandler{usecase: usecase}
}

func (h *PaymentTypeHandler) Create(c *gin.Context) {
	var req domain.PaymentType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.TransactionCodeID == nil || *req.TransactionCodeID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode transaksi wajib dipilih"})
		return
	}

	if err := h.usecase.Create(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Payment type created", "data": req})
}

func (h *PaymentTypeHandler) GetAll(c *gin.Context) {
	var academicYearID uint
	if ayID := c.Query("academic_year_id"); ayID != "" {
		if v, err := strconv.ParseUint(ayID, 10, 32); err == nil {
			academicYearID = uint(v)
		}
	}

	pts, err := h.usecase.GetAll(academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pts)
}

func (h *PaymentTypeHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req domain.PaymentType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = uint(id)

	if err := h.usecase.Update(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment type updated"})
}

func (h *PaymentTypeHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.usecase.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment type deleted"})
}
