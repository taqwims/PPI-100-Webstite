package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/utils"

	"github.com/google/uuid"
)

type NotificationUsecase struct {
	notificationRepo *postgres.NotificationRepository
	waService        *utils.WAService
}

func NewNotificationUsecase(notificationRepo *postgres.NotificationRepository, waService *utils.WAService) *NotificationUsecase {
	return &NotificationUsecase{
		notificationRepo: notificationRepo,
		waService:        waService,
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
	return u.waService.SendWhatsApp(phone, message)
}

func (u *NotificationUsecase) GetWATemplateByID(id uint) (*domain.WATemplate, error) {
	return u.notificationRepo.GetWATemplateByID(id)
}

func (u *NotificationUsecase) GetDefaultWATemplate() (*domain.WATemplate, error) {
	return u.notificationRepo.GetDefaultWATemplate()
}
