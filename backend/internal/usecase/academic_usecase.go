package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/google/uuid"
)

type AcademicUsecase struct {
	academicRepo  *postgres.AcademicRepository
	elearningRepo *postgres.ElearningRepository
	userRepo      *postgres.UserRepository
	teacherRepo   *postgres.TeacherRepository
}

func NewAcademicUsecase(academicRepo *postgres.AcademicRepository, elearningRepo *postgres.ElearningRepository, userRepo *postgres.UserRepository, teacherRepo *postgres.TeacherRepository) *AcademicUsecase {
	return &AcademicUsecase{
		academicRepo:  academicRepo,
		elearningRepo: elearningRepo,
		userRepo:      userRepo,
		teacherRepo:   teacherRepo,
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

func (u *AcademicUsecase) UpdateClass(id uint, name string, homeroomTeacherID *uuid.UUID) error {
	class, err := u.academicRepo.GetClassByID(id)
	if err != nil {
		return err
	}

	oldHomeroomTeacherID := class.HomeroomTeacherID
	class.Name = name
	class.HomeroomTeacherID = homeroomTeacherID

	if err := u.academicRepo.UpdateClass(class); err != nil {
		return err
	}

	// Update teacher roles for homeroom teacher changes
	// If old teacher was unassigned, revert to Guru (4) if not homeroom teacher of another class
	if oldHomeroomTeacherID != nil && (homeroomTeacherID == nil || *oldHomeroomTeacherID != *homeroomTeacherID) {
		u.revertTeacherRole(oldHomeroomTeacherID.String(), id)
	}

	// If new teacher is assigned, set role to Wali Kelas (5)
	if homeroomTeacherID != nil && (oldHomeroomTeacherID == nil || *oldHomeroomTeacherID != *homeroomTeacherID) {
		u.setHomeroomTeacherRole(homeroomTeacherID.String())
	}

	return nil
}

// setHomeroomTeacherRole sets the teacher's user role to Wali Kelas (5)
func (u *AcademicUsecase) setHomeroomTeacherRole(teacherID string) {
	teacher, err := u.teacherRepo.FindByID(teacherID)
	if err != nil {
		return
	}
	user, err := u.userRepo.FindByID(teacher.UserID.String())
	if err != nil {
		return
	}
	if user.RoleID == 4 { // Only update if currently Guru
		user.RoleID = 5 // Wali Kelas
		u.userRepo.Update(user)
	}
}

// revertTeacherRole reverts the teacher's role to Guru (4) if they're not homeroom teacher of another class
func (u *AcademicUsecase) revertTeacherRole(teacherID string, excludeClassID uint) {
	// Check if this teacher is still homeroom teacher of another class
	_, err := u.academicRepo.GetClassByHomeroomTeacher(teacherID)
	if err == nil {
		// Teacher is still homeroom teacher of another class, don't revert
		return
	}

	teacher, err := u.teacherRepo.FindByID(teacherID)
	if err != nil {
		return
	}
	user, err := u.userRepo.FindByID(teacher.UserID.String())
	if err != nil {
		return
	}
	if user.RoleID == 5 { // Only revert if currently Wali Kelas
		user.RoleID = 4 // Guru
		u.userRepo.Update(user)
	}
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

func (u *AcademicUsecase) GetTeacherIDByUserID(userID string) (string, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return "", err
	}
	if user.Teacher == nil {
		return "", errors.New("user is not a teacher")
	}
	return user.Teacher.ID.String(), nil
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

func (u *AcademicUsecase) GetAllSchedules(unitID, classID uint, teacherID string) ([]domain.Schedule, error) {
	return u.academicRepo.GetAllSchedules(unitID, classID, teacherID)
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
