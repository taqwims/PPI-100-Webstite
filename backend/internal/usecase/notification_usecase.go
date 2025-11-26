package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"

	"github.com/google/uuid"
)

type NotificationUsecase struct {
	notificationRepo *postgres.NotificationRepository
}

func NewNotificationUsecase(notificationRepo *postgres.NotificationRepository) *NotificationUsecase {
	return &NotificationUsecase{notificationRepo: notificationRepo}
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
