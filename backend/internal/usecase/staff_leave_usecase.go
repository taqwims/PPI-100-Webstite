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

type StaffLeaveUsecase struct {
	leaveRepo        *postgres.StaffLeaveRepository
	userRepo         *postgres.UserRepository
	notificationRepo *postgres.NotificationRepository
	db               *gorm.DB
}

func NewStaffLeaveUsecase(
	leaveRepo *postgres.StaffLeaveRepository,
	userRepo *postgres.UserRepository,
	notificationRepo *postgres.NotificationRepository,
	db *gorm.DB,
) *StaffLeaveUsecase {
	return &StaffLeaveUsecase{
		leaveRepo:        leaveRepo,
		userRepo:         userRepo,
		notificationRepo: notificationRepo,
		db:               db,
	}
}

// CreateLeaveRequest membuat pengajuan izin / sakit / tugas luar / dinas / dispensasi oleh guru/staf
func (u *StaffLeaveUsecase) CreateLeaveRequest(
	userID uuid.UUID,
	leaveType string,
	startDateStr string,
	endDateStr string,
	reason string,
	attachmentURL string,
) (*domain.StaffLeaveRequest, error) {
	// Validasi tipe
	validTypes := map[string]string{
		"Duty":         "Tugas Luar Sekolah / Dinas",
		"Sick":         "Sakit",
		"Permission":   "Izin Keperluan Pribadi",
		"Dispensation": "Dispensasi",
		"Leave":        "Cuti",
	}

	typeName, ok := validTypes[leaveType]
	if !ok {
		return nil, errors.New("tipe permohonan tidak valid (harus: Duty, Sick, Permission, Dispensation, atau Leave)")
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return nil, errors.New("format tanggal mulai harus YYYY-MM-DD")
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return nil, errors.New("format tanggal selesai harus YYYY-MM-DD")
	}

	if endDate.Before(startDate) {
		return nil, errors.New("tanggal selesai tidak boleh sebelum tanggal mulai")
	}

	// Hitung total hari
	totalDays := int(endDate.Sub(startDate).Hours()/24) + 1
	if totalDays <= 0 {
		totalDays = 1
	}

	// Ambil data User untuk unit_id
	var user domain.User
	if err := u.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, errors.New("user tidak ditemukan")
	}

	leave := domain.StaffLeaveRequest{
		UserID:             userID,
		UnitID:             user.UnitID,
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

	// Kirim notifikasi lonceng ke Pimpinan & Super Admin
	var leaders []domain.User
	_ = u.db.Where("role_id IN (1, 8) AND (unit_id = ? OR unit_id = 0)", user.UnitID).Find(&leaders).Error
	for _, leader := range leaders {
		_ = u.notificationRepo.Create(&domain.Notification{
			UserID:  leader.ID,
			Title:   fmt.Sprintf("Pengajuan %s Guru: %s", typeName, user.Name),
			Message: fmt.Sprintf("%s mengajukan %s (%s s/d %s, %d hari). Alasan: %s", user.Name, typeName, startDate.Format("02 Jan 2006"), endDate.Format("02 Jan 2006"), totalDays, reason),
			Type:    "StaffLeaveRequest",
		})
	}

	return &leave, nil
}

// GetStaffLeaveRequests mengambil daftar pengajuan izin milik user login
func (u *StaffLeaveUsecase) GetStaffLeaveRequests(userID uuid.UUID) ([]domain.StaffLeaveRequest, error) {
	return u.leaveRepo.GetByUserID(userID)
}

// GetAllStaffLeaveRequests mengambil seluruh pengajuan izin guru (untuk Pimpinan & Admin)
func (u *StaffLeaveUsecase) GetAllStaffLeaveRequests(unitID uint, status string) ([]domain.StaffLeaveRequest, error) {
	return u.leaveRepo.GetAll(unitID, status)
}

// ApproveLeaveRequest memproses persetujuan atau penolakan pengajuan izin guru oleh Pimpinan atau Admin
func (u *StaffLeaveUsecase) ApproveLeaveRequest(
	leaveID uuid.UUID,
	approverUserID uuid.UUID,
	action string, // "Approved" atau "Rejected"
	approvedDays int,
	approvedStartDateStr string,
	approvedEndDateStr string,
	approvalNotes string,
) (*domain.StaffLeaveRequest, error) {
	leave, err := u.leaveRepo.GetByID(leaveID)
	if err != nil {
		return nil, errors.New("pengajuan izin tidak ditemukan")
	}

	if leave.Status != "Pending" {
		return nil, fmt.Errorf("pengajuan ini sudah berstatus '%s'", leave.Status)
	}

	// Cek otoritas approver (Pimpinan role 8, Super Admin role 1, Admin unit role 2, 3)
	var approverUser domain.User
	if err := u.db.First(&approverUser, "id = ?", approverUserID).Error; err != nil {
		return nil, errors.New("pengguna penyetujui tidak ditemukan")
	}

	isAuthorized := approverUser.RoleID <= 3 || approverUser.RoleID == 8
	if !isAuthorized {
		return nil, errors.New("hanya Pimpinan Sekolah atau Admin yang berhak memberikan persetujuan izin/tugas luar staf")
	}

	now := time.Now()
	typeIndoMap := map[string]string{
		"Duty":         "Tugas Luar Sekolah / Dinas",
		"Sick":         "Sakit",
		"Permission":   "Izin",
		"Dispensation": "Dispensasi",
		"Leave":        "Cuti",
	}
	typeIndo := typeIndoMap[leave.Type]
	if typeIndo == "" {
		typeIndo = leave.Type
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
		leave.ApproverUserID = &approverUser.ID
		leave.ApprovalNotes = approvalNotes
		leave.ApprovedAt = &now

		if err := u.leaveRepo.Update(leave); err != nil {
			return nil, fmt.Errorf("gagal memperbarui status pengajuan: %w", err)
		}

		// Tentukan status presensi staf
		attStatus := "Permission"
		if leave.Type == "Sick" {
			attStatus = "Sick"
		} else if leave.Type == "Duty" || leave.Type == "Dispensation" {
			attStatus = "Duty"
		}

		noteText := fmt.Sprintf("%s Disetujui (%s): %s", typeIndo, approverUser.Name, leave.Reason)
		_ = u.leaveRepo.RecordAttendanceForStaffLeave(leave.UserID, leave.UnitID, appStart, appEnd, attStatus, noteText)

		// Kirim notifikasi lonceng ke Guru
		_ = u.notificationRepo.Create(&domain.Notification{
			UserID:  leave.UserID,
			Title:   fmt.Sprintf("Pengajuan %s Disetujui", typeIndo),
			Message: fmt.Sprintf("Pengajuan %s Anda telah disetujui selama %d hari (%s s/d %s) oleh %s. Catatan: %s", typeIndo, approvedDays, appStart.Format("02 Jan 2006"), appEnd.Format("02 Jan 2006"), approverUser.Name, approvalNotes),
			Type:    "StaffLeaveApproval",
		})
	} else if action == "Rejected" {
		leave.Status = "Rejected"
		leave.ApproverUserID = &approverUser.ID
		leave.ApprovalNotes = approvalNotes
		leave.ApprovedAt = &now

		if err := u.leaveRepo.Update(leave); err != nil {
			return nil, fmt.Errorf("gagal memperbarui status pengajuan: %w", err)
		}

		// Kirim notifikasi lonceng ke Guru
		_ = u.notificationRepo.Create(&domain.Notification{
			UserID:  leave.UserID,
			Title:   fmt.Sprintf("Pengajuan %s Ditolak", typeIndo),
			Message: fmt.Sprintf("Pengajuan %s Anda tidak disetujui oleh %s. Alasan: %s", typeIndo, approverUser.Name, approvalNotes),
			Type:    "StaffLeaveApproval",
		})
	} else {
		return nil, errors.New("aksi harus 'Approved' atau 'Rejected'")
	}

	return leave, nil
}

