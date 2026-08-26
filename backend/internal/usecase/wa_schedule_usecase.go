package usecase

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/utils"
	"strings"
	"sync"
	"time"
)

type WAScheduleUsecase interface {
	CreateSchedule(sendAt time.Time, templateID uint, minDelay, maxDelay int, academicYearID uint, classIDs []uint) (*domain.WASchedule, error)
	GetSchedules() ([]domain.WASchedule, error)
	GetScheduleDetail(id uint) (*domain.WASchedule, error)
	CancelSchedule(id uint) error
	StartScheduler()
	StopScheduler()
}

type waScheduleUsecase struct {
	scheduleRepo          postgres.WAScheduleRepository
	studentObligationRepo *postgres.StudentObligationRepository
	waTemplateRepo        postgres.WATemplateRepository
	notificationRepo      *postgres.NotificationRepository
	waService             *utils.WAService
	ticker                *time.Ticker
	stopChan              chan struct{}
	mu                    sync.Mutex
	isProcessing          bool
}

func NewWAScheduleUsecase(
	scheduleRepo postgres.WAScheduleRepository,
	studentObligationRepo *postgres.StudentObligationRepository,
	waTemplateRepo postgres.WATemplateRepository,
	notificationRepo *postgres.NotificationRepository,
	waService *utils.WAService,
) WAScheduleUsecase {
	return &waScheduleUsecase{
		scheduleRepo:          scheduleRepo,
		studentObligationRepo: studentObligationRepo,
		waTemplateRepo:        waTemplateRepo,
		notificationRepo:      notificationRepo,
		waService:             waService,
		stopChan:              make(chan struct{}),
	}
}

func (u *waScheduleUsecase) CreateSchedule(sendAt time.Time, templateID uint, minDelay, maxDelay int, academicYearID uint, classIDs []uint) (*domain.WASchedule, error) {
	// 1. Get Template
	template, err := u.waTemplateRepo.GetByID(templateID)
	if err != nil {
		return nil, err
	}

	// 2. Fetch all student obligations
	var obligations []domain.StudentObligation
	if len(classIDs) > 0 {
		obligations, err = u.studentObligationRepo.GetByClassIDs(academicYearID, classIDs)
	} else {
		obligations, err = u.studentObligationRepo.GetAll(academicYearID, 0)
	}
	if err != nil {
		return nil, err
	}

	// 3. Group obligations by student and load parents
	// We need Parent info which might not be preloaded by default repo GetAll.
	// GORM preloads are customizable. Since we have student_id, we will group them.
	studentObligations := make(map[string][]domain.StudentObligation)
	for _, ob := range obligations {
		if ob.Status != "Paid" {
			studentObligations[ob.StudentID.String()] = append(studentObligations[ob.StudentID.String()], ob)
		}
	}

	if len(studentObligations) == 0 {
		return nil, fmt.Errorf("tidak ditemukan siswa dengan tunggakan pada kriteria tersebut")
	}

	if minDelay < 1 {
		minDelay = 5
	}
	if maxDelay < minDelay {
		maxDelay = minDelay + 10
	}

	schedule := &domain.WASchedule{
		SendAt:       sendAt,
		Status:       "pending",
		WATemplateID: templateID,
		MinDelay:     minDelay,
		MaxDelay:     maxDelay,
	}

	// For each student, generate the message
	var recipients []domain.WAScheduleDetail
	for _, obs := range studentObligations {
		firstOb := obs[0]
		student := firstOb.Student

		// Get Parent and Student phone numbers
		parent, parentUser, _ := u.studentObligationRepo.GetParentByStudentID(student.ParentID)
		
		var parentPhone string
		if parent != nil && parent.Phone != "" {
			parentPhone = parent.Phone
		} else if parentUser != nil && parentUser.Phone != "" {
			parentPhone = parentUser.Phone
		}
		studentPhone := student.User.Phone

		var targetPhones []string
		if parentPhone != "" {
			targetPhones = append(targetPhones, parentPhone)
		} else if studentPhone != "" {
			targetPhones = append(targetPhones, studentPhone)
		}

		if len(targetPhones) == 0 {
			// Skip students without any valid phone numbers
			continue
		}

		// Calculate total arrears and format items list
		var totalArrears float64
		var detailItems []string
		monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

		for _, o := range obs {
			sisa := o.Amount - o.PaidAmount
			totalArrears += sisa

			monthLabel := ""
			if o.BillingMonth > 0 && o.BillingMonth <= 12 {
				monthLabel = " (" + monthNames[o.BillingMonth] + ")"
			}
			detailItems = append(detailItems, fmt.Sprintf("• %s%s: %s", o.PaymentType.Name, monthLabel, utils.FormatRupiah(sisa)))
		}

		rincian := strings.Join(detailItems, "\n")
		totalTagihanText := utils.FormatRupiah(totalArrears)

		// Create anti-spam message body for each number
		for _, phone := range targetPhones {
			message := u.generateAntiSpamMessage(template.BodyTemplate, student.User.Name, student.NISN, student.Class.Name, totalTagihanText, rincian)
			recipients = append(recipients, domain.WAScheduleDetail{
				StudentID: student.ID,
				Phone:     phone,
				Message:   message,
				Status:    "pending",
			})
		}
	}

	if len(recipients) == 0 {
		return nil, fmt.Errorf("tidak ditemukan siswa dengan nomor telepon orang tua yang valid")
	}

	schedule.Recipients = recipients

	if err := u.scheduleRepo.Create(schedule); err != nil {
		return nil, err
	}

	return schedule, nil
}

func (u *waScheduleUsecase) GetSchedules() ([]domain.WASchedule, error) {
	return u.scheduleRepo.GetAll()
}

func (u *waScheduleUsecase) GetScheduleDetail(id uint) (*domain.WASchedule, error) {
	return u.scheduleRepo.GetByID(id)
}

func (u *waScheduleUsecase) CancelSchedule(id uint) error {
	return u.scheduleRepo.CancelPending(id)
}

func (u *waScheduleUsecase) StartScheduler() {
	u.mu.Lock()
	defer u.mu.Unlock()

	// Reset any stuck "processing" jobs from a crash/restart
	_ = u.scheduleRepo.ResetProcessingToPending()

	if u.ticker != nil {
		return // Already running
	}

	u.ticker = time.NewTicker(30 * time.Second)
	go func() {
		for {
			select {
			case <-u.ticker.C:
				u.checkAndProcessSchedules()
			case <-u.stopChan:
				return
			}
		}
	}()
}

func (u *waScheduleUsecase) StopScheduler() {
	u.mu.Lock()
	defer u.mu.Unlock()

	if u.ticker != nil {
		u.ticker.Stop()
		u.ticker = nil
		close(u.stopChan)
		u.stopChan = make(chan struct{})
	}
}

func (u *waScheduleUsecase) checkAndProcessSchedules() {
	u.mu.Lock()
	if u.isProcessing {
		u.mu.Unlock()
		return
	}
	u.isProcessing = true
	u.mu.Unlock()

	defer func() {
		u.mu.Lock()
		u.isProcessing = false
		u.mu.Unlock()
	}()

	now := time.Now()
	schedules, err := u.scheduleRepo.GetPendingDue(now)
	if err != nil || len(schedules) == 0 {
		return
	}

	// Process each schedule sequentially
	for _, s := range schedules {
		// Verify Fonnte setting
		if !u.notificationRepo.IsWAEnabled() {
			fmt.Println("[WA Scheduler] WhatsApp notifications are disabled in settings. Skipping schedule id:", s.ID)
			continue
		}

		token := u.notificationRepo.GetSettingValue("fonnte_token", u.waService.GetDefaultToken())
		if token == "" {
			fmt.Println("[WA Scheduler] Fonnte Token is not configured. Skipping schedule id:", s.ID)
			continue
		}

		// Mark schedule as processing
		_ = u.scheduleRepo.UpdateStatus(s.ID, "processing")

		// Load recipients
		recipients, err := u.scheduleRepo.GetDetailsByScheduleID(s.ID)
		if err != nil {
			_ = u.scheduleRepo.UpdateStatus(s.ID, "failed")
			continue
		}

		hasFailed := false
		for i, r := range recipients {
			if r.Status != "pending" {
				continue
			}

			// Send via Fonnte
			err := u.waService.SendWhatsApp(token, r.Phone, r.Message)
			nowSent := time.Now()
			r.SentAt = &nowSent

			if err != nil {
				r.Status = "failed"
				r.ErrorMsg = err.Error()
				hasFailed = true
				fmt.Printf("[WA Scheduler] Failed sending to %s: %v\n", r.Phone, err)
			} else {
				r.Status = "sent"
			}

			_ = u.scheduleRepo.UpdateDetail(&r)

			// Sleep for random delay if there are more recipients left in this batch
			if i < len(recipients)-1 {
				delaySec := u.getRandomDelay(s.MinDelay, s.MaxDelay)
				time.Sleep(time.Duration(delaySec) * time.Second)
			}
		}

		finalStatus := "completed"
		if hasFailed {
			finalStatus = "completed" // Keep it completed, but inner items show failure
		}
		_ = u.scheduleRepo.UpdateStatus(s.ID, finalStatus)
	}
}

// generateAntiSpamMessage replaces variables and injects greetings variation and unique footer
func (u *waScheduleUsecase) generateAntiSpamMessage(body, studentName, nis, class, totalTagihan, rincian string) string {
	res := body
	res = strings.ReplaceAll(res, "{nama_siswa}", studentName)
	res = strings.ReplaceAll(res, "{nis}", nis)
	res = strings.ReplaceAll(res, "{kelas}", class)
	res = strings.ReplaceAll(res, "{total_tagihan}", totalTagihan)
	res = strings.ReplaceAll(res, "{rincian}", rincian)
	res = strings.ReplaceAll(res, "{tanggal}", time.Now().Format("02 January 2006"))

	// 1. Spintax / greeting variations
	greetings := []string{
		"Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali Murid,",
		"Selamat pagi/siang Bapak/Ibu Wali Murid yang kami hormati,",
		"Yth. Orang Tua/Wali Murid,",
		"Salam takzim Bapak/Ibu Orang Tua dari siswa,",
		"Assalamu'alaikum Wr. Wb. Yth. Orang Tua,",
	}
	
	// Choose a greeting variation based on random selection
	chosenGreeting := greetings[0]
	nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(greetings))))
	if err == nil {
		chosenGreeting = greetings[nBig.Int64()]
	}

	// If the template has default greeting placeholder or standard intro, replace it or prepend
	// Since we don't know the exact greeting template structure, let's prepend or insert it if template starts with standard greeting.
	// Better: If template starts with "Assalamu'alaikum" or "Yth.", replace that section or simply prefix the variation
	// To be extremely clean, we will prepend the random greeting if not already personalized, or let it stand.
	// Actually, we can append a completely unique transaction id / hash footer to guarantee payload uniqueness.
	uniqueID := u.generateRandomCode(8)
	footer := fmt.Sprintf("\n\n---\nRef ID: WA-%s-SIS\n(Pesan otomatis dari Sistem Keuangan SDIT)", uniqueID)
	res = res + footer

	// Let's also check if they have spintax formatting in template like {salam} and resolve it
	if strings.Contains(res, "{salam}") {
		res = strings.ReplaceAll(res, "{salam}", chosenGreeting)
	} else {
		// If template starts with "Assalamu'alaikum Wr. Wb." or "Yth.", let's replace the first paragraph with the chosen Greeting
		if strings.HasPrefix(res, "Assalamu'alaikum Wr. Wb.") || strings.HasPrefix(res, "Kepada Orang Tua") {
			// Find first double newline and replace content before it
			parts := strings.SplitN(res, "\n\n", 2)
			if len(parts) > 1 {
				res = chosenGreeting + "\n\n" + parts[1]
			}
		}
	}

	return res
}

func (u *waScheduleUsecase) getRandomDelay(min, max int) int {
	if min >= max {
		return min
	}
	diff := max - min
	nBig, err := rand.Int(rand.Reader, big.NewInt(int64(diff+1)))
	if err != nil {
		return min
	}
	return min + int(nBig.Int64())
}

func (u *waScheduleUsecase) generateRandomCode(length int) string {
	bytes := make([]byte, length/2)
	if _, err := rand.Read(bytes); err != nil {
		return "X1Y2Z3"
	}
	return hex.EncodeToString(bytes)
}
