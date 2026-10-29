package postgres

import (
	"fmt"
	"math"
	"ppi-100-sis/internal/domain"
	"sort"
	"time"

	"github.com/google/uuid"
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

func (r *StaffAttendanceRepository) FindByID(id uuid.UUID) (*domain.StaffAttendance, error) {
	var att domain.StaffAttendance
	err := r.db.Preload("User").Preload("User.Teacher").First(&att, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *StaffAttendanceRepository) WaivePenalty(id uuid.UUID, waivedBy string, reason string) (*domain.StaffAttendance, error) {
	att, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}

	if att.OriginalPenalty == 0 && att.PenaltyAmount > 0 {
		att.OriginalPenalty = att.PenaltyAmount
	}
	att.PenaltyAmount = 0
	att.IsPenaltyWaived = true
	att.PenaltyWaivedBy = &waivedBy
	att.PenaltyWaivedReason = reason
	now := time.Now()
	att.PenaltyWaivedAt = &now

	auditNote := fmt.Sprintf("Potongan denda (Rp %.0f) dihapus oleh %s: %s", att.OriginalPenalty, waivedBy, reason)
	if att.Notes != "" {
		att.Notes = att.Notes + " | " + auditNote
	} else {
		att.Notes = auditNote
	}

	if err := r.db.Save(att).Error; err != nil {
		return nil, err
	}
	return att, nil
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

func (r *StaffAttendanceRepository) GetStaffLeaderboard(unitID uint, startDate, endDate time.Time) ([]domain.StaffAttendanceLeaderboardItem, error) {
	startOfDay := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	endOfDay := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	type queryResult struct {
		UserID             uuid.UUID `gorm:"column:user_id"`
		NIP                string    `gorm:"column:nip"`
		Name               string    `gorm:"column:name"`
		RoleName           string    `gorm:"column:role_name"`
		TotalPresent       int       `gorm:"column:total_present"`
		TotalLate          int       `gorm:"column:total_late"`
		TotalLateMinutes   int       `gorm:"column:total_late_minutes"`
		TotalPenaltyAmount float64   `gorm:"column:total_penalty_amount"`
		TotalCheckOut      int       `gorm:"column:total_checkout"`
		TotalDays          int       `gorm:"column:total_days"`
	}

	var results []queryResult

	query := r.db.Table("users").
		Select(`
			users.id as user_id,
			COALESCE(teachers.nip, '-') as nip,
			users.name,
			COALESCE(roles.name, 'Staf') as role_name,
			COUNT(CASE WHEN staff_attendances.status = 'Present' THEN 1 END) as total_present,
			COUNT(CASE WHEN staff_attendances.status = 'Late' THEN 1 END) as total_late,
			COALESCE(SUM(CASE WHEN staff_attendances.status = 'Late' THEN staff_attendances.late_minutes ELSE 0 END), 0) as total_late_minutes,
			COALESCE(SUM(staff_attendances.penalty_amount), 0) as total_penalty_amount,
			COUNT(CASE WHEN staff_attendances.check_out_time IS NOT NULL THEN 1 END) as total_checkout,
			COUNT(staff_attendances.id) as total_days
		`).
		Joins("LEFT JOIN teachers ON teachers.user_id = users.id").
		Joins("LEFT JOIN roles ON roles.id = users.role_id").
		Joins("LEFT JOIN staff_attendances ON staff_attendances.user_id = users.id AND staff_attendances.date >= ? AND staff_attendances.date <= ?", startOfDay, endOfDay).
		Where("users.role_id IN (2, 3, 4, 9, 10, 11) OR teachers.id IS NOT NULL")

	if unitID > 0 {
		query = query.Where("users.unit_id = ? OR teachers.unit_id = ?", unitID, unitID)
	}

	err := query.
		Group("users.id, teachers.nip, users.name, roles.name").
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	var items []domain.StaffAttendanceLeaderboardItem
	for _, res := range results {
		totalValidDays := res.TotalDays
		var pct float64
		var score float64

		if totalValidDays > 0 {
			pct = (float64(res.TotalPresent) / float64(totalValidDays)) * 100.0
			score = (float64(res.TotalPresent)*100.0 + float64(res.TotalLate)*70.0) / float64(totalValidDays)
			if res.TotalLateMinutes > 120 {
				score -= 5.0
			}
			if score < 0 {
				score = 0
			}
		}

		pct = math.Round(pct*10) / 10
		score = math.Round(score*10) / 10

		predicate := "Perlu Evaluasi ⚠️"
		if totalValidDays == 0 {
			predicate = "Belum Ada Presensi"
		} else if score >= 95.0 && res.TotalLate == 0 {
			predicate = "Guru Teladan 🌟"
		} else if score >= 85.0 {
			predicate = "Sangat Disiplin ⭐"
		} else if score >= 75.0 {
			predicate = "Disiplin"
		}

		items = append(items, domain.StaffAttendanceLeaderboardItem{
			UserID:               res.UserID,
			NIP:                  res.NIP,
			Name:                 res.Name,
			RoleName:             res.RoleName,
			TotalPresent:         res.TotalPresent,
			TotalLate:            res.TotalLate,
			TotalLateMinutes:     res.TotalLateMinutes,
			TotalPenaltyAmount:   res.TotalPenaltyAmount,
			TotalCheckOut:        res.TotalCheckOut,
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
		if items[i].TotalLateMinutes != items[j].TotalLateMinutes {
			return items[i].TotalLateMinutes < items[j].TotalLateMinutes
		}
		return items[i].Name < items[j].Name
	})

	for i := range items {
		items[i].Rank = i + 1
	}

	return items, nil
}
