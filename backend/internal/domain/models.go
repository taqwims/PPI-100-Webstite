package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Core Tables

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	RoleID       uint      `gorm:"not null" json:"role_id"`
	UnitID       uint      `gorm:"not null" json:"unit_id"`
	Teacher      *Teacher  `gorm:"foreignKey:UserID" json:"teacher,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type Role struct {
	ID   uint   `gorm:"primaryKey"`
	Name string `gorm:"unique;not null"` // Super Admin, Admin MTS, Admin MA, Guru, Wali Kelas, Siswa, Orang Tua
}

type Unit struct {
	ID   uint   `gorm:"primaryKey"`
	Name string `gorm:"unique;not null"` // MTS, MA, PUBLIC
}

// Akademik

type Student struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	User      User      `gorm:"foreignKey:UserID"`
	NISN      string    `gorm:"unique;not null"`
	ClassID   uint      `gorm:"not null"`
	Class     Class     `gorm:"foreignKey:ClassID"`
	ParentID  uuid.UUID `gorm:"type:uuid"`
	UnitID    uint      `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Parent struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	Phone     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Teacher struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	User      User      `gorm:"foreignKey:UserID"`
	NIP       string    `gorm:"unique"`
	UnitID    uint      `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Class struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"not null"`
	UnitID    uint   `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Subject struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"not null"`
	UnitID    uint   `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Schedule struct {
	ID        uint      `gorm:"primaryKey"`
	ClassID   uint      `gorm:"not null"`
	Class     Class     `gorm:"foreignKey:ClassID"`
	SubjectID uint      `gorm:"not null"`
	Subject   Subject   `gorm:"foreignKey:SubjectID"`
	TeacherID uuid.UUID `gorm:"type:uuid;not null"`
	Teacher   Teacher   `gorm:"foreignKey:TeacherID"`
	Day       string    `gorm:"not null"` // Monday, Tuesday, etc.
	StartTime string    `gorm:"not null"` // HH:MM
	EndTime   string    `gorm:"not null"` // HH:MM
}

// Presensi

type Attendance struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	StudentID  uuid.UUID `gorm:"type:uuid;not null"`
	Student    Student   `gorm:"foreignKey:StudentID"`
	ScheduleID uint      `gorm:"not null"`
	Schedule   Schedule  `gorm:"foreignKey:ScheduleID"`
	Timestamp  time.Time `gorm:"not null"`
	Method     string    `gorm:"not null"` // Manual, QR
	Status     string    `gorm:"not null"` // Present, Absent, Late, Permission, Sick
}

type Bill struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	StudentID   uuid.UUID `gorm:"type:uuid;not null"`
	Student     Student   `gorm:"foreignKey:StudentID"`
	Title       string    `gorm:"not null"` // SPP, Uang Gedung, etc.
	Amount      float64   `gorm:"not null"`
	DueDate     time.Time `gorm:"not null"`
	Status      string    `gorm:"not null"` // Unpaid, Paid, Overdue
	PaymentLink string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Payment struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	BillID        uuid.UUID `gorm:"type:uuid;not null"`
	Bill          Bill      `gorm:"foreignKey:BillID"`
	Amount        float64   `gorm:"not null"`
	PaymentMethod string    `gorm:"not null"` // Transfer, Cash, Midtrans
	Status        string    `gorm:"not null"` // Pending, Success, Failed
	TransactionID string    // From Payment Gateway
	PaidAt        time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// BK

type Violation struct {
	ID          uint   `gorm:"primaryKey"`
	Name        string `gorm:"not null"`
	Points      int    `gorm:"not null"`
	Description string
}

type BKCall struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	StudentID uuid.UUID `gorm:"type:uuid;not null"`
	Student   Student   `gorm:"foreignKey:StudentID"`
	TeacherID uuid.UUID `gorm:"type:uuid;not null"`
	Teacher   Teacher   `gorm:"foreignKey:TeacherID"`
	Reason    string    `gorm:"not null"`
	Date      time.Time `gorm:"not null"`
	Status    string    `gorm:"not null"` // Pending, Resolved
	CreatedAt time.Time
	UpdatedAt time.Time
}

// E-learning

type Material struct {
	ID          uint      `gorm:"primaryKey"`
	Title       string    `gorm:"not null"`
	Description string
	FileURL     string
	ClassID     uint      `gorm:"not null"`
	SubjectID   uint      `gorm:"not null"`
	Subject     Subject   `gorm:"foreignKey:SubjectID"`
	TeacherID   uuid.UUID `gorm:"type:uuid;not null"`
	CreatedAt   time.Time
}

type Task struct {
	ID          uint      `gorm:"primaryKey"`
	Title       string    `gorm:"not null"`
	Description string
	Deadline    time.Time
	ClassID     uint      `gorm:"not null"`
	SubjectID   uint      `gorm:"not null"`
	Subject     Subject   `gorm:"foreignKey:SubjectID"`
	TeacherID   uuid.UUID `gorm:"type:uuid;not null"`
	CreatedAt   time.Time
}

type TaskSubmission struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	TaskID    uint      `gorm:"not null"`
	StudentID uuid.UUID `gorm:"type:uuid;not null"`
	FileURL   string
	Grade     float64
	CreatedAt time.Time
}



// Notifikasi

type Notification struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;not null"`
	Title       string    `gorm:"not null"`
	Message     string    `gorm:"not null"`
	Type        string    `gorm:"not null"` // Bill, BK, Task, etc.
	ReferenceID string
	IsRead      bool      `gorm:"default:false"`
	CreatedAt   time.Time
}

type NotificationToken struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	Token     string    `gorm:"not null"`
	Device    string
	CreatedAt time.Time
}

// Website Publik

type PublicTeacher struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"not null"`
	Position  string
	PhotoURL  string
	Bio       string
	CreatedAt time.Time
}

type Download struct {
	ID        uint   `gorm:"primaryKey"`
	Title     string `gorm:"not null"`
	Category  string // Brosur, Kalender
	FileURL   string `gorm:"not null"`
	CreatedAt time.Time
}

type Alumni struct {
	ID             uint   `gorm:"primaryKey"`
	Name           string `gorm:"not null"`
	GraduationYear int
	Profession     string
	Testimony      string
	PhotoURL       string
	CreatedAt      time.Time
}

type PPDBRegistration struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name        string    `gorm:"not null"`
	NISN        string
	OriginSchool string
	ParentName  string
	Phone       string
	Status      string // Pending, Accepted, Rejected
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
