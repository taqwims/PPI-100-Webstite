package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StudentHandler struct {
	studentUsecase           *usecase.StudentUsecase
	userRepo                 *postgres.UserRepository
	studentObligationUsecase *usecase.StudentObligationUsecase
}

func NewStudentHandler(studentUsecase *usecase.StudentUsecase, userRepo *postgres.UserRepository) *StudentHandler {
	return &StudentHandler{studentUsecase: studentUsecase, userRepo: userRepo}
}

func (h *StudentHandler) SetStudentObligationUsecase(u *usecase.StudentObligationUsecase) {
	h.studentObligationUsecase = u
}

func (h *StudentHandler) GetAllStudents(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	students, err := h.studentUsecase.GetAllStudents(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

type AttendanceRequest struct {
	StudentID  string `json:"student_id" binding:"required"`
	ScheduleID uint   `json:"schedule_id" binding:"required"`
	Method     string `json:"method" binding:"required"`
	Status     string `json:"status" binding:"required"`
}

func (h *StudentHandler) RecordAttendance(c *gin.Context) {
	var req AttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	if err := h.studentUsecase.RecordAttendance(studentUUID, req.ScheduleID, req.Method, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Attendance recorded successfully"})
}

func (h *StudentHandler) GetScheduleAttendance(c *gin.Context) {
	scheduleID, _ := strconv.Atoi(c.Param("schedule_id"))
	attendances, err := h.studentUsecase.GetScheduleAttendance(uint(scheduleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attendances)
}

func (h *StudentHandler) GetChildren(c *gin.Context) {
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

	children, err := h.studentUsecase.GetChildrenByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, children)
}

type CreateStudentRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	NISN     string `json:"nisn" binding:"required"`
	RFID     string `json:"rfid"`
	ClassID  uint   `json:"class_id" binding:"required"`
	UnitID   uint   `json:"unit_id" binding:"required"`
	ParentID string `json:"parent_id"` // Can be parent_user_id (user.id) — will be resolved
}

// resolveParentID takes a user ID (from the parent user) or parent table ID and finds the parent table ID
func (h *StudentHandler) resolveParentID(parentUserID string) (*uuid.UUID, error) {
	if parentUserID == "" {
		return nil, nil
	}
	parentUser, err := h.userRepo.FindByID(parentUserID)
	if err == nil && parentUser != nil {
		if parentUser.Parent != nil {
			return &parentUser.Parent.ID, nil
		}
		// If user doesn't have a Parent record yet, create one
		parsedUUID, err := uuid.Parse(parentUserID)
		if err != nil {
			return nil, err
		}
		
		newParent := domain.Parent{
			UserID: parsedUUID,
		}
		// We need to create it using userRepo.Update, which saves the User and its associations,
		// or create the parent record. We'll assign it to parentUser and save.
		parentUser.Parent = &newParent
		if err := h.userRepo.Update(parentUser); err != nil {
			return nil, err
		}
		
		// parentUser.Parent should now have the generated ID
		if parentUser.Parent.ID != uuid.Nil {
			return &parentUser.Parent.ID, nil
		}
	}

	// Also check if parentUserID is already a Parent Table ID directly
	if parent, pErr := h.studentUsecase.GetParentByID(parentUserID); pErr == nil && parent != nil {
		return &parent.ID, nil
	}

	return nil, errors.New("parent not found")
}

func (h *StudentHandler) CreateStudent(c *gin.Context) {
	var req CreateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parentUUID, err := h.resolveParentID(req.ParentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent ID: " + err.Error()})
		return
	}

	if err := h.studentUsecase.CreateStudent(req.Name, req.Email, req.Password, req.NISN, req.RFID, req.ClassID, req.UnitID, parentUUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Student created successfully"})
}

type UpdateStudentRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password"`
	NISN     string `json:"nisn" binding:"required"`
	RFID     string `json:"rfid"`
	ClassID  uint   `json:"class_id" binding:"required"`
	UnitID   uint   `json:"unit_id" binding:"required"`
	ParentID string `json:"parent_id"` // Can be parent_user_id (user.id) — will be resolved
}

func (h *StudentHandler) UpdateStudent(c *gin.Context) {
	id := c.Param("id")
	var req UpdateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parentUUID, err := h.resolveParentID(req.ParentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent ID: " + err.Error()})
		return
	}

	if err := h.studentUsecase.UpdateStudent(id, req.Name, req.Email, req.Password, req.NISN, req.RFID, req.ClassID, req.UnitID, parentUUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student updated successfully"})
}

func (h *StudentHandler) DeleteStudent(c *gin.Context) {
	id := c.Param("id")
	if err := h.studentUsecase.DeleteStudent(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
}

type AssignRFIDRequest struct {
	RFID string `json:"rfid"`
}

func (h *StudentHandler) AssignRFID(c *gin.Context) {
	id := c.Param("id")
	var req AssignRFIDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.studentUsecase.AssignStudentRFID(id, req.RFID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nomor kartu RFID/NFC berhasil diperbarui"})
}

type RFIDTapRequest struct {
	RFID       string `json:"rfid" binding:"required"`
	UnitID     uint   `json:"unit_id"`
	ScheduleID *uint  `json:"schedule_id"`
	Type       string `json:"type"`   // "Auto", "CheckIn", "CheckOut", "Schedule"
	Method     string `json:"method"` // "RFID", "NFC"
	DeviceID   string `json:"device_id"`
}

func (h *StudentHandler) RecordRFIDAttendance(c *gin.Context) {
	var req RFIDTapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: " + err.Error()})
		return
	}

	att, student, actionCode, err := h.studentUsecase.RecordRFIDAttendance(
		req.RFID,
		req.UnitID,
		req.ScheduleID,
		req.Type,
		req.Method,
		req.DeviceID,
	)

	if err != nil {
		statusCode := http.StatusBadRequest
		if student == nil {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{
			"error":   err.Error(),
			"student": student,
			"action":  actionCode,
		})
		return
	}

	studentInfo := gin.H{
		"id":         student.ID,
		"name":       student.User.Name,
		"nisn":       student.NISN,
		"rfid":       student.RFID,
		"class_id":   student.ClassID,
		"class_name": student.Class.Name,
		"unit_id":    student.UnitID,
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Presensi berhasil dicatat",
		"attendance": att,
		"student":    studentInfo,
		"status":     att.Status,
		"type":       att.Type,
		"action":     actionCode,
		"timestamp":  att.Timestamp,
	})
}

func (h *StudentHandler) GetDailyAttendance(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	date := c.Query("date")
	classIDStr := c.Query("class_id")

	var classID *uint
	if classIDStr != "" {
		if parsed, err := strconv.Atoi(classIDStr); err == nil && parsed > 0 {
			uParsed := uint(parsed)
			classID = &uParsed
		}
	}

	attendances, err := h.studentUsecase.GetDailyAttendance(uint(unitID), date, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attendances)
}

func (h *StudentHandler) GetRecentDailyAttendance(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 {
		limit = 15
	}

	attendances, err := h.studentUsecase.GetRecentDailyAttendance(uint(unitID), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attendances)
}

func (h *StudentHandler) GetTodaySummary(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	date := c.Query("date")

	summary, err := h.studentUsecase.GetDailyAttendanceSummary(uint(unitID), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *StudentHandler) GetStudentAttendance(c *gin.Context) {
	studentID := c.Query("student_id")
	if studentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id is required"})
		return
	}

	attendances, err := h.studentUsecase.GetStudentAttendance(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attendances)
}

type BulkPromoteRequest struct {
	StudentIDs     []string `json:"student_ids" binding:"required"`
	Action         string   `json:"action" binding:"required"` // "promote" or "graduate"
	NextClassID    uint     `json:"next_class_id"`             // required if action is "promote"
	AutoBill       bool     `json:"auto_bill"`
	PaymentTypeID  uint     `json:"payment_type_id"`
	AcademicYearID uint     `json:"academic_year_id"`
	Months         []int    `json:"months"` // Optional for monthly payment
}

func (h *StudentHandler) HandleBulkPromote(c *gin.Context) {
	var req BulkPromoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Action == "promote" && req.NextClassID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "next_class_id is required for promotion"})
		return
	}

	// Parse student IDs
	var studentUUIDs []uuid.UUID
	for _, idStr := range req.StudentIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID: " + idStr})
			return
		}
		studentUUIDs = append(studentUUIDs, id)
	}

	// Promote/Graduate students via StudentUsecase
	count, err := h.studentUsecase.PromoteStudents(studentUUIDs, req.Action, req.NextClassID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses siswa: " + err.Error(), "processed": count})
		return
	}

	// Generate auto bill if requested
	billCount := 0
	if req.AutoBill && req.Action == "promote" {
		if req.PaymentTypeID == 0 || req.AcademicYearID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payment_type_id and academic_year_id are required for auto billing"})
			return
		}

		if h.studentObligationUsecase == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Billing service unavailable"})
			return
		}

		bc, err := h.studentObligationUsecase.AssignToStudents(studentUUIDs, req.PaymentTypeID, req.AcademicYearID, req.Months, 1)
		if err != nil {
			// Students already promoted, but billing failed — inform but don't rollback
			c.JSON(http.StatusOK, gin.H{
				"message":    "Kenaikan kelas berhasil, tetapi gagal membuat tagihan: " + err.Error(),
				"promoted":   count,
				"billed":     0,
			})
			return
		}
		billCount = bc
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Berhasil memproses " + fmt.Sprintf("%d", count) + " siswa",
		"promoted": count,
		"billed":   billCount,
	})
}
