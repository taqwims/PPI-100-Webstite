package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type BKUsecase struct {
	bkRepo             *postgres.BKRepository
	userRepo           *postgres.UserRepository
	studentRepo        *postgres.StudentRepository
	notificationUsecase *NotificationUsecase
}

func NewBKUsecase(bkRepo *postgres.BKRepository, userRepo *postgres.UserRepository, studentRepo *postgres.StudentRepository, notificationUsecase *NotificationUsecase) *BKUsecase {
	return &BKUsecase{
		bkRepo:             bkRepo,
		userRepo:           userRepo,
		studentRepo:        studentRepo,
		notificationUsecase: notificationUsecase,
	}
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
	err := u.bkRepo.CreateBKCall(call)
	if err != nil {
		return err
	}

	// Send notification if parent exists
	student, _ := u.studentRepo.GetByID(studentID.String())
	if student != nil && student.ParentID != nil {
		parent, _ := u.studentRepo.GetParentByID(student.ParentID.String())
		if parent != nil {
			_ = u.notificationUsecase.SendWhatsApp(
				parent.Phone,
				"Pemberitahuan Bimbingan Konseling:\nAnak anda "+student.User.Name+" diminta menemui BK pada "+date.Format("02 Jan 2006")+" dengan alasan: "+reason,
			)
		}
	}
	return nil
}

func (u *BKUsecase) RecordStudentViolation(studentID, teacherID uuid.UUID, violationID uint, date time.Time) error {
	sv := &domain.StudentViolation{
		StudentID:   studentID,
		TeacherID:   teacherID,
		ViolationID: violationID,
		Date:        date,
	}
	
	if err := u.bkRepo.RecordStudentViolation(sv); err != nil {
		return err
	}

	// Check total points
	totalPoints, _ := u.bkRepo.GetTotalViolationPoints(studentID.String())
	if totalPoints >= 50 {
		// Automatically create a BKCall
		reason := fmt.Sprintf("Akumulasi Poin Pelanggaran mencapai %d poin.", totalPoints)
		_ = u.CreateBKCall(studentID, teacherID, reason, time.Now().AddDate(0, 0, 1))
	}

	return nil
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

