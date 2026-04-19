package handlers

import (
	"net/http"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BackupHandler struct {
	usecase *usecase.BackupUsecase
	cfg     *config.Config
}

func NewBackupHandler(usecase *usecase.BackupUsecase, cfg *config.Config) *BackupHandler {
	return &BackupHandler{usecase: usecase, cfg: cfg}
}

// CreateBackup creates a new database backup
func (h *BackupHandler) CreateBackup(c *gin.Context) {
	var req struct {
		Label string `json:"label"`
		Notes string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body — label and notes are optional
		req.Label = ""
		req.Notes = ""
	}

	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak valid"})
		return
	}

	backup, err := h.usecase.CreateBackup(req.Label, req.Notes, userID, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat backup: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Backup berhasil dibuat",
		"backup":  backup,
	})
}

// ListBackups returns all backups for timeline display
func (h *BackupHandler) ListBackups(c *gin.Context) {
	backups, err := h.usecase.ListBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar backup"})
		return
	}
	c.JSON(http.StatusOK, backups)
}

// RestoreBackup restores database from a specific backup
func (h *BackupHandler) RestoreBackup(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var req struct {
		Confirmation string `json:"confirmation" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Confirmation != "RESTORE" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ketik 'RESTORE' untuk konfirmasi"})
		return
	}

	if err := h.usecase.RestoreBackup(id, h.cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal restore: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Database berhasil di-restore"})
}

// DownloadBackup sends the backup file for download
func (h *BackupHandler) DownloadBackup(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	filePath, filename, err := h.usecase.GetBackupFilePath(id, h.cfg)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.FileAttachment(filePath, filename)
}

// DeleteBackup removes a backup file and record
func (h *BackupHandler) DeleteBackup(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.usecase.DeleteBackup(id, h.cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus backup: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Backup berhasil dihapus"})
}
