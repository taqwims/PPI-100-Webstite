package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ElearningHandler struct {
	elearningUsecase *usecase.ElearningUsecase
}

func NewElearningHandler(elearningUsecase *usecase.ElearningUsecase) *ElearningHandler {
	return &ElearningHandler{elearningUsecase: elearningUsecase}
}

type CreateMaterialRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	FileURL     string `json:"file_url"`
	ClassID     uint   `json:"class_id" binding:"required"`
	SubjectID   uint   `json:"subject_id" binding:"required"`
	TeacherID   string `json:"teacher_id" binding:"required"`
}

func (h *ElearningHandler) CreateMaterial(c *gin.Context) {
	var req CreateMaterialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacherUUID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	if err := h.elearningUsecase.CreateMaterial(req.Title, req.Description, req.FileURL, req.ClassID, req.SubjectID, teacherUUID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Material created successfully"})
}

func (h *ElearningHandler) GetMaterials(c *gin.Context) {
	classID, _ := strconv.Atoi(c.Query("class_id"))
	materials, err := h.elearningUsecase.GetMaterials(uint(classID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, materials)
}

type CreateTaskRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Deadline    string `json:"deadline" binding:"required"`
	ClassID     uint   `json:"class_id" binding:"required"`
	SubjectID   uint   `json:"subject_id" binding:"required"`
	TeacherID   string `json:"teacher_id" binding:"required"`
}

func (h *ElearningHandler) CreateTask(c *gin.Context) {
	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacherUUID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	deadline, err := time.Parse("2006-01-02", req.Deadline)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
		return
	}

	if err := h.elearningUsecase.CreateTask(req.Title, req.Description, deadline, req.ClassID, req.SubjectID, teacherUUID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Task created successfully"})
}

func (h *ElearningHandler) GetTasks(c *gin.Context) {
	classID, _ := strconv.Atoi(c.Query("class_id"))
	tasks, err := h.elearningUsecase.GetTasks(uint(classID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

type GradeSubmissionRequest struct {
	Grade float64 `json:"grade" binding:"required"`
}

func (h *ElearningHandler) GradeSubmission(c *gin.Context) {
	id := c.Param("id")
	var req GradeSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.elearningUsecase.GradeSubmission(id, req.Grade); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission graded successfully"})
}

func (h *ElearningHandler) GetSubmissions(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	submissions, err := h.elearningUsecase.GetSubmissions(uint(taskID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, submissions)
}
