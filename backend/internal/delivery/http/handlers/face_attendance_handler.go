package handlers

import (
	"net/http"
	"strconv"
	"time"

	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
)

type FaceAttendanceHandler struct {
	faceBiometricUsecase   *usecase.FaceBiometricUsecase
	staffAttendanceUsecase *usecase.StaffAttendanceUsecase
}

func NewFaceAttendanceHandler(
	faceBiometricUsecase *usecase.FaceBiometricUsecase,
	staffAttendanceUsecase *usecase.StaffAttendanceUsecase,
) *FaceAttendanceHandler {
	return &FaceAttendanceHandler{
		faceBiometricUsecase:   faceBiometricUsecase,
		staffAttendanceUsecase: staffAttendanceUsecase,
	}
}

type RegisterFaceRequest struct {
	UserID    string    `json:"user_id" binding:"required"`
	Embedding []float64 `json:"embedding" binding:"required"`
	PhotoURL  string    `json:"photo_url"`
}

func (h *FaceAttendanceHandler) RegisterFace(c *gin.Context) {
	var req RegisterFaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data biometrik tidak valid: " + err.Error()})
		return
	}

	if err := h.faceBiometricUsecase.RegisterFace(req.UserID, req.Embedding, req.PhotoURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Biometrik wajah berhasil didaftarkan"})
}

func (h *FaceAttendanceHandler) RemoveFace(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id wajib disertakan"})
		return
	}

	if err := h.faceBiometricUsecase.RemoveFace(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data wajah berhasil dihapus"})
}

func (h *FaceAttendanceHandler) GetRegisteredFaces(c *gin.Context) {
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)

	descriptors, err := h.faceBiometricUsecase.GetRegisteredFaces(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  descriptors,
		"total": len(descriptors),
	})
}

func (h *FaceAttendanceHandler) MatchAndRecordAttendance(c *gin.Context) {
	var req usecase.MatchScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data scan wajah tidak valid: " + err.Error()})
		return
	}

	res, err := h.faceBiometricUsecase.MatchAndRecord(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": res.Message,
		"data":    res,
	})
}

func (h *FaceAttendanceHandler) GetStaffDailyAttendance(c *gin.Context) {
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)

	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		date = time.Now()
	}

	records, err := h.staffAttendanceUsecase.GetDailyAttendance(uint(unitID), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": records})
}

func (h *FaceAttendanceHandler) GetStaffAttendanceExport(c *gin.Context) {
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	userID := c.Query("user_id")
	status := c.Query("status")

	var pUserID *string
	if userID != "" {
		pUserID = &userID
	}

	var pStatus *string
	if status != "" {
		pStatus = &status
	}

	records, err := h.staffAttendanceUsecase.GetStaffAttendanceExport(uint(unitID), startDate, endDate, pUserID, pStatus)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": records})
}

func (h *FaceAttendanceHandler) GetStaffRecentDaily(c *gin.Context) {
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)

	limitStr := c.DefaultQuery("limit", "15")
	limit, _ := strconv.Atoi(limitStr)

	records, err := h.staffAttendanceUsecase.GetRecentDaily(uint(unitID), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": records})
}

func (h *FaceAttendanceHandler) GetStaffDailySummary(c *gin.Context) {
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)

	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		date = time.Now()
	}

	summary, err := h.staffAttendanceUsecase.GetDailySummary(uint(unitID), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": summary})
}

func (h *FaceAttendanceHandler) GetStaffMonthlySummary(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id wajib disertakan"})
		return
	}

	now := time.Now()
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(now.Month())))
	yearStr := c.DefaultQuery("year", strconv.Itoa(now.Year()))

	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	summary, err := h.staffAttendanceUsecase.GetMonthlyAttendanceSummary(userID, month, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": summary})
}
