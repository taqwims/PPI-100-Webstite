package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/google/uuid"
)

type AcademicUsecase struct {
	academicRepo *postgres.AcademicRepository
	elearningRepo *postgres.ElearningRepository
	userRepo      *postgres.UserRepository
}

func NewAcademicUsecase(academicRepo *postgres.AcademicRepository, elearningRepo *postgres.ElearningRepository, userRepo *postgres.UserRepository) *AcademicUsecase {
	return &AcademicUsecase{
		academicRepo: academicRepo,
		elearningRepo: elearningRepo,
		userRepo:      userRepo,
	}
}

// Class
func (u *AcademicUsecase) CreateClass(name string, unitID uint) error {
	class := &domain.Class{
		Name:   name,
		UnitID: unitID,
	}
	return u.academicRepo.CreateClass(class)
}

func (u *AcademicUsecase) GetAllClasses(unitID uint) ([]domain.Class, error) {
	return u.academicRepo.GetAllClasses(unitID)
}

func (u *AcademicUsecase) UpdateClass(id uint, name string) error {
	class, err := u.academicRepo.GetClassByID(id)
	if err != nil {
		return err
	}
	class.Name = name
	return u.academicRepo.UpdateClass(class)
}

func (u *AcademicUsecase) DeleteClass(id uint) error {
	return u.academicRepo.DeleteClass(id)
}

func (u *AcademicUsecase) GetHomeroomClass(teacherID string) (*domain.Class, error) {
	return u.academicRepo.GetClassByHomeroomTeacher(teacherID)
}

type SubjectGrade struct {
	SubjectName string  `json:"subject_name"`
	Average     float64 `json:"average"`
}

func (u *AcademicUsecase) GetStudentReportCard(studentID uuid.UUID) ([]SubjectGrade, error) {
	submissions, err := u.elearningRepo.GetSubmissionsByStudent(studentID)
	if err != nil {
		return nil, err
	}

	// Group by Subject
	subjectScores := make(map[string][]float64)
	for _, sub := range submissions {
		subjectName := sub.Task.Subject.Name
		subjectScores[subjectName] = append(subjectScores[subjectName], sub.Grade)
	}

	// Calculate Average
	var reportCard []SubjectGrade
	for subject, scores := range subjectScores {
		total := 0.0
		for _, score := range scores {
			total += score
		}
		average := 0.0
		if len(scores) > 0 {
			average = total / float64(len(scores))
		}
		reportCard = append(reportCard, SubjectGrade{
			SubjectName: subject,
			Average:     average,
		})
	}

	return reportCard, nil
}

func (u *AcademicUsecase) GetStudentReportCardByUserID(userID string) ([]SubjectGrade, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.Student == nil {
		return nil, errors.New("user is not a student") // Or handle as error
	}
	return u.GetStudentReportCard(user.Student.ID)
}

// Subject
func (u *AcademicUsecase) CreateSubject(name string, unitID uint) error {
	subject := &domain.Subject{
		Name:   name,
		UnitID: unitID,
	}
	return u.academicRepo.CreateSubject(subject)
}

func (u *AcademicUsecase) GetStudentClassIDByUserID(userID string) (uint, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return 0, err
	}
	if user.Student == nil {
		return 0, errors.New("user is not a student")
	}
	return user.Student.ClassID, nil
}

func (u *AcademicUsecase) GetAllSubjects(unitID uint) ([]domain.Subject, error) {
	return u.academicRepo.GetAllSubjects(unitID)
}

func (u *AcademicUsecase) UpdateSubject(id uint, name string) error {
	subject := &domain.Subject{
		ID:   id,
		Name: name,
	}
	return u.academicRepo.UpdateSubject(subject)
}

func (u *AcademicUsecase) DeleteSubject(id uint) error {
	return u.academicRepo.DeleteSubject(id)
}

// Schedule
func (u *AcademicUsecase) CreateSchedule(req domain.Schedule) error {
	return u.academicRepo.CreateSchedule(&req)
}

func (u *AcademicUsecase) GetAllSchedules(classID uint, teacherID string) ([]domain.Schedule, error) {
	return u.academicRepo.GetAllSchedules(classID, teacherID)
}

func (u *AcademicUsecase) UpdateSchedule(id uint, req domain.Schedule) error {
	schedule, err := u.academicRepo.GetScheduleByID(id)
	if err != nil {
		return err
	}
	
	schedule.ClassID = req.ClassID
	schedule.SubjectID = req.SubjectID
	schedule.TeacherID = req.TeacherID
	schedule.Day = req.Day
	schedule.StartTime = req.StartTime
	schedule.EndTime = req.EndTime
	
	return u.academicRepo.UpdateSchedule(schedule)
}

func (u *AcademicUsecase) DeleteSchedule(id uint) error {
	return u.academicRepo.DeleteSchedule(id)
}
