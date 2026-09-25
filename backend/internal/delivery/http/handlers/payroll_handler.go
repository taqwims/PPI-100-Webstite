package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PayrollHandler struct {
	payrollUsecase *usecase.PayrollUsecase
}

func NewPayrollHandler(u *usecase.PayrollUsecase) *PayrollHandler {
	return &PayrollHandler{payrollUsecase: u}
}

func (h *PayrollHandler) GetPayrolls(c *gin.Context) {
	monthStr := c.Query("month")
	yearStr := c.Query("year")
	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	roleIDVal, exists := c.Get("roleID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var roleID int
	switch v := roleIDVal.(type) {
	case uint:
		roleID = int(v)
	case int:
		roleID = v
	case float64:
		roleID = int(v)
	}

	userID := ""
	// Role manajemen yang berhak melihat semua slip gaji: Super Admin (1), Admin (2), TU (3), Kepala Sekolah (8), Bendahara (9), Staf Keuangan (11)
	isManagementRole := roleID == 1 || roleID == 2 || roleID == 3 || roleID == 8 || roleID == 9 || roleID == 11
	if !isManagementRole {
		uidVal, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		if idStr, ok := uidVal.(string); ok {
			userID = idStr
		}
	}

	payrolls, err := h.payrollUsecase.GetPayrolls(month, year, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if payrolls == nil {
		payrolls = []domain.Payroll{}
	}
	c.JSON(http.StatusOK, payrolls)
}

func (h *PayrollHandler) CreatePayroll(c *gin.Context) {
	var payroll domain.Payroll
	if err := c.ShouldBindJSON(&payroll); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.payrollUsecase.CreatePayroll(&payroll); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, payroll)
}

func (h *PayrollHandler) UpdatePayroll(c *gin.Context) {
	id := c.Param("id")
	var payroll domain.Payroll
	if err := c.ShouldBindJSON(&payroll); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.payrollUsecase.UpdatePayroll(id, &payroll); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Payroll updated successfully"})
}

func (h *PayrollHandler) DeletePayroll(c *gin.Context) {
	id := c.Param("id")
	if err := h.payrollUsecase.DeletePayroll(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Payroll deleted successfully"})
}

func (h *PayrollHandler) Pay(c *gin.Context) {
	id := c.Param("id")
	if err := h.payrollUsecase.Pay(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status gaji berhasil diubah menjadi Lunas"})
}

type PostToBKURequest struct {
	Month      int    `json:"month"`
	Year       int    `json:"year"`
	FundSource string `json:"fund_source"`
}

func (h *PayrollHandler) PostToBKU(c *gin.Context) {
	var req PostToBKURequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	entry, err := h.payrollUsecase.PostPayrollToBKU(req.Month, req.Year, req.FundSource)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Total gaji berhasil diposting ke Buku Kas Umum (BKU)",
		"entry":   entry,
	})
}

func (h *PayrollHandler) GetBKUStatus(c *gin.Context) {
	monthStr := c.Query("month")
	yearStr := c.Query("year")
	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	posted, entry, err := h.payrollUsecase.GetBKUPostingStatus(month, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"posted": posted,
		"entry":  entry,
	})
}

func (h *PayrollHandler) GetTemplates(c *gin.Context) {
	templates, err := h.payrollUsecase.GetPayrollTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (h *PayrollHandler) GetTemplateByUserID(c *gin.Context) {
	userID := c.Param("userId")
	template, err := h.payrollUsecase.GetPayrollTemplateByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}
	c.JSON(http.StatusOK, template)
}

func (h *PayrollHandler) UpsertTemplate(c *gin.Context) {
	var template domain.PayrollTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.payrollUsecase.UpsertPayrollTemplate(&template); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, template)
}
