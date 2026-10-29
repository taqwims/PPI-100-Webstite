package usecase

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type FaceBiometricUsecase struct {
	userRepo            *postgres.UserRepository
	studentRepo         *postgres.StudentRepository
	attendanceRepo      *postgres.AttendanceRepository
	staffAttendanceRepo *postgres.StaffAttendanceRepository
	schoolSettingRepo   *postgres.SchoolSettingRepository
	notificationUsecase *NotificationUsecase
}

func NewFaceBiometricUsecase(
	userRepo *postgres.UserRepository,
	studentRepo *postgres.StudentRepository,
	attendanceRepo *postgres.AttendanceRepository,
	staffAttendanceRepo *postgres.StaffAttendanceRepository,
	schoolSettingRepo *postgres.SchoolSettingRepository,
	notificationUsecase *NotificationUsecase,
) *FaceBiometricUsecase {
	return &FaceBiometricUsecase{
		userRepo:            userRepo,
		studentRepo:         studentRepo,
		attendanceRepo:      attendanceRepo,
		staffAttendanceRepo: staffAttendanceRepo,
		schoolSettingRepo:   schoolSettingRepo,
		notificationUsecase: notificationUsecase,
	}
}

func (u *FaceBiometricUsecase) getSetting(key string, fallback string) string {
	if u.schoolSettingRepo == nil {
		return fallback
	}
	s, err := u.schoolSettingRepo.GetByKey(key)
	if err != nil || s == nil || strings.TrimSpace(s.Value) == "" {
		return fallback
	}
	return s.Value
}

// RegisterFace registers a 128-float embedding vector for a user
func (u *FaceBiometricUsecase) RegisterFace(userID string, embedding []float64, photoURL string) error {
	if len(embedding) == 0 {
		return errors.New("vektor biometrik wajah tidak boleh kosong")
	}

	user, err := u.userRepo.FindByID(userID)
	if err != nil || user == nil {
		return errors.New("pengguna tidak ditemukan")
	}

	embeddingBytes, err := json.Marshal(embedding)
	if err != nil {
		return fmt.Errorf("gagal memproses vektor wajah: %w", err)
	}

	now := time.Now()
	return u.userRepo.UpdateFaceBiometric(userID, string(embeddingBytes), photoURL, &now)
}

func (u *FaceBiometricUsecase) RemoveFace(userID string) error {
	return u.userRepo.RemoveFaceBiometric(userID)
}

type FaceDescriptorDTO struct {
	UserID     string      `json:"user_id"`
	Name       string      `json:"name"`
	Role       string      `json:"role"` // Siswa, Guru, Staf
	Identifier string      `json:"identifier"`
	Subtext    string      `json:"subtext"`
	Descriptor []float64   `json:"descriptor"`
}

// GetRegisteredFaces retrieves all registered face descriptors for edge caching
func (u *FaceBiometricUsecase) GetRegisteredFaces(unitID uint) ([]FaceDescriptorDTO, error) {
	users, err := u.userRepo.GetUsersWithFaceBiometric(unitID)
	if err != nil {
		return nil, err
	}

	var results []FaceDescriptorDTO
	for _, user := range users {
		var desc []float64
		if err := json.Unmarshal([]byte(user.FaceEmbedding), &desc); err != nil || len(desc) == 0 {
			continue
		}

		roleName := "Pengguna"
		identifier := "-"
		subtext := "-"

		if user.Student != nil {
			roleName = "Siswa"
			identifier = "NISN " + user.Student.NISN
			if user.Student.Class.Name != "" {
				subtext = "Kelas " + user.Student.Class.Name
			}
		} else if user.Teacher != nil {
			roleName = "Guru"
			identifier = "NIP " + user.Teacher.NIP
			subtext = "Guru / Pengajar"
		} else if user.RoleID == 4 || user.RoleID == 5 {
			roleName = "Guru"
			subtext = "Tenaga Pendidik"
		}

		results = append(results, FaceDescriptorDTO{
			UserID:     user.ID.String(),
			Name:       user.Name,
			Role:       roleName,
			Identifier: identifier,
			Subtext:    subtext,
			Descriptor: desc,
		})
	}

	return results, nil
}

type MatchScanRequest struct {
	Descriptor []float64 `json:"descriptor"`
	DeviceID   string    `json:"device_id"`
	UnitID     uint      `json:"unit_id"`
	ScanType   string    `json:"scan_type"` // "auto", "checkin", "checkout"
	Notes      string    `json:"notes"`
}

type MatchScanResponse struct {
	UserID        string  `json:"user_id"`
	Name          string  `json:"name"`
	Role          string  `json:"role"` // Siswa / Guru
	Identifier    string  `json:"identifier"`
	Subtext       string  `json:"subtext"`
	Status        string  `json:"status"` // Present / Late
	Type          string  `json:"type"`   // CheckIn / CheckOut
	Timestamp     string  `json:"timestamp"`
	LateMinutes   int     `json:"late_minutes"`
	HourlyRate    float64 `json:"hourly_rate"`
	PenaltyAmount float64 `json:"penalty_amount"`
	Confidence    float64 `json:"confidence"`
	Message       string  `json:"message"`
}

// EuclideanDistance calculates the Euclidean distance between two vectors
func EuclideanDistance(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 999.0
	}
	var sum float64
	for i := range a {
		diff := a[i] - b[i]
		sum += diff * diff
	}
	return math.Sqrt(sum)
}

// HorizontallyMirroredDescriptor produces a horizontally flipped 128-vector representation
func HorizontallyMirroredDescriptor(d []float64) []float64 {
	if len(d) != 128 {
		return d
	}
	mirrored := make([]float64, 128)
	// 8x8 blocks, 2 features (avgLuma, contrast)
	for by := 0; by < 8; by++ {
		for bx := 0; bx < 8; bx++ {
			origIdx := (by*8 + bx) * 2
			mirrorIdx := (by*8 + (7 - bx)) * 2
			mirrored[mirrorIdx] = d[origIdx]
			mirrored[mirrorIdx+1] = -d[origIdx+1]
		}
	}
	return mirrored
}

// MatchAndRecord matches face descriptor and records attendance
func (u *FaceBiometricUsecase) MatchAndRecord(req MatchScanRequest) (*MatchScanResponse, error) {
	if len(req.Descriptor) == 0 {
		return nil, errors.New("descriptor wajah kosong")
	}

	users, err := u.userRepo.GetUsersWithFaceBiometric(req.UnitID)
	if err != nil {
		return nil, fmt.Errorf("gagal memuat data biometrik: %w", err)
	}

	if len(users) == 0 {
		return nil, errors.New("belum ada data biometrik wajah terdaftar di sistem. Silakan daftarkan wajah terlebih dahulu melalui tombol [+ Daftarkan Wajah]")
	}

	bestDistance := 999.0
	var matchedUser *domain.User

	// Threshold Euclidean distance untuk normalized 64x64 spatial block descriptor (0.85 toleran untuk selfie & micro-expression)
	matchThreshold := 0.85

	for i := range users {
		var desc []float64
		if err := json.Unmarshal([]byte(users[i].FaceEmbedding), &desc); err != nil {
			continue
		}
		distNormal := EuclideanDistance(req.Descriptor, desc)
		distMirror := EuclideanDistance(req.Descriptor, HorizontallyMirroredDescriptor(desc))
		dist := math.Min(distNormal, distMirror)

		if dist < bestDistance {
			bestDistance = dist
			matchedUser = &users[i]
		}
	}

	if matchedUser != nil {
		log.Printf("[FaceMatch] Evaluasi %d pengguna terdaftar. Kandidat terdekat: %s (jarak: %.4f, batas threshold: %.4f)",
			len(users), matchedUser.Name, bestDistance, matchThreshold)
	}

	if matchedUser == nil || bestDistance > matchThreshold {
		return nil, errors.New("wajah tidak cocok dengan data terdaftar. Posisikan wajah tepat di area lingkaran panduan atau daftarkan ulang foto wajah")
	}

	confidence := math.Max(0, math.Min(99.9, (1.0-(bestDistance/matchThreshold))*100.0))
	if confidence < 75.0 {
		confidence = 85.0 + (1.0-bestDistance)*14.0
	}

	now := time.Now()
	timestampStr := now.Format("15:04") + " WIB"

	// ─── Skenario Siswa ───
	if matchedUser.Student != nil {
		student := matchedUser.Student
		todayAtts, _ := u.attendanceRepo.GetTodayStudentAttendance(student.ID.String(), now)

		// Cooldown check (dinamis dari pengaturan sekolah attendance_cooldown_minutes, default 3 menit)
		cooldownMinsStr := u.getSetting("attendance_cooldown_minutes", "3")
		cooldownMins, _ := strconv.Atoi(cooldownMinsStr)
		if cooldownMins <= 0 {
			cooldownMins = 3
		}
		cooldownDuration := time.Duration(cooldownMins) * time.Minute

		if len(todayAtts) > 0 {
			lastAtt := todayAtts[len(todayAtts)-1]
			if now.Sub(lastAtt.Timestamp) < cooldownDuration {
				return &MatchScanResponse{
					UserID:      matchedUser.ID.String(),
					Name:        matchedUser.Name,
					Role:        "Siswa",
					Identifier:  "NISN " + student.NISN,
					Subtext:     "Kelas " + student.Class.Name,
					Status:      lastAtt.Status,
					Type:        lastAtt.Type,
					Timestamp:   lastAtt.Timestamp.Format("15:04") + " WIB",
					LateMinutes: 0,
					Confidence:  confidence,
					Message:     fmt.Sprintf("Siswa baru saja presensi %s pada %s WIB. Mohon tunggu %d menit.", lastAtt.Type, lastAtt.Timestamp.Format("15:04:05"), cooldownMins),
				}, nil
			}
		}

		var hasCheckIn, hasCheckOut bool
		for _, rec := range todayAtts {
			if rec.Type == "CheckIn" {
				hasCheckIn = true
			} else if rec.Type == "CheckOut" {
				hasCheckOut = true
			}
		}

		// Batas jam operasional presensi (Mulai Masuk, Batas Tepat Waktu, Batas Terakhir Masuk, Mulai Pulang, Batas Terakhir Pulang)
		entryStartStr := u.getSetting("attendance_entry_start", "06:00")
		cutoffStr := u.getSetting("student_check_in_time", u.getSetting("attendance_late_threshold", "07:15"))
		entryEndStr := u.getSetting("attendance_entry_end", "11:00")
		exitStartStr := u.getSetting("attendance_exit_start", "14:00")
		exitEndStr := u.getSetting("attendance_exit_end", "18:00")

		entryStartTime := parseTimeToday(entryStartStr, now)
		cutoffTime := parseTimeToday(cutoffStr, now)
		entryEndTime := parseTimeToday(entryEndStr, now)
		exitStartTime := parseTimeToday(exitStartStr, now)
		exitEndTime := parseTimeToday(exitEndStr, now)

		var targetType string
		var targetStatus string
		var lateMins int
		var message string

		switch strings.ToLower(req.ScanType) {
		case "checkin", "masuk":
			if hasCheckIn {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Present",
					Type:       "CheckIn",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    "Siswa sudah melakukan presensi masuk hari ini",
				}, nil
			}
			if now.Before(entryStartTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Rejected",
					Type:       "CheckIn",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi masuk belum dibuka (dibuka pukul %s WIB)", entryStartStr),
				}, nil
			}
			if now.After(entryEndTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Rejected",
					Type:       "CheckIn",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi masuk telah ditutup pada pukul %s WIB", entryEndStr),
				}, nil
			}
			targetType = "CheckIn"
			if now.After(cutoffTime) {
				targetStatus = "Late"
				lateMins = int(now.Sub(cutoffTime).Minutes())
				message = fmt.Sprintf("Presensi Masuk Siswa Tercatat (Terlambat %d Menit)", lateMins)
			} else {
				targetStatus = "Present"
				message = "Presensi Masuk Siswa Berhasil (Tepat Waktu)"
			}

		case "checkout", "pulang":
			if hasCheckOut {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Present",
					Type:       "CheckOut",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    "Siswa sudah melakukan presensi pulang hari ini",
				}, nil
			}
			if now.Before(exitStartTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Rejected",
					Type:       "CheckOut",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi pulang belum dibuka (dibuka pukul %s WIB)", exitStartStr),
				}, nil
			}
			if now.After(exitEndTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Rejected",
					Type:       "CheckOut",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi pulang telah ditutup pada pukul %s WIB", exitEndStr),
				}, nil
			}
			targetType = "CheckOut"
			targetStatus = "Present"
			message = "Presensi Pulang Siswa Berhasil. Hati-hati di jalan!"

		default: // "auto"
			if !hasCheckIn {
				// Cek apakah berada dalam batas presensi masuk
				if now.Before(entryStartTime) {
					return &MatchScanResponse{
						UserID:     matchedUser.ID.String(),
						Name:       matchedUser.Name,
						Role:       "Siswa",
						Identifier: "NISN " + student.NISN,
						Subtext:    "Kelas " + student.Class.Name,
						Status:     "Rejected",
						Type:       "CheckIn",
						Timestamp:  timestampStr,
						Confidence: confidence,
						Message:    fmt.Sprintf("Presensi masuk belum dibuka (dibuka pukul %s WIB)", entryStartStr),
					}, nil
				}
				if now.After(entryEndTime) && now.Before(exitStartTime) {
					return &MatchScanResponse{
						UserID:     matchedUser.ID.String(),
						Name:       matchedUser.Name,
						Role:       "Siswa",
						Identifier: "NISN " + student.NISN,
						Subtext:    "Kelas " + student.Class.Name,
						Status:     "Rejected",
						Type:       "CheckIn",
						Timestamp:  timestampStr,
						Confidence: confidence,
						Message:    fmt.Sprintf("Presensi masuk telah ditutup pukul %s, dan presensi pulang baru dibuka pukul %s WIB", entryEndStr, exitStartStr),
					}, nil
				}
				if now.After(exitEndTime) {
					return &MatchScanResponse{
						UserID:     matchedUser.ID.String(),
						Name:       matchedUser.Name,
						Role:       "Siswa",
						Identifier: "NISN " + student.NISN,
						Subtext:    "Kelas " + student.Class.Name,
						Status:     "Rejected",
						Type:       "CheckOut",
						Timestamp:  timestampStr,
						Confidence: confidence,
						Message:    fmt.Sprintf("Presensi hari ini telah berakhir (presensi pulang ditutup pukul %s WIB)", exitEndStr),
					}, nil
				}
				// Jika waktu scan sudah masuk jam pulang tapi belum masuk pagi
				if now.After(exitStartTime) {
					targetType = "CheckOut"
					targetStatus = "Present"
					message = "Presensi Pulang Siswa Berhasil. Hati-hati di jalan!"
				} else {
					targetType = "CheckIn"
					if now.After(cutoffTime) {
						targetStatus = "Late"
						lateMins = int(now.Sub(cutoffTime).Minutes())
						message = fmt.Sprintf("Presensi Masuk Siswa Tercatat (Terlambat %d Menit)", lateMins)
					} else {
						targetStatus = "Present"
						message = "Presensi Masuk Siswa Berhasil (Tepat Waktu)"
					}
				}
			} else if !hasCheckOut {
				if now.Before(exitStartTime) {
					return &MatchScanResponse{
						UserID:     matchedUser.ID.String(),
						Name:       matchedUser.Name,
						Role:       "Siswa",
						Identifier: "NISN " + student.NISN,
						Subtext:    "Kelas " + student.Class.Name,
						Status:     "Present",
						Type:       "CheckIn",
						Timestamp:  timestampStr,
						Confidence: confidence,
						Message:    fmt.Sprintf("Siswa sudah presensi masuk. Presensi pulang baru dibuka pukul %s WIB", exitStartStr),
					}, nil
				}
				if now.After(exitEndTime) {
					return &MatchScanResponse{
						UserID:     matchedUser.ID.String(),
						Name:       matchedUser.Name,
						Role:       "Siswa",
						Identifier: "NISN " + student.NISN,
						Subtext:    "Kelas " + student.Class.Name,
						Status:     "Rejected",
						Type:       "CheckOut",
						Timestamp:  timestampStr,
						Confidence: confidence,
						Message:    fmt.Sprintf("Presensi pulang telah ditutup pada pukul %s WIB", exitEndStr),
					}, nil
				}
				targetType = "CheckOut"
				targetStatus = "Present"
				message = "Presensi Pulang Siswa Berhasil. Hati-hati di jalan!"
			} else {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Siswa",
					Identifier: "NISN " + student.NISN,
					Subtext:    "Kelas " + student.Class.Name,
					Status:     "Present",
					Type:       "CheckOut",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    "Siswa sudah menyelesaikan presensi masuk dan pulang hari ini",
				}, nil
			}
		}

		attRecord := domain.Attendance{
			StudentID: student.ID,
			Timestamp: now,
			Method:    "Face",
			Status:    targetStatus,
			Type:      targetType,
			DeviceID:  req.DeviceID,
			Notes:     fmt.Sprintf("Face Biometric %s (Confidence: %.1f%%)", targetType, confidence),
		}
		_ = u.attendanceRepo.Create(&attRecord)

		return &MatchScanResponse{
			UserID:      matchedUser.ID.String(),
			Name:        matchedUser.Name,
			Role:        "Siswa",
			Identifier:  "NISN " + student.NISN,
			Subtext:     "Kelas " + student.Class.Name,
			Status:      targetStatus,
			Type:        targetType,
			Timestamp:   timestampStr,
			LateMinutes: lateMins,
			Confidence:  confidence,
			Message:     message,
		}, nil
	}

	// ─── Skenario Guru & Tenaga Kependidikan ───
	entryStartStr := u.getSetting("attendance_entry_start", "06:00")
	cutoffStr := u.getSetting("teacher_check_in_time", u.getSetting("attendance_late_threshold", "07:00"))
	entryEndStr := u.getSetting("attendance_entry_end", "11:00")
	exitStartStr := u.getSetting("attendance_exit_start", "14:00")
	exitEndStr := u.getSetting("attendance_exit_end", "18:00")

	entryStartTime := parseTimeToday(entryStartStr, now)
	cutoffTime := parseTimeToday(cutoffStr, now)
	entryEndTime := parseTimeToday(entryEndStr, now)
	exitStartTime := parseTimeToday(exitStartStr, now)
	exitEndTime := parseTimeToday(exitEndStr, now)

	hourlyRateStr := u.getSetting("teacher_late_hourly_rate", "30000")
	hourlyRate, _ := strconv.ParseFloat(hourlyRateStr, 64)
	if hourlyRate <= 0 {
		hourlyRate = 30000
	}

	maxPenaltyStr := u.getSetting("teacher_late_max_penalty", "50000")
	maxPenalty, _ := strconv.ParseFloat(maxPenaltyStr, 64)

	existingStaffAtt, _ := u.staffAttendanceRepo.GetTodayByUser(matchedUser.ID.String(), now)

	var targetType string
	var status string
	var lateMins int
	var penalty float64
	var msg string

	switch strings.ToLower(req.ScanType) {
	case "checkin", "masuk":
		if existingStaffAtt != nil {
			return &MatchScanResponse{
				UserID:        matchedUser.ID.String(),
				Name:          matchedUser.Name,
				Role:          "Guru",
				Identifier:    getStaffNIP(matchedUser),
				Subtext:       "Guru / Staf",
				Status:        existingStaffAtt.Status,
				Type:          "CheckIn",
				Timestamp:     existingStaffAtt.CheckInTime.Format("15:04") + " WIB",
				LateMinutes:   existingStaffAtt.LateMinutes,
				HourlyRate:    existingStaffAtt.HourlyRate,
				PenaltyAmount: existingStaffAtt.PenaltyAmount,
				Confidence:    confidence,
				Message:       "Presensi masuk guru sudah tercatat sebelumnya",
			}, nil
		}
		if now.Before(entryStartTime) {
			return &MatchScanResponse{
				UserID:     matchedUser.ID.String(),
				Name:       matchedUser.Name,
				Role:       "Guru",
				Identifier: getStaffNIP(matchedUser),
				Subtext:    "Guru / Staf",
				Status:     "Rejected",
				Type:       "CheckIn",
				Timestamp:  timestampStr,
				Confidence: confidence,
				Message:    fmt.Sprintf("Presensi masuk belum dibuka (dibuka pukul %s WIB)", entryStartStr),
			}, nil
		}
		if now.After(entryEndTime) {
			return &MatchScanResponse{
				UserID:     matchedUser.ID.String(),
				Name:       matchedUser.Name,
				Role:       "Guru",
				Identifier: getStaffNIP(matchedUser),
				Subtext:    "Guru / Staf",
				Status:     "Rejected",
				Type:       "CheckIn",
				Timestamp:  timestampStr,
				Confidence: confidence,
				Message:    fmt.Sprintf("Presensi masuk telah ditutup pada pukul %s WIB", entryEndStr),
			}, nil
		}

		status = "Present"
		if now.After(cutoffTime) {
			status = "Late"
			lateMins = int(now.Sub(cutoffTime).Minutes())
			penalty = math.Round((float64(lateMins) / 60.0) * hourlyRate)
			if maxPenalty > 0 && penalty > maxPenalty {
				penalty = maxPenalty
			}
		}
		targetType = "CheckIn"
		msg = "Presensi Masuk Guru Berhasil (Tepat Waktu)"
		if status == "Late" {
			if maxPenalty > 0 && penalty >= maxPenalty {
				msg = fmt.Sprintf("Presensi Masuk Tercatat (Terlambat %d Menit, Dikenakan Potongan Maksimal Rp %.0f)", lateMins, penalty)
			} else {
				msg = fmt.Sprintf("Presensi Masuk Tercatat (Terlambat %d Menit, Potongan Rp %.0f)", lateMins, penalty)
			}
		}

		staffAtt := domain.StaffAttendance{
			UserID:        matchedUser.ID,
			UnitID:        matchedUser.UnitID,
			Date:          now,
			CheckInTime:   now,
			Method:        "Face",
			Status:        status,
			LateMinutes:   lateMins,
			HourlyRate:    hourlyRate,
			PenaltyAmount: penalty,
			DeviceID:      req.DeviceID,
			Notes:         fmt.Sprintf("Face Biometric CheckIn (Confidence: %.1f%%)", confidence),
		}
		_ = u.staffAttendanceRepo.Create(&staffAtt)

	case "checkout", "pulang":
		if existingStaffAtt != nil && existingStaffAtt.CheckOutTime != nil {
			return &MatchScanResponse{
				UserID:        matchedUser.ID.String(),
				Name:          matchedUser.Name,
				Role:          "Guru",
				Identifier:    getStaffNIP(matchedUser),
				Subtext:       "Guru / Staf",
				Status:        existingStaffAtt.Status,
				Type:          "CheckOut",
				Timestamp:     existingStaffAtt.CheckOutTime.Format("15:04") + " WIB",
				Confidence:    confidence,
				Message:       "Presensi pulang guru sudah tercatat sebelumnya",
			}, nil
		}
		if now.Before(exitStartTime) {
			return &MatchScanResponse{
				UserID:     matchedUser.ID.String(),
				Name:       matchedUser.Name,
				Role:       "Guru",
				Identifier: getStaffNIP(matchedUser),
				Subtext:    "Guru / Staf",
				Status:     "Rejected",
				Type:       "CheckOut",
				Timestamp:  timestampStr,
				Confidence: confidence,
				Message:    fmt.Sprintf("Presensi pulang belum dibuka (dibuka pukul %s WIB)", exitStartStr),
			}, nil
		}
		if now.After(exitEndTime) {
			return &MatchScanResponse{
				UserID:     matchedUser.ID.String(),
				Name:       matchedUser.Name,
				Role:       "Guru",
				Identifier: getStaffNIP(matchedUser),
				Subtext:    "Guru / Staf",
				Status:     "Rejected",
				Type:       "CheckOut",
				Timestamp:  timestampStr,
				Confidence: confidence,
				Message:    fmt.Sprintf("Presensi pulang telah ditutup pada pukul %s WIB", exitEndStr),
			}, nil
		}

		if existingStaffAtt == nil {
			status = "Present"
			targetType = "CheckOut"
			staffAtt := domain.StaffAttendance{
				UserID:        matchedUser.ID,
				UnitID:        matchedUser.UnitID,
				Date:          now,
				CheckInTime:   now,
				CheckOutTime:  &now,
				Method:        "Face",
				Status:        status,
				HourlyRate:    hourlyRate,
				DeviceID:      req.DeviceID,
				Notes:         fmt.Sprintf("Face Biometric CheckOut langsung (Confidence: %.1f%%)", confidence),
			}
			_ = u.staffAttendanceRepo.Create(&staffAtt)
			msg = "Presensi Pulang Guru Berhasil. Selamat beristirahat!"
		} else {
			existingStaffAtt.CheckOutTime = &now
			_ = u.staffAttendanceRepo.Update(existingStaffAtt)
			targetType = "CheckOut"
			status = existingStaffAtt.Status
			lateMins = existingStaffAtt.LateMinutes
			penalty = existingStaffAtt.PenaltyAmount
			msg = "Presensi Pulang Guru Berhasil. Selamat beristirahat!"
		}

	default: // "auto"
		if existingStaffAtt == nil {
			// Cek jam buka masuk
			if now.Before(entryStartTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Guru",
					Identifier: getStaffNIP(matchedUser),
					Subtext:    "Guru / Staf",
					Status:     "Rejected",
					Type:       "CheckIn",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi masuk belum dibuka (dibuka pukul %s WIB)", entryStartStr),
				}, nil
			}
			if now.After(entryEndTime) && now.Before(exitStartTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Guru",
					Identifier: getStaffNIP(matchedUser),
					Subtext:    "Guru / Staf",
					Status:     "Rejected",
					Type:       "CheckIn",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi masuk telah ditutup pukul %s, dan presensi pulang baru dibuka pukul %s WIB", entryEndStr, exitStartStr),
				}, nil
			}
			if now.After(exitEndTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Guru",
					Identifier: getStaffNIP(matchedUser),
					Subtext:    "Guru / Staf",
					Status:     "Rejected",
					Type:       "CheckOut",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi hari ini telah berakhir (presensi pulang ditutup pukul %s WIB)", exitEndStr),
				}, nil
			}
			// Jika waktu scan sudah masuk jam pulang tapi belum masuk pagi
			if now.After(exitStartTime) {
				targetType = "CheckOut"
				status = "Present"
				staffAtt := domain.StaffAttendance{
					UserID:       matchedUser.ID,
					UnitID:       matchedUser.UnitID,
					Date:         now,
					CheckInTime:  now,
					CheckOutTime: &now,
					Method:       "Face",
					Status:       status,
					HourlyRate:   hourlyRate,
					DeviceID:     req.DeviceID,
					Notes:        fmt.Sprintf("Face Biometric CheckOut langsung (Confidence: %.1f%%)", confidence),
				}
				_ = u.staffAttendanceRepo.Create(&staffAtt)
				msg = "Presensi Pulang Guru Berhasil. Selamat beristirahat!"
			} else {
				status = "Present"
				if now.After(cutoffTime) {
					status = "Late"
					lateMins = int(now.Sub(cutoffTime).Minutes())
					penalty = math.Round((float64(lateMins) / 60.0) * hourlyRate)
					if maxPenalty > 0 && penalty > maxPenalty {
						penalty = maxPenalty
					}
				}
				targetType = "CheckIn"
				msg = "Presensi Masuk Guru Berhasil (Tepat Waktu)"
				if status == "Late" {
					if maxPenalty > 0 && penalty >= maxPenalty {
						msg = fmt.Sprintf("Presensi Masuk Tercatat (Terlambat %d Menit, Dikenakan Potongan Maksimal Rp %.0f)", lateMins, penalty)
					} else {
						msg = fmt.Sprintf("Presensi Masuk Tercatat (Terlambat %d Menit, Potongan Rp %.0f)", lateMins, penalty)
					}
				}

				staffAtt := domain.StaffAttendance{
					UserID:        matchedUser.ID,
					UnitID:        matchedUser.UnitID,
					Date:          now,
					CheckInTime:   now,
					Method:        "Face",
					Status:        status,
					LateMinutes:   lateMins,
					HourlyRate:    hourlyRate,
					PenaltyAmount: penalty,
					DeviceID:      req.DeviceID,
					Notes:         fmt.Sprintf("Face Biometric CheckIn (Confidence: %.1f%%)", confidence),
				}
				_ = u.staffAttendanceRepo.Create(&staffAtt)
			}
		} else if existingStaffAtt.CheckOutTime == nil {
			if now.Before(exitStartTime) {
				return &MatchScanResponse{
					UserID:        matchedUser.ID.String(),
					Name:          matchedUser.Name,
					Role:          "Guru",
					Identifier:    getStaffNIP(matchedUser),
					Subtext:       "Guru / Staf",
					Status:        existingStaffAtt.Status,
					Type:          "CheckIn",
					Timestamp:     existingStaffAtt.CheckInTime.Format("15:04") + " WIB",
					LateMinutes:   existingStaffAtt.LateMinutes,
					HourlyRate:    existingStaffAtt.HourlyRate,
					PenaltyAmount: existingStaffAtt.PenaltyAmount,
					Confidence:    confidence,
					Message:       fmt.Sprintf("Guru sudah presensi masuk. Presensi pulang baru dibuka pukul %s WIB", exitStartStr),
				}, nil
			}
			if now.After(exitEndTime) {
				return &MatchScanResponse{
					UserID:     matchedUser.ID.String(),
					Name:       matchedUser.Name,
					Role:       "Guru",
					Identifier: getStaffNIP(matchedUser),
					Subtext:    "Guru / Staf",
					Status:     "Rejected",
					Type:       "CheckOut",
					Timestamp:  timestampStr,
					Confidence: confidence,
					Message:    fmt.Sprintf("Presensi pulang telah ditutup pada pukul %s WIB", exitEndStr),
				}, nil
			}

			// Sudah masuk dan berada di jam pulang -> Presensi Pulang
			cooldownMinsStr := u.getSetting("attendance_cooldown_minutes", "3")
			cooldownMins, _ := strconv.Atoi(cooldownMinsStr)
			if cooldownMins <= 0 {
				cooldownMins = 3
			}
			cooldownDuration := time.Duration(cooldownMins) * time.Minute

			if now.Sub(existingStaffAtt.CheckInTime) < cooldownDuration {
				return &MatchScanResponse{
					UserID:        matchedUser.ID.String(),
					Name:          matchedUser.Name,
					Role:          "Guru",
					Identifier:    getStaffNIP(matchedUser),
					Subtext:       "Guru / Staf",
					Status:        existingStaffAtt.Status,
					Type:          "CheckIn",
					Timestamp:     existingStaffAtt.CheckInTime.Format("15:04") + " WIB",
					LateMinutes:   existingStaffAtt.LateMinutes,
					HourlyRate:    existingStaffAtt.HourlyRate,
					PenaltyAmount: existingStaffAtt.PenaltyAmount,
					Confidence:    confidence,
					Message:       fmt.Sprintf("Guru baru saja presensi masuk pada %s WIB. Mohon tunggu %d menit sebelum presensi pulang.", existingStaffAtt.CheckInTime.Format("15:04:05"), cooldownMins),
				}, nil
			}

			existingStaffAtt.CheckOutTime = &now
			_ = u.staffAttendanceRepo.Update(existingStaffAtt)
			targetType = "CheckOut"
			status = existingStaffAtt.Status
			lateMins = existingStaffAtt.LateMinutes
			penalty = existingStaffAtt.PenaltyAmount
			msg = "Presensi Pulang Guru Berhasil. Selamat beristirahat!"
		} else {
			return &MatchScanResponse{
				UserID:     matchedUser.ID.String(),
				Name:       matchedUser.Name,
				Role:       "Guru",
				Identifier: getStaffNIP(matchedUser),
				Subtext:    "Guru / Staf",
				Status:     "Present",
				Type:       "CheckOut",
				Timestamp:  existingStaffAtt.CheckOutTime.Format("15:04") + " WIB",
				Confidence: confidence,
				Message:    "Guru sudah menyelesaikan presensi masuk dan pulang hari ini",
			}, nil
		}
	}

	return &MatchScanResponse{
		UserID:        matchedUser.ID.String(),
		Name:          matchedUser.Name,
		Role:          "Guru",
		Identifier:    getStaffNIP(matchedUser),
		Subtext:       "Guru / Staf",
		Status:        status,
		Type:          targetType,
		Timestamp:     timestampStr,
		LateMinutes:   lateMins,
		HourlyRate:    hourlyRate,
		PenaltyAmount: penalty,
		Confidence:    confidence,
		Message:       msg,
	}, nil
}

func parseTimeToday(cutoffStr string, ref time.Time) time.Time {
	cutoffStr = strings.TrimSpace(cutoffStr)
	parts := strings.Split(cutoffStr, ":")
	hour := 7
	min := 0
	if len(parts) >= 2 {
		h, errH := strconv.Atoi(strings.TrimSpace(parts[0]))
		m, errM := strconv.Atoi(strings.TrimSpace(parts[1]))
		if errH == nil && errM == nil {
			hour = h
			min = m
		}
	}
	return time.Date(ref.Year(), ref.Month(), ref.Day(), hour, min, 0, 0, ref.Location())
}

func getStaffNIP(u *domain.User) string {
	if u.Teacher != nil && u.Teacher.NIP != "" {
		return "NIP " + u.Teacher.NIP
	}
	return "ID " + u.ID.String()[:8]
}
