package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type ElearningUsecase struct {
	elearningRepo *postgres.ElearningRepository
	notificationUsecase *NotificationUsecase
	userRepo *postgres.UserRepository
}

func NewElearningUsecase(elearningRepo *postgres.ElearningRepository, notificationUsecase *NotificationUsecase, userRepo *postgres.UserRepository) *ElearningUsecase {
	return &ElearningUsecase{
		elearningRepo: elearningRepo,
		notificationUsecase: notificationUsecase,
		userRepo: userRepo,
	}
}

// ... (CreateMaterial, GetMaterials, CreateTask, GetTasks omitted for brevity, but I need to be careful with replace_file_content)
// Wait, I can't omit code in replace_file_content if I'm replacing a chunk.
// I'll target the struct and constructor first.

func (u *ElearningUsecase) GradeSubmission(id string, grade float64) error {
	uuidID, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	// Update grade
	if err := u.elearningRepo.UpdateSubmissionGrade(uuidID, grade); err != nil {
		return err
	}

	// Get submission to send notification
	submission, err := u.elearningRepo.GetSubmissionByID(uuidID)
	if err != nil {
		return nil // Ignore error if submission not found, just don't send notification
	}

	// Send Notification
	return u.notificationUsecase.SendNotification(
		submission.StudentID,
		"Nilai Baru",
		"Tugas Anda '"+submission.Task.Title+"' telah dinilai.",
		"grade",
		submission.ID.String(),
	)
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

func (u *ElearningUsecase) GetMaterialsByUnit(unitID uint) ([]domain.Material, error) {
	return u.elearningRepo.GetMaterialsByUnit(unitID)
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

func (u *ElearningUsecase) GetTasksByUnit(unitID uint) ([]domain.Task, error) {
	return u.elearningRepo.GetTasksByUnit(unitID)
}



func (u *ElearningUsecase) GetSubmissions(taskID uint) ([]domain.TaskSubmission, error) {
	return u.elearningRepo.GetSubmissionsByTask(taskID)
}

func (u *ElearningUsecase) SubmitTask(taskID uint, studentID uuid.UUID, fileURL string) error {
	submission := &domain.TaskSubmission{
		TaskID:    taskID,
		StudentID: studentID,
		FileURL:   fileURL,
		Grade:     0, // Default grade
	}
	return u.elearningRepo.CreateSubmission(submission)
}

func (u *ElearningUsecase) GetStudentSubmissions(studentID uuid.UUID) ([]domain.TaskSubmission, error) {
	return u.elearningRepo.GetSubmissionsByStudent(studentID)
}

func (u *ElearningUsecase) GetStudentSubmissionsByUserID(userID string) ([]domain.TaskSubmission, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.Student == nil {
		return nil, errors.New("user is not a student")
	}
	return u.GetStudentSubmissions(user.Student.ID)
}

// Update/Delete Material
func (u *ElearningUsecase) UpdateMaterial(material *domain.Material) error {
	return u.elearningRepo.UpdateMaterial(material)
}

func (u *ElearningUsecase) DeleteMaterial(id uint) error {
	return u.elearningRepo.DeleteMaterial(id)
}

// Update/Delete Task
func (u *ElearningUsecase) UpdateTask(task *domain.Task) error {
	return u.elearningRepo.UpdateTask(task)
}

func (u *ElearningUsecase) DeleteTask(id uint) error {
	return u.elearningRepo.DeleteTask(id)
}

// Delete Submission
func (u *ElearningUsecase) DeleteSubmission(id uuid.UUID) error {
	return u.elearningRepo.DeleteSubmission(id)
}

