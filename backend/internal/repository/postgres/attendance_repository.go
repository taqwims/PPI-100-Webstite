package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"gorm.io/gorm"
)

type AttendanceRepository struct {
	db *gorm.DB
}

func NewAttendanceRepository(db *gorm.DB) *AttendanceRepository {
	return &AttendanceRepository{db: db}
}

func (r *AttendanceRepository) Create(attendance *domain.Attendance) error {
	return r.db.Create(attendance).Error
}

func (r *AttendanceRepository) GetBySchedule(scheduleID uint) ([]domain.Attendance, error) {
	var attendances []domain.Attendance
	err := r.db.Where("schedule_id = ?", scheduleID).Preload("Student.User").Find(&attendances).Error
	return attendances, err
}

func (r *AttendanceRepository) GetByStudent(studentID string) ([]domain.Attendance, error) {
	var attendances []domain.Attendance
	err := r.db.Where("student_id = ?", studentID).Preload("Schedule.Subject").Find(&attendances).Error
	return attendances, err
}

func (r *AttendanceRepository) CheckExistence(studentID string, scheduleID uint, date time.Time) (bool, error) {
	var count int64
	// Check if attendance exists for this student, schedule and date (ignoring time)
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	err := r.db.Model(&domain.Attendance{}).
		Where("student_id = ? AND schedule_id = ? AND timestamp >= ? AND timestamp < ?", studentID, scheduleID, startOfDay, endOfDay).
		Count(&count).Error
	return count > 0, err
}

func (r *AttendanceRepository) GetTodayStudentAttendance(studentID string, date time.Time) ([]domain.Attendance, error) {
	var attendances []domain.Attendance
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	err := r.db.Where("student_id = ? AND timestamp >= ? AND timestamp < ?", studentID, startOfDay, endOfDay).
		Order("timestamp ASC").
		Find(&attendances).Error
	return attendances, err
}

func (r *AttendanceRepository) GetDailyAttendance(unitID uint, date time.Time, classID *uint) ([]domain.Attendance, error) {
	var attendances []domain.Attendance
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	query := r.db.Joins("JOIN students ON students.id = attendances.student_id").
		Where("attendances.timestamp >= ? AND attendances.timestamp < ?", startOfDay, endOfDay)

	if unitID > 0 {
		query = query.Where("students.unit_id = ?", unitID)
	}

	if classID != nil && *classID > 0 {
		query = query.Where("students.class_id = ?", *classID)
	}

	err := query.Preload("Student.User").
		Preload("Student.Class").
		Preload("Schedule.Subject").
		Order("attendances.timestamp DESC").
		Find(&attendances).Error

	return attendances, err
}

func (r *AttendanceRepository) GetRecentDaily(unitID uint, limit int) ([]domain.Attendance, error) {
	if limit <= 0 {
		limit = 15
	}
	var attendances []domain.Attendance
	query := r.db.Joins("JOIN students ON students.id = attendances.student_id")

	if unitID > 0 {
		query = query.Where("students.unit_id = ?", unitID)
	}

	err := query.Preload("Student.User").
		Preload("Student.Class").
		Preload("Schedule.Subject").
		Order("attendances.timestamp DESC").
		Limit(limit).
		Find(&attendances).Error

	return attendances, err
}

func (r *AttendanceRepository) GetDailySummary(unitID uint, date time.Time) (map[string]int64, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Count total active students
	var totalStudents int64
	studentQuery := r.db.Model(&domain.Student{}).Where("status = ?", "Active")
	if unitID > 0 {
		studentQuery = studentQuery.Where("unit_id = ?", unitID)
	}
	_ = studentQuery.Count(&totalStudents).Error

	// Count present check-ins
	var presentCount int64
	attQuery := r.db.Model(&domain.Attendance{}).
		Joins("JOIN students ON students.id = attendances.student_id").
		Where("attendances.timestamp >= ? AND attendances.timestamp < ? AND attendances.type = ?", startOfDay, endOfDay, "CheckIn").
		Where("attendances.status = ?", "Present")
	if unitID > 0 {
		attQuery = attQuery.Where("students.unit_id = ?", unitID)
	}
	_ = attQuery.Distinct("attendances.student_id").Count(&presentCount).Error

	// Count late check-ins
	var lateCount int64
	lateQuery := r.db.Model(&domain.Attendance{}).
		Joins("JOIN students ON students.id = attendances.student_id").
		Where("attendances.timestamp >= ? AND attendances.timestamp < ? AND attendances.type = ?", startOfDay, endOfDay, "CheckIn").
		Where("attendances.status = ?", "Late")
	if unitID > 0 {
		lateQuery = lateQuery.Where("students.unit_id = ?", unitID)
	}
	_ = lateQuery.Distinct("attendances.student_id").Count(&lateCount).Error

	// Count check-outs
	var checkOutCount int64
	outQuery := r.db.Model(&domain.Attendance{}).
		Joins("JOIN students ON students.id = attendances.student_id").
		Where("attendances.timestamp >= ? AND attendances.timestamp < ? AND attendances.type = ?", startOfDay, endOfDay, "CheckOut")
	if unitID > 0 {
		outQuery = outQuery.Where("students.unit_id = ?", unitID)
	}
	_ = outQuery.Distinct("attendances.student_id").Count(&checkOutCount).Error

	totalAttended := presentCount + lateCount
	unattended := totalStudents - totalAttended
	if unattended < 0 {
		unattended = 0
	}

	return map[string]int64{
		"total_students": totalStudents,
		"present":        presentCount,
		"late":           lateCount,
		"total_attended": totalAttended,
		"check_out":      checkOutCount,
		"unattended":     unattended,
	}, nil
}
