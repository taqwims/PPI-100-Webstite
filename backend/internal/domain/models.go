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
	PhotoURL     string    `json:"photo_url"`
	RoleID       uint      `gorm:"not null" json:"role_id"`
	UnitID       uint      `gorm:"not null" json:"unit_id"`
	Teacher      *Teacher  `gorm:"foreignKey:UserID" json:"teacher,omitempty"`
	Parent       *Parent   `gorm:"foreignKey:UserID" json:"parent,omitempty"`
	Student      *Student  `gorm:"foreignKey:UserID" json:"student,omitempty"`
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
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	NISN      string    `gorm:"unique;not null" json:"nisn"`
	ClassID   uint      `gorm:"not null" json:"class_id"`
	Class     Class     `gorm:"foreignKey:ClassID" json:"class"`
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	UnitID    uint      `gorm:"not null" json:"unit_id"`
	Status    string    `gorm:"not null;default:'Active'" json:"status"` // Active, Graduated, Transferred
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Parent struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Teacher struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	NIP       string    `gorm:"unique" json:"nip"`
	UnitID    uint      `gorm:"not null" json:"unit_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
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

type Bill struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID   uuid.UUID `gorm:"type:uuid;not null" json:"student_id"`
	Student     Student   `gorm:"foreignKey:StudentID" json:"student"`
	Title          string        `gorm:"not null" json:"title"` // SPP, Uang Gedung, etc.
	AcademicYearID *uint         `json:"academic_year_id"`
	AcademicYear   *AcademicYear `gorm:"foreignKey:AcademicYearID" json:"academic_year,omitempty"`
	BillType       string        `gorm:"not null;default:'SPP'" json:"bill_type"` // SPP, Uang Pangkal, Uang Kegiatan, Tunggakan Alumni
	Amount         float64       `gorm:"not null" json:"amount"`
	DueDate        time.Time     `gorm:"not null" json:"due_date"`
	Status      string    `gorm:"not null" json:"status"` // Unpaid, Paid, Overdue
	PaymentLink string    `json:"payment_link"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Payment struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	BillID        uuid.UUID `gorm:"type:uuid;not null" json:"bill_id"`
	Bill          Bill      `gorm:"foreignKey:BillID" json:"bill"`
	Amount        float64   `gorm:"not null" json:"amount"`
	PaymentMethod string    `gorm:"not null" json:"payment_method"` // Transfer, Cash, Midtrans
	Status        string    `gorm:"not null" json:"status"` // Pending, Success, Failed
	TransactionID string    `json:"transaction_id"` // From Payment Gateway
	PaidAt        time.Time `json:"paid_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

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

type PPDBRegistration struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	NISN         string    `json:"nisn"`
	OriginSchool string    `json:"origin_school"`
	ParentName   string    `json:"parent_name"`
	Phone        string    `json:"phone"`
	Status       string    `json:"status"` // Pending, Accepted, Rejected
	UnitID       uint      `gorm:"not null" json:"unit_id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
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

type Payroll struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User           User      `gorm:"foreignKey:UserID" json:"user"`
	MonthYear      string    `gorm:"not null" json:"month_year"` // e.g. "11-2023"
	BasicSalary    float64   `gorm:"not null;default:0" json:"basic_salary"`
	Allowances     float64   `gorm:"not null;default:0" json:"allowances"`
	Deductions     float64   `gorm:"not null;default:0" json:"deductions"`
	Total          float64   `gorm:"not null;default:0" json:"total"`
	Status         string    `gorm:"not null" json:"status"` // Pending, Paid
	PaymentDate    time.Time `json:"payment_date"`
	ProcessedByID  uuid.UUID `gorm:"type:uuid;not null" json:"processed_by_id"`
	ProcessedBy    User      `gorm:"foreignKey:ProcessedByID" json:"processed_by"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type SavingAccount struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID uuid.UUID `gorm:"type:uuid;unique;not null" json:"student_id"`
	Student   Student   `gorm:"foreignKey:StudentID" json:"student"`
	Balance   float64   `gorm:"not null;default:0" json:"balance"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SavingTransaction struct {
	ID          uuid.UUID     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	AccountID   uuid.UUID     `gorm:"type:uuid;not null" json:"account_id"`
	Account     SavingAccount `gorm:"foreignKey:AccountID" json:"account"`
	Type        string        `gorm:"not null" json:"type"` // Deposit, Withdrawal
	Amount      float64       `gorm:"not null" json:"amount"`
	Date        time.Time     `gorm:"not null" json:"date"`
	HandledByID uuid.UUID     `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy   User          `gorm:"foreignKey:HandledByID" json:"handled_by"`
	Notes       string        `json:"notes"`
	CreatedAt   time.Time     `json:"created_at"`
}

type CashLedger struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Date        time.Time `gorm:"not null" json:"date"`
	Source      string    `gorm:"not null" json:"source"` // From who, to who
	ItemName    string    `gorm:"not null" json:"item_name"`
	Type        string    `gorm:"not null" json:"type"` // Income, Expense
	Amount      float64   `gorm:"not null" json:"amount"`
	Category    string    `gorm:"not null" json:"category"` // Operasional, Hutang Pihak ke 3, dll
	Notes       string    `json:"notes"`
	CreatedBy   uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DailyInfaq struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Date        time.Time `gorm:"not null" json:"date"`
	Source      string    `gorm:"not null" json:"source"` // Student ID, external donatur
	Type        string    `gorm:"not null" json:"type"` // Income, Expense (if any uses)
	Amount      float64   `gorm:"not null" json:"amount"`
	HandledByID uuid.UUID `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy   User      `gorm:"foreignKey:HandledByID" json:"handled_by"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
