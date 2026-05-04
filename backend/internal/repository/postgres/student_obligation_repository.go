package postgres

import (
	"ppi-100-sis/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StudentObligationRepository struct {
	db *gorm.DB
}

func NewStudentObligationRepository(db *gorm.DB) *StudentObligationRepository {
	return &StudentObligationRepository{db: db}
}

func (r *StudentObligationRepository) Create(ob *domain.StudentObligation) error {
	return r.db.Create(ob).Error
}

func (r *StudentObligationRepository) BulkCreate(obs []domain.StudentObligation) error {
	return r.db.Create(&obs).Error
}

func (r *StudentObligationRepository) GetAll(academicYearID uint, classID uint) ([]domain.StudentObligation, error) {
	var obs []domain.StudentObligation
	query := r.db.
		Preload("Student").
		Preload("Student.User").
		Preload("Student.Class").
		Preload("PaymentType").
		Preload("AcademicYear").
		Joins("JOIN students ON students.id = student_obligations.student_id").
		Joins("JOIN users ON users.id = students.user_id").
		Where("students.deleted_at IS NULL AND users.deleted_at IS NULL")

	if academicYearID > 0 {
		query = query.Where("student_obligations.academic_year_id = ?", academicYearID)
	}
	if classID > 0 {
		query = query.Where("students.class_id = ?", classID)
	}

	if err := query.Order("created_at desc").Find(&obs).Error; err != nil {
		return nil, err
	}
	return obs, nil
}

func (r *StudentObligationRepository) GetByStudentID(studentID uuid.UUID, academicYearID uint) ([]domain.StudentObligation, error) {
	var obs []domain.StudentObligation
	query := r.db.
		Preload("PaymentType").
		Preload("AcademicYear").
		Where("student_id = ?", studentID)

	if academicYearID > 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	if err := query.Order("created_at desc").Find(&obs).Error; err != nil {
		return nil, err
	}
	return obs, nil
}

func (r *StudentObligationRepository) GetByID(id uuid.UUID) (*domain.StudentObligation, error) {
	var ob domain.StudentObligation
	if err := r.db.
		Preload("Student").Preload("Student.User").Preload("Student.Class").
		Preload("PaymentType").Preload("AcademicYear").
		Where("id = ?", id).First(&ob).Error; err != nil {
		return nil, err
	}
	return &ob, nil
}

func (r *StudentObligationRepository) Update(ob *domain.StudentObligation) error {
	return r.db.Save(ob).Error
}

func (r *StudentObligationRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&domain.StudentObligation{}, "id = ?", id).Error
}

func (r *StudentObligationRepository) RecordPayment(id uuid.UUID, amount float64) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var ob domain.StudentObligation
		if err := tx.Where("id = ?", id).First(&ob).Error; err != nil {
			return err
		}
		ob.PaidAmount += amount
		if ob.PaidAmount >= ob.Amount {
			ob.Status = "Paid"
		} else if ob.PaidAmount > 0 {
			ob.Status = "Partial"
		}
		return tx.Save(&ob).Error
	})
}

// GetStudentsByClassID fetches all students in a class (helper)
func (r *StudentObligationRepository) GetStudentsByClassID(classID uint) ([]domain.Student, error) {
	var students []domain.Student
	if err := r.db.
		Preload("User").Preload("Class").
		Joins("JOIN users ON users.id = students.user_id").
		Where("students.class_id = ? AND students.status = ? AND students.deleted_at IS NULL AND users.deleted_at IS NULL", classID, "Active").
		Find(&students).Error; err != nil {
		return nil, err
	}
	return students, nil
}

// GetParentByStudentID fetches parent info for a student
func (r *StudentObligationRepository) GetParentByStudentID(parentID *uuid.UUID) (*domain.Parent, *domain.User, error) {
	if parentID == nil {
		return nil, nil, nil
	}
	var parent domain.Parent
	if err := r.db.Where("id = ?", parentID).First(&parent).Error; err != nil {
		return nil, nil, err
	}
	var user domain.User
	if err := r.db.Where("id = ?", parent.UserID).First(&user).Error; err != nil {
		return &parent, nil, err
	}
	return &parent, &user, nil
}
