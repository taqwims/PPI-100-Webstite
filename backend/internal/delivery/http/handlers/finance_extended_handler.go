package handlers

import (
	"fmt"
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"
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

func (h *FinanceExtendedHandler) UpdateAcademicYear(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req domain.AcademicYear
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = uint(id)

	if err := h.financeExtendedUsecase.UpdateAcademicYear(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Academic year updated"})
}

func (h *FinanceExtendedHandler) DeleteAcademicYear(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.financeExtendedUsecase.DeleteAcademicYear(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Academic year deleted"})
}

func (h *FinanceExtendedHandler) SetActiveAcademicYear(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.financeExtendedUsecase.SetActiveAcademicYear(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Academic year set as active"})
}

type RolloverRequest struct {
	FromYearID uint `json:"from_year_id" binding:"required"`
	ToYearID   uint `json:"to_year_id" binding:"required"`
}

func (h *FinanceExtendedHandler) RolloverAcademicYear(c *gin.Context) {
	var req RolloverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.FromYearID == req.ToYearID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tahun ajaran asal dan tujuan tidak boleh sama"})
		return
	}

	count, err := h.financeExtendedUsecase.RolloverAcademicYear(req.FromYearID, req.ToYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Berhasil memindahkan %d tunggakan ke tahun ajaran baru", count),
		"count":   count,
	})
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

type UpdateSavingTransactionRequest struct {
	Amount float64 `json:"amount" binding:"required"`
	Notes  string  `json:"notes"`
}

func (h *FinanceExtendedHandler) UpdateSavingTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	var req UpdateSavingTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.financeExtendedUsecase.UpdateSavingTransaction(id, req.Amount, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Saving transaction updated successfully"})
}

func (h *FinanceExtendedHandler) DeleteSavingTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	if err := h.financeExtendedUsecase.DeleteSavingTransaction(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Saving transaction deleted successfully"})
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
	var classID *uint
	if classIDStr := c.Query("class_id"); classIDStr != "" {
		parsed, err := strconv.ParseUint(classIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class_id"})
			return
		}
		v := uint(parsed)
		classID = &v
	}

	accounts, err := h.financeExtendedUsecase.GetAllSavingAccounts(classID)
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

type TransferSavingsRequest struct {
	StudentID string  `json:"student_id" binding:"required"`
	Module    string  `json:"module" binding:"required"` // CashLedger, Infaq
	Direction string  `json:"direction" binding:"required"` // ToSaving, FromSaving
	Amount    float64 `json:"amount" binding:"required"`
	Notes     string  `json:"notes"`
}

func (h *FinanceExtendedHandler) TransferSavings(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req TransferSavingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	err = h.financeExtendedUsecase.TransferSavings(studentUUID, handledByID, req.Module, req.Direction, req.Amount, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fund transferred successfully"})
}

// ------------------- My Savings (Student / Parent) -------------------

func (h *FinanceExtendedHandler) GetMySavings(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	account, err := h.financeExtendedUsecase.GetSavingAccountByUserID(userID)
	if err != nil {
		c.JSON(http.StatusOK, nil) // No account yet, return null
		return
	}

	txns, _ := h.financeExtendedUsecase.GetSavingTransactions(account.ID)
	c.JSON(http.StatusOK, gin.H{
		"account":      account,
		"transactions": txns,
	})
}

func (h *FinanceExtendedHandler) GetMyChildrenSavings(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	accounts, err := h.financeExtendedUsecase.GetSavingAccountsByParentID(userID)
	if err != nil {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	var result []gin.H
	for _, acc := range accounts {
		txns, _ := h.financeExtendedUsecase.GetSavingTransactions(acc.ID)
		result = append(result, gin.H{
			"account":      acc,
			"transactions": txns,
		})
	}
	c.JSON(http.StatusOK, result)
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

// ------------------- Savings Operational -------------------

type OperationalWithdrawRequest struct {
	Amount  float64 `json:"amount" binding:"required"`
	Purpose string  `json:"purpose" binding:"required"`
	UnitID  uint    `json:"unit_id" binding:"required"`
}

func (h *FinanceExtendedHandler) WithdrawSavingsOperational(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req OperationalWithdrawRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.financeExtendedUsecase.WithdrawSavingsOperational(handledByID, req.Amount, req.Purpose, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dana tidak mencukupi atau terjadi kesalahan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dana operasional berhasil diambil"})
}

type OperationalReturnRequest struct {
	WithdrawalID string  `json:"withdrawal_id" binding:"required"`
	Amount       float64 `json:"amount" binding:"required"`
	Source       string  `json:"source"` // CashLedger, Infaq
	Notes        string  `json:"notes"`
	UnitID       uint    `json:"unit_id" binding:"required"`
}

func (h *FinanceExtendedHandler) ReturnSavingsOperational(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req OperationalReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	withdrawalUUID, err := uuid.Parse(req.WithdrawalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid withdrawal ID"})
		return
	}

	if err := h.financeExtendedUsecase.ReturnSavingsOperational(withdrawalUUID, handledByID, req.Amount, req.Notes, req.Source, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengembalikan dana: jumlah melebihi sisa"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dana berhasil dikembalikan"})
}

func (h *FinanceExtendedHandler) GetSavingsOperationalHistory(c *gin.Context) {
	history, err := h.financeExtendedUsecase.GetSavingsOperationalHistory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (h *FinanceExtendedHandler) GetSavingsOperationalReturns(c *gin.Context) {
	withdrawalID := c.Param("withdrawal_id")
	withdrawalUUID, err := uuid.Parse(withdrawalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid withdrawal ID"})
		return
	}

	returns, err := h.financeExtendedUsecase.GetSavingsOperationalReturns(withdrawalUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, returns)
}

func (h *FinanceExtendedHandler) GetSavingsPoolSummary(c *gin.Context) {
	summary, err := h.financeExtendedUsecase.GetSavingsPoolSummary()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *FinanceExtendedHandler) GetSavingsRecap(c *gin.Context) {
	params := domain.SavingsRecapParams{}

	params.PeriodType = c.Query("period_type")

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		t, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
			return
		}
		params.StartDate = t
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		t, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
			return
		}
		params.EndDate = t
	}

	if yearStr := c.Query("year"); yearStr != "" {
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
			return
		}
		params.Year = year
	}

	if semesterStr := c.Query("semester"); semesterStr != "" {
		semester, err := strconv.Atoi(semesterStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid semester"})
			return
		}
		params.Semester = semester
	}

	if classIDStr := c.Query("class_id"); classIDStr != "" {
		parsed, err := strconv.ParseUint(classIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class_id"})
			return
		}
		v := uint(parsed)
		params.ClassID = &v
	}

	resp, err := h.financeExtendedUsecase.GetSavingsRecap(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ------------------- Savings Receivable / Piutang -------------------

type ReceivableWithdrawRequest struct {
	Amount       float64 `json:"amount" binding:"required"`
	Purpose      string  `json:"purpose" binding:"required"`
	Description  string  `json:"description"` // Keterangan piutang
	BorrowerName string  `json:"borrower_name" binding:"required"`
	BorrowerID   string  `json:"borrower_id" binding:"required"`
	DueDate      string  `json:"due_date" binding:"required"`
	ReturnMethod string  `json:"return_method" binding:"required"`
	UnitID       uint    `json:"unit_id" binding:"required"`
}

func (h *FinanceExtendedHandler) WithdrawSavingsReceivable(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req ReceivableWithdrawRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal jatuh tempo salah (harus YYYY-MM-DD)"})
		return
	}

	if err := h.financeExtendedUsecase.WithdrawSavingsReceivable(handledByID, req.Amount, req.Purpose, req.Description, req.BorrowerName, req.BorrowerID, dueDate, req.ReturnMethod, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dana tidak mencukupi atau terjadi kesalahan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Piutang berhasil dicatat"})
}

type ReceivableReturnRequest struct {
	WithdrawalID string  `json:"withdrawal_id" binding:"required"`
	Amount       float64 `json:"amount" binding:"required"`
	Notes        string  `json:"notes"`
	UnitID       uint    `json:"unit_id" binding:"required"`
}

func (h *FinanceExtendedHandler) ReturnSavingsReceivable(c *gin.Context) {
	handledByID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req ReceivableReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	withdrawalUUID, err := uuid.Parse(req.WithdrawalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid withdrawal ID"})
		return
	}

	if err := h.financeExtendedUsecase.ReturnSavingsReceivable(withdrawalUUID, handledByID, req.Amount, req.Notes, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengembalikan piutang: jumlah melebihi sisa"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Piutang berhasil dikembalikan"})
}

func (h *FinanceExtendedHandler) GetSavingsReceivableHistory(c *gin.Context) {
	history, err := h.financeExtendedUsecase.GetSavingsReceivableHistory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (h *FinanceExtendedHandler) GetSavingsReceivableReturns(c *gin.Context) {
	withdrawalID := c.Param("withdrawal_id")
	withdrawalUUID, err := uuid.Parse(withdrawalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid withdrawal ID"})
		return
	}

	returns, err := h.financeExtendedUsecase.GetSavingsReceivableReturns(withdrawalUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, returns)
}
