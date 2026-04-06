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

	payrolls, err := h.payrollUsecase.GetPayrolls(month, year)
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
