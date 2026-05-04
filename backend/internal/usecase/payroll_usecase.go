package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"
)

type PayrollUsecase struct {
	payrollRepo *postgres.PayrollRepository
	userRepo    *postgres.UserRepository
	financeRepo *postgres.FinanceRepository
}

func NewPayrollUsecase(payrollRepo *postgres.PayrollRepository, userRepo *postgres.UserRepository, financeRepo *postgres.FinanceRepository) *PayrollUsecase {
	return &PayrollUsecase{
		payrollRepo: payrollRepo,
		userRepo:    userRepo,
		financeRepo: financeRepo,
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
	payroll.Status = "Draft"
	return u.payrollRepo.CreatePayroll(payroll)
}

func (u *PayrollUsecase) UpdatePayroll(id string, input *domain.Payroll) error {
	existing, err := u.payrollRepo.GetPayrollByID(id)
	if err != nil {
		return err
	}

	if existing.Status == "Paid" {
		return errors.New("cannot update a payroll that is already paid")
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
	existing, err := u.payrollRepo.GetPayrollByID(id)
	if err != nil {
		return err
	}
	if existing.Status == "Paid" {
		return errors.New("cannot delete a payroll that is already paid")
	}
	return u.payrollRepo.DeletePayroll(id)
}

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

	if err := u.payrollRepo.UpdatePayroll(existing); err != nil {
		return err
	}

	// Otomatis masukkan pengeluaran ke buku kas (CashLedger)
	cashLedgerEntry := domain.CashLedger{
		Date:     now,
		Source:   "TATA USAHA",
		ItemName: "Pembayaran Gaji - " + existing.EmployeeName,
		Type:     "Expense",
		Amount:   existing.NetSalary,
		Category: "Gaji Pegawai",
	}
	_ = u.financeRepo.AddCashLedgerEntry(&cashLedgerEntry)

	return nil
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
