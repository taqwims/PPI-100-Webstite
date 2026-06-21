package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type WAScheduleHandler struct {
	usecase usecase.WAScheduleUsecase
}

func NewWAScheduleHandler(u usecase.WAScheduleUsecase) *WAScheduleHandler {
	return &WAScheduleHandler{usecase: u}
}

type CreateScheduleRequest struct {
	SendAt         string `json:"send_at" binding:"required"` // format: RFC3339, e.g. "2026-06-21T21:30:00Z"
	WATemplateID   uint   `json:"wa_template_id" binding:"required"`
	MinDelay       int    `json:"min_delay"`
	MaxDelay       int    `json:"max_delay"`
	AcademicYearID uint   `json:"academic_year_id" binding:"required"`
	ClassID        uint   `json:"class_id"` // optional, legacy single class
	ClassIDs       []uint `json:"class_ids"` // optional, multiple classes
}

func (h *WAScheduleHandler) CreateSchedule(c *gin.Context) {
	var req CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sendAt, err := time.Parse(time.RFC3339, req.SendAt)
	if err != nil {
		// Try format "2006-01-02 15:04:00" in local timezone
		loc, _ := time.LoadLocation("Asia/Jakarta")
		sendAt, err = time.ParseInLocation("2006-01-02 15:04:00", req.SendAt, loc)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal kirim tidak valid. Gunakan format ISO8601 (RFC3339) atau YYYY-MM-DD HH:MM:SS"})
			return
		}
	}

	var classIDs []uint
	if len(req.ClassIDs) > 0 {
		classIDs = req.ClassIDs
	} else if req.ClassID > 0 {
		classIDs = []uint{req.ClassID}
	}

	schedule, err := h.usecase.CreateSchedule(sendAt, req.WATemplateID, req.MinDelay, req.MaxDelay, req.AcademicYearID, classIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, schedule)
}

func (h *WAScheduleHandler) GetSchedules(c *gin.Context) {
	schedules, err := h.usecase.GetSchedules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}

func (h *WAScheduleHandler) GetScheduleDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID jadwal tidak valid"})
		return
	}

	schedule, err := h.usecase.GetScheduleDetail(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, schedule)
}

func (h *WAScheduleHandler) CancelSchedule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID jadwal tidak valid"})
		return
	}

	err = h.usecase.CancelSchedule(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jadwal berhasil dibatalkan"})
}
