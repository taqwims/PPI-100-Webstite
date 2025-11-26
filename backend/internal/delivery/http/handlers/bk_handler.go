package handlers

import (
	"net/http"
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
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	calls, err := h.bkUsecase.GetAllBKCalls(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, calls)
}
