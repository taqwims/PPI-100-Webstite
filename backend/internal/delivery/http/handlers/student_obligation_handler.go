package handlers

import (
	"net/http"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StudentObligationHandler struct {
	usecase *usecase.StudentObligationUsecase
	cfg     *config.Config
}

func NewStudentObligationHandler(uc *usecase.StudentObligationUsecase, cfg *config.Config) *StudentObligationHandler {
	return &StudentObligationHandler{usecase: uc, cfg: cfg}
}

func (h *StudentObligationHandler) Create(c *gin.Context) {
	var req domain.StudentObligation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.usecase.Create(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Tanggungan berhasil dibuat", "data": req})
}

type BulkAssignRequest struct {
	ClassID          uint  `json:"class_id" binding:"required"`
	PaymentTypeID    uint  `json:"payment_type_id" binding:"required"`
	AcademicYearID   uint  `json:"academic_year_id" binding:"required"`
	SelectedMonths   []int `json:"selected_months"`   // [1,2,3,...,12] untuk bulanan
	InstallmentCount int   `json:"installment_count"` // Jumlah cicilan untuk tahunan (0 = tidak dicicil)
}

func (h *StudentObligationHandler) BulkAssign(c *gin.Context) {
	var req BulkAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	count, err := h.usecase.BulkAssign(req.ClassID, req.PaymentTypeID, req.AcademicYearID, req.SelectedMonths, req.InstallmentCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Tanggungan berhasil ditambahkan", "count": count})
}

func (h *StudentObligationHandler) GetAll(c *gin.Context) {
	var academicYearID, classID uint
	if v := c.Query("academic_year_id"); v != "" {
		if n, err := strconv.ParseUint(v, 10, 32); err == nil {
			academicYearID = uint(n)
		}
	}
	if v := c.Query("class_id"); v != "" {
		if n, err := strconv.ParseUint(v, 10, 32); err == nil {
			classID = uint(n)
		}
	}

	obs, err := h.usecase.GetAll(academicYearID, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Enrich with parent info
	type ObligationResponse struct {
		domain.StudentObligation
		ParentName  string `json:"parent_name"`
		ParentPhone string `json:"parent_phone"`
	}

	var results []ObligationResponse
	for _, ob := range obs {
		resp := ObligationResponse{StudentObligation: ob}
		if ob.Student.ParentID != nil {
			_, parentUser, err := h.usecase.GetParentByStudentID(ob.Student.ParentID)
			if err == nil && parentUser != nil {
				resp.ParentName = parentUser.Name
			}
			parent, _, _ := h.usecase.GetParentByStudentID(ob.Student.ParentID)
			if parent != nil {
				resp.ParentPhone = parent.Phone
			}
		}
		results = append(results, resp)
	}

	c.JSON(http.StatusOK, results)
}

func (h *StudentObligationHandler) GetByStudentID(c *gin.Context) {
	studentIDStr := c.Param("student_id")
	studentID, err := uuid.Parse(studentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	var academicYearID uint
	if v := c.Query("academic_year_id"); v != "" {
		if n, err := strconv.ParseUint(v, 10, 32); err == nil {
			academicYearID = uint(n)
		}
	}

	obs, err := h.usecase.GetByStudentID(studentID, academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, obs)
}

func (h *StudentObligationHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req domain.StudentObligation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id

	if err := h.usecase.Update(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tanggungan berhasil diperbarui"})
}

func (h *StudentObligationHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.usecase.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tanggungan berhasil dihapus"})
}

type RecordPaymentRequest struct {
	Amount float64 `json:"amount" binding:"required"`
}

func (h *StudentObligationHandler) RecordPayment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req RecordPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.usecase.RecordPayment(id, req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pembayaran berhasil dicatat"})
}

func (h *StudentObligationHandler) BulkDelete(c *gin.Context) {
	if !h.cfg.FeatureBulkDeleteObligations {
		c.JSON(http.StatusForbidden, gin.H{"error": "Fitur hapus massal dinonaktifkan di konfigurasi sistem"})
		return
	}
	paymentTypeID, _ := strconv.ParseUint(c.Query("payment_type_id"), 10, 32)
	academicYearID, _ := strconv.ParseUint(c.Query("academic_year_id"), 10, 32)
	classID, _ := strconv.ParseUint(c.Query("class_id"), 10, 32)

	if paymentTypeID == 0 || academicYearID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_type_id and academic_year_id are required"})
		return
	}

	if err := h.usecase.BulkDelete(uint(paymentTypeID), uint(academicYearID), uint(classID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tanggungan massal berhasil dihapus (khusus yang belum ada pembayaran)"})
}
