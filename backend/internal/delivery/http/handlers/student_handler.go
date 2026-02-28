package handlers

import (
	"net/http"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StudentHandler struct {
	studentUsecase *usecase.StudentUsecase
	userRepo       *postgres.UserRepository
}

func NewStudentHandler(studentUsecase *usecase.StudentUsecase, userRepo *postgres.UserRepository) *StudentHandler {
	return &StudentHandler{studentUsecase: studentUsecase, userRepo: userRepo}
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

func (h *StudentHandler) GetChildren(c *gin.Context) {
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

	children, err := h.studentUsecase.GetChildrenByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, children)
}

type CreateStudentRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	NISN     string `json:"nisn" binding:"required"`
	ClassID  uint   `json:"class_id" binding:"required"`
	UnitID   uint   `json:"unit_id" binding:"required"`
	ParentID string `json:"parent_id"` // Can be parent_user_id (user.id) — will be resolved
}

// resolveParentID takes a user ID (from the parent user) and finds the parent table ID
func (h *StudentHandler) resolveParentID(parentUserID string) (*uuid.UUID, error) {
	if parentUserID == "" {
		return nil, nil
	}
	parentUser, err := h.userRepo.FindByID(parentUserID)
	if err != nil {
		return nil, err
	}
	if parentUser.Parent != nil {
		return &parentUser.Parent.ID, nil
	}
	// If user doesn't have a Parent record yet, try parsing as direct parent.id
	parsedUUID, err := uuid.Parse(parentUserID)
	if err != nil {
		return nil, err
	}
	return &parsedUUID, nil
}

func (h *StudentHandler) CreateStudent(c *gin.Context) {
	var req CreateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parentUUID, err := h.resolveParentID(req.ParentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent ID: " + err.Error()})
		return
	}

	if err := h.studentUsecase.CreateStudent(req.Name, req.Email, req.Password, req.NISN, req.ClassID, req.UnitID, parentUUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Student created successfully"})
}

type UpdateStudentRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	NISN     string `json:"nisn" binding:"required"`
	ClassID  uint   `json:"class_id" binding:"required"`
	UnitID   uint   `json:"unit_id" binding:"required"`
	ParentID string `json:"parent_id"` // Can be parent_user_id (user.id) — will be resolved
}

func (h *StudentHandler) UpdateStudent(c *gin.Context) {
	id := c.Param("id")
	var req UpdateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parentUUID, err := h.resolveParentID(req.ParentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent ID: " + err.Error()})
		return
	}

	if err := h.studentUsecase.UpdateStudent(id, req.Name, req.Email, req.NISN, req.ClassID, req.UnitID, parentUUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student updated successfully"})
}

func (h *StudentHandler) DeleteStudent(c *gin.Context) {
	id := c.Param("id")
	if err := h.studentUsecase.DeleteStudent(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
}

func (h *StudentHandler) GetStudentAttendance(c *gin.Context) {
	studentID := c.Query("student_id")
	if studentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id is required"})
		return
	}

	attendances, err := h.studentUsecase.GetStudentAttendance(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attendances)
}
