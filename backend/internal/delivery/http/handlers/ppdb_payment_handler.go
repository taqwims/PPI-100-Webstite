package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PPDBPaymentHandler struct {
	ppdbPaymentUsecase *usecase.PPDBPaymentUsecase
}

func NewPPDBPaymentHandler(ppdbPaymentUsecase *usecase.PPDBPaymentUsecase) *PPDBPaymentHandler {
	return &PPDBPaymentHandler{ppdbPaymentUsecase: ppdbPaymentUsecase}
}

type CreatePPDBPaymentRequest struct {
	PPDBRegistrationID string                     `json:"ppdb_registration_id" binding:"required"`
	Items              []PPDBPaymentItemRequest   `json:"items" binding:"required,min=1"`
}

type PPDBPaymentItemRequest struct {
	ItemName       string  `json:"item_name" binding:"required"`
	ExpectedAmount float64 `json:"expected_amount" binding:"required"`
	PaidAmount     float64 `json:"paid_amount" binding:"required"`
}

type UpdatePPDBPaymentRequest struct {
	Items []PPDBPaymentItemRequest `json:"items" binding:"required,min=1"`
}

// CreatePayment creates a new PPDB payment
func (h *PPDBPaymentHandler) CreatePayment(c *gin.Context) {
	var req CreatePPDBPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	registrationUUID, err := uuid.Parse(req.PPDBRegistrationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid PPDB registration ID"})
		return
	}

	// Convert request items to domain items
	items := make([]domain.PPDBPaymentItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = domain.PPDBPaymentItem{
			ItemName:       item.ItemName,
			ExpectedAmount: item.ExpectedAmount,
			PaidAmount:     item.PaidAmount,
		}
	}

	payment := &domain.PPDBPayment{
		PPDBRegistrationID: registrationUUID,
		Items:              items,
	}

	if err := h.ppdbPaymentUsecase.CreatePayment(payment); err != nil {
		// Check if it's a DP validation error (422)
		if strings.HasPrefix(err.Error(), "DP") {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "PPDB payment created successfully",
		"data":    payment,
	})
}

// GetPayments retrieves all PPDB payments or filtered by registration_id
func (h *PPDBPaymentHandler) GetPayments(c *gin.Context) {
	registrationID := c.Query("registration_id")
	
	if registrationID != "" {
		registrationUUID, err := uuid.Parse(registrationID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid registration ID"})
			return
		}

		payment, err := h.ppdbPaymentUsecase.GetByRegistrationID(registrationUUID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}
		c.JSON(http.StatusOK, payment)
		return
	}

	payments, err := h.ppdbPaymentUsecase.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, payments)
}

// GetPaymentByID retrieves a single PPDB payment by ID
func (h *PPDBPaymentHandler) GetPaymentByID(c *gin.Context) {
	id := c.Param("id")
	
	payment, err := h.ppdbPaymentUsecase.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	c.JSON(http.StatusOK, payment)
}

// UpdatePayment updates an existing PPDB payment
func (h *PPDBPaymentHandler) UpdatePayment(c *gin.Context) {
	id := c.Param("id")
	
	var req UpdatePPDBPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment ID"})
		return
	}

	// Get existing payment to preserve registration ID
	existingPayment, err := h.ppdbPaymentUsecase.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	// Convert request items to domain items
	items := make([]domain.PPDBPaymentItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = domain.PPDBPaymentItem{
			PPDBPaymentID:  paymentUUID,
			ItemName:       item.ItemName,
			ExpectedAmount: item.ExpectedAmount,
			PaidAmount:     item.PaidAmount,
		}
	}

	payment := &domain.PPDBPayment{
		ID:                 paymentUUID,
		PPDBRegistrationID: existingPayment.PPDBRegistrationID,
		InvoiceNumber:      existingPayment.InvoiceNumber,
		Items:              items,
	}

	if err := h.ppdbPaymentUsecase.UpdatePayment(payment); err != nil {
		// Check if it's a DP validation error (422)
		if strings.HasPrefix(err.Error(), "DP") {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "PPDB payment updated successfully",
		"data":    payment,
	})
}

// DeletePayment deletes a PPDB payment by ID
func (h *PPDBPaymentHandler) DeletePayment(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.ppdbPaymentUsecase.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "PPDB payment deleted successfully"})
}
