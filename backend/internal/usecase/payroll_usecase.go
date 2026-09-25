package usecase

import (
	"errors"
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"
)

type PayrollUsecase struct {
	payrollRepo *postgres.PayrollRepository
	userRepo    *postgres.UserRepository
	financeRepo *postgres.FinanceRepository
	budgetRepo  *postgres.BudgetRepository
	tcRepo      *postgres.TransactionCodeRepository
}

func NewPayrollUsecase(
	payrollRepo *postgres.PayrollRepository,
	userRepo *postgres.UserRepository,
	financeRepo *postgres.FinanceRepository,
	budgetRepo *postgres.BudgetRepository,
	tcRepo *postgres.TransactionCodeRepository,
) *PayrollUsecase {
	return &PayrollUsecase{
		payrollRepo: payrollRepo,
		userRepo:    userRepo,
		financeRepo: financeRepo,
		budgetRepo:  budgetRepo,
		tcRepo:      tcRepo,
	}
}

func (u *PayrollUsecase) CalculateTotals(payroll *domain.Payroll) {
	fixedIncome := payroll.BaseSalary + payroll.FunctionalAllowance + payroll.TransportAllowance + payroll.AdditionalTask
	var customIncome float64
	for _, item := range payroll.CustomIncomeItems {
		customIncome += item.Amount
	}
	payroll.TotalIncome = fixedIncome + customIncome

	fixedDeduction := payroll.LatenessPenalty + payroll.InfaqDeduction + payroll.CashAdvance
	var customDeduction float64
	for _, item := range payroll.CustomDeductionItems {
		customDeduction += item.Amount
	}
	payroll.TotalDeduction = fixedDeduction + customDeduction

	payroll.NetSalary = payroll.TotalIncome - payroll.TotalDeduction
}

func (u *PayrollUsecase) GetPayrolls(month, year int, userID string) ([]domain.Payroll, error) {
	return u.payrollRepo.GetPayrolls(month, year, userID)
}

func (u *PayrollUsecase) CreatePayroll(payroll *domain.Payroll) error {
	// Atur nama jika kosong
	if user, err := u.userRepo.FindByID(payroll.UserID.String()); err == nil {
		if payroll.EmployeeName == "" {
			payroll.EmployeeName = user.Name
		}
	}
	u.CalculateTotals(payroll)
	if payroll.Status == "" {
		payroll.Status = "Draft"
	}
	if payroll.Status == "Paid" && payroll.PaidAt == nil {
		now := time.Now()
		payroll.PaidAt = &now
	}
	return u.payrollRepo.CreatePayroll(payroll)
}

func (u *PayrollUsecase) UpdatePayroll(id string, input *domain.Payroll) error {
	existing, err := u.payrollRepo.GetPayrollByID(id)
	if err != nil {
		return err
	}

	// Update fields
	existing.BaseSalary = input.BaseSalary
	existing.FunctionalAllowance = input.FunctionalAllowance
	existing.TransportAllowance = input.TransportAllowance
	existing.AdditionalTask = input.AdditionalTask

	existing.LatenessPenalty = input.LatenessPenalty
	existing.InfaqDeduction = input.InfaqDeduction
	existing.CashAdvance = input.CashAdvance

	existing.EmployeeName = input.EmployeeName
	existing.EmployeeNIK = input.EmployeeNIK
	existing.Position = input.Position
	existing.Notes = input.Notes

	if input.Status != "" {
		existing.Status = input.Status
		if input.Status == "Paid" && existing.PaidAt == nil {
			now := time.Now()
			existing.PaidAt = &now
		} else if input.Status == "Draft" {
			existing.PaidAt = nil
		}
	}

	existing.PaymentMethod = input.PaymentMethod
	existing.BankName = input.BankName
	existing.BankAccountNumber = input.BankAccountNumber
	existing.BankAccountHolder = input.BankAccountHolder

	existing.CustomIncomeItems = input.CustomIncomeItems
	existing.CustomDeductionItems = input.CustomDeductionItems

	u.CalculateTotals(existing)
	return u.payrollRepo.UpdatePayroll(existing)
}

func (u *PayrollUsecase) DeletePayroll(id string) error {
	return u.payrollRepo.DeletePayroll(id)
}

// Pay marks a single payroll as Paid without automatically creating individual BKU entries
func (u *PayrollUsecase) Pay(id string) error {
	existing, err := u.payrollRepo.GetPayrollByID(id)
	if err != nil {
		return err
	}
	if existing.Status == "Paid" {
		return errors.New("payroll is already paid")
	}

	now := time.Now()
	existing.Status = "Paid"
	existing.PaidAt = &now

	return u.payrollRepo.UpdatePayroll(existing)
}

// PostPayrollToBKU consolidates all Paid payrolls in the given period into ONE single transaction in BKU
func (u *PayrollUsecase) PostPayrollToBKU(month, year int, fundSource string) (*domain.CashLedger, error) {
	if month < 1 || month > 12 || year < 2000 {
		return nil, errors.New("periode bulan dan tahun tidak valid")
	}

	payrolls, err := u.payrollRepo.GetPayrolls(month, year, "")
	if err != nil {
		return nil, err
	}

	var paidPayrolls []domain.Payroll
	var totalPaidNetSalary float64
	for _, p := range payrolls {
		if p.Status == "Paid" {
			paidPayrolls = append(paidPayrolls, p)
			totalPaidNetSalary += p.NetSalary
		}
	}

	if len(paidPayrolls) == 0 {
		return nil, errors.New("tidak ada data gaji dengan status Lunas untuk periode ini")
	}

	if fundSource == "" {
		fundSource = "TATA USAHA"
	}

	monthNames := []string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}
	monthName := fmt.Sprintf("Bulan %d", month)
	if month >= 1 && month <= 12 {
		monthName = monthNames[month-1]
	}

	// Cari kode transaksi untuk Gaji Pegawai
	var gajiTCID *uint
	if u.tcRepo != nil {
		codes, _ := u.tcRepo.GetAll()
		for _, tc := range codes {
			if tc.Category == "Gaji" || tc.Name == "Gaji" || tc.Code == "B1" {
				gajiTCID = &tc.ID
				break
			}
		}
	}

	itemName := fmt.Sprintf("Pembayaran Total Gaji Pegawai & Guru Periode %s %d", monthName, year)

	// Cek apakah sudah pernah diposting transaksi dengan nama item ini
	if u.financeRepo != nil {
		if existing, err := u.financeRepo.GetCashLedgerByItemName(itemName); err == nil && existing != nil {
			return nil, fmt.Errorf("gaji periode %s %d sudah pernah diposting ke BKU pada %s (Nominal: Rp %.0f)", monthName, year, existing.Date.Format("02/01/2006"), existing.Amount)
		}
	}

	now := time.Now()
	cashLedgerEntry := domain.CashLedger{
		Date:              now,
		Source:            fundSource,
		FundSource:        fundSource,
		ItemName:          itemName,
		Type:              "Expense",
		Amount:            totalPaidNetSalary,
		Category:          "Gaji Pegawai",
		TransactionCodeID: gajiTCID,
		Notes:             fmt.Sprintf("Rekapitulasi pembayaran gaji %d pegawai lunas (Periode %s %d)", len(paidPayrolls), monthName, year),
	}

	if err := u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry); err != nil {
		return nil, err
	}

	// Realisasi pos anggaran belanja gaji di RKAS
	if gajiTCID != nil && u.budgetRepo != nil {
		_ = u.budgetRepo.AddRealizationByTransactionCodeID(*gajiTCID, totalPaidNetSalary, month)
	}

	return &cashLedgerEntry, nil
}

// GetBKUPostingStatus checks if the given period has been posted to BKU
func (u *PayrollUsecase) GetBKUPostingStatus(month, year int) (bool, *domain.CashLedger, error) {
	monthNames := []string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}
	monthName := fmt.Sprintf("Bulan %d", month)
	if month >= 1 && month <= 12 {
		monthName = monthNames[month-1]
	}
	itemName := fmt.Sprintf("Pembayaran Total Gaji Pegawai & Guru Periode %s %d", monthName, year)

	if u.financeRepo != nil {
		if existing, err := u.financeRepo.GetCashLedgerByItemName(itemName); err == nil && existing != nil {
			return true, existing, nil
		}
	}
	return false, nil, nil
}

func (u *PayrollUsecase) GetPayrollTemplates() ([]domain.PayrollTemplate, error) {
	return u.payrollRepo.GetPayrollTemplates()
}

func (u *PayrollUsecase) GetPayrollTemplateByUserID(userID string) (*domain.PayrollTemplate, error) {
	return u.payrollRepo.GetPayrollTemplateByUserID(userID)
}

func (u *PayrollUsecase) UpsertPayrollTemplate(template *domain.PayrollTemplate) error {
	return u.payrollRepo.UpsertPayrollTemplate(template)
}
