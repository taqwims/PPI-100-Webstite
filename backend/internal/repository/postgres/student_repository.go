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
