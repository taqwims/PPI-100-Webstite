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
	if id, ok := roleIDVal.(int); ok {
		roleID = id
	} else if id, ok := roleIDVal.(float64); ok {
		roleID = int(id)
	}

	userID := ""
	// Jika bukan Super Admin (1) dan bukan Bendahara (9), hanya boleh lihat gajinya sendiri
	if roleID != 1 && roleID != 9 {
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
	c.JSON(http.StatusOK, gin.H{"message": "Payroll paid successfully"})
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
		// Return 404 if not found, instead of 500
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
