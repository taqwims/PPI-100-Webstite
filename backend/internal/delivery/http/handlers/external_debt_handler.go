package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExternalDebtHandler struct {
	db *gorm.DB
}

func NewExternalDebtHandler(db *gorm.DB) *ExternalDebtHandler {
	return &ExternalDebtHandler{db: db}
}

// GetAll lists all debts
func (h *ExternalDebtHandler) GetAll(c *gin.Context) {
	var debts []domain.ExternalDebt
	h.db.Preload("CreatedBy").Order("created_at DESC").Find(&debts)
	c.JSON(http.StatusOK, debts)
}

// Create a new debt
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

	debt := domain.ExternalDebt{
		CreditorName: req.CreditorName,
		Description:  req.Description,
		Amount:       req.Amount,
		DueDate:      req.DueDate,
		Notes:        req.Notes,
		CreatedByID:  uid,
	}
	if err := h.db.Create(&debt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat catatan hutang"})
		return
	}
	h.db.Preload("CreatedBy").First(&debt, "id = ?", debt.ID)
	c.JSON(http.StatusCreated, debt)
}

// Update a debt
func (h *ExternalDebtHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var debt domain.ExternalDebt
	if err := h.db.First(&debt, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hutang tidak ditemukan"})
		return
	}

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

	updates := map[string]interface{}{}
	if req.CreditorName != "" {
		updates["creditor_name"] = req.CreditorName
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Amount > 0 {
		updates["amount"] = req.Amount
	}
	if req.DueDate != nil {
		updates["due_date"] = req.DueDate
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	h.db.Model(&debt).Updates(updates)
	// Recalculate status
	h.recalcStatus(&debt)
	h.db.Preload("CreatedBy").First(&debt, "id = ?", debt.ID)
	c.JSON(http.StatusOK, debt)
}

// Delete a debt
func (h *ExternalDebtHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	// Delete all payments first
	h.db.Where("debt_id = ?", id).Delete(&domain.ExternalDebtPayment{})
	if err := h.db.Delete(&domain.ExternalDebt{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus hutang"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Hutang berhasil dihapus"})
}

// GetPayments lists all payments for a debt
func (h *ExternalDebtHandler) GetPayments(c *gin.Context) {
	debtID := c.Param("id")
	var payments []domain.ExternalDebtPayment
	h.db.Preload("PaidBy").Where("debt_id = ?", debtID).Order("created_at DESC").Find(&payments)
	c.JSON(http.StatusOK, payments)
}

// RecordPayment records a payment for a debt and creates BKU/Infaq entry
func (h *ExternalDebtHandler) RecordPayment(c *gin.Context) {
	debtID := c.Param("id")
	var debt domain.ExternalDebt
	if err := h.db.First(&debt, "id = ?", debtID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hutang tidak ditemukan"})
		return
	}

	var req struct {
		Amount     float64 `json:"amount" binding:"required"`
		FundSource string  `json:"fund_source" binding:"required"` // "Kas Umum" or "Infaq"
		Notes      string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	remaining := debt.Amount - debt.PaidAmount
	if req.Amount > remaining {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pembayaran melebihi sisa hutang"})
		return
	}

	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(userID.(string))

	// Create payment record
	payment := domain.ExternalDebtPayment{
		DebtID:     debt.ID,
		Amount:     req.Amount,
		FundSource: req.FundSource,
		Notes:      req.Notes,
		PaidByID:   uid,
	}

	tx := h.db.Begin()

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencatat pembayaran"})
		return
	}

	// Update debt paid amount
	debt.PaidAmount += req.Amount
	if debt.PaidAmount >= debt.Amount {
		debt.Status = "Paid"
	} else {
		debt.Status = "Partial"
	}
	tx.Save(&debt)

	// Record in BKU (Cash Ledger) as Expense
	if req.FundSource == "Kas Umum" {
		bku := domain.CashLedger{
			Date:     time.Now(),
			Source:   "Pembayaran Hutang",
			ItemName: "Bayar Hutang: " + debt.CreditorName + " — " + debt.Description,
			Type:     "Expense",
			Amount:   req.Amount,
			Category: "Hutang",
			Notes:    req.Notes,
		}
		tx.Create(&bku)
	} else if req.FundSource == "Infaq" {
		infaq := domain.DailyInfaq{
			Date:      time.Now(),
			Source:    "Pembayaran Hutang — " + debt.CreditorName,
			Type:     "Expense",
			Amount:   req.Amount,
			HandledByID: uid,
			FundSource: "Infaq",
			Notes:    "Bayar hutang: " + debt.Description + ". " + req.Notes,
		}
		tx.Create(&infaq)
	}

	tx.Commit()

	tx2 := h.db
	tx2.Preload("PaidBy").First(&payment, "id = ?", payment.ID)
	c.JSON(http.StatusCreated, payment)
}

func (h *ExternalDebtHandler) recalcStatus(debt *domain.ExternalDebt) {
	var totalPaid float64
	h.db.Model(&domain.ExternalDebtPayment{}).Where("debt_id = ?", debt.ID).Select("COALESCE(SUM(amount), 0)").Scan(&totalPaid)
	debt.PaidAmount = totalPaid
	if totalPaid >= debt.Amount {
		debt.Status = "Paid"
	} else if totalPaid > 0 {
		debt.Status = "Partial"
	} else {
		debt.Status = "Unpaid"
	}
	h.db.Save(debt)
}
