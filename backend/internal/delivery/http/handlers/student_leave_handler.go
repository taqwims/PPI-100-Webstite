package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StudentLeaveHandler struct {
	leaveUsecase *usecase.StudentLeaveUsecase
	db           *gorm.DB
}

func NewStudentLeaveHandler(leaveUsecase *usecase.StudentLeaveUsecase, db *gorm.DB) *StudentLeaveHandler {
	return &StudentLeaveHandler{
		leaveUsecase: leaveUsecase,
		db:           db,
	}
}

func getUserUUIDFromContext(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get("userID")
	if !exists {
		return uuid.Nil, fmt.Errorf("unauthorized")
	}

	if idStr, ok := val.(string); ok {
		return uuid.Parse(idStr)
	} else if u, ok := val.(uuid.UUID); ok {
		return u, nil
	}
	return uuid.Nil, fmt.Errorf("invalid user ID type")
}

// POST /academic/leave-requests - Mengajukan izin / sakit (Siswa atau Orang Tua)
func (h *StudentLeaveHandler) CreateLeaveRequest(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Cek Role Pengguna
	var user domain.User
	if err := h.db.First(&user, "id = ?", userUUID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak ditemukan"})
		return
	}

	var studentIDStr string
	var leaveType string
	var startDateStr string
	var endDateStr string
	var reason string
	var attachmentURL string

	// Support Multipart Form (dengan upload file) atau JSON
	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		studentIDStr = c.PostForm("student_id")
		leaveType = c.PostForm("type")
		startDateStr = c.PostForm("start_date")
		endDateStr = c.PostForm("end_date")
		reason = c.PostForm("reason")

		// Handle file upload lampiran
		file, err := c.FormFile("attachment")
		if err == nil && file != nil {
			uploadDir := "./uploads/leave_attachments"
			_ = os.MkdirAll(uploadDir, os.ModePerm)

			ext := filepath.Ext(file.Filename)
			newFilename := fmt.Sprintf("leave_%d%s", time.Now().UnixNano(), ext)
			savePath := filepath.Join(uploadDir, newFilename)

			if err := c.SaveUploadedFile(file, savePath); err == nil {
				attachmentURL = "/uploads/leave_attachments/" + newFilename
			}
		}
	} else {
		var req struct {
			StudentID     string `json:"student_id"`
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
		studentIDStr = req.StudentID
		leaveType = req.Type
		startDateStr = req.StartDate
		endDateStr = req.EndDate
		reason = req.Reason
		attachmentURL = req.AttachmentURL
	}

	// Tentukan StudentID dan ApplicantRole
	var targetStudentID uuid.UUID
	var applicantRole string

	if user.RoleID == 6 {
		// Siswa mengajukan untuk dirinya sendiri
		applicantRole = "Student"
		var student domain.Student
		if err := h.db.First(&student, "user_id = ?", userUUID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Profil siswa tidak ditemukan untuk akun ini"})
			return
		}
		targetStudentID = student.ID
	} else if user.RoleID == 7 {
		// Orang Tua mengajukan untuk anaknya
		applicantRole = "Parent"
		if studentIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih anak yang diajukan izinnya (student_id diperlukan)"})
			return
		}
		parsedID, err := uuid.Parse(studentIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format student_id tidak valid"})
			return
		}
		targetStudentID = parsedID
	} else {
		// Admin / Guru dapat mengajukan dengan student_id eksplisit
		applicantRole = "Admin"
		parsedID, err := uuid.Parse(studentIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "student_id tidak valid"})
			return
		}
		targetStudentID = parsedID
	}

	leave, err := h.leaveUsecase.CreateLeaveRequest(
		targetStudentID,
		applicantRole,
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
		"message": "Pengajuan izin/sakit berhasil dikirim ke Wali Kelas",
		"data":    leave,
	})
}

// GET /academic/leave-requests/my - Riwayat pengajuan izin untuk siswa yang login
func (h *StudentLeaveHandler) GetMyStudentLeaveRequests(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var student domain.Student
	if err := h.db.First(&student, "user_id = ?", userUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data siswa tidak ditemukan"})
		return
	}

	leaves, err := h.leaveUsecase.GetStudentLeaveRequests(student.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// GET /academic/leave-requests/children - Riwayat pengajuan izin anak-anak dari orang tua
func (h *StudentLeaveHandler) GetChildrenLeaveRequests(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	leaves, err := h.leaveUsecase.GetParentChildrenLeaveRequests(userUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// GET /academic/leave-requests/homeroom - Daftar pengajuan izin untuk kelas wali kelas
func (h *StudentLeaveHandler) GetHomeroomLeaveRequests(c *gin.Context) {
	userUUID, err := getUserUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	status := c.DefaultQuery("status", "all")

	leaves, err := h.leaveUsecase.GetHomeroomLeaveRequests(userUUID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// PUT /academic/leave-requests/:id/approval - Persetujuan atau Penolakan oleh Wali Kelas
type LeaveApprovalRequest struct {
	Action            string `json:"action" binding:"required"` // "Approved" atau "Rejected"
	ApprovedDays      int    `json:"approved_days"`
	ApprovedStartDate string `json:"approved_start_date"`
	ApprovedEndDate   string `json:"approved_end_date"`
	ApprovalNotes     string `json:"approval_notes"`
}

func (h *StudentLeaveHandler) ApproveLeaveRequest(c *gin.Context) {
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

	var req LeaveApprovalRequest
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

	msg := "Pengajuan izin berhasil disetujui"
	if req.Action == "Rejected" {
		msg = "Pengajuan izin berhasil ditolak"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": msg,
		"data":    updatedLeave,
	})
}
