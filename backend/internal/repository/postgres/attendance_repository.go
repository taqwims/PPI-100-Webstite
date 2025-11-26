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
