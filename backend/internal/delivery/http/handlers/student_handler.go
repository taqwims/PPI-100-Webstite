package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StudentHandler struct {
	studentUsecase *usecase.StudentUsecase
}

func NewStudentHandler(studentUsecase *usecase.StudentUsecase) *StudentHandler {
	return &StudentHandler{studentUsecase: studentUsecase}
}

func (h *StudentHandler) GetAllStudents(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	students, err := h.studentUsecase.GetAllStudents(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

type AttendanceRequest struct {
	StudentID  string `json:"student_id" binding:"required"`
	ScheduleID uint   `json:"schedule_id" binding:"required"`
	Method     string `json:"method" binding:"required"`
	Status     string `json:"status" binding:"required"`
}

func (h *StudentHandler) RecordAttendance(c *gin.Context) {
	var req AttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	if err := h.studentUsecase.RecordAttendance(studentUUID, req.ScheduleID, req.Method, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Attendance recorded successfully"})
}

func (h *StudentHandler) GetScheduleAttendance(c *gin.Context) {
	scheduleID, _ := strconv.Atoi(c.Param("schedule_id"))
	attendances, err := h.studentUsecase.GetScheduleAttendance(uint(scheduleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attendances)
}
