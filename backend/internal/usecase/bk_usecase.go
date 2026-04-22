package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type BKUsecase struct {
	bkRepo   *postgres.BKRepository
	userRepo *postgres.UserRepository
}

func NewBKUsecase(bkRepo *postgres.BKRepository, userRepo *postgres.UserRepository) *BKUsecase {
	return &BKUsecase{bkRepo: bkRepo, userRepo: userRepo}
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

func (u *BKUsecase) GetStudentBKCallsByUserID(userID string) ([]domain.BKCall, error) {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.Student == nil {
		return nil, errors.New("user is not a student")
	}
	return u.bkRepo.GetBKCallsByStudent(user.Student.ID.String())
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

