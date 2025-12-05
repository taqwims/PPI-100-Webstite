package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type BKUsecase struct {
	bkRepo *postgres.BKRepository
}

func NewBKUsecase(bkRepo *postgres.BKRepository) *BKUsecase {
	return &BKUsecase{bkRepo: bkRepo}
}

func (u *BKUsecase) CreateViolation(name string, points int, description string) error {
	violation := &domain.Violation{
		Name:        name,
		Points:      points,
		Description: description,
	}
	return u.bkRepo.CreateViolation(violation)
}

func (u *BKUsecase) GetAllViolations() ([]domain.Violation, error) {
	return u.bkRepo.GetAllViolations()
}

func (u *BKUsecase) CreateBKCall(studentID, teacherID uuid.UUID, reason string, date time.Time) error {
	call := &domain.BKCall{
		StudentID: studentID,
		TeacherID: teacherID,
		Reason:    reason,
		Date:      date,
		Status:    "Pending",
	}
	return u.bkRepo.CreateBKCall(call)
}

func (u *BKUsecase) GetAllBKCalls(unitID uint) ([]domain.BKCall, error) {
	return u.bkRepo.GetAllBKCalls(unitID)
}

func (u *BKUsecase) GetStudentBKCalls(studentID string) ([]domain.BKCall, error) {
	return u.bkRepo.GetBKCallsByStudent(studentID)
}

// Update/Delete Violation
func (u *BKUsecase) UpdateViolation(violation *domain.Violation) error {
	return u.bkRepo.UpdateViolation(violation)
}

func (u *BKUsecase) DeleteViolation(id uint) error {
	return u.bkRepo.DeleteViolation(id)
}

// Update/Delete BKCall
func (u *BKUsecase) UpdateBKCall(call *domain.BKCall) error {
	return u.bkRepo.UpdateBKCall(call)
}

func (u *BKUsecase) DeleteBKCall(id string) error {
	return u.bkRepo.DeleteBKCall(id)
}

