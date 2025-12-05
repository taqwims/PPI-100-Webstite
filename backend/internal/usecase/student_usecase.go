package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type StudentUsecase struct {
	studentRepo    *postgres.StudentRepository
	attendanceRepo *postgres.AttendanceRepository
	userRepo       *postgres.UserRepository
}

func NewStudentUsecase(studentRepo *postgres.StudentRepository, attendanceRepo *postgres.AttendanceRepository, userRepo *postgres.UserRepository) *StudentUsecase {
	return &StudentUsecase{
		studentRepo:    studentRepo,
		attendanceRepo: attendanceRepo,
		userRepo:       userRepo,
	}
}

func (u *StudentUsecase) GetAllStudents(unitID uint) ([]domain.Student, error) {
	return u.studentRepo.GetAll(unitID)
}

func (u *StudentUsecase) CreateStudent(name, email, password, nisn string, classID, unitID uint, parentID *uuid.UUID) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		ID:       uuid.New(),
		Name:     name,
		Email:    email,
		PasswordHash: string(hashedPassword),
		RoleID:   6, // Student
	}

	if err := u.userRepo.Create(user); err != nil {
		return err
	}

	student := &domain.Student{
		ID:       uuid.New(),
		UserID:   user.ID,
		NISN:     nisn,
		ClassID:  classID,
		UnitID:   unitID,
		ParentID: parentID,
	}

	return u.studentRepo.Create(student)
}

func (u *StudentUsecase) UpdateStudent(id string, name, email, nisn string, classID uint) error {
	student, err := u.studentRepo.GetByID(id)
	if err != nil {
		return err
	}

	// Update User
	user, err := u.userRepo.FindByID(student.UserID.String())
	if err != nil {
		return err
	}
	user.Name = name
	user.Email = email
	if err := u.userRepo.Update(user); err != nil {
		return err
	}

	// Update Student
	student.NISN = nisn
	student.ClassID = classID
	return u.studentRepo.Update(student)
}

func (u *StudentUsecase) DeleteStudent(id string) error {
	student, err := u.studentRepo.GetByID(id)
	if err != nil {
		return err
	}

	// Delete Student first (FK constraint usually requires this, or cascade)
	if err := u.studentRepo.Delete(id); err != nil {
		return err
	}

	// Delete User
	return u.userRepo.Delete(student.UserID.String())
}

func (u *StudentUsecase) RecordAttendance(studentID uuid.UUID, scheduleID uint, method, status string) error {
	// Check if already attended today for this schedule
	exists, err := u.attendanceRepo.CheckExistence(studentID.String(), scheduleID, time.Now())
	if err != nil {
		return err
	}
	if exists {
		return errors.New("attendance already recorded for this schedule today")
	}

	attendance := &domain.Attendance{
		StudentID:  studentID,
		ScheduleID: scheduleID,
		Timestamp:  time.Now(),
		Method:     method,
		Status:     status,
	}

	return u.attendanceRepo.Create(attendance)
}

func (u *StudentUsecase) GetStudentAttendance(studentID string) ([]domain.Attendance, error) {
	return u.attendanceRepo.GetByStudent(studentID)
}

func (u *StudentUsecase) GetScheduleAttendance(scheduleID uint) ([]domain.Attendance, error) {
	return u.attendanceRepo.GetBySchedule(scheduleID)
}

func (u *StudentUsecase) GetChildren(parentID string) ([]domain.Student, error) {
	return u.studentRepo.GetByParent(parentID)
}

func (u *StudentUsecase) GetChildrenByUserID(userID string) ([]domain.Student, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.Parent == nil {
		return nil, errors.New("user is not a parent")
	}
	return u.studentRepo.GetByParent(user.Parent.ID.String())
}
