package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	userUsecase *usecase.UserUsecase
}

func NewUserHandler(userUsecase *usecase.UserUsecase) *UserHandler {
	return &UserHandler{userUsecase: userUsecase}
}

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userUsecase.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	RoleID   uint   `json:"role_id" binding:"required"`
	UnitID   uint   `json:"unit_id" binding:"required"`
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userUsecase.CreateUser(req.Name, req.Email, req.Password, req.RoleID, req.UnitID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if err := h.userUsecase.DeleteUser(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email" binding:"email"`
	Password string `json:"password"`
	RoleID   uint   `json:"role_id"`
	UnitID   uint   `json:"unit_id"`
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user := &domain.User{
		ID:           userUUID,
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: req.Password, // Usecase will handle hashing if not empty
		RoleID:       req.RoleID,
		UnitID:       req.UnitID,
	}

	if err := h.userUsecase.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
}

