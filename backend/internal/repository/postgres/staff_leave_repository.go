package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StaffLeaveRepository struct {
	db *gorm.DB
}

func NewStaffLeaveRepository(db *gorm.DB) *StaffLeaveRepository {
	return &StaffLeaveRepository{db: db}
}

func (r *StaffLeaveRepository) Create(leave *domain.StaffLeaveRequest) error {
	return r.db.Create(leave).Error
}

func (r *StaffLeaveRepository) GetByID(id uuid.UUID) (*domain.StaffLeaveRequest, error) {
	var leave domain.StaffLeaveRequest
	err := r.db.
		Preload("User").
		Preload("User.Teacher").
		Preload("ApproverUser").
		First(&leave, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &leave, nil
}

func (r *StaffLeaveRepository) GetByUserID(userID uuid.UUID) ([]domain.StaffLeaveRequest, error) {
	var leaves []domain.StaffLeaveRequest
	err := r.db.
		Preload("User").
		Preload("ApproverUser").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&leaves).Error
	return leaves, err
}

func (r *StaffLeaveRepository) GetAll(unitID uint, status string) ([]domain.StaffLeaveRequest, error) {
	query := r.db.
		Preload("User").
		Preload("User.Teacher").
		Preload("ApproverUser")

	if unitID > 0 {
		query = query.Where("unit_id = ?", unitID)
	}

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	var leaves []domain.StaffLeaveRequest
	err := query.Order("created_at DESC").Find(&leaves).Error
	return leaves, err
}

func (r *StaffLeaveRepository) Update(leave *domain.StaffLeaveRequest) error {
	return r.db.Save(leave).Error
}

// RecordAttendanceForStaffLeave secara otomatis membuat/memperbarui record presensi harian staf (bebas denda)
func (r *StaffLeaveRepository) RecordAttendanceForStaffLeave(userID uuid.UUID, unitID uint, startDate, endDate time.Time, leaveType, notes string) error {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	if loc == nil {
		loc = time.Local
	}

	cur := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 7, 0, 0, 0, loc)
	end := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 7, 0, 0, 0, loc)

	for !cur.After(end) {
		startOfDay := time.Date(cur.Year(), cur.Month(), cur.Day(), 0, 0, 0, 0, loc)
		endOfDay := startOfDay.Add(24 * time.Hour)

		var existing domain.StaffAttendance
		err := r.db.Where("user_id = ? AND date >= ? AND date < ?", userID, startOfDay, endOfDay).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			// Buat presensi baru dengan status izin/tugas luar/sakit dan bebas potongan
			newAtt := domain.StaffAttendance{
				UserID:          userID,
				UnitID:          unitID,
				Date:            startOfDay,
				CheckInTime:     cur,
				Method:          "Permit",
				Status:          leaveType, // "Duty", "Sick", "Permission", dll
				LateMinutes:     0,
				HourlyRate:      0,
				PenaltyAmount:   0,
				OriginalPenalty: 0,
				IsPenaltyWaived: true,
				Notes:           notes,
			}
			if err := r.db.Create(&newAtt).Error; err != nil {
				return err
			}
		} else if err == nil {
			// Update status presensi yang sudah ada menjadi izin resmi dan hapus potongan denda
			existing.Status = leaveType
			existing.Method = "Permit"
			existing.LateMinutes = 0
			existing.PenaltyAmount = 0
			existing.IsPenaltyWaived = true
			if existing.Notes != "" {
				existing.Notes = existing.Notes + " | " + notes
			} else {
				existing.Notes = notes
			}
			if err := r.db.Save(&existing).Error; err != nil {
				return err
			}
		} else {
			return err
		}

		cur = cur.AddDate(0, 0, 1)
	}

	return nil
}

