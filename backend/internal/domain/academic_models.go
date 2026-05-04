package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Akademik
type Student struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	NISN      string    `gorm:"unique;not null" json:"nisn"`
	ClassID   uint      `gorm:"not null" json:"class_id"`
	Class     Class     `gorm:"foreignKey:ClassID" json:"class"`
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	Parent    *Parent    `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	UnitID    uint      `gorm:"not null" json:"unit_id"`
	Status    string    `gorm:"not null;default:'Active'" json:"status"` // Active, Graduated, Transferred
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Parent struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User       User      `gorm:"foreignKey:UserID" json:"user"`
	Phone      string    `json:"phone"`
	Address    string    `json:"address"`
	Occupation string    `json:"occupation"`
	Relation   string    `json:"relation"` // e.g. Ayah, Ibu, Wali
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

type Teacher struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	NIP       string    `gorm:"unique" json:"nip"`
	UnitID    uint      `gorm:"not null" json:"unit_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Class struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	Name              string     `gorm:"not null" json:"name"`
	UnitID            uint       `gorm:"not null" json:"unit_id"`
	HomeroomTeacherID *uuid.UUID `gorm:"type:uuid" json:"homeroom_teacher_id"`
	HomeroomTeacher   *Teacher   `gorm:"foreignKey:HomeroomTeacherID" json:"homeroom_teacher,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type Subject struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	UnitID    uint      `gorm:"not null" json:"unit_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Schedule struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ClassID   uint      `gorm:"not null" json:"class_id"`
	Class     Class     `gorm:"foreignKey:ClassID" json:"class"`
	SubjectID uint      `gorm:"not null" json:"subject_id"`
	Subject   Subject   `gorm:"foreignKey:SubjectID" json:"subject"`
	TeacherID uuid.UUID `gorm:"type:uuid;not null" json:"teacher_id"`
	Teacher   Teacher   `gorm:"foreignKey:TeacherID" json:"teacher"`
	Day       string    `gorm:"not null" json:"day"` // Monday, Tuesday, etc.
	StartTime string    `gorm:"not null" json:"start_time"` // HH:MM
	EndTime   string    `gorm:"not null" json:"end_time"` // HH:MM
}

// Presensi
type Attendance struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID  uuid.UUID `gorm:"type:uuid;not null" json:"student_id"`
	Student    Student   `gorm:"foreignKey:StudentID" json:"student"`
	ScheduleID uint      `gorm:"not null" json:"schedule_id"`
	Schedule   Schedule  `gorm:"foreignKey:ScheduleID" json:"schedule"`
	Timestamp  time.Time `gorm:"not null" json:"timestamp"`
	Method     string    `gorm:"not null" json:"method"` // Manual, QR
	Status     string    `gorm:"not null" json:"status"` // Present, Absent, Late, Permission, Sick
}

// ------------------- New Financial & Admin Models -------------------
type AcademicYear struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"unique;not null" json:"name"` // e.g. "2023/2024"
	IsActive  bool      `gorm:"default:false" json:"is_active"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type StudentClassHistory struct {
	ID             uuid.UUID    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID      uuid.UUID    `gorm:"type:uuid;not null" json:"student_id"`
	Student        Student      `gorm:"foreignKey:StudentID" json:"student"`
	ClassID        uint         `gorm:"not null" json:"class_id"`
	Class          Class        `gorm:"foreignKey:ClassID" json:"class"`
	AcademicYearID uint         `gorm:"not null" json:"academic_year_id"`
	AcademicYear   AcademicYear `gorm:"foreignKey:AcademicYearID" json:"academic_year"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

