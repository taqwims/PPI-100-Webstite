package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StudentLeaveRepository struct {
	db *gorm.DB
}

func NewStudentLeaveRepository(db *gorm.DB) *StudentLeaveRepository {
	return &StudentLeaveRepository{db: db}
}

func (r *StudentLeaveRepository) Create(leave *domain.StudentLeaveRequest) error {
	return r.db.Create(leave).Error
}

func (r *StudentLeaveRepository) GetByID(id uuid.UUID) (*domain.StudentLeaveRequest, error) {
	var leave domain.StudentLeaveRequest
	err := r.db.
		Preload("Student.User").
		Preload("Student.Class.HomeroomTeacher.User").
		Preload("Student.Parent.User").
		Preload("ApplicantUser").
		Preload("ApproverTeacher.User").
		First(&leave, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &leave, nil
}

func (r *StudentLeaveRepository) GetByStudentID(studentID uuid.UUID) ([]domain.StudentLeaveRequest, error) {
	var leaves []domain.StudentLeaveRequest
	err := r.db.
		Preload("Student.User").
		Preload("Student.Class").
		Preload("ApproverTeacher.User").
		Where("student_id = ?", studentID).
		Order("created_at DESC").
		Find(&leaves).Error
	return leaves, err
}

func (r *StudentLeaveRepository) GetByStudentIDs(studentIDs []uuid.UUID) ([]domain.StudentLeaveRequest, error) {
	if len(studentIDs) == 0 {
		return []domain.StudentLeaveRequest{}, nil
	}
	var leaves []domain.StudentLeaveRequest
	err := r.db.
		Preload("Student.User").
		Preload("Student.Class").
		Preload("ApproverTeacher.User").
		Where("student_id IN ?", studentIDs).
		Order("created_at DESC").
		Find(&leaves).Error
	return leaves, err
}

func (r *StudentLeaveRepository) GetByHomeroomTeacherID(teacherID uuid.UUID, status string) ([]domain.StudentLeaveRequest, error) {
	// 1. Dapatkan kelas yang dibina oleh wali kelas ini
	var classes []domain.Class
	if err := r.db.Where("homeroom_teacher_id = ?", teacherID).Find(&classes).Error; err != nil {
		return nil, err
	}
	if len(classes) == 0 {
		return []domain.StudentLeaveRequest{}, nil
	}

	var classIDs []uint
	for _, c := range classes {
		classIDs = append(classIDs, c.ID)
	}

	// 2. Query leave request dari siswa di kelas-kelas tersebut
	query := r.db.
		Preload("Student.User").
		Preload("Student.Class").
		Preload("Student.Parent.User").
		Preload("ApplicantUser").
		Preload("ApproverTeacher.User").
		Joins("JOIN students ON students.id = student_leave_requests.student_id").
		Where("students.class_id IN ?", classIDs)

	if status != "" && status != "all" {
		query = query.Where("student_leave_requests.status = ?", status)
	}

	var leaves []domain.StudentLeaveRequest
	err := query.Order("student_leave_requests.created_at DESC").Find(&leaves).Error
	return leaves, err
}

func (r *StudentLeaveRepository) Update(leave *domain.StudentLeaveRequest) error {
	return r.db.Save(leave).Error
}

// RecordAttendanceForLeave secara otomatis membuat/memperbarui record presensi harian untuk setiap hari yang disetujui
func (r *StudentLeaveRepository) RecordAttendanceForLeave(studentID uuid.UUID, startDate, endDate time.Time, leaveType, notes string) error {
	// Normalisasi tanggal ke jam 07:00:00 WIB
	loc, _ := time.LoadLocation("Asia/Jakarta")
	if loc == nil {
		loc = time.Local
	}

	cur := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 7, 0, 0, 0, loc)
	end := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 7, 0, 0, 0, loc)

	for !cur.After(end) {
		startOfDay := time.Date(cur.Year(), cur.Month(), cur.Day(), 0, 0, 0, 0, loc)
		endOfDay := startOfDay.Add(24 * time.Hour)

		var existing domain.Attendance
		err := r.db.Where("student_id = ? AND timestamp >= ? AND timestamp < ?", studentID, startOfDay, endOfDay).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			// Buat presensi baru dengan status izin/sakit
			newAtt := domain.Attendance{
				StudentID: studentID,
				Timestamp: cur,
				Method:    "Permit",
				Status:    leaveType, // "Sick" atau "Permission"
				Type:      "CheckIn",
				Notes:     notes,
			}
			if err := r.db.Create(&newAtt).Error; err != nil {
				return err
			}
		} else if err == nil {
			// Update status presensi yang sudah ada menjadi izin/sakit resmi
			existing.Status = leaveType
			existing.Method = "Permit"
			if existing.Notes != "" {
				existing.Notes = existing.Notes + " | " + notes
			} else {
				existing.Notes = notes
			}
			if err := r.db.Save(&existing).Error; err != nil {
				return err
			}
		}

		cur = cur.AddDate(0, 0, 1)
	}

	return nil
}
