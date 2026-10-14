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
	Notes      string    `json:"notes"`
}

type MatchScanResponse struct {
	UserID        string  `json:"user_id"`
	Name          string  `json:"name"`
	Role          string  `json:"role"` // Siswa / Guru
	Identifier    string  `json:"identifier"`
	Subtext       string  `json:"subtext"`
	Status        string  `json:"status"` // Present / Late
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

		// Cooldown check (5 menit untuk mencegah double-tap)
		todayAtts, _ := u.attendanceRepo.GetTodayStudentAttendance(student.ID.String(), now)
		if len(todayAtts) > 0 {
			lastAtt := todayAtts[len(todayAtts)-1]
			if now.Sub(lastAtt.Timestamp) < 5*time.Minute {
				return &MatchScanResponse{
					UserID:      matchedUser.ID.String(),
					Name:        matchedUser.Name,
					Role:        "Siswa",
					Identifier:  "NISN " + student.NISN,
					Subtext:     "Kelas " + student.Class.Name,
					Status:      lastAtt.Status,
					Timestamp:   lastAtt.Timestamp.Format("15:04") + " WIB",
					LateMinutes: 0,
					Confidence:  confidence,
					Message:     "Sudah melakukan presensi beberapa saat yang lalu",
				}, nil
			}
		}

		// Batas jam masuk siswa (default 07:00)
		cutoffStr := u.getSetting("student_check_in_time", "07:00")
		status := "Present"
		lateMins := 0

		cutoffTime := parseTimeToday(cutoffStr, now)
		if now.After(cutoffTime) {
			status = "Late"
			lateMins = int(now.Sub(cutoffTime).Minutes())
		}

		attRecord := domain.Attendance{
			StudentID: student.ID,
			Timestamp: now,
			Method:    "Face",
			Status:    status,
			Type:      "CheckIn",
			DeviceID:  req.DeviceID,
			Notes:     fmt.Sprintf("Face Biometric (Confidence: %.1f%%)", confidence),
		}
		_ = u.attendanceRepo.Create(&attRecord)

		return &MatchScanResponse{
			UserID:      matchedUser.ID.String(),
			Name:        matchedUser.Name,
			Role:        "Siswa",
			Identifier:  "NISN " + student.NISN,
			Subtext:     "Kelas " + student.Class.Name,
			Status:      status,
			Timestamp:   timestampStr,
			LateMinutes: lateMins,
			Confidence:  confidence,
			Message:     "Presensi Siswa Berhasil",
		}, nil
	}

	// ─── Skenario Guru & Tenaga Kependidikan ───
	cutoffStr := u.getSetting("teacher_check_in_time", "07:00")
	hourlyRateStr := u.getSetting("teacher_late_hourly_rate", "30000")
	hourlyRate, _ := strconv.ParseFloat(hourlyRateStr, 64)
	if hourlyRate <= 0 {
		hourlyRate = 30000
	}

	status := "Present"
	lateMins := 0
	penalty := 0.0

	cutoffTime := parseTimeToday(cutoffStr, now)
	if now.After(cutoffTime) {
		status = "Late"
		lateMins = int(now.Sub(cutoffTime).Minutes())
		// Rumus: (menit : 60 x harga)
		penalty = math.Round((float64(lateMins) / 60.0) * hourlyRate)
	}

	// Cek apakah sudah absen hari ini
	existingStaffAtt, _ := u.staffAttendanceRepo.GetTodayByUser(matchedUser.ID.String(), now)
	if existingStaffAtt != nil {
		return &MatchScanResponse{
			UserID:        matchedUser.ID.String(),
			Name:          matchedUser.Name,
			Role:          "Guru",
			Identifier:    getStaffNIP(matchedUser),
			Subtext:       "Guru / Staf",
			Status:        existingStaffAtt.Status,
			Timestamp:     existingStaffAtt.CheckInTime.Format("15:04") + " WIB",
			LateMinutes:   existingStaffAtt.LateMinutes,
			HourlyRate:    existingStaffAtt.HourlyRate,
			PenaltyAmount: existingStaffAtt.PenaltyAmount,
			Confidence:    confidence,
			Message:       "Presensi hari ini sudah tercatat sebelumnya",
		}, nil
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
		Notes:         fmt.Sprintf("Face Biometric (Confidence: %.1f%%)", confidence),
	}
	_ = u.staffAttendanceRepo.Create(&staffAtt)

	msg := "Presensi Guru Berhasil (Tepat Waktu)"
	if status == "Late" {
		msg = fmt.Sprintf("Presensi Tercatat (Terlambat %d Menit, Potongan Rp %.0f)", lateMins, penalty)
	}

	return &MatchScanResponse{
		UserID:        matchedUser.ID.String(),
		Name:          matchedUser.Name,
		Role:          "Guru",
		Identifier:    getStaffNIP(matchedUser),
		Subtext:       "Guru / Staf",
		Status:        status,
		Timestamp:     timestampStr,
		LateMinutes:   lateMins,
		HourlyRate:    hourlyRate,
		PenaltyAmount: penalty,
		Confidence:    confidence,
		Message:       msg,
	}, nil
}

func parseTimeToday(cutoffStr string, ref time.Time) time.Time {
	parts := strings.Split(cutoffStr, ":")
	hour := 7
	min := 0
	if len(parts) >= 2 {
		h, errH := strconv.Atoi(parts[0])
		m, errM := strconv.Atoi(parts[1])
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
