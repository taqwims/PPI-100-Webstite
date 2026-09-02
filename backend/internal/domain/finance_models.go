package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

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
	Obligation           *StudentObligation `gorm:"foreignKey:ObligationID" json:"obligation,omitempty"`
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

// ------------------- Payroll Custom Item (JSONB) -------------------
type PayrollCustomItem struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
}

// PayrollCustomItems is a slice of PayrollCustomItem stored as JSONB in Postgres
type PayrollCustomItems []PayrollCustomItem

func (p PayrollCustomItems) Value() (driver.Value, error) {
	if p == nil {
		return "[]", nil
	}
	data, err := json.Marshal(p)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal PayrollCustomItems: %w", err)
	}
	return string(data), nil
}

func (p *PayrollCustomItems) Scan(value interface{}) error {
	if value == nil {
		*p = PayrollCustomItems{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("unsupported type for PayrollCustomItems: %T", value)
	}
	return json.Unmarshal(bytes, p)
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

	// Pendapatan (Fixed)
	BaseSalary          float64   `json:"base_salary"`
	FunctionalAllowance float64   `json:"functional_allowance"`
	TransportAllowance  float64   `json:"transport_allowance"`
	AdditionalTask      float64   `json:"additional_task"`
	TotalIncome         float64   `json:"total_income"`

	// Potongan (Fixed)
	LatenessPenalty     float64   `json:"lateness_penalty"`
	InfaqDeduction      float64   `json:"infaq_deduction"`
	CashAdvance         float64   `json:"cash_advance"`
	TotalDeduction      float64   `json:"total_deduction"`

	// Custom Components (JSONB)
	CustomIncomeItems    PayrollCustomItems `gorm:"type:jsonb;default:'[]'" json:"custom_income_items"`
	CustomDeductionItems PayrollCustomItems `gorm:"type:jsonb;default:'[]'" json:"custom_deduction_items"`

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
	ID                   uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID               uuid.UUID          `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	User                 User               `gorm:"foreignKey:UserID" json:"user"`
	BaseSalary           float64            `json:"base_salary"`
	FunctionalAllowance  float64            `json:"functional_allowance"`
	TransportAllowance   float64            `json:"transport_allowance"`
	AdditionalTask       float64            `json:"additional_task"`
	CustomIncomeItems    PayrollCustomItems `gorm:"type:jsonb;default:'[]'" json:"custom_income_items"`
	CustomDeductionItems PayrollCustomItems `gorm:"type:jsonb;default:'[]'" json:"custom_deduction_items"`
	CreatedAt            time.Time          `json:"created_at"`
	UpdatedAt            time.Time          `json:"updated_at"`
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
	ObligationID      *uuid.UUID       `gorm:"type:uuid" json:"obligation_id"`
	Obligation        *StudentObligation `gorm:"foreignKey:ObligationID" json:"obligation,omitempty"`
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

// ------------------- Savings Receivable / Piutang (Pool-level) -------------------
type SavingsReceivableWithdrawal struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Amount         float64   `gorm:"not null" json:"amount"`
	ReturnedAmount float64   `gorm:"default:0" json:"returned_amount"`
	Purpose        string    `gorm:"not null" json:"purpose"`
	Description    string    `json:"description"` // Keterangan piutang

	// Borrower Details
	BorrowerName string    `json:"borrower_name"`
	BorrowerID   string    `json:"borrower_id"` // NUP / KTP
	DueDate      time.Time `json:"due_date"`
	ReturnMethod string    `json:"return_method"` // Cicilan / Sekali Bayar

	Status      string                    `gorm:"default:'Outstanding'" json:"status"` // Outstanding, PartialReturn, Returned
	HandledByID uuid.UUID                 `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy   User                      `gorm:"foreignKey:HandledByID" json:"handled_by"`
	Returns     []SavingsReceivableReturn `gorm:"foreignKey:WithdrawalID" json:"returns"`
	UnitID      uint                      `json:"unit_id"`
	CreatedAt   time.Time                 `json:"created_at"`
	UpdatedAt   time.Time                 `json:"updated_at"`
}

type SavingsReceivableReturn struct {
	ID           uuid.UUID                    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	WithdrawalID uuid.UUID                    `gorm:"type:uuid;not null" json:"withdrawal_id"`
	Withdrawal   SavingsReceivableWithdrawal  `gorm:"foreignKey:WithdrawalID" json:"withdrawal"`
	Amount       float64                      `gorm:"not null" json:"amount"`
	Notes        string                       `json:"notes"`
	HandledByID  uuid.UUID                    `gorm:"type:uuid;not null" json:"handled_by_id"`
	HandledBy    User                         `gorm:"foreignKey:HandledByID" json:"handled_by"`
	UnitID       uint                         `json:"unit_id"`
	CreatedAt    time.Time                    `json:"created_at"`
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
	PeriodType string    // daily, monthly, range, semester, yearly
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

