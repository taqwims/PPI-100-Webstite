package domain

import (
	"time"

	"github.com/google/uuid"
	)

// E-learning
type Material struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	FileURL     string    `json:"file_url"`
	ClassID     uint      `gorm:"not null" json:"class_id"`
	SubjectID   uint      `gorm:"not null" json:"subject_id"`
	Subject     Subject   `gorm:"foreignKey:SubjectID" json:"subject"`
	TeacherID   uuid.UUID `gorm:"type:uuid;not null" json:"teacher_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type Task struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	Deadline    time.Time `json:"deadline"`
	ClassID     uint      `gorm:"not null" json:"class_id"`
	SubjectID   uint      `gorm:"not null" json:"subject_id"`
	Subject     Subject   `gorm:"foreignKey:SubjectID" json:"subject"`
	TeacherID   uuid.UUID `gorm:"type:uuid;not null" json:"teacher_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type TaskSubmission struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	TaskID    uint      `gorm:"not null" json:"task_id"`
	Task      Task      `gorm:"foreignKey:TaskID" json:"task"`
	StudentID uuid.UUID `gorm:"type:uuid;not null" json:"student_id"`
	FileURL   string    `json:"file_url"`
	Grade     float64   `json:"grade"`
	CreatedAt time.Time `json:"created_at"`
}

