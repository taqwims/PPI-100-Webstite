package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BKHandler struct {
	bkUsecase *usecase.BKUsecase
}

func NewBKHandler(bkUsecase *usecase.BKUsecase) *BKHandler {
	return &BKHandler{bkUsecase: bkUsecase}
}

type CreateViolationRequest struct {
	Name        string `json:"name" binding:"required"`
	Points      int    `json:"points" binding:"required"`
	Description string `json:"description"`
}

func (h *BKHandler) CreateViolation(c *gin.Context) {
	var req CreateViolationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.bkUsecase.CreateViolation(req.Name, req.Points, req.Description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Violation type created successfully"})
}

func (h *BKHandler) GetAllViolations(c *gin.Context) {
	violations, err := h.bkUsecase.GetAllViolations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, violations)
}

type CreateBKCallRequest struct {
	StudentID string `json:"student_id" binding:"required"`
	TeacherID string `json:"teacher_id" binding:"required"`
	Reason    string `json:"reason" binding:"required"`
	Date      string `json:"date" binding:"required"`
}

func (h *BKHandler) CreateBKCall(c *gin.Context) {
	var req CreateBKCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	teacherUUID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
		return
	}

	if err := h.bkUsecase.CreateBKCall(studentUUID, teacherUUID, req.Reason, date); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "BK Call created successfully"})
}

func (h *BKHandler) GetAllBKCalls(c *gin.Context) {
	studentID := c.Query("student_id")
	if studentID != "" {
		calls, err := h.bkUsecase.GetStudentBKCalls(studentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, calls)
		return
	}

	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	calls, err := h.bkUsecase.GetAllBKCalls(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, calls)
}

// Update/Delete Violation
func (h *BKHandler) UpdateViolation(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req CreateViolationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	violation := &domain.Violation{
		ID:          uint(id),
		Name:        req.Name,
		Points:      req.Points,
		Description: req.Description,
	}

	if err := h.bkUsecase.UpdateViolation(violation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Violation updated successfully"})
}

func (h *BKHandler) DeleteViolation(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.bkUsecase.DeleteViolation(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Violation deleted successfully"})
}

// Update/Delete BKCall
func (h *BKHandler) UpdateBKCall(c *gin.Context) {
	id := c.Param("id")
	var req CreateBKCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	callUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid call ID"})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	teacherUUID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
		return
	}

	call := &domain.BKCall{
		ID:        callUUID,
		StudentID: studentUUID,
		TeacherID: teacherUUID,
		Reason:    req.Reason,
		Date:      date,
	}

	if err := h.bkUsecase.UpdateBKCall(call); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "BK Call updated successfully"})
}

func (h *BKHandler) DeleteBKCall(c *gin.Context) {
	id := c.Param("id")
	if err := h.bkUsecase.DeleteBKCall(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "BK Call deleted successfully"})
}
