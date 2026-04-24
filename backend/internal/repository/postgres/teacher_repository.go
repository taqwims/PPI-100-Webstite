package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type TeacherRepository struct {
	db *gorm.DB
}

func NewTeacherRepository(db *gorm.DB) *TeacherRepository {
	return &TeacherRepository{db: db}
}

func (r *TeacherRepository) Create(teacher *domain.Teacher) error {
	return r.db.Create(teacher).Error
}

func (r *TeacherRepository) GetAll(unitID uint) ([]domain.Teacher, error) {
	var teachers []domain.Teacher
	query := r.db.Preload("User")
	if unitID > 0 {
		query = query.Where("unit_id = ?", unitID)
	}
	err := query.Find(&teachers).Error
	return teachers, err
}

func (r *TeacherRepository) FindByID(id string) (*domain.Teacher, error) {
	var teacher domain.Teacher
	err := r.db.Preload("User").First(&teacher, "id = ?", id).Error
	return &teacher, err
}

func (r *TeacherRepository) DeleteByUserID(userID string) error {
	return r.db.Where("user_id = ?", userID).Delete(&domain.Teacher{}).Error
}
