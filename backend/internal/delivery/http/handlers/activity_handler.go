package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ActivityHandler struct {
	usecase *usecase.ActivityUsecase
}

func NewActivityHandler(uc *usecase.ActivityUsecase) *ActivityHandler {
	return &ActivityHandler{usecase: uc}
}

// ------------------- Activities -------------------

func (h *ActivityHandler) Create(c *gin.Context) {
	var req domain.Activity
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	req.CreatedByID = userID

	if err := h.usecase.Create(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ActivityHandler) GetAllByAcademicYear(c *gin.Context) {
	yearIDStr := c.Query("academic_year_id")
	if yearIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_year_id is required"})
		return
	}

	yearID, err := strconv.ParseUint(yearIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic_year_id"})
		return
	}

	activities, err := h.usecase.GetAllByAcademicYear(uint(yearID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

func (h *ActivityHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	activity, err := h.usecase.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activity)
}

func (h *ActivityHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req domain.Activity
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id

	if err := h.usecase.Update(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "activity updated successfully"})
}

func (h *ActivityHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.usecase.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "activity deleted successfully"})
}

// ------------------- Activity Obligations -------------------

func (h *ActivityHandler) GetObligations(c *gin.Context) {
	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity id"})
		return
	}

	obs, err := h.usecase.GetObligationsByActivity(activityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, obs)
}

func (h *ActivityHandler) BulkAssignClass(c *gin.Context) {
	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity id"})
		return
	}

	var req struct {
		ClassID uint `json:"class_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))

	count, err := h.usecase.BulkAssignClass(activityID, req.ClassID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "count": count})
}

func (h *ActivityHandler) AssignStudent(c *gin.Context) {
	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity id"})
		return
	}

	var req struct {
		StudentID uuid.UUID `json:"student_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))

	ob, err := h.usecase.AssignStudent(activityID, req.StudentID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": ob})
}

func (h *ActivityHandler) DeleteObligation(c *gin.Context) {
	obID, err := uuid.Parse(c.Param("ob_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid obligation id"})
		return
	}

	if err := h.usecase.DeleteObligation(obID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "obligation deleted successfully"})
}

func (h *ActivityHandler) RecordPayment(c *gin.Context) {
	obID, err := uuid.Parse(c.Param("ob_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid obligation id"})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))

	if err := h.usecase.RecordPayment(obID, req.Amount, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "payment recorded successfully"})
}

// ------------------- Activity Transactions -------------------

func (h *ActivityHandler) CreateTransaction(c *gin.Context) {
	var req domain.ActivityTransaction
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity id"})
		return
	}
	req.ActivityID = activityID

	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	req.CreatedByID = userID

	if err := h.usecase.CreateTransaction(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *ActivityHandler) GetTransactions(c *gin.Context) {
	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity id"})
		return
	}

	txs, err := h.usecase.GetTransactionsByActivity(activityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, txs)
}

func (h *ActivityHandler) DeleteTransaction(c *gin.Context) {
	txID, err := uuid.Parse(c.Param("tx_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
		return
	}

	if err := h.usecase.DeleteTransaction(txID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "transaction deleted successfully"})
}

func (h *ActivityHandler) GetSummary(c *gin.Context) {
	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity id"})
		return
	}

	summary, err := h.usecase.GetActivitySummary(activityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}
