package postgres

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"gorm.io/gorm"
)

type WAScheduleRepository interface {
	Create(schedule *domain.WASchedule) error
	GetAll() ([]domain.WASchedule, error)
	GetByID(id uint) (*domain.WASchedule, error)
	UpdateStatus(id uint, status string) error
	UpdateDetail(detail *domain.WAScheduleDetail) error
	GetPendingDue(now time.Time) ([]domain.WASchedule, error)
	GetActiveProcessing() ([]domain.WASchedule, error)
	CancelPending(id uint) error
	GetDetailsByScheduleID(scheduleID uint) ([]domain.WAScheduleDetail, error)
	ResetProcessingToPending() error
}

type waScheduleRepository struct {
	db *gorm.DB
}

func NewWAScheduleRepository(db *gorm.DB) WAScheduleRepository {
	return &waScheduleRepository{db: db}
}

func (r *waScheduleRepository) Create(schedule *domain.WASchedule) error {
	return r.db.Create(schedule).Error
}

func (r *waScheduleRepository) GetAll() ([]domain.WASchedule, error) {
	var schedules []domain.WASchedule
	err := r.db.Preload("WATemplate").Order("send_at desc").Find(&schedules).Error
	return schedules, err
}

func (r *waScheduleRepository) GetByID(id uint) (*domain.WASchedule, error) {
	var schedule domain.WASchedule
	err := r.db.Preload("WATemplate").Preload("Recipients.Student.User").Preload("Recipients.Student.Class").First(&schedule, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("%w: wa schedule id %d", domain.ErrNotFound, id)
		}
		return nil, err
	}
	return &schedule, nil
}

func (r *waScheduleRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&domain.WASchedule{}).Where("id = ?", id).Update("status", status).Error
}

func (r *waScheduleRepository) UpdateDetail(detail *domain.WAScheduleDetail) error {
	return r.db.Save(detail).Error
}

func (r *waScheduleRepository) GetPendingDue(now time.Time) ([]domain.WASchedule, error) {
	var schedules []domain.WASchedule
	// Select pending schedules scheduled for now or in the past
	err := r.db.Where("status = ? AND send_at <= ?", "pending", now).Find(&schedules).Error
	return schedules, err
}

func (r *waScheduleRepository) GetActiveProcessing() ([]domain.WASchedule, error) {
	var schedules []domain.WASchedule
	err := r.db.Where("status = ?", "processing").Find(&schedules).Error
	return schedules, err
}

func (r *waScheduleRepository) CancelPending(id uint) error {
	result := r.db.Model(&domain.WASchedule{}).Where("id = ? AND status = ?", id, "pending").Update("status", "cancelled")
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("tidak bisa membatalkan jadwal (tidak berstatus pending)")
	}
	return nil
}

func (r *waScheduleRepository) GetDetailsByScheduleID(scheduleID uint) ([]domain.WAScheduleDetail, error) {
	var details []domain.WAScheduleDetail
	err := r.db.Where("wa_schedule_id = ?", scheduleID).Preload("Student.User").Preload("Student.Class").Find(&details).Error
	return details, err
}

func (r *waScheduleRepository) ResetProcessingToPending() error {
	return r.db.Model(&domain.WASchedule{}).Where("status = ?", "processing").Update("status", "pending").Error
}
