package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"ppi-100-sis/internal/usecase"
	"strings"

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
	Name              string `json:"name"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	Address           string `json:"address"`
	BankName          string `json:"bank_name"`
	BankAccountNumber string `json:"bank_account_number"`
	BankAccountHolder string `json:"bank_account_holder"`
}

// PUT /profile - Update name, email, and bank details
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

	// Update fields - preserve existing values if not provided
	user.ID = uuid
	if strings.TrimSpace(req.Name) != "" {
		user.Name = strings.TrimSpace(req.Name)
	}
	if strings.TrimSpace(req.Email) != "" {
		user.Email = strings.TrimSpace(req.Email)
	}
	if strings.TrimSpace(req.Phone) != "" {
		user.Phone = strings.TrimSpace(req.Phone)
	}
	if strings.TrimSpace(req.Address) != "" {
		user.Address = strings.TrimSpace(req.Address)
	}
	if strings.TrimSpace(req.BankName) != "" {
		user.BankName = strings.TrimSpace(req.BankName)
	}
	if strings.TrimSpace(req.BankAccountNumber) != "" {
		user.BankAccountNumber = strings.TrimSpace(req.BankAccountNumber)
	}
	if strings.TrimSpace(req.BankAccountHolder) != "" {
		user.BankAccountHolder = strings.TrimSpace(req.BankAccountHolder)
	}

	if err := h.userUsecase.UpdateUser(user, ""); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
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

	if err := h.userUsecase.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
	uploadDir := "./uploads/profiles"
	os.MkdirAll(uploadDir, os.ModePerm)
	
	filename := userID + "_" + file.Filename
	savePath := filepath.Join(uploadDir, filename)

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
	if err := h.userUsecase.UpdateUser(user, ""); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Photo uploaded successfully",
		"photo_url": user.PhotoURL,
	})
}
