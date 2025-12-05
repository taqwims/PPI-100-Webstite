package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"
	"ppi-100-sis/pkg/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProfileHandler struct {
	userUsecase *usecase.UserUsecase
}

func NewProfileHandler(userUsecase *usecase.UserUsecase) *ProfileHandler {
	return &ProfileHandler{userUsecase: userUsecase}
}

// GET /profile - Get current user profile
func (h *ProfileHandler) GetProfile(c *gin.Context) {
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

	user, err := h.userUsecase.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

type ProfileUpdateRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// PUT /profile - Update name and email
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
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

	var req ProfileUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uuid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Get existing user
	user, err := h.userUsecase.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	user.ID = uuid
	user.Name = req.Name
	user.Email = req.Email

	if err := h.userUsecase.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

type ProfileChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// PUT /profile/password - Change password
func (h *ProfileHandler) ChangePassword(c *gin.Context) {
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

	var req ProfileChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user
	user, err := h.userUsecase.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Verify old password
	if !utils.CheckPasswordHash(req.OldPassword, user.PasswordHash) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password lama tidak sesuai"})
		return
	}

	// Hash new password
	newHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	user.PasswordHash = newHash
	if err := h.userUsecase.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// POST /profile/photo - Upload profile photo
func (h *ProfileHandler) UploadPhoto(c *gin.Context) {
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

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// For now, we'll just save to a static folder
	// In production, you'd upload to S3 or similar
	filename := userID + "_" + file.Filename
	savePath := "./uploads/profiles/" + filename

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update user photo URL
	user, err := h.userUsecase.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.PhotoURL = "/uploads/profiles/" + filename
	if err := h.userUsecase.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Photo uploaded successfully",
		"photo_url": user.PhotoURL,
	})
}
