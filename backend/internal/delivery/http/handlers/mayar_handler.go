package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MayarHandler struct {
	mayarUsecase *usecase.MayarUsecase
}

func NewMayarHandler(mayarUsecase *usecase.MayarUsecase) *MayarHandler {
	return &MayarHandler{mayarUsecase: mayarUsecase}
}

type CreateMayarTransactionRequest struct {
	BillID string  `json:"bill_id" binding:"required"`
	Amount float64 `json:"amount" binding:"required"`
}

// CreateTransaction creates a Mayar Invoice for payment
// POST /finance/mayar/create-transaction (authenticated)
func (h *MayarHandler) CreateTransaction(c *gin.Context) {
	var req CreateMayarTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	billUUID, err := uuid.Parse(req.BillID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tagihan tidak valid"})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nominal harus lebih dari 0"})
		return
	}

	invoiceURL, orderID, err := h.mayarUsecase.CreateInvoice(billUUID, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"invoice_url":  invoiceURL,
		"redirect_url": invoiceURL,
		"order_id":     orderID,
	})
}

// HandleNotification handles webhook notifications from Mayar
// POST /api/mayar/notification (public, no auth)
func (h *MayarHandler) HandleNotification(c *gin.Context) {
	var notificationPayload map[string]interface{}
	if err := c.ShouldBindJSON(&notificationPayload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid"})
		return
	}

	tokenHeader := c.GetHeader("x-callback-token")
	if tokenHeader == "" {
		tokenHeader = c.GetHeader("Authorization")
	}
	tokenQuery := c.Query("token")

	if err := h.mayarUsecase.HandleNotification(notificationPayload, tokenHeader, tokenQuery); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Notification processed successfully"})
}

// CheckTransactionStatus checks payment status from Mayar
// POST /finance/mayar/check-status (authenticated)
func (h *MayarHandler) CheckTransactionStatus(c *gin.Context) {
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	detail, err := h.mayarUsecase.CheckTransactionStatus(req.OrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// CancelTransaction cancels a pending Mayar transaction
// POST /finance/mayar/cancel-transaction (authenticated)
func (h *MayarHandler) CancelTransaction(c *gin.Context) {
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.mayarUsecase.CancelTransaction(req.OrderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaksi Mayar berhasil dibatalkan", "status": "Failed"})
}
