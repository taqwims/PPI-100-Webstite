package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type AcademicRepository struct {
	db *gorm.DB
}

func NewAcademicRepository(db *gorm.DB) *AcademicRepository {
	return &AcademicRepository{db: db}
}

// Class
func (r *AcademicRepository) CreateClass(class *domain.Class) error {
	return r.db.Create(class).Error
}

func (r *AcademicRepository) GetAllClasses(unitID uint) ([]domain.Class, error) {
	var classes []domain.Class
	err := r.db.Where("unit_id = ?", unitID).Find(&classes).Error
	return classes, err
}

func (r *AcademicRepository) GetClassByID(id uint) (*domain.Class, error) {
	var class domain.Class
	err := r.db.First(&class, id).Error
	return &class, err
}

func (r *AcademicRepository) UpdateClass(class *domain.Class) error {
	return r.db.Save(class).Error
}

func (r *AcademicRepository) DeleteClass(id uint) error {
	return r.db.Delete(&domain.Class{}, id).Error
}

// Subject
func (r *AcademicRepository) CreateSubject(subject *domain.Subject) error {
	return r.db.Create(subject).Error
}

func (r *AcademicRepository) GetAllSubjects(unitID uint) ([]domain.Subject, error) {
	var subjects []domain.Subject
	err := r.db.Where("unit_id = ?", unitID).Find(&subjects).Error
	return subjects, err
}

func (r *AcademicRepository) UpdateSubject(subject *domain.Subject) error {
	return r.db.Save(subject).Error
}

func (r *AcademicRepository) DeleteSubject(id uint) error {
	return r.db.Delete(&domain.Subject{}, id).Error
}

// Schedule
func (r *AcademicRepository) CreateSchedule(schedule *domain.Schedule) error {
	return r.db.Create(schedule).Error
}

func (r *AcademicRepository) GetAllSchedules(classID uint, teacherID string) ([]domain.Schedule, error) {
	var schedules []domain.Schedule
	query := r.db.Preload("Class").Preload("Subject").Preload("Teacher")

	if classID != 0 {
		query = query.Where("class_id = ?", classID)
	}
	if teacherID != "" {
		query = query.Where("teacher_id = ?", teacherID)
	}

	err := query.Find(&schedules).Error
	return schedules, err
}

func (r *AcademicRepository) DeleteSchedule(id uint) error {
	return r.db.Delete(&domain.Schedule{}, id).Error
}
