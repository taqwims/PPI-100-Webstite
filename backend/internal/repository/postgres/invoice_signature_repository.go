package postgres

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"gorm.io/gorm"
)

// InvoiceHistoryItem represents a grouped invoice history row.
type InvoiceHistoryItem struct {
	InvoiceNumber    string    `json:"invoice_number"`
	InvoiceType      string    `json:"invoice_type"`
	ReferenceID      string    `json:"reference_id"`
	Amount           float64   `json:"amount"`
	DocumentDate     string    `json:"document_date"`
	SignedAt         time.Time `json:"signed_at"`
	VerificationCode string    `json:"verification_code"`
	LatestCreatedAt  time.Time `json:"latest_created_at"`
}

// InvoiceSignatureRepository defines the data access contract.
type InvoiceSignatureRepository interface {
	FindByTypeAndRef(invoiceType, referenceID string) ([]domain.InvoiceSignature, error)
	CreateSignatures(sigs []domain.InvoiceSignature) error
	UpdateVerificationCode(invoiceType, referenceID, code, docDate string) error
	FindByVerificationCode(code string) ([]domain.InvoiceSignature, error)
	FindByShortCode(code string) ([]domain.InvoiceSignature, error)
	GetInvoiceHistory(userIDStr string, roleID int, invoiceType, search, startDate, endDate string) ([]InvoiceHistoryItem, error)
	GetConfigs() ([]domain.InvoiceNumberConfig, error)
	GetConfigByType(invoiceType string) (*domain.InvoiceNumberConfig, error)
	GetConfigByID(id uint) (*domain.InvoiceNumberConfig, error)
	SaveConfig(config *domain.InvoiceNumberConfig) error
	GetStakeholders() ([]domain.StakeholderConfig, error)
	GetStakeholderByID(id uint) (*domain.StakeholderConfig, error)
	SaveStakeholder(config *domain.StakeholderConfig) error
}

type invoiceSignatureRepository struct {
	db *gorm.DB
}

// NewInvoiceSignatureRepository creates a new InvoiceSignatureRepository.
func NewInvoiceSignatureRepository(db *gorm.DB) InvoiceSignatureRepository {
	return &invoiceSignatureRepository{db: db}
}

func (r *invoiceSignatureRepository) FindByTypeAndRef(invoiceType, referenceID string) ([]domain.InvoiceSignature, error) {
	var sigs []domain.InvoiceSignature
	err := r.db.Where("invoice_type = ? AND reference_id = ?", invoiceType, referenceID).Find(&sigs).Error
	return sigs, err
}

func (r *invoiceSignatureRepository) CreateSignatures(sigs []domain.InvoiceSignature) error {
	for i := range sigs {
		if err := r.db.Create(&sigs[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *invoiceSignatureRepository) UpdateVerificationCode(invoiceType, referenceID, code, docDate string) error {
	return r.db.Model(&domain.InvoiceSignature{}).
		Where("invoice_type = ? AND reference_id = ?", invoiceType, referenceID).
		Updates(map[string]interface{}{
			"verification_code": code,
			"document_date":     docDate,
		}).Error
}

func (r *invoiceSignatureRepository) FindByVerificationCode(code string) ([]domain.InvoiceSignature, error) {
	var sigs []domain.InvoiceSignature
	err := r.db.Where("LOWER(verification_code) = LOWER(?)", code).Find(&sigs).Error
	return sigs, err
}

func (r *invoiceSignatureRepository) FindByShortCode(code string) ([]domain.InvoiceSignature, error) {
	var sigs []domain.InvoiceSignature
	err := r.db.Where("LOWER(short_code) = LOWER(?)", code).Find(&sigs).Error
	return sigs, err
}

func (r *invoiceSignatureRepository) GetInvoiceHistory(userIDStr string, roleID int, invoiceType, search, startDate, endDate string) ([]InvoiceHistoryItem, error) {
	query := r.db.Model(&domain.InvoiceSignature{}).
		Select("invoice_number, invoice_type, reference_id, amount, document_date, signed_at, verification_code, MAX(created_at) as latest_created_at").
		Group("invoice_number, invoice_type, reference_id, amount, document_date, signed_at, verification_code")

	if invoiceType != "" {
		query = query.Where("invoice_type = ?", invoiceType)
	}
	if search != "" {
		query = query.Where("(invoice_number LIKE ? OR verification_code LIKE ?)", "%"+search+"%", "%"+search+"%")
	}
	if startDate != "" {
		query = query.Where("document_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("document_date <= ?", endDate)
	}

	isAdmin := roleID == 1 || roleID == 2 || roleID == 3 || roleID == 8 || roleID == 9
	if !isAdmin {
		payrollSub := r.db.Table("payrolls").Select("CAST(id AS TEXT)").Where("user_id = ?", userIDStr)

		paymentSub := r.db.Table("payments").
			Select("CAST(payments.id AS TEXT)").
			Joins("JOIN bills ON payments.bill_id = bills.id").
			Joins("JOIN students ON bills.student_id = students.id").
			Joins("LEFT JOIN parents ON students.parent_id = parents.id").
			Where("students.user_id = ? OR parents.user_id = ?", userIDStr, userIDStr)

		savingsSub := r.db.Table("saving_transactions").
			Select("CAST(saving_transactions.id AS TEXT)").
			Joins("JOIN saving_accounts ON saving_transactions.account_id = saving_accounts.id").
			Joins("JOIN students ON saving_accounts.student_id = students.id").
			Joins("LEFT JOIN parents ON students.parent_id = parents.id").
			Where("students.user_id = ? OR parents.user_id = ?", userIDStr, userIDStr)

		query = query.Where("reference_id IN (?) OR reference_id IN (?) OR reference_id IN (?)", payrollSub, paymentSub, savingsSub)
	}

	var results []InvoiceHistoryItem
	err := query.Order("latest_created_at DESC").Scan(&results).Error
	return results, err
}

func (r *invoiceSignatureRepository) GetConfigs() ([]domain.InvoiceNumberConfig, error) {
	var configs []domain.InvoiceNumberConfig
	err := r.db.Order("invoice_type ASC").Find(&configs).Error
	if err != nil {
		return nil, err
	}

	if len(configs) == 0 {
		defaults := []domain.InvoiceNumberConfig{
			{InvoiceType: "Payroll", Prefix: "SG", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Slip Gaji", IsActive: true},
			{InvoiceType: "CashLedger", Prefix: "BK", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Bukti Kas", IsActive: true},
			{InvoiceType: "Bill", Prefix: "KP", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Kuitansi Pembayaran", IsActive: true},
			{InvoiceType: "Obligation", Prefix: "OB", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Kuitansi Tanggungan", IsActive: true},
			{InvoiceType: "Infaq", Prefix: "INF", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Bukti Infaq", IsActive: true},
			{InvoiceType: "Activity", Prefix: "KW", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Kwitansi Kegiatan", IsActive: true},
			{InvoiceType: "RKAS", Prefix: "RKAS", Separator: "/", IncludeDate: true, CounterLength: 3, CounterResetPeriod: "yearly", DisplayLabel: "Laporan RKAS", IsActive: true},
			{InvoiceType: "Debt", Prefix: "HT", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Bukti Bayar Hutang", IsActive: true},
			{InvoiceType: "Savings", Prefix: "TB", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Laporan Tabungan", IsActive: true},
			{InvoiceType: "StudentBill", Prefix: "ST", Separator: "-", IncludeDate: true, CounterLength: 4, CounterResetPeriod: "monthly", DisplayLabel: "Surat Tagihan", IsActive: true},
			{InvoiceType: "FinancialReport", Prefix: "LK", Separator: "/", IncludeDate: true, CounterLength: 3, CounterResetPeriod: "yearly", DisplayLabel: "Laporan Keuangan", IsActive: true},
		}
		for i := range defaults {
			r.db.Create(&defaults[i])
		}
		err = r.db.Order("invoice_type ASC").Find(&configs).Error
	}
	return configs, err
}

func (r *invoiceSignatureRepository) GetConfigByType(invoiceType string) (*domain.InvoiceNumberConfig, error) {
	var config domain.InvoiceNumberConfig
	err := r.db.Where("invoice_type = ? AND is_active = ?", invoiceType, true).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (r *invoiceSignatureRepository) SaveConfig(config *domain.InvoiceNumberConfig) error {
	return r.db.Save(config).Error
}

func (r *invoiceSignatureRepository) GetStakeholders() ([]domain.StakeholderConfig, error) {
	var configs []domain.StakeholderConfig
	err := r.db.Order("id ASC").Find(&configs).Error
	if err != nil {
		return nil, err
	}

	if len(configs) == 0 {
		defaults := []domain.StakeholderConfig{
			{Role: "chairman", DisplayLabel: "Ketua Yayasan", Name: "Ketua Yayasan PPI 100", IsActive: true},
			{Role: "treasurer", DisplayLabel: "Bendahara", Name: "Bendahara PPI 100", IsActive: true},
			{Role: "principal", DisplayLabel: "Kepala Sekolah", Name: "Kepala Sekolah SDIT", IsActive: true},
		}
		for i := range defaults {
			r.db.Create(&defaults[i])
		}
		err = r.db.Order("id ASC").Find(&configs).Error
	}
	return configs, err
}

func (r *invoiceSignatureRepository) SaveStakeholder(config *domain.StakeholderConfig) error {
	return r.db.Save(config).Error
}

// GetConfigByID fetches a config by primary key.
func (r *invoiceSignatureRepository) GetConfigByID(id uint) (*domain.InvoiceNumberConfig, error) {
	var config domain.InvoiceNumberConfig
	err := r.db.First(&config, id).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// GetStakeholderByID fetches a stakeholder by primary key.
func (r *invoiceSignatureRepository) GetStakeholderByID(id uint) (*domain.StakeholderConfig, error) {
	var config domain.StakeholderConfig
	err := r.db.First(&config, id).Error
	if err != nil {
		return nil, fmt.Errorf("stakeholder not found")
	}
	return &config, nil
}
