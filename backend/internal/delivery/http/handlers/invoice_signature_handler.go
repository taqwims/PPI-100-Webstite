package handlers

import (
	"fmt"
	"log"
	"net/http"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
)

type InvoiceSignatureHandler struct {
	uc usecase.InvoiceSignatureUsecase
}

func NewInvoiceSignatureHandler(uc usecase.InvoiceSignatureUsecase) *InvoiceSignatureHandler {
	return &InvoiceSignatureHandler{uc: uc}
}

// ─── Sign Invoice ───

type SignInvoiceRequest struct {
	InvoiceType string  `json:"invoice_type" binding:"required"`
	ReferenceID string  `json:"reference_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
	DateStr     string  `json:"date_str" binding:"required"`
}

func (h *InvoiceSignatureHandler) SignInvoice(c *gin.Context) {
	var req SignInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.uc.SignInvoice(req.InvoiceType, req.ReferenceID, req.Amount, req.DateStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return existing signatures format when already signed
	if result.Existing != nil {
		c.JSON(http.StatusOK, gin.H{
			"verification_code": result.VerificationCode,
			"invoice_number":    result.InvoiceNumber,
			"signatures":        result.Existing,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"signatures":        result.Signatures,
		"verification_code": result.VerificationCode,
		"invoice_number":    result.InvoiceNumber,
	})
}

// ─── Verify Invoice ───

type VerifyInvoiceRequest struct {
	VerificationCode string `json:"verification_code" binding:"required"`
}

type VerifyInvoiceResponse struct {
	Valid    bool      `json:"valid"`
	Metadata struct {
		ModuleName  string    `json:"module_name"`
		ReferenceID string    `json:"reference_id"`
		Amount      float64   `json:"amount"`
		Date        string    `json:"date"`
		SignedAt    interface{} `json:"signed_at"`
	} `json:"metadata"`
	Signatures interface{} `json:"signatures"`
}

func (h *InvoiceSignatureHandler) VerifyInvoice(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		var req VerifyInvoiceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "verification_code is required"})
			return
		}
		code = req.VerificationCode
	}

	result, err := h.uc.VerifyInvoice(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !result.Valid {
		// Log invalid signature for diagnostics
		log.Printf("[VERIFY] Code not found or invalid: %s", code)
		c.JSON(http.StatusOK, gin.H{"valid": false})
		return
	}

	resp := gin.H{
		"valid":      true,
		"signatures": result.Signatures,
		"metadata": gin.H{
			"module_name":  result.Metadata.ModuleName,
			"reference_id": result.Metadata.ReferenceID,
			"amount":       result.Metadata.Amount,
			"date":         result.Metadata.Date,
			"signed_at":    result.Metadata.SignedAt,
		},
	}
	c.JSON(http.StatusOK, resp)
}

// ─── Generate Invoice Number ───

func (h *InvoiceSignatureHandler) GenerateNumber(c *gin.Context) {
	invoiceType := c.Query("type")
	if invoiceType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type query parameter is required"})
		return
	}

	number, err := h.uc.GenerateNumber(invoiceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invoice_number": number})
}

// ─── Invoice History ───

func (h *InvoiceSignatureHandler) GetInvoiceHistory(c *gin.Context) {
	userIDAny, _ := c.Get("userID")
	roleIDVal, _ := c.Get("roleID")

	userIDStr := fmt.Sprintf("%v", userIDAny)

	var roleID int
	switch v := roleIDVal.(type) {
	case uint:
		roleID = int(v)
	case float64:
		roleID = int(v)
	case int:
		roleID = v
	}

	log.Printf("[InvoiceHistory] Request by UserID: %s, RoleID: %d", userIDStr, roleID)

	invoiceType := c.Query("type")
	search := c.Query("search")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	results, err := h.uc.GetInvoiceHistory(userIDStr, roleID, invoiceType, search, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[InvoiceHistory] Found %d records for UserID: %s", len(results), userIDStr)
	c.JSON(http.StatusOK, results)
}

// ─── Invoice Number Config CRUD ───

func (h *InvoiceSignatureHandler) GetInvoiceConfigs(c *gin.Context) {
	configs, err := h.uc.GetInvoiceConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func (h *InvoiceSignatureHandler) UpdateInvoiceConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var input usecase.UpdateInvoiceConfigInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config, err := h.uc.UpdateInvoiceConfig(uint(id), input)
	if err != nil {
		if err.Error() == "config not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

func (h *InvoiceSignatureHandler) ResetCounter(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.uc.ResetCounter(uint(id)); err != nil {
		if err.Error() == "config not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated config to return in response
	configs, _ := h.uc.GetInvoiceConfigs()
	for _, cfg := range configs {
		if cfg.ID == uint(id) {
			c.JSON(http.StatusOK, gin.H{"message": "Counter reset successfully", "config": cfg})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Counter reset successfully"})
}

// ─── Stakeholder Config CRUD ───

func (h *InvoiceSignatureHandler) GetStakeholders(c *gin.Context) {
	configs, err := h.uc.GetStakeholders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func (h *InvoiceSignatureHandler) UpdateStakeholder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var input usecase.UpdateStakeholderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config, err := h.uc.UpdateStakeholder(uint(id), input)
	if err != nil {
		if err.Error() == "stakeholder not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Stakeholder not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}


