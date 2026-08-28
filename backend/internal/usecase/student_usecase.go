package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type StudentUsecase struct {
	studentRepo       *postgres.StudentRepository
	attendanceRepo    *postgres.AttendanceRepository
	userRepo          *postgres.UserRepository
	schoolSettingRepo *postgres.SchoolSettingRepository
	notificationUsecase *NotificationUsecase
	cfg               *config.Config
}

func NewStudentUsecase(studentRepo *postgres.StudentRepository, attendanceRepo *postgres.AttendanceRepository, userRepo *postgres.UserRepository) *StudentUsecase {
	return &StudentUsecase{
		studentRepo:    studentRepo,
		attendanceRepo: attendanceRepo,
		userRepo:       userRepo,
	}
}

func (u *StudentUsecase) SetSchoolSettingRepo(r *postgres.SchoolSettingRepository) {
	u.schoolSettingRepo = r
}

func (u *StudentUsecase) SetNotificationUsecase(n *NotificationUsecase) {
	u.notificationUsecase = n
}

func (u *StudentUsecase) SetCfg(cfg *config.Config) {
	u.cfg = cfg
}

func (u *StudentUsecase) getSetting(key, def string) string {
	if u.schoolSettingRepo == nil {
		return def
	}
	s, err := u.schoolSettingRepo.GetByKey(key)
	if err != nil || s == nil || strings.TrimSpace(s.Value) == "" {
		return def
	}
	return strings.TrimSpace(s.Value)
}

func (u *StudentUsecase) GetAllStudents(unitID uint) ([]domain.Student, error) {
	return u.studentRepo.GetAll(unitID)
}

func (u *StudentUsecase) CreateStudent(name, email, password, nisn, rfid string, classID, unitID uint, parentID *uuid.UUID) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: string(hashedPassword),
		RoleID:       6, // Student
		UnitID:       unitID,
	}

	if err := u.userRepo.Create(user); err != nil {
		return err
	}

	rfid = strings.TrimSpace(rfid)
	if rfid != "" {
		if existing, _ := u.studentRepo.GetByRFID(rfid); existing != nil {
			return fmt.Errorf("kartu RFID/NFC '%s' sudah terdaftar pada siswa %s", rfid, existing.User.Name)
		}
	}

	student := &domain.Student{
		ID:       uuid.New(),
		UserID:   user.ID,
		NISN:     nisn,
		RFID:     rfid,
		ClassID:  classID,
		UnitID:   unitID,
		ParentID: parentID,
	}

	return u.studentRepo.Create(student)
}

func (u *StudentUsecase) UpdateStudent(id string, name, email, password, nisn, rfid string, classID, unitID uint, parentID *uuid.UUID) error {
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
	if password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user.PasswordHash = string(hashedPassword)
	}
	if err := u.userRepo.Update(user); err != nil {
		return err
	}

	rfid = strings.TrimSpace(rfid)
	if rfid != "" {
		if existing, _ := u.studentRepo.GetByRFID(rfid); existing != nil && existing.ID.String() != id {
			return fmt.Errorf("kartu RFID/NFC '%s' sudah digunakan oleh siswa %s", rfid, existing.User.Name)
		}
	}

	// Update Student
	student.NISN = nisn
	student.RFID = rfid
	student.ClassID = classID
	student.UnitID = unitID
	student.ParentID = parentID
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

func (u *StudentUsecase) AssignStudentRFID(studentID string, rfid string) error {
	rfid = strings.TrimSpace(rfid)
	if rfid != "" {
		existing, err := u.studentRepo.GetByRFID(rfid)
		if err == nil && existing != nil && existing.ID.String() != studentID {
			return fmt.Errorf("nomor kartu RFID/NFC '%s' sudah digunakan oleh siswa %s (%s)", rfid, existing.User.Name, existing.Class.Name)
		}
	}
	return u.studentRepo.UpdateRFID(studentID, rfid)
}

func (u *StudentUsecase) RecordAttendance(studentID uuid.UUID, scheduleID uint, method, status string) error {
	// Check if already attended today for this schedule
	exists, err := u.attendanceRepo.CheckExistence(studentID.String(), scheduleID, time.Now())
	if err != nil {
		return err
	}
	if exists {
		return errors.New("absensi sudah tercatat untuk jadwal ini hari ini")
	}

	schID := scheduleID
	attendance := &domain.Attendance{
		StudentID:  studentID,
		ScheduleID: &schID,
		Timestamp:  time.Now(),
		Method:     method,
		Status:     status,
		Type:       "Schedule",
	}

	return u.attendanceRepo.Create(attendance)
}

func (u *StudentUsecase) RecordRFIDAttendance(rfid string, unitID uint, scheduleID *uint, reqType string, method string, deviceID string) (*domain.Attendance, *domain.Student, string, error) {
	rfid = strings.TrimSpace(rfid)
	if rfid == "" {
		return nil, nil, "", errors.New("nomor kartu RFID/NFC tidak boleh kosong")
	}

	if u.cfg != nil && !u.cfg.FeatureRFIDAttendance {
		return nil, nil, "", errors.New("fitur presensi RFID & NFC dinonaktifkan oleh developer melalui konfigurasi sistem (ENV)")
	}

	if u.getSetting("enable_rfid_attendance", "true") == "false" {
		return nil, nil, "", errors.New("fitur presensi RFID & NFC sedang dinonaktifkan oleh administrator")
	}

	// Lookup student by RFID
	student, err := u.studentRepo.GetByRFID(rfid)
	if err != nil || student == nil {
		return nil, nil, "", fmt.Errorf("kartu RFID/NFC (%s) belum terdaftar ke data siswa manapun", rfid)
	}

	if student.Status != "Active" {
		return nil, student, "", fmt.Errorf("status siswa %s tidak aktif (%s)", student.User.Name, student.Status)
	}

	now := time.Now()
	nowHHMM := now.Format("15:04")

	if method == "" {
		method = "RFID"
	}

	// If scheduleID provided, record schedule attendance
	if scheduleID != nil && *scheduleID > 0 {
		exists, err := u.attendanceRepo.CheckExistence(student.ID.String(), *scheduleID, now)
		if err != nil {
			return nil, student, "", err
		}
		if exists {
			return nil, student, "ALREADY_RECORDED", fmt.Errorf("presensi jadwal mapel sudah tercatat untuk %s hari ini", student.User.Name)
		}

		att := &domain.Attendance{
			StudentID:  student.ID,
			ScheduleID: scheduleID,
			Timestamp:  now,
			Method:     method,
			Status:     "Present",
			Type:       "Schedule",
			DeviceID:   deviceID,
		}
		if err := u.attendanceRepo.Create(att); err != nil {
			return nil, student, "", err
		}
		go u.sendAttendanceWhatsApp(student, att)
		return att, student, "SUCCESS", nil
	}

	// Daily Attendance Logic
	todayRecords, err := u.attendanceRepo.GetTodayStudentAttendance(student.ID.String(), now)
	if err != nil {
		return nil, student, "", err
	}

	cooldownMinutes, _ := strconv.Atoi(u.getSetting("attendance_cooldown_minutes", "3"))
	if cooldownMinutes <= 0 {
		cooldownMinutes = 3
	}
	cooldownDuration := time.Duration(cooldownMinutes) * time.Minute

	// Check cooldown against the latest tap
	if len(todayRecords) > 0 {
		lastRecord := todayRecords[len(todayRecords)-1]
		if now.Sub(lastRecord.Timestamp) < cooldownDuration {
			return nil, student, "COOLDOWN", fmt.Errorf("Siswa %s baru saja melakukan presensi %s pada %s WIB. Mohon tunggu %d menit untuk tap kembali.", student.User.Name, lastRecord.Type, lastRecord.Timestamp.Format("15:04:05"), cooldownMinutes)
		}
	}

	var hasCheckIn, hasCheckOut bool
	for _, rec := range todayRecords {
		if rec.Type == "CheckIn" {
			hasCheckIn = true
		} else if rec.Type == "CheckOut" {
			hasCheckOut = true
		}
	}

	lateThreshold := u.getSetting("attendance_late_threshold", "07:15")
	exitStart := u.getSetting("attendance_exit_start", "14:00")

	var targetType string
	var targetStatus string

	switch strings.ToLower(reqType) {
	case "checkin", "masuk":
		if hasCheckIn {
			return nil, student, "ALREADY_CHECKED_IN", fmt.Errorf("siswa %s sudah melakukan presensi masuk hari ini", student.User.Name)
		}
		targetType = "CheckIn"
		if nowHHMM > lateThreshold {
			targetStatus = "Late"
		} else {
			targetStatus = "Present"
		}

	case "checkout", "pulang":
		if hasCheckOut {
			return nil, student, "ALREADY_CHECKED_OUT", fmt.Errorf("siswa %s sudah melakukan presensi pulang hari ini", student.User.Name)
		}
		targetType = "CheckOut"
		targetStatus = "Present"

	default: // "auto" or empty
		if !hasCheckIn {
			targetType = "CheckIn"
			if nowHHMM > lateThreshold {
				targetStatus = "Late"
			} else {
				targetStatus = "Present"
			}
		} else if !hasCheckOut {
			// If already past exit start or student has already checked in and cooldown passed
			_ = exitStart
			targetType = "CheckOut"
			targetStatus = "Present"
		} else {
			return nil, student, "ALREADY_COMPLETED", fmt.Errorf("siswa %s sudah menyelesaikan presensi masuk dan pulang hari ini", student.User.Name)
		}
	}

	att := &domain.Attendance{
		StudentID: student.ID,
		Timestamp: now,
		Method:    method,
		Status:    targetStatus,
		Type:      targetType,
		DeviceID:  deviceID,
	}

	if err := u.attendanceRepo.Create(att); err != nil {
		return nil, student, "", err
	}

	// Trigger WA notification asynchronously
	go u.sendAttendanceWhatsApp(student, att)

	return att, student, "SUCCESS", nil
}

func (u *StudentUsecase) sendAttendanceWhatsApp(student *domain.Student, att *domain.Attendance) {
	if u.notificationUsecase == nil {
		return
	}
	if u.getSetting("enable_attendance_wa_notif", "true") != "true" {
		return
	}
	if student.Parent == nil || strings.TrimSpace(student.Parent.Phone) == "" {
		return
	}

	phone := strings.TrimSpace(student.Parent.Phone)
	var templateKey string
	var defaultTpl string

	statusLabel := "Hadir Tepat Waktu"
	if att.Status == "Late" {
		statusLabel = "Terlambat"
	}

	if att.Type == "CheckOut" {
		templateKey = "wa_notif_attendance_out"
		defaultTpl = "Assalamu'alaikum Wr. Wb.\n\nDiberitahukan bahwa ananda *{nama_siswa}* ({kelas}) telah selesai KBM dan melakukan presensi pulang pada pukul *{waktu}* WIB.\n\nTerima kasih."
	} else {
		templateKey = "wa_notif_attendance_in"
		defaultTpl = "Assalamu'alaikum Wr. Wb.\n\nDiberitahukan bahwa ananda *{nama_siswa}* ({kelas}) telah hadir di sekolah pada pukul *{waktu}* WIB.\nStatus: *{status}*.\n\nTerima kasih."
	}

	rawTpl := u.getSetting(templateKey, defaultTpl)
	msg := strings.ReplaceAll(rawTpl, "{nama_siswa}", student.User.Name)
	msg = strings.ReplaceAll(msg, "{nisn}", student.NISN)
	msg = strings.ReplaceAll(msg, "{kelas}", student.Class.Name)
	msg = strings.ReplaceAll(msg, "{waktu}", att.Timestamp.Format("15:04:05"))
	msg = strings.ReplaceAll(msg, "{tanggal}", att.Timestamp.Format("02-01-2006"))
	msg = strings.ReplaceAll(msg, "{status}", statusLabel)
	msg = strings.ReplaceAll(msg, "{tipe}", att.Type)

	_ = u.notificationUsecase.SendWhatsApp(phone, msg)
}

func (u *StudentUsecase) GetDailyAttendance(unitID uint, dateStr string, classID *uint) ([]domain.Attendance, error) {
	var date time.Time
	if dateStr != "" {
		parsed, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			date = parsed
		} else {
			date = time.Now()
		}
	} else {
		date = time.Now()
	}
	return u.attendanceRepo.GetDailyAttendance(unitID, date, classID)
}

func (u *StudentUsecase) GetRecentDailyAttendance(unitID uint, limit int) ([]domain.Attendance, error) {
	return u.attendanceRepo.GetRecentDaily(unitID, limit)
}

func (u *StudentUsecase) GetDailyAttendanceSummary(unitID uint, dateStr string) (map[string]int64, error) {
	var date time.Time
	if dateStr != "" {
		parsed, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			date = parsed
		} else {
			date = time.Now()
		}
	} else {
		date = time.Now()
	}
	return u.attendanceRepo.GetDailySummary(unitID, date)
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

func (u *StudentUsecase) PromoteStudents(studentIDs []uuid.UUID, action string, nextClassID uint) (int, error) {
	successCount := 0
	for _, id := range studentIDs {
		var err error
		if action == "graduate" {
			// For graduation, keep current class but change status
			student, getErr := u.studentRepo.GetByID(id.String())
			if getErr != nil {
				return successCount, errors.New("gagal menemukan siswa: " + id.String())
			}
			err = u.studentRepo.PromoteStudentAtomically(id.String(), student.ClassID, "Graduated")
		} else if action == "promote" {
			err = u.studentRepo.PromoteStudentAtomically(id.String(), nextClassID, "Active")
		}

		if err != nil {
			return successCount, errors.New("gagal update siswa " + id.String() + ": " + err.Error())
		}
		successCount++
	}
	return successCount, nil
}

func (u *StudentUsecase) GetParentByID(parentID string) (*domain.Parent, error) {
	return u.studentRepo.GetParentByID(parentID)
}
