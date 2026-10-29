package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"ppi-100-sis/internal/usecase"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StaffLeaveHandler struct {
	leaveUsecase *usecase.StaffLeaveUsecase
	db           *gorm.DB
}

func NewStaffLeaveHandler(leaveUsecase *usecase.StaffLeaveUsecase, db *gorm.DB) *StaffLeaveHandler {
	return &StaffLeaveHandler{
		leaveUsecase: leaveUsecase,
		db:           db,
	}
}

// POST /staff/leave-requests - Mengajukan izin / tugas luar / sakit / dinas (Guru & Staf)
func (h *StaffLeaveHandler) CreateLeaveRequest(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var leaveType string
	var startDateStr string
	var endDateStr string
	var reason string
	var attachmentURL string

	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		leaveType = c.PostForm("type")
		startDateStr = c.PostForm("start_date")
		endDateStr = c.PostForm("end_date")
		reason = c.PostForm("reason")

		file, err := c.FormFile("attachment")
		if err == nil && file != nil {
			uploadDir := "./uploads/leave_attachments"
			_ = os.MkdirAll(uploadDir, os.ModePerm)

			ext := filepath.Ext(file.Filename)
			newFilename := fmt.Sprintf("staff_leave_%d%s", time.Now().UnixNano(), ext)
			savePath := filepath.Join(uploadDir, newFilename)

			if err := c.SaveUploadedFile(file, savePath); err == nil {
				attachmentURL = "/uploads/leave_attachments/" + newFilename
			}
		}
	} else {
		var req struct {
			Type          string `json:"type" binding:"required"`
			StartDate     string `json:"start_date" binding:"required"`
			EndDate       string `json:"end_date" binding:"required"`
			Reason        string `json:"reason" binding:"required"`
			AttachmentURL string `json:"attachment_url"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak lengkap: " + err.Error()})
			return
		}
		leaveType = req.Type
		startDateStr = req.StartDate
		endDateStr = req.EndDate
		reason = req.Reason
		attachmentURL = req.AttachmentURL
	}

	leave, err := h.leaveUsecase.CreateLeaveRequest(
		userUUID,
		leaveType,
		startDateStr,
		endDateStr,
		reason,
		attachmentURL,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pengajuan izin/tugas luar berhasil dikirim ke Pimpinan & Admin",
		"data":    leave,
	})
}

// GET /staff/leave-requests/my - Riwayat pengajuan izin milik user login
func (h *StaffLeaveHandler) GetMyLeaveRequests(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	leaves, err := h.leaveUsecase.GetStaffLeaveRequests(userUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// GET /staff/leave-requests - Mengambil daftar seluruh permohonan izin staf (untuk Pimpinan & Admin)
func (h *StaffLeaveHandler) GetAllLeaveRequests(c *gin.Context) {
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)
	status := c.DefaultQuery("status", "all")

	leaves, err := h.leaveUsecase.GetAllStaffLeaveRequests(uint(unitID), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// PUT /staff/leave-requests/:id/approval - Persetujuan atau penolakan oleh Pimpinan/Admin
func (h *StaffLeaveHandler) ApproveLeaveRequest(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	leaveID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format ID pengajuan tidak valid"})
		return
	}

	var req struct {
		Action            string `json:"action" binding:"required"` // "Approved" atau "Rejected"
		ApprovedDays      int    `json:"approved_days"`
		ApprovedStartDate string `json:"approved_start_date"`
		ApprovedEndDate   string `json:"approved_end_date"`
		ApprovalNotes     string `json:"approval_notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak lengkap: " + err.Error()})
		return
	}

	updatedLeave, err := h.leaveUsecase.ApproveLeaveRequest(
		leaveID,
		userUUID,
		req.Action,
		req.ApprovedDays,
		req.ApprovedStartDate,
		req.ApprovedEndDate,
		req.ApprovalNotes,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := "Pengajuan tugas luar/izin berhasil disetujui"
	if req.Action == "Rejected" {
		msg = "Pengajuan izin/tugas luar berhasil ditolak"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": msg,
		"data":    updatedLeave,
	})
}
