package postgres

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ActivityRepository struct {
	db *gorm.DB
}

func NewActivityRepository(db *gorm.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

// ------------------- Activities -------------------

func (r *ActivityRepository) Create(activity *domain.Activity) error {
	return r.db.Create(activity).Error
}

func (r *ActivityRepository) GetAllByAcademicYear(academicYearID uint) ([]domain.Activity, error) {
	var activities []domain.Activity
	err := r.db.Preload("AcademicYear").Preload("CreatedBy").
		Where("academic_year_id = ?", academicYearID).
		Order("created_at desc").
		Find(&activities).Error
	return activities, err
}

func (r *ActivityRepository) GetAll() ([]domain.Activity, error) {
	var activities []domain.Activity
	err := r.db.Preload("AcademicYear").Preload("CreatedBy").
		Order("created_at desc").
		Find(&activities).Error
	return activities, err
}

func (r *ActivityRepository) GetByID(id uuid.UUID) (*domain.Activity, error) {
	var activity domain.Activity
	err := r.db.Preload("AcademicYear").Preload("CreatedBy").First(&activity, "id = ?", id).Error
	return &activity, err
}

func (r *ActivityRepository) Update(activity *domain.Activity) error {
	return r.db.Save(activity).Error
}

func (r *ActivityRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&domain.Activity{}, "id = ?", id).Error
}

// ------------------- Activity Obligations (Tagihan) -------------------

func (r *ActivityRepository) CreateObligation(obligation *domain.ActivityObligation) error {
	return r.db.Create(obligation).Error
}

func (r *ActivityRepository) GetObligationsByActivity(activityID uuid.UUID) ([]domain.ActivityObligation, error) {
	var obs []domain.ActivityObligation
	err := r.db.Preload("Student").Preload("Student.User").Preload("Student.Class").Preload("Activity").
		Where("activity_id = ?", activityID).
		Order("created_at desc").
		Find(&obs).Error
	return obs, err
}

func (r *ActivityRepository) GetObligationByID(id uuid.UUID) (*domain.ActivityObligation, error) {
	var ob domain.ActivityObligation
	err := r.db.Preload("Activity").Preload("Student").Preload("Student.User").First(&ob, "id = ?", id).Error
	return &ob, err
}

func (r *ActivityRepository) UpdateObligation(obligation *domain.ActivityObligation) error {
	return r.db.Save(obligation).Error
}

func (r *ActivityRepository) DeleteObligation(id uuid.UUID) error {
	return r.db.Delete(&domain.ActivityObligation{}, "id = ?", id).Error
}

func (r *ActivityRepository) BulkAssignClass(activityID uuid.UUID, classID uint, createdByID uuid.UUID) (int, error) {
	var students []domain.Student
	if err := r.db.Where("class_id = ? AND status = 'Active'", classID).Find(&students).Error; err != nil {
		return 0, err
	}

	activity, err := r.GetByID(activityID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, student := range students {
		// Ignore if already assigned
		var existing int64
		r.db.Model(&domain.ActivityObligation{}).Where("activity_id = ? AND student_id = ?", activityID, student.ID).Count(&existing)
		if existing > 0 {
			continue
		}

		ob := domain.ActivityObligation{
			ActivityID:  activityID,
			StudentID:   student.ID,
			Amount:      activity.TargetAmount,
			PaidAmount:  0,
			Status:      "Unpaid",
			CreatedByID: createdByID,
		}

		if err := r.db.Create(&ob).Error; err == nil {
			count++
			
			// Auto create Bill with link to ActivityObligation
			obID := ob.ID
			bill := domain.Bill{
				StudentID:            student.ID,
				Title:                activity.Name,
				Amount:               activity.TargetAmount,
				DueDate:              activity.EndDate,
				Status:               "Unpaid",
				BillType:             "Kegiatan",
				AcademicYearID:       &activity.AcademicYearID,
				ActivityObligationID: &obID,
				IsInstallment:        false,
				InvoiceNumber:        fmt.Sprintf("INV-%d-%s", time.Now().UnixMilli(), student.ID.String()[:8]),
			}
			r.db.Create(&bill)
		}
	}

	return count, nil
}

func (r *ActivityRepository) AssignStudent(activityID uuid.UUID, studentID uuid.UUID, createdByID uuid.UUID) (*domain.ActivityObligation, error) {
	activity, err := r.GetByID(activityID)
	if err != nil {
		return nil, err
	}

	var existing int64
	r.db.Model(&domain.ActivityObligation{}).Where("activity_id = ? AND student_id = ?", activityID, studentID).Count(&existing)
	if existing > 0 {
		return nil, errors.New("Siswa sudah ditugaskan untuk kegiatan ini")
	}

	ob := domain.ActivityObligation{
		ActivityID:  activityID,
		StudentID:   studentID,
		Amount:      activity.TargetAmount,
		PaidAmount:  0,
		Status:      "Unpaid",
		CreatedByID: createdByID,
	}

	if err := r.db.Create(&ob).Error; err != nil {
		return nil, err
	}

	// Auto create Bill with link to ActivityObligation
	obID := ob.ID
	bill := domain.Bill{
		StudentID:            studentID,
		Title:                activity.Name,
		Amount:               activity.TargetAmount,
		DueDate:              activity.EndDate,
		Status:               "Unpaid",
		BillType:             "Kegiatan",
		AcademicYearID:       &activity.AcademicYearID,
		ActivityObligationID: &obID,
		IsInstallment:        false,
		InvoiceNumber:        fmt.Sprintf("INV-%d-%s", time.Now().UnixMilli(), studentID.String()[:8]),
	}
	r.db.Create(&bill)

	return &ob, nil
}

// ------------------- Activity Transactions (Buku Kas Kegiatan) -------------------

func (r *ActivityRepository) CreateTransaction(tx *domain.ActivityTransaction) error {
	return r.db.Create(tx).Error
}

func (r *ActivityRepository) GetTransactionsByActivity(activityID uuid.UUID) ([]domain.ActivityTransaction, error) {
	var txs []domain.ActivityTransaction
	err := r.db.Preload("CreatedBy").
		Where("activity_id = ?", activityID).
		Order("date desc, created_at desc").
		Find(&txs).Error
	return txs, err
}

func (r *ActivityRepository) DeleteTransaction(id uuid.UUID) error {
	return r.db.Delete(&domain.ActivityTransaction{}, "id = ?", id).Error
}
