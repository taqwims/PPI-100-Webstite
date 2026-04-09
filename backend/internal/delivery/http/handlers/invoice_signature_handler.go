package handlers

import (
	"fmt"
	"log"
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type InvoiceSignatureHandler struct {
	db *gorm.DB
}

func NewInvoiceSignatureHandler(db *gorm.DB) *InvoiceSignatureHandler {
	return &InvoiceSignatureHandler{db: db}
}

// ─── Sign Invoice ───

type SignInvoiceRequest struct {
	InvoiceType string  `json:"invoice_type" binding:"required"` // Payroll, CashLedger, Bill, Obligation, Infaq, Activity, RKAS, Debt, Savings
	ReferenceID string  `json:"reference_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
	DateStr     string  `json:"date_str" binding:"required"` // ISO date string
}

type SignInvoiceResponse struct {
	Signatures       []utils.StakeholderSig `json:"signatures"`
	VerificationCode string                 `json:"verification_code"`
	InvoiceNumber    string                 `json:"invoice_number"`
}

func (h *InvoiceSignatureHandler) SignInvoice(c *gin.Context) {
	var req SignInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Standardize InvoiceType to Title Case (e.g., "payroll" -> "Payroll")
	req.InvoiceType = strings.Title(strings.ToLower(req.InvoiceType))

	// 1. Check if already signed
	var existing []domain.InvoiceSignature
	h.db.Where("invoice_type = ? AND reference_id = ?", req.InvoiceType, req.ReferenceID).Find(&existing)
	if len(existing) > 0 {
		// Prepare signatures array
		needsUpdate := false
		verificationCode := existing[0].VerificationCode
		docDate := existing[0].DocumentDate

		if verificationCode == "" {
			verificationCode = utils.GenerateVerificationCode(req.InvoiceType, req.ReferenceID, req.Amount, req.DateStr)
			needsUpdate = true
		}
		if docDate == "" {
			docDate = req.DateStr
			needsUpdate = true
		}

		if needsUpdate {
			h.db.Model(&domain.InvoiceSignature{}).
				Where("invoice_type = ? AND reference_id = ?", req.InvoiceType, req.ReferenceID).
				Updates(map[string]interface{}{
					"verification_code": verificationCode,
					"document_date":     docDate,
				})
		}
		
		// Return updated info
		var updated []domain.InvoiceSignature
		h.db.Where("invoice_type = ? AND reference_id = ?", req.InvoiceType, req.ReferenceID).Find(&updated)
		
		// Get invoice number from first record
		invNum := ""
		if len(updated) > 0 {
			invNum = updated[0].InvoiceNumber
		}
		
		c.JSON(http.StatusOK, gin.H{
			"verification_code": verificationCode,
			"invoice_number":    invNum,
			"signatures":        updated,
		})
		return
	}

	// 2. Not signed yet, generate all
	stakeholderNames := make(map[string]string)
	var configs []domain.StakeholderConfig
	h.db.Where("is_active = ?", true).Find(&configs)
	for _, cfg := range configs {
		stakeholderNames[cfg.Role] = cfg.Name
	}

	sigs, err := utils.GenerateAllSignatures(req.InvoiceType, req.ReferenceID, req.Amount, req.DateStr, stakeholderNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	verificationCode := utils.GenerateVerificationCode(req.InvoiceType, req.ReferenceID, req.Amount, req.DateStr)
	invoiceNumber, _ := h.generateInvoiceNumber(req.InvoiceType)

	now := time.Now()
	for _, sig := range sigs {
		record := domain.InvoiceSignature{
			InvoiceType:      req.InvoiceType,
			ReferenceID:      req.ReferenceID,
			StakeholderRole:  sig.Role,
			StakeholderName:  sig.Name,
			SignatureHash:    sig.Signature,
			ShortCode:        sig.ShortCode,
			VerificationCode: verificationCode,
			InvoiceNumber:    invoiceNumber,
			Amount:           req.Amount,
			DocumentDate:     req.DateStr,
			SignedAt:         now,
		}
		h.db.Create(&record)
	}

	c.JSON(http.StatusOK, SignInvoiceResponse{
		Signatures:       sigs,
		VerificationCode: verificationCode,
		InvoiceNumber:    invoiceNumber,
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
		SignedAt    time.Time `json:"signed_at"`
	} `json:"metadata"`
	Signatures []domain.InvoiceSignature `json:"signatures"`
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

	var sigs []domain.InvoiceSignature
	// 1. Try search by verification_code (case-insensitive)
	result := h.db.Where("LOWER(verification_code) = LOWER(?)", code).Find(&sigs)
	if result.Error != nil || len(sigs) == 0 {
		// 2. Fallback: try search by short_code (case-insensitive)
		result = h.db.Where("LOWER(short_code) = LOWER(?)", code).Find(&sigs)
		if result.Error != nil || len(sigs) == 0 {
			c.JSON(http.StatusOK, VerifyInvoiceResponse{Valid: false})
			return
		}
	}

	// Verify each signature cryptographically
	for i := range sigs {
		sig := sigs[i]
		// Ensure Title Case for verification too
		invoiceType := strings.Title(strings.ToLower(sig.InvoiceType))
		
		valid := utils.VerifyStakeholderSignature(sig.StakeholderRole, invoiceType, sig.ReferenceID, sig.Amount, sig.DocumentDate, sig.SignatureHash)
		
		// DIAGNOSTIC LOGGING
		if !valid {
			log.Printf("[VERIFY] INVALID SIGNATURE DETECTED!")
			log.Printf("  - Code: %s", code)
			log.Printf("  - Role: %s", sig.StakeholderRole)
			log.Printf("  - Type: %s (Standardized: %s)", sig.InvoiceType, invoiceType)
			log.Printf("  - Ref:  %s", sig.ReferenceID)
			log.Printf("  - Date: %s", sig.DocumentDate)
			log.Printf("  - Hash in DB: %s", sig.SignatureHash)
			
			// Try to generate what it should be
			expected, _ := utils.GenerateStakeholderSignature(sig.StakeholderRole, invoiceType, sig.ReferenceID, sig.Amount, sig.DocumentDate)
			log.Printf("  - Expected:   %s", expected)
			
			c.JSON(http.StatusOK, VerifyInvoiceResponse{Valid: false})
			return
		}
	}

	res := VerifyInvoiceResponse{
		Valid:      true,
		Signatures: sigs,
	}
	res.Metadata.ModuleName = sigs[0].InvoiceType
	res.Metadata.ReferenceID = sigs[0].ReferenceID
	res.Metadata.Amount = sigs[0].Amount
	res.Metadata.Date = sigs[0].DocumentDate
	res.Metadata.SignedAt = sigs[0].SignedAt

	c.JSON(http.StatusOK, res)
}

// ─── Invoice Number Generation ───

func (h *InvoiceSignatureHandler) generateInvoiceNumber(invoiceType string) (string, error) {
	var config domain.InvoiceNumberConfig
	result := h.db.Where("invoice_type = ? AND is_active = ?", invoiceType, true).First(&config)
	if result.Error != nil {
		// Use default format
		return h.generateDefaultInvoiceNumber(invoiceType), nil
	}

	now := time.Now()

	// Check counter reset
	needsReset := false
	if config.LastResetDate != nil {
		switch config.CounterResetPeriod {
		case "monthly":
			needsReset = now.Year() != config.LastResetDate.Year() || now.Month() != config.LastResetDate.Month()
		case "yearly":
			needsReset = now.Year() != config.LastResetDate.Year()
		}
	} else {
		needsReset = true
	}

	if needsReset {
		config.CurrentCounter = 0
		config.LastResetDate = &now
	}

	config.CurrentCounter++
	h.db.Save(&config)

	// Build number
	parts := []string{config.Prefix}
	if config.IncludeDate {
		parts = append(parts, now.Format("200601"))
	}
	counterStr := fmt.Sprintf("%0*d", config.CounterLength, config.CurrentCounter)
	parts = append(parts, counterStr)

	return strings.Join(parts, config.Separator), nil
}

func (h *InvoiceSignatureHandler) generateDefaultInvoiceNumber(invoiceType string) string {
	prefixes := map[string]string{
		"Payroll":    "SG",
		"CashLedger": "BK",
		"Bill":       "KP",
		"Obligation": "OB",
		"Infaq":      "INF",
		"Activity":   "KW",
		"RKAS":       "RKAS",
		"Debt":       "HT",
		"Savings":    "TB",
	}
	prefix := prefixes[invoiceType]
	if prefix == "" {
		prefix = "INV"
	}
	now := time.Now()
	return fmt.Sprintf("%s-%s-%04d", prefix, now.Format("200601"), now.UnixNano()%10000)
}

// ─── Stakeholder Config CRUD ───

func (h *InvoiceSignatureHandler) GetStakeholders(c *gin.Context) {
	var configs []domain.StakeholderConfig
	h.db.Order("id ASC").Find(&configs)

	// Seed defaults if empty
	if len(configs) == 0 {
		defaults := []domain.StakeholderConfig{
			{Role: "chairman", DisplayLabel: "Ketua Yayasan", Name: "Ketua Yayasan PPI 100", IsActive: true},
			{Role: "treasurer", DisplayLabel: "Bendahara", Name: "Bendahara PPI 100", IsActive: true},
			{Role: "principal", DisplayLabel: "Kepala Sekolah", Name: "Kepala Sekolah SDIT", IsActive: true},
		}
		for _, d := range defaults {
			h.db.Create(&d)
		}
		h.db.Order("id ASC").Find(&configs)
	}

	c.JSON(http.StatusOK, configs)
}

func (h *InvoiceSignatureHandler) UpdateStakeholder(c *gin.Context) {
	id := c.Param("id")
	var config domain.StakeholderConfig
	if err := h.db.First(&config, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stakeholder not found"})
		return
	}

	var input struct {
		Name         string `json:"name"`
		NIP          string `json:"nip"`
		DisplayLabel string `json:"display_label"`
		IsActive     *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" {
		config.Name = input.Name
	}
	if input.NIP != "" {
		config.NIP = input.NIP
	}
	if input.DisplayLabel != "" {
		config.DisplayLabel = input.DisplayLabel
	}
	if input.IsActive != nil {
		config.IsActive = *input.IsActive
	}

	h.db.Save(&config)
	c.JSON(http.StatusOK, config)
}

// ─── Invoice Number Config CRUD ───

func (h *InvoiceSignatureHandler) GetInvoiceConfigs(c *gin.Context) {
	var configs []domain.InvoiceNumberConfig
	h.db.Order("invoice_type ASC").Find(&configs)

	// Seed defaults if empty
	if len(configs) == 0 {
		defaults := []domain.InvoiceNumberConfig{
			{InvoiceType: "Payroll", Prefix: "SG", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Slip Gaji", IsActive: true},
			{InvoiceType: "CashLedger", Prefix: "BK", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Bukti Kas", IsActive: true},
			{InvoiceType: "Bill", Prefix: "KP", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Kuitansi Pembayaran", IsActive: true},
			{InvoiceType: "Obligation", Prefix: "OB", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Kuitansi Tanggungan", IsActive: true},
			{InvoiceType: "Infaq", Prefix: "INF", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Bukti Infaq", IsActive: true},
			{InvoiceType: "Activity", Prefix: "KW", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Kwitansi Kegiatan", IsActive: true},
			{InvoiceType: "RKAS", Prefix: "RKAS", Separator: "/", IncludeDate: true, CounterLength: 3, CounterResetPeriod: "yearly", DisplayLabel: "Laporan RKAS", IsActive: true},
			{InvoiceType: "Debt", Prefix: "HT", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Bukti Bayar Hutang", IsActive: true},
			{InvoiceType: "Savings", Prefix: "TB", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Laporan Tabungan", IsActive: true},
			{InvoiceType: "StudentBill", Prefix: "ST", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Surat Tagihan", IsActive: true},
			{InvoiceType: "FinancialReport", Prefix: "LK", Separator: "/", IncludeDate: true, CounterLength: 3, CounterResetPeriod: "yearly", DisplayLabel: "Laporan Keuangan", IsActive: true},
		}
		for _, d := range defaults {
			h.db.Create(&d)
		}
		h.db.Order("invoice_type ASC").Find(&configs)
	}

	c.JSON(http.StatusOK, configs)
}

func (h *InvoiceSignatureHandler) UpdateInvoiceConfig(c *gin.Context) {
	id := c.Param("id")
	var config domain.InvoiceNumberConfig
	if err := h.db.First(&config, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
		return
	}

	var input struct {
		Prefix             string `json:"prefix"`
		Separator          string `json:"separator"`
		IncludeDate        *bool  `json:"include_date"`
		IncludeUnit        *bool  `json:"include_unit"`
		CounterLength      *int   `json:"counter_length"`
		CounterResetPeriod string `json:"counter_reset_period"`
		DisplayLabel       string `json:"display_label"`
		AutoNotifyWA       *bool  `json:"auto_notify_wa"`
		WATemplateID       *uint  `json:"wa_template_id"`
		IsActive           *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Prefix != "" {
		config.Prefix = input.Prefix
	}
	if input.Separator != "" {
		config.Separator = input.Separator
	}
	if input.IncludeDate != nil {
		config.IncludeDate = *input.IncludeDate
	}
	if input.IncludeUnit != nil {
		config.IncludeUnit = *input.IncludeUnit
	}
	if input.CounterLength != nil {
		config.CounterLength = *input.CounterLength
	}
	if input.CounterResetPeriod != "" {
		config.CounterResetPeriod = input.CounterResetPeriod
	}
	if input.DisplayLabel != "" {
		config.DisplayLabel = input.DisplayLabel
	}
	if input.AutoNotifyWA != nil {
		config.AutoNotifyWA = *input.AutoNotifyWA
	}
	if input.WATemplateID != nil {
		if *input.WATemplateID == 0 {
			config.WATemplateID = nil
		} else {
			config.WATemplateID = input.WATemplateID
		}
	}
	if input.IsActive != nil {
		config.IsActive = *input.IsActive
	}

	h.db.Save(&config)
	c.JSON(http.StatusOK, config)
}

func (h *InvoiceSignatureHandler) ResetCounter(c *gin.Context) {
	id := c.Param("id")
	var config domain.InvoiceNumberConfig
	if err := h.db.First(&config, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
		return
	}

	now := time.Now()
	config.CurrentCounter = 0
	config.LastResetDate = &now
	h.db.Save(&config)

	c.JSON(http.StatusOK, gin.H{"message": "Counter reset successfully", "config": config})
}

// ─── Generate Invoice Number (No signing, just numbering) ───

func (h *InvoiceSignatureHandler) GenerateNumber(c *gin.Context) {
	invoiceType := c.Query("type")
	if invoiceType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type query parameter is required"})
		return
	}

	number, err := h.generateInvoiceNumber(invoiceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invoice_number": number})
}
