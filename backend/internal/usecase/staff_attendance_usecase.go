package usecase

import (
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type StaffAttendanceUsecase struct {
	staffRepo         *postgres.StaffAttendanceRepository
	userRepo          *postgres.UserRepository
	schoolSettingRepo *postgres.SchoolSettingRepository
}

func NewStaffAttendanceUsecase(
	staffRepo *postgres.StaffAttendanceRepository,
	userRepo *postgres.UserRepository,
	schoolSettingRepo *postgres.SchoolSettingRepository,
) *StaffAttendanceUsecase {
	return &StaffAttendanceUsecase{
		staffRepo:         staffRepo,
		userRepo:          userRepo,
		schoolSettingRepo: schoolSettingRepo,
	}
}

func (u *StaffAttendanceUsecase) getSetting(key string, fallback string) string {
	if u.schoolSettingRepo == nil {
		return fallback
	}
	s, err := u.schoolSettingRepo.GetByKey(key)
	if err != nil || s == nil || strings.TrimSpace(s.Value) == "" {
		return fallback
	}
	return s.Value
}

func (u *StaffAttendanceUsecase) GetDailyAttendance(unitID uint, date time.Time) ([]domain.StaffAttendance, error) {
	return u.staffRepo.GetDailyAttendance(unitID, date)
}

func (u *StaffAttendanceUsecase) GetStaffAttendanceExport(unitID uint, startDateStr, endDateStr string, userID *string, status *string) ([]domain.StaffAttendance, error) {
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		startDate = time.Now().AddDate(0, 0, -30)
	}
	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		endDate = time.Now()
	}
	return u.staffRepo.GetStaffAttendanceExport(unitID, startDate, endDate, userID, status)
}

func (u *StaffAttendanceUsecase) GetRecentDaily(unitID uint, limit int) ([]domain.StaffAttendance, error) {
	return u.staffRepo.GetRecentDaily(unitID, limit)
}

func (u *StaffAttendanceUsecase) GetDailySummary(unitID uint, date time.Time) (map[string]int64, error) {
	return u.staffRepo.GetDailySummary(unitID, date)
}

func (u *StaffAttendanceUsecase) GetMonthlyAttendanceSummary(userID string, month, year int) (map[string]interface{}, error) {
	presentCount, lateCount, totalLateMinutes, totalPenaltyFromDB, err := u.staffRepo.GetMonthlySummary(userID, month, year)
	if err != nil {
		return nil, err
	}

	hourlyRateStr := u.getSetting("teacher_late_hourly_rate", "30000")
	hourlyRate, _ := strconv.ParseFloat(hourlyRateStr, 64)
	if hourlyRate <= 0 {
		hourlyRate = 30000
	}

	// Formula: (menit : 60 x harga)
	calculatedPenalty := math.Round((float64(totalLateMinutes) / 60.0) * hourlyRate)
	if totalPenaltyFromDB > 0 && calculatedPenalty == 0 {
		calculatedPenalty = totalPenaltyFromDB
	}

	records, _ := u.staffRepo.GetMonthlyRecordsByUser(userID, month, year)

	return map[string]interface{}{
		"user_id":                     userID,
		"month":                       month,
		"year":                        year,
		"present_count":               presentCount,
		"late_count":                  lateCount,
		"total_late_minutes":          totalLateMinutes,
		"hourly_rate":                 hourlyRate,
		"calculated_lateness_penalty": calculatedPenalty,
		"records":                     records,
	}, nil
}

func (u *StaffAttendanceUsecase) GetStaffLeaderboard(unitID uint, startDateStr, endDateStr string) ([]domain.StaffAttendanceLeaderboardItem, error) {
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		startDate = time.Now().AddDate(-1, 0, 0)
	}
	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		endDate = time.Now()
	}
	return u.staffRepo.GetStaffLeaderboard(unitID, startDate, endDate)
}

func (u *StaffAttendanceUsecase) WaivePenalty(attID uuid.UUID, waivedBy string, reason string) (*domain.StaffAttendance, error) {
	if strings.TrimSpace(reason) == "" {
		reason = "Dihapus oleh Administrator"
	}
	return u.staffRepo.WaivePenalty(attID, waivedBy, reason)
}
