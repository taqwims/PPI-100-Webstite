package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

func (h *AcademicHandler) DeleteClass(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.academicUsecase.DeleteClass(uint(id)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Class deleted successfully"})
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

func (h *AcademicHandler) GetHomeroomClass(c *gin.Context) {
	teacherID := c.Query("teacher_id")
	if teacherID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "teacher_id is required"})
		return
	}

	class, err := h.academicUsecase.GetHomeroomClass(teacherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *AcademicHandler) GetStudentReportCard(c *gin.Context) {
	studentID := c.Param("student_id")
	if studentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id is required"})
		return
	}

	if studentID == "me" {
		userIDVal, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var userID string
		if id, ok := userIDVal.(string); ok {
			userID = id
		} else if id, ok := userIDVal.(uuid.UUID); ok {
			userID = id.String()
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
			return
		}

		reportCard, err := h.academicUsecase.GetStudentReportCardByUserID(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, reportCard)
		return
	}

	id, err := uuid.Parse(studentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student_id"})
		return
	}

	reportCard, err := h.academicUsecase.GetStudentReportCard(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reportCard)
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

	if classID == 0 && teacherID == "" {
		userIDVal, exists := c.Get("userID")
		if exists {
			var userID string
			if id, ok := userIDVal.(string); ok {
				userID = id
			} else if id, ok := userIDVal.(uuid.UUID); ok {
				userID = id.String()
			}

			if userID != "" {
				cid, err := h.academicUsecase.GetStudentClassIDByUserID(userID)
				if err == nil {
					classID = int(cid)
				}
			}
		}
	}

	schedules, err := h.academicUsecase.GetAllSchedules(uint(classID), teacherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}

func (h *AcademicHandler) UpdateClass(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.academicUsecase.UpdateClass(uint(id), req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Class updated successfully"})
}

func (h *AcademicHandler) UpdateSubject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.academicUsecase.UpdateSubject(uint(id), req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subject updated successfully"})
}

func (h *AcademicHandler) DeleteSubject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.academicUsecase.DeleteSubject(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subject deleted successfully"})
}

func (h *AcademicHandler) UpdateSchedule(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req domain.Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.academicUsecase.UpdateSchedule(uint(id), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Schedule updated successfully"})
}

func (h *AcademicHandler) DeleteSchedule(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.academicUsecase.DeleteSchedule(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Schedule deleted successfully"})
}

