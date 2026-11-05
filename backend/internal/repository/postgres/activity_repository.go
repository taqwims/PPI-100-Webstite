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
	if err := r.db.Save(activity).Error; err != nil {
		return err
	}
	isInst := activity.IsInstallment || activity.PaymentSchedule == "Bertahap"
	return r.db.Exec(`
		UPDATE bills SET is_installment = ? 
		WHERE activity_obligation_id IN (
			SELECT id FROM activity_obligations WHERE activity_id = ?
		)
	`, isInst, activity.ID).Error
}

func (r *ActivityRepository) Delete(id uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Dapatkan detail kegiatan (untuk mengambil nama kegiatan)
		var activity domain.Activity
		_ = tx.First(&activity, "id = ?", id).Error

		// 2. Dapatkan semua ID kewajiban (activity_obligations) untuk kegiatan ini
		var obligationIDs []uuid.UUID
		if err := tx.Model(&domain.ActivityObligation{}).
			Where("activity_id = ?", id).
			Pluck("id", &obligationIDs).Error; err != nil {
			return err
		}

		// 3. Dapatkan semua ID tagihan (bills) yang terhubung
		var billIDs []uuid.UUID
		if len(obligationIDs) > 0 {
			_ = tx.Model(&domain.Bill{}).
				Where("activity_obligation_id IN ?", obligationIDs).
				Pluck("id", &billIDs).Error
		}

		// Juga bersihkan jika ada tagihan dengan nama kegiatan yang sama dan bertipe Kegiatan
		if activity.Name != "" {
			var namedBillIDs []uuid.UUID
			_ = tx.Model(&domain.Bill{}).
				Where("bill_type = 'Kegiatan' AND title = ?", activity.Name).
				Pluck("id", &namedBillIDs).Error
			billIDs = append(billIDs, namedBillIDs...)
		}

		// 4. Hapus tagihan beserta pembayaran dan itemnya
		if len(billIDs) > 0 {
			uniqueBillIDs := make([]uuid.UUID, 0, len(billIDs))
			seenBills := make(map[uuid.UUID]bool)
			for _, bID := range billIDs {
				if !seenBills[bID] {
					seenBills[bID] = true
					uniqueBillIDs = append(uniqueBillIDs, bID)
				}
			}

			if err := tx.Where("bill_id IN ?", uniqueBillIDs).Delete(&domain.Payment{}).Error; err != nil {
				return err
			}
			if err := tx.Where("bill_id IN ?", uniqueBillIDs).Delete(&domain.BillItem{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", uniqueBillIDs).Delete(&domain.Bill{}).Error; err != nil {
				return err
			}
		}

		// 5. Hapus kewajiban kegiatan
		if len(obligationIDs) > 0 {
			if err := tx.Where("id IN ?", obligationIDs).Delete(&domain.ActivityObligation{}).Error; err != nil {
				return err
			}
		}

		// 6. Hapus transaksi kas kegiatan
		if err := tx.Where("activity_id = ?", id).Delete(&domain.ActivityTransaction{}).Error; err != nil {
			return err
		}

		// 7. Hapus kegiatan itu sendiri
		return tx.Delete(&domain.Activity{}, "id = ?", id).Error
	})
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
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Cari semua tagihan yang terhubung dengan kewajiban kegiatan ini
		var billIDs []uuid.UUID
		if err := tx.Model(&domain.Bill{}).
			Where("activity_obligation_id = ?", id).
			Pluck("id", &billIDs).Error; err != nil {
			return err
		}

		// 2. Hapus tagihan dan pembayaran/item terkait
		if len(billIDs) > 0 {
			if err := tx.Where("bill_id IN ?", billIDs).Delete(&domain.Payment{}).Error; err != nil {
				return err
			}
			if err := tx.Where("bill_id IN ?", billIDs).Delete(&domain.BillItem{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", billIDs).Delete(&domain.Bill{}).Error; err != nil {
				return err
			}
		}

		// 3. Hapus data kewajiban kegiatan
		return tx.Delete(&domain.ActivityObligation{}, "id = ?", id).Error
	})
}

// CleanOrphanedBills membersihkan tagihan kegiatan yang kegiatannya sudah tidak ada di database
func (r *ActivityRepository) CleanOrphanedBills() error {
	return CleanOrphanedActivityBills(r.db)
}

// CleanOrphanedActivityBills membersihkan tagihan kegiatan yang kegiatannya sudah tidak ada di database
func CleanOrphanedActivityBills(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Cari ID tagihan orphaned
		queryOrphanedBills := `
			SELECT id FROM bills 
			WHERE bill_type = 'Kegiatan' AND (
				activity_obligation_id IS NULL 
				OR activity_obligation_id NOT IN (SELECT id FROM activity_obligations)
				OR activity_obligation_id IN (
					SELECT ao.id FROM activity_obligations ao 
					LEFT JOIN activities a ON ao.activity_id = a.id 
					WHERE a.id IS NULL
				)
			)
		`

		var orphanedBillIDs []uuid.UUID
		if err := tx.Raw(queryOrphanedBills).Scan(&orphanedBillIDs).Error; err != nil {
			return err
		}

		if len(orphanedBillIDs) > 0 {
			_ = tx.Where("bill_id IN ?", orphanedBillIDs).Delete(&domain.Payment{}).Error
			_ = tx.Where("bill_id IN ?", orphanedBillIDs).Delete(&domain.BillItem{}).Error
			_ = tx.Where("id IN ?", orphanedBillIDs).Delete(&domain.Bill{}).Error
		}

		// Bersihkan activity_obligations yang tidak punya kegiatan
		_ = tx.Exec(`
			DELETE FROM activity_obligations 
			WHERE activity_id NOT IN (SELECT id FROM activities)
		`).Error

		// Bersihkan activity_transactions yang tidak punya kegiatan
		_ = tx.Exec(`
			DELETE FROM activity_transactions 
			WHERE activity_id NOT IN (SELECT id FROM activities)
		`).Error

		return nil
	})
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
			isInstallment := activity.IsInstallment || activity.PaymentSchedule == "Bertahap"
			bill := domain.Bill{
				StudentID:            student.ID,
				Title:                activity.Name,
				Amount:               activity.TargetAmount,
				DueDate:              activity.EndDate,
				Status:               "Unpaid",
				BillType:             "Kegiatan",
				AcademicYearID:       &activity.AcademicYearID,
				ActivityObligationID: &obID,
				IsInstallment:        isInstallment,
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
	isInstallment := activity.IsInstallment || activity.PaymentSchedule == "Bertahap"
	bill := domain.Bill{
		StudentID:            studentID,
		Title:                activity.Name,
		Amount:               activity.TargetAmount,
		DueDate:              activity.EndDate,
		Status:               "Unpaid",
		BillType:             "Kegiatan",
		AcademicYearID:       &activity.AcademicYearID,
		ActivityObligationID: &obID,
		IsInstallment:        isInstallment,
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
