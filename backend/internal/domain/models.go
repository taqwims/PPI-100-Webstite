package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Core Tables

type User struct {
	ID                uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name              string    `gorm:"not null" json:"name"`
	Email             string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash      string    `gorm:"not null" json:"-"`
	PhotoURL          string    `json:"photo_url"`
	RoleID            uint      `gorm:"not null" json:"role_id"`
	UnitID            uint      `gorm:"not null" json:"unit_id"`
	BankName          string    `json:"bank_name"`
	BankAccountNumber string    `json:"bank_account_number"`
	BankAccountHolder string    `json:"bank_account_holder"`
	Teacher           *Teacher  `gorm:"foreignKey:UserID" json:"teacher,omitempty"`
	Parent            *Parent   `gorm:"foreignKey:UserID" json:"parent,omitempty"`
	Student           *Student  `gorm:"foreignKey:UserID" json:"student,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

type Role struct {
	ID   uint   `gorm:"primaryKey"`
	Name string `gorm:"unique;not null"` // Super Admin, Admin MTS, Admin MA, Guru, Wali Kelas, Siswa, Orang Tua
}

type Unit struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	Name         string      `gorm:"unique;not null" json:"name"` // MTS, MA, PUBLIC
	FoundationID *uint       `json:"foundation_id"`
	Foundation   *Foundation `gorm:"foreignKey:FoundationID" json:"foundation,omitempty"`
	Code         string      `json:"code"`                     // Short code: "mts", "ma"
	IsActive     bool        `gorm:"default:true" json:"is_active"`
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
	Status      string    `gorm:"not null" json:"status"` // Unpaid, Paid, Partial, Overdue
	PaymentLink string    `json:"payment_link"`
	InvoiceNumber     string           `gorm:"unique" json:"invoice_number"`
	IsInstallment        bool             `gorm:"default:false" json:"is_installment"`
	TransactionCodeID    *uint            `json:"transaction_code_id"`
	TransactionCode      *TransactionCode `gorm:"foreignKey:TransactionCodeID" json:"transaction_code,omitempty"`
	ObligationID         *uuid.UUID       `gorm:"type:uuid" json:"obligation_id"`
	ActivityObligationID *uuid.UUID       `gorm:"type:uuid" json:"activity_obligation_id"`
	Items                []BillItem       `gorm:"foreignKey:BillID" json:"items,omitempty"`
	Payments             []Payment        `gorm:"foreignKey:BillID" json:"payments,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type BillTemplate struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	UnitID            uint      `gorm:"not null" json:"unit_id"` // 1: MTS, 2: MA, etc.
	TemplateName      string    `gorm:"not null" json:"template_name"` // e.g. "Template SPP 12"
	Title             string    `gorm:"not null" json:"title"` // "SPP Bulan Juli"
	Amount            float64   `gorm:"not null" json:"amount"`
	BillType          string    `gorm:"not null;default:'SPP'" json:"bill_type"`
	TransactionCodeID *uint     `json:"transaction_code_id"`
	TransactionCode   *TransactionCode `gorm:"foreignKey:TransactionCodeID" json:"transaction_code,omitempty"`
	IsInstallment     bool      `gorm:"default:false" json:"is_installment"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Payment struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	BillID        uuid.UUID `gorm:"type:uuid;not null" json:"bill_id"`
	Bill          Bill      `gorm:"foreignKey:BillID" json:"bill"`
	Amount        float64   `gorm:"not null" json:"amount"`
	PaymentMethod string    `gorm:"not null" json:"payment_method"` // Transfer, Cash, Midtrans
	Status        string    `gorm:"not null" json:"status"` // Pending, Success, Failed
	TransactionID string    `json:"transaction_id"` // From Payment Gateway
	ProofURL      string    `json:"proof_url"`      // File path for transfer proof
	PaidAt        time.Time `json:"paid_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Payroll (Penggajian)
type Payroll struct {
	ID                  uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID              uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User                User      `gorm:"foreignKey:UserID" json:"user"`
	EmployeeName        string    `json:"employee_name"` // Snapshot name
	EmployeeNIK         string    `json:"employee_nik"`  // Snapshot NIK/NIP
	Position            string    `json:"position"`      // Snapshot Jabatan
	PeriodMonth         int       `json:"period_month"`  // e.g. 3
	PeriodYear          int       `json:"period_year"`   // e.g. 2026

	// Pendapatan
	BaseSalary          float64   `json:"base_salary"`
	FunctionalAllowance float64   `json:"functional_allowance"`
	TransportAllowance  float64   `json:"transport_allowance"`
	AdditionalTask      float64   `json:"additional_task"`
	TotalIncome         float64   `json:"total_income"`

	// Potongan
	LatenessPenalty     float64   `json:"lateness_penalty"`
	InfaqDeduction      float64   `json:"infaq_deduction"`
	CashAdvance         float64   `json:"cash_advance"`
	TotalDeduction      float64   `json:"total_deduction"`

	NetSalary           float64   `json:"net_salary"`
	Notes               string    `json:"notes"`
	Status              string    `gorm:"default:'Draft'" json:"status"` // Draft, Paid
	PaidAt              *time.Time `json:"paid_at"`

	PaymentMethod       string    `json:"payment_method"` // e.g. "Transfer", "Cash"
	BankName            string    `json:"bank_name"`
	BankAccountNumber   string    `json:"bank_account_number"`
	BankAccountHolder   string    `json:"bank_account_holder"`

	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type PayrollTemplate struct {
	ID                  uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID              uuid.UUID `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	User                User      `gorm:"foreignKey:UserID" json:"user"`
	BaseSalary          float64   `json:"base_salary"`
	FunctionalAllowance float64   `json:"functional_allowance"`
	TransportAllowance  float64   `json:"transport_allowance"`
	AdditionalTask      float64   `json:"additional_task"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
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

type PPDBPayment struct {
	ID                 uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PPDBRegistrationID uuid.UUID          `gorm:"type:uuid;not null" json:"ppdb_registration_id"`
	PPDBRegistration   PPDBRegistration   `gorm:"foreignKey:PPDBRegistrationID" json:"ppdb_registration"`
	InvoiceNumber      string             `gorm:"unique;not null" json:"invoice_number"`
	TotalAmount        float64            `gorm:"not null;default:0" json:"total_amount"`
	PaidAmount         float64            `gorm:"not null;default:0" json:"paid_amount"`
	Status             string             `gorm:"not null;default:'Belum Bayar'" json:"status"` // Belum Bayar, DP Terpenuhi, Lunas
	Items              []PPDBPaymentItem  `gorm:"foreignKey:PPDBPaymentID" json:"items,omitempty"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
}

type PPDBPaymentItem struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PPDBPaymentID  uuid.UUID `gorm:"type:uuid;not null" json:"ppdb_payment_id"`
	ItemName       string    `gorm:"not null" json:"item_name"`        // "Uang Bangunan", "Uang Tes Kemampuan"
	ExpectedAmount float64   `gorm:"not null" json:"expected_amount"`  // Nominal yang seharusnya dibayar
	PaidAmount     float64   `gorm:"not null;default:0" json:"paid_amount"` // Nominal yang sudah dibayar
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
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
	ID                uuid.UUID        `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Date              time.Time        `gorm:"not null" json:"date"`
	Source            string           `gorm:"not null" json:"source"` // From who, to who
	ItemName          string           `gorm:"not null" json:"item_name"`
	Type              string           `gorm:"not null" json:"type"` // Income, Expense
	Amount            float64          `gorm:"not null" json:"amount"`
	Category          string           `gorm:"not null" json:"category"` // Operasional, Hutang Pihak ke 3, dll
	FundSource        string           `gorm:"default:'Kas Umum'" json:"fund_source"` // Kas Umum, Infaq, Tabungan Siswa
	Notes             string           `json:"notes"`
	CreatedBy         uuid.UUID        `gorm:"type:uuid" json:"created_by"`
	ResponsibleID     *uuid.UUID       `gorm:"type:uuid" json:"responsible_id"`
	Responsible       *User            `gorm:"foreignKey:ResponsibleID" json:"responsible"`
	TransactionCodeID *uint            `json:"transaction_code_id"`
	TransactionCode   *TransactionCode `gorm:"foreignKey:TransactionCodeID" json:"transaction_code,omitempty"`
	AutoGenerated     bool             `gorm:"default:false" json:"auto_generated"` // true = auto dari tanggungan siswa
	UnitID            uint             `json:"unit_id"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
}

type DailyInfaq struct {
	ID                uuid.UUID        `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Date              time.Time        `gorm:"not null" json:"date"`
	Source            string           `gorm:"not null" json:"source"` // Student ID, external donatur
	Type              string           `gorm:"not null" json:"type"` // Income, Expense
	Amount            float64          `gorm:"not null" json:"amount"`
	ClassName         string           `json:"class_name"` // Optional class name for per-class infaq
	HandledByID       uuid.UUID        `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy         User             `gorm:"foreignKey:HandledByID" json:"handled_by"`
	ResponsibleID     *uuid.UUID       `gorm:"type:uuid" json:"responsible_id"`
	Responsible       *User            `gorm:"foreignKey:ResponsibleID" json:"responsible"`
	TransactionCodeID *uint            `json:"transaction_code_id"`
	TransactionCode   *TransactionCode `gorm:"foreignKey:TransactionCodeID" json:"transaction_code,omitempty"`
	InfaqTypeID       *uint            `json:"infaq_type_id"`
	InfaqType         *InfaqType       `gorm:"foreignKey:InfaqTypeID" json:"infaq_type,omitempty"`
	ProofURL          string           `json:"proof_url"`                               // Upload bukti file
	FundSource        string           `gorm:"default:'Infaq'" json:"fund_source"`      // Infaq, Kas Umum, Tabungan Siswa
	Notes             string           `json:"notes"`
	UnitID            uint             `json:"unit_id"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
}

// ------------------- Jenis Infaq -------------------

type InfaqType struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"unique;not null" json:"name"` // "Infaq Jumat", "Infaq Ramadhan", etc.
	Description string    `json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ------------------- Savings Operational (Pool-level) -------------------

type SavingsOperationalWithdrawal struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Amount         float64   `gorm:"not null" json:"amount"`
	ReturnedAmount float64   `gorm:"default:0" json:"returned_amount"`
	Purpose        string    `gorm:"not null" json:"purpose"`
	Status         string    `gorm:"default:'Outstanding'" json:"status"` // Outstanding, PartialReturn, Returned
	HandledByID    uuid.UUID `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy      User      `gorm:"foreignKey:HandledByID" json:"handled_by"`
	UnitID         uint      `json:"unit_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type SavingsOperationalReturn struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	WithdrawalID uuid.UUID `gorm:"type:uuid;not null" json:"withdrawal_id"`
	Withdrawal   SavingsOperationalWithdrawal `gorm:"foreignKey:WithdrawalID" json:"withdrawal"`
	Amount       float64   `gorm:"not null" json:"amount"`
	ReturnSource string    `json:"return_source"` // CashLedger, Infaq
	Notes        string    `json:"notes"`
	HandledByID  uuid.UUID `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy    User      `gorm:"foreignKey:HandledByID" json:"handled_by"`
	UnitID       uint      `json:"unit_id"`
	CreatedAt    time.Time `json:"created_at"`
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

// ------------------- Transaction Code & Categorization -------------------

type TransactionCode struct {
	ID            uint              `gorm:"primaryKey" json:"id"`
	Code          string            `gorm:"unique;not null" json:"code"`        // A1, B1, C1, etc.
	Name          string            `gorm:"not null" json:"name"`               // "Pendapatan SPP"
	Type          string            `gorm:"not null" json:"type"`               // "Income", "Expense"
	Category      string            `gorm:"not null" json:"category"`           // "SPP", "Gaji", "Infaq", "Operasional"
	Description   string            `json:"description"`
	ParentCodeID  *uint             `json:"parent_code_id"`                     // NULL = master/induk, non-NULL = anak
	ParentCode    *TransactionCode  `gorm:"foreignKey:ParentCodeID" json:"parent_code,omitempty"`
	Children      []TransactionCode `gorm:"foreignKey:ParentCodeID" json:"children,omitempty"`
	IsActive      bool              `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// ------------------- Bill Item (Itemized Billing) -------------------

type BillItem struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	BillID    uuid.UUID `gorm:"type:uuid;not null" json:"bill_id"`
	ItemName  string    `gorm:"not null" json:"item_name"` // "SPP", "Uang Makan", "Kegiatan"
	Amount    float64   `gorm:"not null" json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

// ------------------- RAB / RKAS (Budget) -------------------

type BudgetCategory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Budget struct {
	ID             uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	AcademicYearID uint           `gorm:"not null" json:"academic_year_id"`
	AcademicYear   AcademicYear   `gorm:"foreignKey:AcademicYearID" json:"academic_year"`
	CategoryID     uint           `gorm:"not null" json:"category_id"`
	Category       BudgetCategory `gorm:"foreignKey:CategoryID" json:"category"`
	BudgetType     string         `gorm:"default:'Pengeluaran'" json:"budget_type"` // Penerimaan, Pengeluaran
	ItemName       string         `gorm:"not null" json:"item_name"`
	Period         string         `gorm:"default:'Tahunan'" json:"period"` // Tahunan, Semester 1, Semester 2, Bulanan
	Month          int            `gorm:"default:0" json:"month"`  // 1-12 for monthly, 0 for non-monthly
	Quantity       int            `gorm:"default:1" json:"quantity"`        // Jumlah item
	UnitPrice      float64        `gorm:"default:0" json:"unit_price"`     // Harga per item
	PlannedAmount  float64        `gorm:"not null" json:"planned_amount"`  // = quantity * unit_price
	RealizedAmount float64        `gorm:"default:0" json:"realized_amount"`
	Status         string         `gorm:"not null;default:'Draft'" json:"status"` // Draft, Pending, Approved, Rejected
	ApprovedByID   *uuid.UUID       `gorm:"type:uuid" json:"approved_by_id"`
	ApprovedBy     *User            `gorm:"foreignKey:ApprovedByID" json:"approved_by,omitempty"`
	ApprovedAt     *time.Time       `json:"approved_at"`
	TransactionCodeID *uint         `json:"transaction_code_id"`
	TransactionCode   *TransactionCode `gorm:"foreignKey:TransactionCodeID" json:"transaction_code,omitempty"`
	Notes          string           `json:"notes"`
	CreatedByID    uuid.UUID      `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy      User           `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// ------------------- Jenis Pembayaran -------------------

type PaymentType struct {
	ID                uint             `gorm:"primaryKey" json:"id"`
	Code              string           `gorm:"unique;not null" json:"code"`             // SPP-01
	Name              string           `gorm:"not null" json:"name"`                    // SPP
	ClassID           *uint            `json:"class_id"`                                // null = semua kelas
	Class             *Class           `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	PaymentSchedule   string           `gorm:"not null" json:"payment_schedule"`        // Bulanan, Tahunan, Semesteran, Bertahap
	Amount            float64          `gorm:"not null" json:"amount"`
	AcademicYearID    uint             `gorm:"not null" json:"academic_year_id"`
	AcademicYear      AcademicYear     `gorm:"foreignKey:AcademicYearID" json:"academic_year"`
	TransactionCodeID *uint            `json:"transaction_code_id"`
	TransactionCode   *TransactionCode `gorm:"foreignKey:TransactionCodeID" json:"transaction_code,omitempty"`
	IsActive          bool             `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
}

// ------------------- Tanggungan Siswa -------------------

type StudentObligation struct {
	ID                uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID         uuid.UUID      `gorm:"type:uuid;not null" json:"student_id"`
	Student           Student        `gorm:"foreignKey:StudentID" json:"student"`
	PaymentTypeID     uint           `gorm:"not null" json:"payment_type_id"`
	PaymentType       PaymentType    `gorm:"foreignKey:PaymentTypeID" json:"payment_type"`
	AcademicYearID    uint           `gorm:"not null" json:"academic_year_id"`
	AcademicYear      AcademicYear   `gorm:"foreignKey:AcademicYearID" json:"academic_year"`
	Amount            float64        `gorm:"not null" json:"amount"`
	PaidAmount        float64        `gorm:"default:0" json:"paid_amount"`
	Status            string         `gorm:"not null;default:'Unpaid'" json:"status"` // Unpaid, Partial, Paid
	BillingMonth      int            `json:"billing_month"`                           // 1-12 untuk pembayaran bulanan (0 = non-bulanan)
	DueDate           *time.Time     `json:"due_date"`                                // Tanggal jatuh tempo
	InstallmentNumber int            `json:"installment_number"`                      // Nomor cicilan (1, 2, 3...) untuk tahunan dicicil
	TotalInstallments int            `json:"total_installments"`                      // Total cicilan (mis: 4x cicilan tahunan)
	Notes             string         `json:"notes"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

// ------------------- External Debt (Catatan Hutang) -------------------

type ExternalDebt struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreditorName     string    `gorm:"not null" json:"creditor_name"`     // Nama pihak ketiga / vendor
	Description      string    `gorm:"not null" json:"description"`      // Keterangan hutang
	Amount           float64   `gorm:"not null" json:"amount"`           // Nominal hutang awal
	PaidAmount       float64   `gorm:"default:0" json:"paid_amount"`     // Total yang sudah dibayar
	Status           string    `gorm:"not null;default:'Unpaid'" json:"status"` // Unpaid, Partial, Paid
	DueDate          *time.Time `json:"due_date"`
	Notes            string    `json:"notes"`
	CreatedByID      uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy        User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type ExternalDebtPayment struct {
	ID             uuid.UUID    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	DebtID         uuid.UUID    `gorm:"type:uuid;not null" json:"debt_id"`
	Debt           ExternalDebt `gorm:"foreignKey:DebtID" json:"debt"`
	Amount         float64      `gorm:"not null" json:"amount"`
	FundSource     string       `gorm:"not null" json:"fund_source"` // Kas Umum, Infaq
	Notes          string       `json:"notes"`
	PaidByID       uuid.UUID    `gorm:"type:uuid;not null" json:"paid_by_id"`
	PaidBy         User         `gorm:"foreignKey:PaidByID" json:"paid_by"`
	CreatedAt      time.Time    `json:"created_at"`
}

// ------------------- Bulk User Import -------------------

type BulkUserImportRow struct {
	Name     string `csv:"name"`
	Email    string `csv:"email"`
	Password string `csv:"password"`
	RoleID   uint   `csv:"role_id"`
	UnitID   uint   `csv:"unit_id"`
	NISN     string `csv:"nisn"`
	ClassID  *uint  `csv:"class_id"`
}

type BulkImportResult struct {
	TotalRows int                  `json:"total_rows"`
	Success   int                  `json:"success"`
	Failed    int                  `json:"failed"`
	Errors    []BulkImportRowError `json:"errors"`
}

type BulkImportRowError struct {
	Row    int    `json:"row"`
	Email  string `json:"email"`
	Reason string `json:"reason"`
}

// ------------------- Multi-Bill Payment -------------------

// MultiBillPaymentRequest is used as request body only, not persisted to DB
type MultiBillPaymentRequest struct {
	BillIDs       []string `json:"bill_ids" binding:"required,min=2"`
	Amount        float64  `json:"amount" binding:"required"`
	PaymentMethod string   `json:"payment_method" binding:"required"`
}

// MultiPaymentResult is the response for a successful multi-payment
type MultiPaymentResult struct {
	Payments      []Payment `json:"payments"`
	InvoiceNumber string    `json:"invoice_number"`
}

// ------------------- Savings Recap -------------------

type SavingsRecapParams struct {
	PeriodType string    // monthly, range, semester, yearly
	StartDate  time.Time
	EndDate    time.Time
	Year       int
	Semester   int // 1 atau 2
	ClassID    *uint
}

type SavingsRecapRow struct {
	StudentID     uuid.UUID `json:"student_id"`
	StudentName   string    `json:"student_name"`
	ClassName     string    `json:"class_name"`
	TotalDeposit  float64   `json:"total_deposit"`
	TotalWithdraw float64   `json:"total_withdraw"`
	EndBalance    float64   `json:"end_balance"`
}

type SavingsRecapResponse struct {
	Period        string            `json:"period"`
	Rows          []SavingsRecapRow `json:"rows"`
	GrandDeposit  float64           `json:"grand_deposit"`
	GrandWithdraw float64           `json:"grand_withdraw"`
	GrandBalance  float64           `json:"grand_balance"`
}

// ------------------- Asset Management -------------------

type Asset struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name             string     `gorm:"not null" json:"name"`
	Category         string     `gorm:"not null" json:"category"`          // Elektronik, Furnitur, Kendaraan, Bangunan, Perlengkapan
	Condition        string     `gorm:"not null" json:"condition"`         // Baik, Rusak Ringan, Rusak Berat
	Location         string     `gorm:"not null" json:"location"`
	AcquisitionValue float64    `gorm:"not null" json:"acquisition_value"`
	AcquisitionDate  time.Time  `gorm:"not null" json:"acquisition_date"`
	Status           string     `gorm:"not null;default:'Aktif'" json:"status"` // Aktif, Dalam Perbaikan, Dihapuskan
	DeletedAt        *time.Time `json:"deleted_at"`                        // Diisi otomatis saat status = Dihapuskan
	Notes            string     `json:"notes"`
	CreatedByID      uuid.UUID  `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy        User       `gorm:"foreignKey:CreatedByID" json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type AssetRecap struct {
	ByCategory  []AssetCategoryCount `json:"by_category"`
	ByStatus    []AssetStatusCount   `json:"by_status"`
	TotalValue  float64              `json:"total_value"`
	TotalAssets int                  `json:"total_assets"`
}

type AssetCategoryCount struct {
	Category string  `json:"category"`
	Count    int     `json:"count"`
	Value    float64 `json:"value"`
}

type AssetStatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type AssetCategory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"uniqueIndex;not null" json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ------------------- School Bank Account -------------------

type SchoolBankAccount struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	BankName      string    `gorm:"not null" json:"bank_name"`       // BSI, BCA, Mandiri
	AccountNumber string    `gorm:"not null" json:"account_number"`  // 7123456789
	AccountHolder string    `gorm:"not null" json:"account_holder"`  // Yayasan PPI 100
	IsPrimary     bool      `gorm:"default:false" json:"is_primary"` // Rekening utama
	IsActive      bool      `gorm:"default:true" json:"is_active"`   // Tampil/Tidak
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ------------------- Foundation (Yayasan) -------------------

type Foundation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"` // "Yayasan PPI 100"
	Address   string    `json:"address"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	LogoURL   string    `json:"logo_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ------------------- School Settings -------------------

type SchoolSetting struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"uniqueIndex;not null" json:"key"` // "school_name", "school_address", etc.
	Value       string    `gorm:"type:text" json:"value"`
	Description string    `json:"description"`
	IsAdminEdit bool      `gorm:"default:true" json:"is_admin_edit"` // true = admin can edit
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ------------------- Database Backup (Timeline) -------------------

type DatabaseBackup struct {
	ID            uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Filename      string     `gorm:"not null" json:"filename"`
	FileSizeBytes int64      `json:"file_size_bytes"`
	Label         string     `json:"label"`       // User label: "Sebelum Migrasi"
	Notes         string     `json:"notes"`       // Extra notes
	Status        string     `gorm:"default:'Success'" json:"status"` // Success, Failed, Restoring
	CreatedByID   uuid.UUID  `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy     User       `gorm:"foreignKey:CreatedByID" json:"created_by"`
	RestoredAt    *time.Time `json:"restored_at"`
	CreatedAt     time.Time  `json:"created_at"`
}
