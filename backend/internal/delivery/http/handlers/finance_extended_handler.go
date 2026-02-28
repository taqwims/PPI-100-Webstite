package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FinanceExtendedHandler struct {
	financeExtendedUsecase *usecase.FinanceExtendedUsecase
}

func NewFinanceExtendedHandler(financeExtendedUsecase *usecase.FinanceExtendedUsecase) *FinanceExtendedHandler {
	return &FinanceExtendedHandler{financeExtendedUsecase: financeExtendedUsecase}
}

// helper: safely extract userID string from gin context
func getUserIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		return uuid.UUID{}, false
	}
	switch v := userIDVal.(type) {
	case string:
		parsed, err := uuid.Parse(v)
		if err != nil {
			return uuid.UUID{}, false
		}
		return parsed, true
	case uuid.UUID:
		return v, true
	default:
		return uuid.UUID{}, false
	}
}

// ------------------- Academic Year -------------------

func (h *FinanceExtendedHandler) CreateAcademicYear(c *gin.Context) {
	var req domain.AcademicYear
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.financeExtendedUsecase.CreateAcademicYear(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Academic year created successfully", "data": req})
}

func (h *FinanceExtendedHandler) GetAllAcademicYears(c *gin.Context) {
	years, err := h.financeExtendedUsecase.GetAllAcademicYears()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, years)
}

// ------------------- Savings -------------------

type SavingsTransactionRequest struct {
	StudentID string  `json:"student_id" binding:"required"`
	Type      string  `json:"type" binding:"required"` // Deposit, Withdrawal
	Amount    float64 `json:"amount" binding:"required"`
	Notes     string  `json:"notes"`
}

func (h *FinanceExtendedHandler) ProcessSavingTransaction(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req SavingsTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	err = h.financeExtendedUsecase.ProcessSavingTransaction(studentUUID, handledByID, req.Type, req.Amount, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Saving transaction processed successfully"})
}

func (h *FinanceExtendedHandler) GetStudentSavings(c *gin.Context) {
	studentID := c.Param("student_id")
	studentUUID, err := uuid.Parse(studentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	account, err := h.financeExtendedUsecase.GetStudentSavingAccount(studentUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, account)
}

func (h *FinanceExtendedHandler) GetAllSavingAccounts(c *gin.Context) {
	accounts, err := h.financeExtendedUsecase.GetAllSavingAccounts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, accounts)
}

func (h *FinanceExtendedHandler) GetSavingTransactions(c *gin.Context) {
	accountID := c.Param("account_id")
	accountUUID, err := uuid.Parse(accountID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	txns, err := h.financeExtendedUsecase.GetSavingTransactions(accountUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, txns)
}

// ------------------- Payroll -------------------

func (h *FinanceExtendedHandler) CreatePayroll(c *gin.Context) {
	processedByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req domain.Payroll
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.ProcessedByID = processedByID
	req.Total = req.BasicSalary + req.Allowances - req.Deductions

	if err := h.financeExtendedUsecase.CreatePayroll(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Payroll created successfully", "data": req})
}

func (h *FinanceExtendedHandler) GetPayrolls(c *gin.Context) {
	monthYear := c.Query("month_year") // optional filter
	payrolls, err := h.financeExtendedUsecase.GetPayrolls(monthYear)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payrolls)
}

func (h *FinanceExtendedHandler) UpdatePayroll(c *gin.Context) {
	id := c.Param("id")
	payrollUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payroll ID"})
		return
	}

	var req domain.Payroll
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = payrollUUID

	if err := h.financeExtendedUsecase.UpdatePayroll(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payroll updated successfully"})
}

func (h *FinanceExtendedHandler) DeletePayroll(c *gin.Context) {
	id := c.Param("id")
	if err := h.financeExtendedUsecase.DeletePayroll(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payroll deleted successfully"})
}

// ------------------- Cash Ledger -------------------

func (h *FinanceExtendedHandler) AddCashLedgerEntry(c *gin.Context) {
	createdByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req domain.CashLedger
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.CreatedBy = createdByID
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	if err := h.financeExtendedUsecase.AddCashLedgerEntry(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Cash ledger entry added successfully", "data": req})
}

func (h *FinanceExtendedHandler) GetCashLedger(c *gin.Context) {
	entries, err := h.financeExtendedUsecase.GetCashLedger()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}

func (h *FinanceExtendedHandler) UpdateCashLedgerEntry(c *gin.Context) {
	id := c.Param("id")
	entryUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash ledger entry ID"})
		return
	}

	var req domain.CashLedger
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = entryUUID

	if err := h.financeExtendedUsecase.UpdateCashLedgerEntry(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cash ledger entry updated successfully"})
}

func (h *FinanceExtendedHandler) DeleteCashLedgerEntry(c *gin.Context) {
	id := c.Param("id")
	if err := h.financeExtendedUsecase.DeleteCashLedgerEntry(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cash ledger entry deleted successfully"})
}

// ------------------- Daily Infaq -------------------

func (h *FinanceExtendedHandler) AddDailyInfaqEntry(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req domain.DailyInfaq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.HandledByID = handledByID
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	if err := h.financeExtendedUsecase.AddDailyInfaqEntry(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Daily infaq entry added successfully", "data": req})
}

func (h *FinanceExtendedHandler) GetDailyInfaq(c *gin.Context) {
	entries, err := h.financeExtendedUsecase.GetDailyInfaq()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}

func (h *FinanceExtendedHandler) UpdateDailyInfaqEntry(c *gin.Context) {
	id := c.Param("id")
	entryUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid infaq entry ID"})
		return
	}

	var req domain.DailyInfaq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = entryUUID

	if err := h.financeExtendedUsecase.UpdateDailyInfaqEntry(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Infaq entry updated successfully"})
}

func (h *FinanceExtendedHandler) DeleteDailyInfaqEntry(c *gin.Context) {
	id := c.Param("id")
	if err := h.financeExtendedUsecase.DeleteDailyInfaqEntry(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Infaq entry deleted successfully"})
}

// ------------------- Analytics Dashboard -------------------

func (h *FinanceExtendedHandler) GetDashboardAnalytics(c *gin.Context) {
	analytics, err := h.financeExtendedUsecase.GetDashboardAnalytics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, analytics)
}
