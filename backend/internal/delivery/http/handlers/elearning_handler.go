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
	unitID, _ := strconv.Atoi(c.Query("unit_id"))

	var materials []domain.Material
	var err error

	if classID != 0 {
		materials, err = h.elearningUsecase.GetMaterials(uint(classID))
	} else if unitID != 0 {
		materials, err = h.elearningUsecase.GetMaterialsByUnit(uint(unitID))
	} else {
		// If no filter, maybe return empty or all? For now, let's return all if no filter (or handle in usecase)
		// But usecase GetMaterials takes classID.
		// We need to update usecase interface too.
		// For now let's assume usecase has GetMaterialsByUnit.
		materials, err = h.elearningUsecase.GetMaterialsByUnit(uint(unitID)) // Default to unit filter if provided
	}

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
	unitID, _ := strconv.Atoi(c.Query("unit_id"))

	var tasks []domain.Task
	var err error

	if classID != 0 {
		tasks, err = h.elearningUsecase.GetTasks(uint(classID))
	} else if unitID != 0 {
		tasks, err = h.elearningUsecase.GetTasksByUnit(uint(unitID))
	} else {
		tasks, err = h.elearningUsecase.GetTasksByUnit(uint(unitID))
	}

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

type SubmitTaskRequest struct {
	TaskID    uint   `json:"task_id" binding:"required"`
	StudentID string `json:"student_id" binding:"required"`
	FileURL   string `json:"file_url" binding:"required"`
}

func (h *ElearningHandler) SubmitTask(c *gin.Context) {
	var req SubmitTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	if err := h.elearningUsecase.SubmitTask(req.TaskID, studentUUID, req.FileURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Task submitted successfully"})
}

func (h *ElearningHandler) GetStudentSubmissions(c *gin.Context) {
	studentID := c.Query("student_id")
	if studentID == "" {
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

		submissions, err := h.elearningUsecase.GetStudentSubmissionsByUserID(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, submissions)
		return
	}

	studentUUID, err := uuid.Parse(studentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	submissions, err := h.elearningUsecase.GetStudentSubmissions(studentUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, submissions)
}

// Update/Delete Material
func (h *ElearningHandler) UpdateMaterial(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
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

	material := &domain.Material{
		ID:          uint(id),
		Title:       req.Title,
		Description: req.Description,
		FileURL:     req.FileURL,
		ClassID:     req.ClassID,
		SubjectID:   req.SubjectID,
		TeacherID:   teacherUUID,
	}

	if err := h.elearningUsecase.UpdateMaterial(material); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Material updated successfully"})
}

func (h *ElearningHandler) DeleteMaterial(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.elearningUsecase.DeleteMaterial(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Material deleted successfully"})
}

// Update/Delete Task
func (h *ElearningHandler) UpdateTask(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
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

	task := &domain.Task{
		ID:          uint(id),
		Title:       req.Title,
		Description: req.Description,
		Deadline:    deadline,
		ClassID:     req.ClassID,
		SubjectID:   req.SubjectID,
		TeacherID:   teacherUUID,
	}

	if err := h.elearningUsecase.UpdateTask(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task updated successfully"})
}

func (h *ElearningHandler) DeleteTask(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.elearningUsecase.DeleteTask(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}

// Delete Submission
func (h *ElearningHandler) DeleteSubmission(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	if err := h.elearningUsecase.DeleteSubmission(uuid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission deleted successfully"})
}

