package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StudentLeaveUsecase struct {
	leaveRepo        *postgres.StudentLeaveRepository
	studentRepo      *postgres.StudentRepository
	userRepo         *postgres.UserRepository
	notificationRepo *postgres.NotificationRepository
	db               *gorm.DB
}

func NewStudentLeaveUsecase(
	leaveRepo *postgres.StudentLeaveRepository,
	studentRepo *postgres.StudentRepository,
	userRepo *postgres.UserRepository,
	notificationRepo *postgres.NotificationRepository,
	db *gorm.DB,
) *StudentLeaveUsecase {
	return &StudentLeaveUsecase{
		leaveRepo:        leaveRepo,
		studentRepo:      studentRepo,
		userRepo:         userRepo,
		notificationRepo: notificationRepo,
		db:               db,
	}
}

// CreateLeaveRequest membuat pengajuan izin/sakit baru oleh siswa atau orang tua
func (u *StudentLeaveUsecase) CreateLeaveRequest(
	studentID uuid.UUID,
	applicantRole string,
	applicantUserID uuid.UUID,
	leaveType string,
	startDateStr string,
	endDateStr string,
	reason string,
	attachmentURL string,
) (*domain.StudentLeaveRequest, error) {
	if leaveType != "Sick" && leaveType != "Permission" {
		return nil, errors.New("tipe ketidakhadiran harus 'Sick' (Sakit) atau 'Permission' (Izin)")
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return nil, errors.New("format tanggal mulai tidak valid (gunakan YYYY-MM-DD)")
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return nil, errors.New("format tanggal selesai tidak valid (gunakan YYYY-MM-DD)")
	}

	if endDate.Before(startDate) {
		return nil, errors.New("tanggal selesai tidak boleh sebelum tanggal mulai")
	}

	// Hitung total hari yang diajukan
	totalDays := int(endDate.Sub(startDate).Hours()/24) + 1
	if totalDays <= 0 {
		totalDays = 1
	}

	// Cari data siswa beserta kelas dan wali kelas
	var student domain.Student
	err = u.db.
		Preload("User").
		Preload("Class.HomeroomTeacher.User").
		First(&student, "id = ?", studentID).Error
	if err != nil {
		return nil, errors.New("siswa tidak ditemukan")
	}

	leave := domain.StudentLeaveRequest{
		StudentID:          studentID,
		ApplicantRole:      applicantRole,
		ApplicantUserID:    applicantUserID,
		Type:               leaveType,
		StartDate:          startDate,
		EndDate:            endDate,
		TotalDaysRequested: totalDays,
		Reason:             reason,
		AttachmentURL:      attachmentURL,
		Status:             "Pending",
	}

	if err := u.leaveRepo.Create(&leave); err != nil {
		return nil, fmt.Errorf("gagal menyimpan pengajuan: %w", err)
	}

	// Kirim Notifikasi ke Wali Kelas (jika kelas memiliki wali kelas)
	typeIndo := "Izin"
	if leaveType == "Sick" {
		typeIndo = "Sakit"
	}

	if student.Class.HomeroomTeacher != nil && student.Class.HomeroomTeacher.UserID != uuid.Nil {
		teacherUserID := student.Class.HomeroomTeacher.UserID
		notif := domain.Notification{
			UserID:      teacherUserID,
			Title:       fmt.Sprintf("Pengajuan %s Baru: %s", typeIndo, student.User.Name),
			Message:     fmt.Sprintf("%s (%s) mengajukan %s selama %d hari (%s s/d %s). Alasan: %s", student.User.Name, student.Class.Name, typeIndo, totalDays, startDateStr, endDateStr, reason),
			Type:        "LeaveRequest",
			ReferenceID: leave.ID.String(),
			IsRead:      false,
			CreatedAt:   time.Now(),
		}
		_ = u.notificationRepo.Create(&notif)
	}

	return &leave, nil
}

// GetStudentLeaveRequests mengambil daftar pengajuan izin oleh siswa
func (u *StudentLeaveUsecase) GetStudentLeaveRequests(studentID uuid.UUID) ([]domain.StudentLeaveRequest, error) {
	return u.leaveRepo.GetByStudentID(studentID)
}

// GetParentChildrenLeaveRequests mengambil daftar pengajuan izin anak-anak dari wali/orang tua
func (u *StudentLeaveUsecase) GetParentChildrenLeaveRequests(parentUserID uuid.UUID) ([]domain.StudentLeaveRequest, error) {
	// Dapatkan semua anak dari parent
	var students []domain.Student
	err := u.db.Joins("JOIN parents ON parents.id = students.parent_id").
		Where("parents.user_id = ?", parentUserID).
		Find(&students).Error
	if err != nil {
		return nil, err
	}

	var studentIDs []uuid.UUID
	for _, s := range students {
		studentIDs = append(studentIDs, s.ID)
	}

	if len(studentIDs) == 0 {
		return []domain.StudentLeaveRequest{}, nil
	}

	return u.leaveRepo.GetByStudentIDs(studentIDs)
}

// GetHomeroomLeaveRequests mengambil daftar pengajuan izin untuk kelas perwalian wali kelas
func (u *StudentLeaveUsecase) GetHomeroomLeaveRequests(teacherUserID uuid.UUID, status string) ([]domain.StudentLeaveRequest, error) {
	// Cari data Teacher berdasarkan teacherUserID
	var teacher domain.Teacher
	if err := u.db.Where("user_id = ?", teacherUserID).First(&teacher).Error; err != nil {
		return nil, errors.New("data guru tidak ditemukan")
	}

	return u.leaveRepo.GetByHomeroomTeacherID(teacher.ID, status)
}

// GetAllStudentLeaveRequests mengambil semua pengajuan izin siswa lintas kelas (Admin & Pimpinan)
func (u *StudentLeaveUsecase) GetAllStudentLeaveRequests(unitID uint, classID *uint, status string) ([]domain.StudentLeaveRequest, error) {
	return u.leaveRepo.GetAll(unitID, classID, status)
}

// ApproveLeaveRequest memproses keputusan persetujuan/penolakan oleh wali kelas atau admin/pimpinan
func (u *StudentLeaveUsecase) ApproveLeaveRequest(
	leaveID uuid.UUID,
	approverUserID uuid.UUID,
	action string, // "Approved" atau "Rejected"
	approvedDays int,
	approvedStartDateStr string,
	approvedEndDateStr string,
	approvalNotes string,
) (*domain.StudentLeaveRequest, error) {
	leave, err := u.leaveRepo.GetByID(leaveID)
	if err != nil {
		return nil, errors.New("pengajuan izin tidak ditemukan")
	}

	if leave.Status != "Pending" {
		return nil, fmt.Errorf("pengajuan ini sudah berstatus '%s'", leave.Status)
	}

	// Cari data pengguna yang melakukan approval
	var approverUser domain.User
	if err := u.db.First(&approverUser, "id = ?", approverUserID).Error; err != nil {
		return nil, errors.New("pengguna penyetujui tidak ditemukan")
	}

	// Cek apakah user adalah guru
	var teacher domain.Teacher
	hasTeacher := u.db.Preload("User").Where("user_id = ?", approverUserID).First(&teacher).Error == nil

	isAdminOrPrincipal := approverUser.RoleID <= 3 || approverUser.RoleID == 8
	isHomeroom := hasTeacher && leave.Student.Class.HomeroomTeacherID != nil && *leave.Student.Class.HomeroomTeacherID == teacher.ID

	if !isAdminOrPrincipal && !isHomeroom {
		return nil, errors.New("hanya wali kelas atau admin/pimpinan yang berhak memberikan persetujuan izin untuk siswa ini")
	}

	now := time.Now()
	typeIndo := "Izin"
	if leave.Type == "Sick" {
		typeIndo = "Sakit"
	}

	approverRoleTitle := "Wali Kelas"
	if isAdminOrPrincipal && !isHomeroom {
		approverRoleTitle = "Admin/Pimpinan"
	}

	if action == "Approved" {
		if approvedDays <= 0 {
			approvedDays = leave.TotalDaysRequested
		}

		var appStart, appEnd time.Time
		if approvedStartDateStr != "" {
			appStart, err = time.Parse("2006-01-02", approvedStartDateStr)
			if err != nil {
				appStart = leave.StartDate
			}
		} else {
			appStart = leave.StartDate
		}

		if approvedEndDateStr != "" {
			appEnd, err = time.Parse("2006-01-02", approvedEndDateStr)
			if err != nil {
				appEnd = appStart.AddDate(0, 0, approvedDays-1)
			}
		} else {
			appEnd = appStart.AddDate(0, 0, approvedDays-1)
		}

		leave.Status = "Approved"
		leave.ApprovedDays = approvedDays
		leave.ApprovedStartDate = &appStart
		leave.ApprovedEndDate = &appEnd
		if hasTeacher {
			leave.ApproverTeacherID = &teacher.ID
		}
		leave.ApproverUserID = &approverUser.ID
		leave.ApprovalNotes = approvalNotes
		leave.ApprovedAt = &now

		if err := u.leaveRepo.Update(leave); err != nil {
			return nil, fmt.Errorf("gagal memperbarui status pengajuan: %w", err)
		}

		// Sinkronisasi otomatis ke tabel Presensi Siswa (attendances)
		noteText := fmt.Sprintf("%s Disetujui %s (%s): %s", typeIndo, approverRoleTitle, approverUser.Name, leave.Reason)
		_ = u.leaveRepo.RecordAttendanceForLeave(leave.StudentID, appStart, appEnd, leave.Type, noteText)

		// Kirim Notifikasi ke Siswa
		_ = u.notificationRepo.Create(&domain.Notification{
			UserID:      leave.Student.UserID,
			Title:       fmt.Sprintf("Pengajuan %s Disetujui", typeIndo),
			Message:     fmt.Sprintf("Pengajuan %s Anda telah disetujui selama %d hari (%s s/d %s) oleh %s (%s). Catatan: %s", typeIndo, approvedDays, appStart.Format("02 Jan 2006"), appEnd.Format("02 Jan 2006"), approverRoleTitle, approverUser.Name, approvalNotes),
			Type:        "LeaveApproval",
			ReferenceID: leave.ID.String(),
			IsRead:      false,
			CreatedAt:   now,
		})

		// Kirim Notifikasi ke Orang Tua (jika ada akun orang tua)
		if leave.Student.Parent != nil && leave.Student.Parent.UserID != uuid.Nil {
			_ = u.notificationRepo.Create(&domain.Notification{
				UserID:      leave.Student.Parent.UserID,
				Title:       fmt.Sprintf("Pengajuan %s Ananda Disetujui", typeIndo),
				Message:     fmt.Sprintf("Pengajuan %s ananda %s telah disetujui oleh Wali Kelas selama %d hari (%s s/d %s).", typeIndo, leave.Student.User.Name, approvedDays, appStart.Format("02 Jan 2006"), appEnd.Format("02 Jan 2006")),
				Type:        "LeaveApproval",
				ReferenceID: leave.ID.String(),
				IsRead:      false,
				CreatedAt:   now,
			})
		}
	} else if action == "Rejected" {
		leave.Status = "Rejected"
		leave.ApproverTeacherID = &teacher.ID
		leave.ApprovalNotes = approvalNotes
		leave.ApprovedAt = &now

		if err := u.leaveRepo.Update(leave); err != nil {
			return nil, fmt.Errorf("gagal menolak pengajuan: %w", err)
		}

		// Kirim Notifikasi ke Siswa
		_ = u.notificationRepo.Create(&domain.Notification{
			UserID:      leave.Student.UserID,
			Title:       fmt.Sprintf("Pengajuan %s Ditolak", typeIndo),
			Message:     fmt.Sprintf("Pengajuan %s Anda ditolak oleh Wali Kelas (%s). Alasan: %s", typeIndo, teacher.User.Name, approvalNotes),
			Type:        "LeaveApproval",
			ReferenceID: leave.ID.String(),
			IsRead:      false,
			CreatedAt:   now,
		})

		// Kirim Notifikasi ke Orang Tua
		if leave.Student.Parent != nil && leave.Student.Parent.UserID != uuid.Nil {
			_ = u.notificationRepo.Create(&domain.Notification{
				UserID:      leave.Student.Parent.UserID,
				Title:       fmt.Sprintf("Pengajuan %s Ananda Ditolak", typeIndo),
				Message:     fmt.Sprintf("Pengajuan %s ananda %s tidak disetujui oleh Wali Kelas. Catatan: %s", typeIndo, leave.Student.User.Name, approvalNotes),
				Type:        "LeaveApproval",
				ReferenceID: leave.ID.String(),
				IsRead:      false,
				CreatedAt:   now,
			})
		}
	} else {
		return nil, errors.New("aksi tidak valid (harus 'Approved' atau 'Rejected')")
	}

	return leave, nil
}
