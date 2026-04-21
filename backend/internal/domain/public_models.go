package domain

import (
	"time"

	)

// Website Publik
type PublicTeacher struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Position  string    `json:"position"`
	PhotoURL  string    `json:"photo_url"`
	Bio       string    `json:"bio"`
	CreatedAt time.Time `json:"created_at"`
}

type Download struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"not null" json:"title"`
	Category  string    `json:"category"` // Brosur, Kalender
	FileURL   string    `gorm:"not null" json:"file_url"`
	CreatedAt time.Time `json:"created_at"`
}

type Alumni struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Name           string    `gorm:"not null" json:"name"`
	GraduationYear int       `json:"graduation_year"`
	Profession     string    `json:"profession"`
	Testimony      string    `json:"testimony"`
	PhotoURL       string    `json:"photo_url"`
	CreatedAt      time.Time `json:"created_at"`
}

