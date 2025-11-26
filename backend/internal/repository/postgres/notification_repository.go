package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(notification *domain.Notification) error {
	return r.db.Create(notification).Error
}

func (r *NotificationRepository) GetByUser(userID string) ([]domain.Notification, error) {
	var notifications []domain.Notification
	err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&notifications).Error
	return notifications, err
}

func (r *NotificationRepository) MarkAsRead(id string) error {
	return r.db.Model(&domain.Notification{}).Where("id = ?", id).Update("is_read", true).Error
}

func (r *NotificationRepository) SaveToken(token *domain.NotificationToken) error {
	return r.db.Create(token).Error
}
