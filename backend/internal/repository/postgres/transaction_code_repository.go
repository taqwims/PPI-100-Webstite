package postgres

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"time"

	"gorm.io/gorm"
)

type TransactionCodeRepository struct {
	db *gorm.DB
}

func NewTransactionCodeRepository(db *gorm.DB) *TransactionCodeRepository {
	return &TransactionCodeRepository{db: db}
}

// ------------------- Transaction Code CRUD -------------------

func (r *TransactionCodeRepository) Create(tc *domain.TransactionCode) error {
	return r.db.Create(tc).Error
}

func (r *TransactionCodeRepository) GetAll() ([]domain.TransactionCode, error) {
	var codes []domain.TransactionCode
	if err := r.db.Preload("ParentCode").Preload("Children").Order("code asc").Find(&codes).Error; err != nil {
		return nil, err
	}
	return codes, nil
}

func (r *TransactionCodeRepository) GetByID(id uint) (*domain.TransactionCode, error) {
	var tc domain.TransactionCode
	if err := r.db.Preload("ParentCode").Preload("Children").First(&tc, id).Error; err != nil {
		return nil, err
	}
	return &tc, nil
}

func (r *TransactionCodeRepository) Update(tc *domain.TransactionCode) error {
	return r.db.Model(&domain.TransactionCode{}).Where("id = ?", tc.ID).Updates(map[string]interface{}{
		"code":           tc.Code,
		"name":           tc.Name,
		"type":           tc.Type,
		"category":       tc.Category,
		"description":    tc.Description,
		"parent_code_id": tc.ParentCodeID,
		"is_active":      tc.IsActive,
	}).Error
}

func (r *TransactionCodeRepository) Delete(id uint) error {
	return r.db.Delete(&domain.TransactionCode{}, "id = ?", id).Error
}

func (r *TransactionCodeRepository) GetLastCodeByPrefix(prefix string) (string, error) {
	var tc domain.TransactionCode
	err := r.db.Where("code LIKE ?", prefix+"%").
		Order("LENGTH(code) DESC, code DESC").
		First(&tc).Error
	if err != nil {
		return "", err
	}
	return tc.Code, nil
}

// ------------------- Global Transactions (Super Table) -------------------

type GlobalTransaction struct {
	Date        time.Time `json:"date"`
	Source      string    `json:"source"`
	Description string    `json:"description"`
	Type        string    `json:"type"`   // Income, Expense
	Amount      float64   `json:"amount"`
	Category    string    `json:"category"`
	Code        string    `json:"code"`
	CodeName    string    `json:"code_name"`
	Module      string    `json:"module"` // Bill, CashLedger, DailyInfaq, Payroll
}

func (r *TransactionCodeRepository) GetGlobalTransactions(startDate, endDate string, category string, codeID uint) ([]GlobalTransaction, error) {
	var results []GlobalTransaction

	// Build filters
	dateArgs := []interface{}{}
	dateFilter := ""
	if startDate != "" && endDate != "" {
		dateFilter = " AND t.date BETWEEN ? AND ?"
		start, _ := time.Parse("2006-01-02", startDate)
		end, _ := time.Parse("2006-01-02", endDate)
		end = end.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		dateArgs = append(dateArgs, start, end)
	}

	categoryFilter := ""
	if category != "" {
		categoryFilter = " AND t.category = ?"
		dateArgs = append(dateArgs, category)
	}

	codeFilter := ""
	if codeID > 0 {
		codeFilter = " AND t.code_id = ?"
		dateArgs = append(dateArgs, codeID)
	}

	query := fmt.Sprintf(`
		SELECT t.date, t.source, t.description, t.type, t.amount, t.category,
		       COALESCE(tc.code, '') as code, COALESCE(tc.name, '') as code_name, t.module
		FROM (
			SELECT cl.date, cl.source, cl.item_name as description, cl.type, cl.amount,
			       cl.category, CAST(cl.transaction_code_id AS INTEGER) as code_id, 'CashLedger' as module
			FROM cash_ledgers cl

			UNION ALL

			SELECT di.date, di.source, COALESCE(di.notes, 'Infaq') as description, di.type, di.amount,
			       'Infaq' as category, CAST(di.transaction_code_id AS INTEGER) as code_id, 'DailyInfaq' as module
			FROM daily_infaqs di

			UNION ALL

			SELECT p.paid_at as date, COALESCE(u.name, 'Siswa') as source, b.title as description,
			       'Income' as type, p.amount, COALESCE(b.bill_type, 'SPP') as category,
			       CAST(b.transaction_code_id AS INTEGER) as code_id, 'Bill' as module
			FROM payments p
			JOIN bills b ON p.bill_id = b.id
			LEFT JOIN students s ON b.student_id = s.id
			LEFT JOIN users u ON s.user_id = u.id
			WHERE p.status = 'Success'

			UNION ALL

			SELECT pr.paid_at as date, u.name as source,
			       CONCAT('Gaji ', pr.period_month, '/', pr.period_year) as description,
			       'Expense' as type, pr.net_salary as amount, 'Gaji' as category,
			       0 as code_id, 'Payroll' as module
			FROM payrolls pr
			LEFT JOIN users u ON pr.user_id = u.id
			WHERE pr.status = 'Paid'

			UNION ALL

			SELECT at2.date, COALESCE(u2.name, 'Siswa') as source,
			       CONCAT(a.name, ' - ', at2.description) as description,
			       at2.transaction_type as type, at2.amount, 'Kegiatan' as category,
			       0 as code_id, 'Activity' as module
			FROM activity_transactions at2
			JOIN activities a ON at2.activity_id = a.id
			LEFT JOIN users u2 ON at2.created_by_id = u2.id

			UNION ALL

			SELECT st.date, COALESCE(u3.name, 'Siswa') as source,
			       CONCAT('Tabungan: ', st.description) as description,
			       st.type, st.amount, 'Tabungan' as category,
			       0 as code_id, 'Savings' as module
			FROM savings_transactions st
			LEFT JOIN savings sv ON st.savings_id = sv.id
			LEFT JOIN students s3 ON sv.student_id = s3.id
			LEFT JOIN users u3 ON s3.user_id = u3.id

			UNION ALL

			SELECT so.paid_at as date, COALESCE(u4.name, 'Siswa') as source,
			       CONCAT('Tagihan: ', pt.name) as description,
			       'Income' as type, so.paid_amount as amount, 'Tanggungan' as category,
			       0 as code_id, 'Obligation' as module
			FROM student_obligations so
			JOIN payment_types pt ON so.payment_type_id = pt.id
			LEFT JOIN students s4 ON so.student_id = s4.id
			LEFT JOIN users u4 ON s4.user_id = u4.id
			WHERE so.status IN ('Paid', 'Partial') AND so.paid_amount > 0
		) t
		LEFT JOIN transaction_codes tc ON t.code_id = tc.id
		WHERE 1=1 %s %s %s
		ORDER BY t.date DESC
		LIMIT 500
	`, dateFilter, categoryFilter, codeFilter)

	if err := r.db.Raw(query, dateArgs...).Scan(&results).Error; err != nil {
		return nil, err
	}

	return results, nil
}
