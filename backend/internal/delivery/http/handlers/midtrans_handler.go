package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MidtransHandler struct {
	midtransUsecase *usecase.MidtransUsecase
}

func NewMidtransHandler(midtransUsecase *usecase.MidtransUsecase) *MidtransHandler {
	return &MidtransHandler{midtransUsecase: midtransUsecase}
}

type CreateSnapRequest struct {
	BillID string  `json:"bill_id" binding:"required"`
	Amount float64 `json:"amount" binding:"required"`
}

// CreateSnapTransaction creates a Midtrans Snap token for payment
// POST /finance/midtrans/create-transaction (authenticated)
func (h *MidtransHandler) CreateSnapTransaction(c *gin.Context) {
	var req CreateSnapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	billUUID, err := uuid.Parse(req.BillID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bill ID"})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be greater than 0"})
		return
	}

	snapToken, redirectURL, orderID, err := h.midtransUsecase.CreateSnapTransaction(billUUID, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"snap_token":   snapToken,
		"redirect_url": redirectURL,
		"order_id":     orderID,
	})
}

// HandleNotification handles webhook notifications from Midtrans
// POST /api/midtrans/notification (public, no auth)
func (h *MidtransHandler) HandleNotification(c *gin.Context) {
	var notificationPayload map[string]interface{}
	if err := c.ShouldBindJSON(&notificationPayload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.midtransUsecase.HandleNotification(notificationPayload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// CheckTransactionStatus checks and updates payment status by querying Midtrans directly
// POST /finance/midtrans/check-status (authenticated)
func (h *MidtransHandler) CheckTransactionStatus(c *gin.Context) {
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	detail, err := h.midtransUsecase.CheckTransactionStatus(req.OrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// CancelTransaction cancels a pending transaction in Midtrans and DB
// POST /finance/midtrans/cancel-transaction (authenticated)
func (h *MidtransHandler) CancelTransaction(c *gin.Context) {
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.midtransUsecase.CancelTransaction(req.OrderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaksi berhasil dibatalkan", "status": "Failed"})
}
