package domain

import (
	"time"

	"github.com/google/uuid"
	)

// Notifikasi
type Notification struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User        User      `gorm:"foreignKey:UserID" json:"user"`
	Title       string    `gorm:"not null" json:"title"`
	Message     string    `gorm:"not null" json:"message"`
	Type        string    `gorm:"not null" json:"type"` // Bill, BK, Task, etc.
	ReferenceID string    `json:"reference_id"`
	IsRead      bool      `gorm:"default:false" json:"is_read"`
	CreatedAt   time.Time `json:"created_at"`
}

type NotificationToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Token     string    `gorm:"not null" json:"token"`
	Device    string    `json:"device"`
	CreatedAt time.Time `json:"created_at"`
}

type ContactMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `gorm:"not null" json:"email"`
	Subject   string    `gorm:"not null" json:"subject"`
	Message   string    `gorm:"not null" json:"message"`
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

// ------------------- WhatsApp Template -------------------
type WATemplate struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`                  // "Template Tagihan", "Template Reminder"
	BodyTemplate string    `gorm:"type:text;not null" json:"body_template"` // Template with {nama_siswa}, {total_tagihan}, {rincian}
	IsDefault    bool      `gorm:"default:false" json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ------------------- WhatsApp Scheduler Models -------------------
type WASchedule struct {
	ID           uint               `gorm:"primaryKey" json:"id"`
	SendAt       time.Time          `gorm:"not null" json:"send_at"`
	Status       string             `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, processing, completed, failed, cancelled
	WATemplateID uint               `gorm:"not null" json:"wa_template_id"`
	WATemplate   WATemplate         `gorm:"foreignKey:WATemplateID" json:"wa_template"`
	MinDelay     int                `gorm:"default:10" json:"min_delay"` // in seconds
	MaxDelay     int                `gorm:"default:30" json:"max_delay"` // in seconds
	Recipients   []WAScheduleDetail `gorm:"foreignKey:WAScheduleID;constraint:OnDelete:CASCADE;" json:"recipients,omitempty"`
	CreatedAt    time.Time          `json:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at"`
}

type WAScheduleDetail struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	WAScheduleID uint       `gorm:"not null" json:"wa_schedule_id"`
	StudentID    uuid.UUID  `gorm:"type:uuid;not null" json:"student_id"`
	Student      Student    `gorm:"foreignKey:StudentID" json:"student"`
	Phone        string     `gorm:"type:varchar(20);not null" json:"phone"`
	Message      string     `gorm:"type:text;not null" json:"message"`
	Status       string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, sent, failed
	ErrorMsg     string     `gorm:"type:text" json:"error_msg"`
	SentAt       *time.Time `json:"sent_at"`
}


