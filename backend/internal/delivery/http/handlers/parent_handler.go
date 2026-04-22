package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ParentHandler struct {
	parentUsecase *usecase.ParentUsecase
}

func NewParentHandler(parentUsecase *usecase.ParentUsecase) *ParentHandler {
	return &ParentHandler{parentUsecase: parentUsecase}
}

func (h *ParentHandler) GetAllParents(c *gin.Context) {
	parents, err := h.parentUsecase.GetAllParents()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, parents)
}

func (h *ParentHandler) GetParentByID(c *gin.Context) {
	id := c.Param("id")
	parent, err := h.parentUsecase.GetParentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parent not found"})
		return
	}
	c.JSON(http.StatusOK, parent)
}

type CreateParentRequest struct {
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	Phone      string `json:"phone"`
	Address    string `json:"address"`
	Occupation string `json:"occupation"`
	Relation   string `json:"relation"`
	UnitID     uint   `json:"unit_id" binding:"required"`
}

func (h *ParentHandler) CreateParent(c *gin.Context) {
	var req CreateParentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.parentUsecase.CreateParent(req.Name, req.Email, req.Password, req.Phone, req.Address, req.Occupation, req.Relation, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Parent created successfully"})
}

type UpdateParentRequest struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Phone      string `json:"phone"`
	Address    string `json:"address"`
	Occupation string `json:"occupation"`
	Relation   string `json:"relation"`
}

func (h *ParentHandler) UpdateParent(c *gin.Context) {
	id := c.Param("id")
	var req UpdateParentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.parentUsecase.UpdateParent(id, req.Name, req.Email, req.Password, req.Phone, req.Address, req.Occupation, req.Relation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Parent updated successfully"})
}

func (h *ParentHandler) DeleteParent(c *gin.Context) {
	id := c.Param("id")
	if err := h.parentUsecase.DeleteParent(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Parent deleted successfully"})
}

func (h *ParentHandler) AssignChild(c *gin.Context) {
	parentID := c.Param("id")
	var req struct {
		StudentID string `json:"student_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.parentUsecase.AssignChild(parentID, req.StudentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Child assigned successfully"})
}

func (h *ParentHandler) RemoveChild(c *gin.Context) {
	// Not necessarily needing parentID if studentID uniquely identifies the link
	studentID := c.Param("student_id")
	if err := h.parentUsecase.RemoveChild(studentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Child removed successfully"})
}
