package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type XenditHandler struct {
	xenditUsecase *usecase.XenditUsecase
}

func NewXenditHandler(xenditUsecase *usecase.XenditUsecase) *XenditHandler {
	return &XenditHandler{xenditUsecase: xenditUsecase}
}

type CreateXenditTransactionRequest struct {
	BillID string  `json:"bill_id" binding:"required"`
	Amount float64 `json:"amount" binding:"required"`
}

// CreateTransaction creates a Xendit Invoice for payment
// POST /finance/xendit/create-transaction (authenticated)
func (h *XenditHandler) CreateTransaction(c *gin.Context) {
	var req CreateXenditTransactionRequest
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

	invoiceURL, orderID, err := h.xenditUsecase.CreateInvoice(billUUID, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"invoice_url": invoiceURL,
		"order_id":    orderID,
	})
}

// HandleNotification handles webhook notifications from Xendit
// POST /api/xendit/notification (public, no auth)
func (h *XenditHandler) HandleNotification(c *gin.Context) {
	var notificationPayload map[string]interface{}
	if err := c.ShouldBindJSON(&notificationPayload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid"})
		return
	}

	tokenHeader := c.GetHeader("x-callback-token")

	if err := h.xenditUsecase.HandleNotification(notificationPayload, tokenHeader); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// CheckTransactionStatus checks payment status from Xendit
// POST /finance/xendit/check-status (authenticated)
func (h *XenditHandler) CheckTransactionStatus(c *gin.Context) {
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	detail, err := h.xenditUsecase.CheckTransactionStatus(req.OrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// CancelTransaction cancels a pending Xendit invoice
// POST /finance/xendit/cancel-transaction (authenticated)
func (h *XenditHandler) CancelTransaction(c *gin.Context) {
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.xenditUsecase.CancelTransaction(req.OrderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaksi Xendit berhasil dibatalkan", "status": "Failed"})
}
