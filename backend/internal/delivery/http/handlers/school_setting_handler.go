package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
)

type SchoolSettingHandler struct {
	usecase *usecase.SchoolSettingUsecase
}

func NewSchoolSettingHandler(usecase *usecase.SchoolSettingUsecase) *SchoolSettingHandler {
	return &SchoolSettingHandler{usecase: usecase}
}

// GetAllSettings returns all school settings
func (h *SchoolSettingHandler) GetAllSettings(c *gin.Context) {
	settings, err := h.usecase.GetAllSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil pengaturan"})
		return
	}
	c.JSON(http.StatusOK, settings)
}

// UpdateSettings updates school settings (admin-editable only)
func (h *SchoolSettingHandler) UpdateSettings(c *gin.Context) {
	var req struct {
		Settings []struct {
			Key   string `json:"key" binding:"required"`
			Value string `json:"value"`
		} `json:"settings" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	// Convert to domain objects
	updates := make([]domain.SchoolSetting, len(req.Settings))
	for i, s := range req.Settings {
		updates[i] = domain.SchoolSetting{Key: s.Key, Value: s.Value}
	}

	// isAdmin = true — enforce admin-edit permission
	if err := h.usecase.UpdateSettings(updates, true); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pengaturan berhasil diperbarui"})
}

// GetUnits returns all units with foundation info (view-only for admin)
func (h *SchoolSettingHandler) GetUnits(c *gin.Context) {
	units, err := h.usecase.GetUnits()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data unit"})
		return
	}

	foundations, err := h.usecase.GetFoundations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data yayasan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"units":       units,
		"foundations": foundations,
	})
}

// UploadLogo handles school logo file upload
func (h *SchoolSettingHandler) UploadLogo(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan"})
		return
	}

	// Save to uploads directory
	uploadDir := "./uploads"
	os.MkdirAll(uploadDir, os.ModePerm)
	
	filename := "school_logo_" + file.Filename
	dst := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file"})
		return
	}

	// Update the school_logo_url setting
	logoURL := "/uploads/" + filename
	updates := []domain.SchoolSetting{
		{Key: "school_logo_url", Value: logoURL},
	}
	if err := h.usecase.UpdateSettings(updates, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update setting logo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Logo berhasil diupload",
		"logo_url": logoURL,
	})
}
