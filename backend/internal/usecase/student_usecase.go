package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type StudentUsecase struct {
	studentRepo    *postgres.StudentRepository
	attendanceRepo *postgres.AttendanceRepository
}

func NewStudentUsecase(studentRepo *postgres.StudentRepository, attendanceRepo *postgres.AttendanceRepository) *StudentUsecase {
	return &StudentUsecase{
		studentRepo:    studentRepo,
		attendanceRepo: attendanceRepo,
	}
}

func (u *StudentUsecase) GetAllStudents(unitID uint) ([]domain.Student, error) {
	return u.studentRepo.GetAll(unitID)
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
