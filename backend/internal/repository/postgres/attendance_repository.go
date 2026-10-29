package postgres

import (
	"math"
	"ppi-100-sis/internal/domain"
	"sort"
	"time"

	"github.com/google/uuid"
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

func (r *AttendanceRepository) GetAttendanceExport(unitID uint, startDate, endDate time.Time, classID *uint, studentID *string, status *string) ([]domain.Attendance, error) {
	var attendances []domain.Attendance
	startOfDay := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	endOfDay := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	query := r.db.Joins("JOIN students ON students.id = attendances.student_id").
		Where("attendances.timestamp >= ? AND attendances.timestamp <= ?", startOfDay, endOfDay)

	if unitID > 0 {
		query = query.Where("students.unit_id = ?", unitID)
	}

	if classID != nil && *classID > 0 {
		query = query.Where("students.class_id = ?", *classID)
	}

	if studentID != nil && *studentID != "" {
		query = query.Where("attendances.student_id = ?", *studentID)
	}

	if status != nil && *status != "" && *status != "all" {
		query = query.Where("attendances.status = ?", *status)
	}

	err := query.Preload("Student.User").
		Preload("Student.Class").
		Preload("Schedule.Subject").
		Order("attendances.timestamp ASC").
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

func (r *AttendanceRepository) GetStudentLeaderboard(unitID uint, startDate, endDate time.Time, classID *uint) ([]domain.StudentAttendanceLeaderboardItem, error) {
	startOfDay := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	endOfDay := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	type queryResult struct {
		StudentID       uuid.UUID `gorm:"column:student_id"`
		NISN            string    `gorm:"column:nisn"`
		Name            string    `gorm:"column:name"`
		ClassID         uint      `gorm:"column:class_id"`
		ClassName       string    `gorm:"column:class_name"`
		TotalPresent    int       `gorm:"column:total_present"`
		TotalLate       int       `gorm:"column:total_late"`
		TotalPermission int       `gorm:"column:total_permission"`
		TotalSick       int       `gorm:"column:total_sick"`
		TotalAbsent     int       `gorm:"column:total_absent"`
		TotalDays       int       `gorm:"column:total_days"`
	}

	var results []queryResult

	query := r.db.Table("students").
		Select(`
			students.id as student_id,
			students.nisn,
			users.name,
			students.class_id,
			COALESCE(classes.name, '-') as class_name,
			COUNT(CASE WHEN attendances.status = 'Present' THEN 1 END) as total_present,
			COUNT(CASE WHEN attendances.status = 'Late' THEN 1 END) as total_late,
			COUNT(CASE WHEN attendances.status = 'Permission' THEN 1 END) as total_permission,
			COUNT(CASE WHEN attendances.status = 'Sick' THEN 1 END) as total_sick,
			COUNT(CASE WHEN attendances.status = 'Absent' THEN 1 END) as total_absent,
			COUNT(attendances.id) as total_days
		`).
		Joins("JOIN users ON users.id = students.user_id").
		Joins("LEFT JOIN classes ON classes.id = students.class_id").
		Joins("LEFT JOIN attendances ON attendances.student_id = students.id AND attendances.timestamp >= ? AND attendances.timestamp <= ? AND (attendances.type = 'CheckIn' OR attendances.type = 'Schedule' OR attendances.type = 'Daily')", startOfDay, endOfDay).
		Where("students.status = ?", "Active")

	if unitID > 0 {
		query = query.Where("students.unit_id = ?", unitID)
	}
	if classID != nil && *classID > 0 {
		query = query.Where("students.class_id = ?", *classID)
	}

	err := query.
		Group("students.id, students.nisn, users.name, students.class_id, classes.name").
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	var items []domain.StudentAttendanceLeaderboardItem
	for _, res := range results {
		totalAttended := res.TotalPresent + res.TotalLate
		totalValidDays := res.TotalDays
		var pct float64
		var score float64

		if totalValidDays > 0 {
			pct = (float64(totalAttended) / float64(totalValidDays)) * 100.0
			score = (float64(res.TotalPresent)*100.0 + float64(res.TotalLate)*70.0 + float64(res.TotalPermission)*50.0 + float64(res.TotalSick)*50.0) / float64(totalValidDays)
		}

		pct = math.Round(pct*10) / 10
		score = math.Round(score*10) / 10

		predicate := "Perlu Bimbingan ⚠️"
		if totalValidDays == 0 {
			predicate = "Belum Ada Presensi"
		} else if score >= 95.0 && res.TotalLate == 0 {
			predicate = "Sangat Teladan 🌟"
		} else if score >= 85.0 {
			predicate = "Disiplin ⭐"
		} else if score >= 75.0 {
			predicate = "Cukup Disiplin"
		}

		items = append(items, domain.StudentAttendanceLeaderboardItem{
			StudentID:            res.StudentID,
			NISN:                 res.NISN,
			Name:                 res.Name,
			ClassID:              res.ClassID,
			ClassName:            res.ClassName,
			TotalPresent:         res.TotalPresent,
			TotalLate:            res.TotalLate,
			TotalPermission:      res.TotalPermission,
			TotalSick:            res.TotalSick,
			TotalAbsent:          res.TotalAbsent,
			TotalDays:            res.TotalDays,
			AttendancePercentage: pct,
			DisciplineScore:      score,
			Predicate:            predicate,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].DisciplineScore != items[j].DisciplineScore {
			return items[i].DisciplineScore > items[j].DisciplineScore
		}
		if items[i].TotalPresent != items[j].TotalPresent {
			return items[i].TotalPresent > items[j].TotalPresent
		}
		if items[i].TotalLate != items[j].TotalLate {
			return items[i].TotalLate < items[j].TotalLate
		}
		return items[i].Name < items[j].Name
	})

	for i := range items {
		items[i].Rank = i + 1
	}

	return items, nil
}
