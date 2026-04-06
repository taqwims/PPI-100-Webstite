package domain

import (
	"time"

	"github.com/google/uuid"
)

// ------------------- Activity (Kegiatan) -------------------

type Activity struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	AcademicYearID uint      `gorm:"not null" json:"academic_year_id"`
	AcademicYear   AcademicYear `gorm:"foreignKey:AcademicYearID" json:"academic_year"`
	Name           string    `gorm:"not null" json:"name"`
	Description    string    `json:"description"`
	TargetAmount   float64   `gorm:"not null" json:"target_amount"` // Tagihan per siswa
	StartDate      time.Time `gorm:"not null" json:"start_date"`
	EndDate        time.Time `gorm:"not null" json:"end_date"`
	Status         string    `gorm:"not null;default:'Active'" json:"status"` // Active, Completed
	CreatedByID    uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy      User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ActivityObligation struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ActivityID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_activity_student" json:"activity_id"`
	Activity    Activity  `gorm:"foreignKey:ActivityID" json:"activity"`
	StudentID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_activity_student" json:"student_id"`
	Student     Student   `gorm:"foreignKey:StudentID" json:"student"`
	Amount      float64   `gorm:"not null" json:"amount"`          // Default is Activity.TargetAmount
	PaidAmount  float64   `gorm:"default:0" json:"paid_amount"`
	Status      string    `gorm:"not null;default:'Unpaid'" json:"status"` // Unpaid, Partial, Paid
	Notes       string    `json:"notes"`
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy   User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ActivityTransaction struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ActivityID      uuid.UUID `gorm:"type:uuid;not null" json:"activity_id"`
	Activity        Activity  `gorm:"foreignKey:ActivityID" json:"activity"`
	TransactionType string    `gorm:"not null" json:"transaction_type"` // Income (from obligation), Expense (from panitia)
	Amount          float64   `gorm:"not null" json:"amount"`
	Date            time.Time `gorm:"not null" json:"date"`
	Description     string    `gorm:"not null" json:"description"`
	ReceiptImage    string    `json:"receipt_image"`
	CreatedByID     uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy       User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
