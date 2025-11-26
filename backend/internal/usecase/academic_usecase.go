package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type AcademicUsecase struct {
	academicRepo *postgres.AcademicRepository
}

func NewAcademicUsecase(academicRepo *postgres.AcademicRepository) *AcademicUsecase {
	return &AcademicUsecase{academicRepo: academicRepo}
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

// Subject
func (u *AcademicUsecase) CreateSubject(name string, unitID uint) error {
	subject := &domain.Subject{
		Name:   name,
		UnitID: unitID,
	}
	return u.academicRepo.CreateSubject(subject)
}

func (u *AcademicUsecase) GetAllSubjects(unitID uint) ([]domain.Subject, error) {
	return u.academicRepo.GetAllSubjects(unitID)
}

// Schedule
func (u *AcademicUsecase) CreateSchedule(req domain.Schedule) error {
	return u.academicRepo.CreateSchedule(&req)
}

func (u *AcademicUsecase) GetAllSchedules(classID uint, teacherID string) ([]domain.Schedule, error) {
	return u.academicRepo.GetAllSchedules(classID, teacherID)
}
