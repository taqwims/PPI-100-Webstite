package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type StudentRepository struct {
	db *gorm.DB
}

func NewStudentRepository(db *gorm.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(student *domain.Student) error {
	return r.db.Create(student).Error
}

func (r *StudentRepository) GetAll(unitID uint) ([]domain.Student, error) {
	var students []domain.Student
	err := r.db.Where("unit_id = ?", unitID).Preload("User").Preload("Class").Find(&students).Error
	return students, err
}

func (r *StudentRepository) GetByID(id string) (*domain.Student, error) {
	var student domain.Student
	err := r.db.Where("id = ?", id).Preload("User").Preload("Class").First(&student).Error
	return &student, err
}

func (r *StudentRepository) GetByParent(parentID string) ([]domain.Student, error) {
	var students []domain.Student
	err := r.db.Where("parent_id = ?", parentID).Preload("User").Preload("Class").Find(&students).Error
	return students, err
}

func (r *StudentRepository) Update(student *domain.Student) error {
	return r.db.Save(student).Error
}

// UpdateClassAndStatus performs a targeted update on only class_id and status columns.
// This avoids issues with GORM's Save() conflicting with preloaded associations.
func (r *StudentRepository) UpdateClassAndStatus(studentID string, classID uint, status string) error {
	return r.db.Model(&domain.Student{}).
		Where("id = ?", studentID).
		Updates(map[string]interface{}{
			"class_id": classID,
			"status":   status,
		}).Error
}

func (r *StudentRepository) Delete(id string) error {
	return r.db.Delete(&domain.Student{}, "id = ?", id).Error
}

func (r *StudentRepository) GetParentByID(parentID string) (*domain.Parent, error) {
	var parent domain.Parent
	err := r.db.Where("id = ?", parentID).First(&parent).Error
	return &parent, err
}
