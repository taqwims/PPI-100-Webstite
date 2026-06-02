package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/utils"
	"time"

	"github.com/google/uuid"
)

type WAJob struct {
	Phone   string
	Message string
}

type NotificationUsecase struct {
	notificationRepo *postgres.NotificationRepository
	waService        *utils.WAService
	waQueue          chan WAJob
}

func NewNotificationUsecase(notificationRepo *postgres.NotificationRepository, waService *utils.WAService) *NotificationUsecase {
	u := &NotificationUsecase{
		notificationRepo: notificationRepo,
		waService:        waService,
		waQueue:          make(chan WAJob, 1000), // Buffer for up to 1000 messages
	}

	// Start background worker
	go u.waWorker()

	return u
}

// waWorker runs in the background and processes WA messages sequentially
// to respect API rate limits and avoid blocking main HTTP threads.
func (u *NotificationUsecase) waWorker() {
	for job := range u.waQueue {
		if u.waService != nil {
			token := u.notificationRepo.GetSettingValue("fonnte_token", u.waService.GetDefaultToken())
			err := u.waService.SendWhatsApp(token, job.Phone, job.Message)
			if err != nil {
				fmt.Printf("[WA Worker] Failed to send WA to %s: %v\n", job.Phone, err)
			}
			// Sleep slightly to prevent rate limit issues
			time.Sleep(500 * time.Millisecond)
		}
	}
}

func (u *NotificationUsecase) SendNotification(userID uuid.UUID, title, message, notifType, refID string) error {
	notification := &domain.Notification{
		UserID:      userID,
		Title:       title,
		Message:     message,
		Type:        notifType,
		ReferenceID: refID,
	}
	// In a real app, we would also send FCM here
	return u.notificationRepo.Create(notification)
}

func (u *NotificationUsecase) GetUserNotifications(userID string) ([]domain.Notification, error) {
	return u.notificationRepo.GetByUser(userID)
}

func (u *NotificationUsecase) MarkAsRead(id string) error {
	return u.notificationRepo.MarkAsRead(id)
}

func (u *NotificationUsecase) MarkAllAsRead(userID string) error {
	return u.notificationRepo.MarkAllAsRead(userID)
}

func (u *NotificationUsecase) GetAllNotifications() ([]domain.Notification, error) {
	return u.notificationRepo.GetAll()
}

func (u *NotificationUsecase) DeleteNotification(id string) error {
	return u.notificationRepo.Delete(id)
}

func (u *NotificationUsecase) SendWhatsApp(phone, message string) error {
	if u.waService == nil {
		return nil // Service not initialized
	}

	if !u.notificationRepo.IsWAEnabled() {
		return fmt.Errorf("fitur notifikasi WhatsApp dinonaktifkan di pengaturan")
	}
	
	// Send to queue instead of blocking
	select {
	case u.waQueue <- WAJob{Phone: phone, Message: message}:
		return nil
	default:
		return fmt.Errorf("whatsapp queue is full")
	}
}

func (u *NotificationUsecase) GetWATemplateByID(id uint) (*domain.WATemplate, error) {
	return u.notificationRepo.GetWATemplateByID(id)
}

func (u *NotificationUsecase) GetDefaultWATemplate() (*domain.WATemplate, error) {
	return u.notificationRepo.GetDefaultWATemplate()
}
