package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"gorm.io/gorm"
)

type StaffAttendanceRepository struct {
	db *gorm.DB
}

func NewStaffAttendanceRepository(db *gorm.DB) *StaffAttendanceRepository {
	return &StaffAttendanceRepository{db: db}
}

func (r *StaffAttendanceRepository) Create(att *domain.StaffAttendance) error {
	return r.db.Create(att).Error
}

func (r *StaffAttendanceRepository) Update(att *domain.StaffAttendance) error {
	return r.db.Save(att).Error
}

func (r *StaffAttendanceRepository) GetTodayByUser(userID string, date time.Time) (*domain.StaffAttendance, error) {
	var att domain.StaffAttendance
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	err := r.db.Where("user_id = ? AND date >= ? AND date < ?", userID, startOfDay, endOfDay).
		Preload("User").
		Preload("User.Teacher").
		First(&att).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *StaffAttendanceRepository) GetDailyAttendance(unitID uint, date time.Time) ([]domain.StaffAttendance, error) {
	var attendances []domain.StaffAttendance
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	query := r.db.Where("date >= ? AND date < ?", startOfDay, endOfDay)
	if unitID > 0 {
		query = query.Where("unit_id = ?", unitID)
	}

	err := query.Preload("User").
		Preload("User.Teacher").
		Order("check_in_time DESC").
		Find(&attendances).Error

	return attendances, err
}

func (r *StaffAttendanceRepository) GetStaffAttendanceExport(unitID uint, startDate, endDate time.Time, userID *string, status *string) ([]domain.StaffAttendance, error) {
	var attendances []domain.StaffAttendance
	startOfDay := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	endOfDay := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	query := r.db.Where("date >= ? AND date <= ?", startOfDay, endOfDay)
	if unitID > 0 {
		query = query.Where("unit_id = ?", unitID)
	}
	if userID != nil && *userID != "" {
		query = query.Where("user_id = ?", *userID)
	}
	if status != nil && *status != "" && *status != "all" {
		query = query.Where("status = ?", *status)
	}

	err := query.Preload("User").
		Preload("User.Teacher").
		Order("date ASC, check_in_time ASC").
		Find(&attendances).Error

	return attendances, err
}

func (r *StaffAttendanceRepository) GetRecentDaily(unitID uint, limit int) ([]domain.StaffAttendance, error) {
	if limit <= 0 {
		limit = 15
	}
	var attendances []domain.StaffAttendance
	query := r.db.Model(&domain.StaffAttendance{})
	if unitID > 0 {
		query = query.Where("unit_id = ?", unitID)
	}

	err := query.Preload("User").
		Preload("User.Teacher").
		Order("check_in_time DESC").
		Limit(limit).
		Find(&attendances).Error

	return attendances, err
}

func (r *StaffAttendanceRepository) GetDailySummary(unitID uint, date time.Time) (map[string]int64, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	var presentCount int64
	var lateCount int64

	pQuery := r.db.Model(&domain.StaffAttendance{}).
		Where("date >= ? AND date < ? AND status = ?", startOfDay, endOfDay, "Present")
	if unitID > 0 {
		pQuery = pQuery.Where("unit_id = ?", unitID)
	}
	_ = pQuery.Count(&presentCount).Error

	lQuery := r.db.Model(&domain.StaffAttendance{}).
		Where("date >= ? AND date < ? AND status = ?", startOfDay, endOfDay, "Late")
	if unitID > 0 {
		lQuery = lQuery.Where("unit_id = ?", unitID)
	}
	_ = lQuery.Count(&lateCount).Error

	return map[string]int64{
		"present":        presentCount,
		"late":           lateCount,
		"total_attended": presentCount + lateCount,
	}, nil
}

func (r *StaffAttendanceRepository) GetMonthlySummary(userID string, month, year int) (presentCount int64, lateCount int64, totalLateMinutes int64, totalPenalty float64, err error) {
	startOfMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var attendances []domain.StaffAttendance
	err = r.db.Where("user_id = ? AND date >= ? AND date < ?", userID, startOfMonth, endOfMonth).
		Find(&attendances).Error
	if err != nil {
		return 0, 0, 0, 0, err
	}

	for _, att := range attendances {
		if att.Status == "Present" {
			presentCount++
		} else if att.Status == "Late" {
			lateCount++
			totalLateMinutes += int64(att.LateMinutes)
			totalPenalty += att.PenaltyAmount
		}
	}

	return presentCount, lateCount, totalLateMinutes, totalPenalty, nil
}

func (r *StaffAttendanceRepository) GetMonthlyRecordsByUser(userID string, month, year int) ([]domain.StaffAttendance, error) {
	startOfMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var attendances []domain.StaffAttendance
	err := r.db.Where("user_id = ? AND date >= ? AND date < ?", userID, startOfMonth, endOfMonth).
		Order("date ASC, check_in_time ASC").
		Find(&attendances).Error
	return attendances, err
}
