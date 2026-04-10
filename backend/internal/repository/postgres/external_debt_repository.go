package postgres

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExternalDebtRepository interface {
	GetAll() ([]domain.ExternalDebt, error)
	Create(debt *domain.ExternalDebt) error
	GetByID(id string) (*domain.ExternalDebt, error)
	Update(debt *domain.ExternalDebt, updates map[string]interface{}) error
	Delete(id string) error
	GetPayments(debtID string) ([]domain.ExternalDebtPayment, error)
	RecordPaymentTx(debt *domain.ExternalDebt, payment *domain.ExternalDebtPayment, fundSource string) error
	RecalcStatus(debt *domain.ExternalDebt) error
}

type externalDebtRepository struct {
	db *gorm.DB
}

func NewExternalDebtRepository(db *gorm.DB) ExternalDebtRepository {
	return &externalDebtRepository{db: db}
}

func (r *externalDebtRepository) GetAll() ([]domain.ExternalDebt, error) {
	var debts []domain.ExternalDebt
	if err := r.db.Preload("CreatedBy").Order("created_at DESC").Find(&debts).Error; err != nil {
		return nil, err
	}
	return debts, nil
}

func (r *externalDebtRepository) Create(debt *domain.ExternalDebt) error {
	if err := r.db.Create(debt).Error; err != nil {
		return err
	}
	return r.db.Preload("CreatedBy").First(debt, "id = ?", debt.ID).Error
}

func (r *externalDebtRepository) GetByID(id string) (*domain.ExternalDebt, error) {
	var debt domain.ExternalDebt
	if err := r.db.First(&debt, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("%w: external debt id %s", domain.ErrNotFound, id)
		}
		return nil, err
	}
	return &debt, nil
}

func (r *externalDebtRepository) Update(debt *domain.ExternalDebt, updates map[string]interface{}) error {
	if err := r.db.Model(debt).Updates(updates).Error; err != nil {
		return err
	}
	return r.RecalcStatus(debt)
}

func (r *externalDebtRepository) Delete(id string) error {
	// Hapus semua pembayaran terlebih dahulu
	r.db.Where("debt_id = ?", id).Delete(&domain.ExternalDebtPayment{})
	result := r.db.Delete(&domain.ExternalDebt{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("%w: external debt id %s", domain.ErrNotFound, id)
	}
	return nil
}

func (r *externalDebtRepository) GetPayments(debtID string) ([]domain.ExternalDebtPayment, error) {
	var payments []domain.ExternalDebtPayment
	if err := r.db.Preload("PaidBy").Where("debt_id = ?", debtID).Order("created_at DESC").Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

// RecordPaymentTx mencatat pembayaran hutang dalam satu database transaction,
// termasuk update status hutang dan pencatatan di BKU/Infaq.
func (r *externalDebtRepository) RecordPaymentTx(debt *domain.ExternalDebt, payment *domain.ExternalDebtPayment, fundSource string) error {
	tx := r.db.Begin()
	defer func() {
		if rec := recover(); rec != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(payment).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("gagal mencatat pembayaran: %w", err)
	}

	// Update status hutang
	debt.PaidAmount += payment.Amount
	if debt.PaidAmount >= debt.Amount {
		debt.Status = "Paid"
	} else {
		debt.Status = "Partial"
	}
	if err := tx.Save(debt).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("gagal update status hutang: %w", err)
	}

	// Catat di BKU atau Infaq sesuai sumber dana
	now := time.Now()
	if fundSource == "Kas Umum" {
		bku := domain.CashLedger{
			Date:     now,
			Source:   "Pembayaran Hutang",
			ItemName: "Bayar Hutang: " + debt.CreditorName + " — " + debt.Description,
			Type:     "Expense",
			Amount:   payment.Amount,
			Category: "Hutang",
			Notes:    payment.Notes,
		}
		if err := tx.Create(&bku).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("gagal catat BKU: %w", err)
		}
	} else if fundSource == "Infaq" {
		infaq := domain.DailyInfaq{
			Date:        now,
			Source:      "Pembayaran Hutang — " + debt.CreditorName,
			Type:        "Expense",
			Amount:      payment.Amount,
			HandledByID: payment.PaidByID,
			FundSource:  "Infaq",
			Notes:       "Bayar hutang: " + debt.Description + ". " + payment.Notes,
		}
		if err := tx.Create(&infaq).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("gagal catat Infaq: %w", err)
		}
	}

	return tx.Commit().Error
}

func (r *externalDebtRepository) RecalcStatus(debt *domain.ExternalDebt) error {
	var totalPaid float64
	r.db.Model(&domain.ExternalDebtPayment{}).Where("debt_id = ?", debt.ID).Select("COALESCE(SUM(amount), 0)").Scan(&totalPaid)
	debt.PaidAmount = totalPaid
	if totalPaid >= debt.Amount {
		debt.Status = "Paid"
	} else if totalPaid > 0 {
		debt.Status = "Partial"
	} else {
		debt.Status = "Unpaid"
	}
	return r.db.Save(debt).Error
}

// Pastikan uuid digunakan
var _ = uuid.UUID{}
