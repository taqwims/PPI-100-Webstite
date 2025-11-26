package postgres

import (
	"ppi-100-sis/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ElearningRepository struct {
	db *gorm.DB
}

func NewElearningRepository(db *gorm.DB) *ElearningRepository {
	return &ElearningRepository{db: db}
}

// Materials
func (r *ElearningRepository) CreateMaterial(material *domain.Material) error {
	return r.db.Create(material).Error
}

func (r *ElearningRepository) GetMaterialsByClass(classID uint) ([]domain.Material, error) {
	var materials []domain.Material
	err := r.db.Where("class_id = ?", classID).Preload("Subject").Find(&materials).Error
	return materials, err
}

// Tasks
func (r *ElearningRepository) CreateTask(task *domain.Task) error {
	return r.db.Create(task).Error
}

func (r *ElearningRepository) GetTasksByClass(classID uint) ([]domain.Task, error) {
	var tasks []domain.Task
	err := r.db.Where("class_id = ?", classID).Preload("Subject").Find(&tasks).Error
	return tasks, err
}

// Submissions
func (r *ElearningRepository) CreateSubmission(submission *domain.TaskSubmission) error {
	return r.db.Create(submission).Error
}

func (r *ElearningRepository) GetSubmissionsByTask(taskID uint) ([]domain.TaskSubmission, error) {
	var submissions []domain.TaskSubmission
	err := r.db.Where("task_id = ?", taskID).Preload("Student.User").Find(&submissions).Error
	return submissions, err
}

func (r *ElearningRepository) UpdateSubmissionGrade(id uuid.UUID, grade float64) error {
	return r.db.Model(&domain.TaskSubmission{}).Where("id = ?", id).Update("grade", grade).Error
}
