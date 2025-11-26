package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type ElearningUsecase struct {
	elearningRepo *postgres.ElearningRepository
}

func NewElearningUsecase(elearningRepo *postgres.ElearningRepository) *ElearningUsecase {
	return &ElearningUsecase{elearningRepo: elearningRepo}
}

func (u *ElearningUsecase) CreateMaterial(title, description, fileURL string, classID, subjectID uint, teacherID uuid.UUID) error {
	material := &domain.Material{
		Title:       title,
		Description: description,
		FileURL:     fileURL,
		ClassID:     classID,
		SubjectID:   subjectID,
		TeacherID:   teacherID,
	}
	return u.elearningRepo.CreateMaterial(material)
}

func (u *ElearningUsecase) GetMaterials(classID uint) ([]domain.Material, error) {
	return u.elearningRepo.GetMaterialsByClass(classID)
}

func (u *ElearningUsecase) CreateTask(title, description string, deadline time.Time, classID, subjectID uint, teacherID uuid.UUID) error {
	task := &domain.Task{
		Title:       title,
		Description: description,
		Deadline:    deadline,
		ClassID:     classID,
		SubjectID:   subjectID,
		TeacherID:   teacherID,
	}
	return u.elearningRepo.CreateTask(task)
}

func (u *ElearningUsecase) GetTasks(classID uint) ([]domain.Task, error) {
	return u.elearningRepo.GetTasksByClass(classID)
}

func (u *ElearningUsecase) GradeSubmission(id string, grade float64) error {
	uuid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return u.elearningRepo.UpdateSubmissionGrade(uuid, grade)
}

func (u *ElearningUsecase) GetSubmissions(taskID uint) ([]domain.TaskSubmission, error) {
	return u.elearningRepo.GetSubmissionsByTask(taskID)
}
