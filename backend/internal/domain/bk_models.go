package domain

import (
	"time"

	"github.com/google/uuid"
	)

// BK
type Violation struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"not null" json:"name"`
	Points      int    `gorm:"not null" json:"points"`
	Description string `json:"description"`
}

type BKCall struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID uuid.UUID `gorm:"type:uuid;not null" json:"student_id"`
	Student   Student   `gorm:"foreignKey:StudentID" json:"student"`
	TeacherID uuid.UUID `gorm:"type:uuid;not null" json:"teacher_id"`
	Teacher   Teacher   `gorm:"foreignKey:TeacherID" json:"teacher"`
	Reason    string    `gorm:"not null" json:"reason"`
	Date      time.Time `gorm:"not null" json:"date"`
	Status    string    `gorm:"not null" json:"status"` // Pending, Resolved
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

