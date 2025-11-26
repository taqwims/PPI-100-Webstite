package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type BKRepository struct {
	db *gorm.DB
}

func NewBKRepository(db *gorm.DB) *BKRepository {
	return &BKRepository{db: db}
}

// Violations
func (r *BKRepository) CreateViolation(violation *domain.Violation) error {
	return r.db.Create(violation).Error
}

func (r *BKRepository) GetAllViolations() ([]domain.Violation, error) {
	var violations []domain.Violation
	err := r.db.Find(&violations).Error
	return violations, err
}

// BK Calls
func (r *BKRepository) CreateBKCall(call *domain.BKCall) error {
	return r.db.Create(call).Error
}

func (r *BKRepository) GetBKCallsByStudent(studentID string) ([]domain.BKCall, error) {
	var calls []domain.BKCall
	err := r.db.Where("student_id = ?", studentID).Preload("Student.User").Preload("Teacher.User").Find(&calls).Error
	return calls, err
}

func (r *BKRepository) GetAllBKCalls(unitID uint) ([]domain.BKCall, error) {
	var calls []domain.BKCall
	// Join with students to filter by unitID
	err := r.db.Joins("JOIN students ON students.id = bk_calls.student_id").
		Where("students.unit_id = ?", unitID).
		Preload("Student.User").
		Preload("Teacher.User").
		Find(&calls).Error
	return calls, err
}
