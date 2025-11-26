package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AcademicHandler struct {
	academicUsecase *usecase.AcademicUsecase
}

func NewAcademicHandler(academicUsecase *usecase.AcademicUsecase) *AcademicHandler {
	return &AcademicHandler{academicUsecase: academicUsecase}
}

// Class Handlers
func (h *AcademicHandler) CreateClass(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		UnitID uint   `json:"unit_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.academicUsecase.CreateClass(req.Name, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Class created successfully"})
}

func (h *AcademicHandler) GetAllClasses(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	classes, err := h.academicUsecase.GetAllClasses(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, classes)
}

// Subject Handlers
func (h *AcademicHandler) CreateSubject(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		UnitID uint   `json:"unit_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.academicUsecase.CreateSubject(req.Name, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Subject created successfully"})
}

func (h *AcademicHandler) GetAllSubjects(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	subjects, err := h.academicUsecase.GetAllSubjects(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, subjects)
}

// Schedule Handlers
func (h *AcademicHandler) CreateSchedule(c *gin.Context) {
	var req domain.Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.academicUsecase.CreateSchedule(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Schedule created successfully"})
}

func (h *AcademicHandler) GetAllSchedules(c *gin.Context) {
	classID, _ := strconv.Atoi(c.Query("class_id"))
	teacherID := c.Query("teacher_id")
	schedules, err := h.academicUsecase.GetAllSchedules(uint(classID), teacherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}
