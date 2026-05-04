package routes

import (
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/delivery/http/handlers"
	"ppi-100-sis/internal/delivery/http/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterFinanceRoutes(
	rg *gin.RouterGroup,
	cfg *config.Config,
	financeHandler *handlers.FinanceHandler,
	midtransHandler *handlers.MidtransHandler,
	financeExtendedHandler *handlers.FinanceExtendedHandler,
	paymentTypeHandler *handlers.PaymentTypeHandler,
	studentObligationHandler *handlers.StudentObligationHandler,
	infaqTypeHandler *handlers.InfaqTypeHandler,
	payrollHandler *handlers.PayrollHandler,
	transactionCodeHandler *handlers.TransactionCodeHandler,
	budgetHandler *handlers.BudgetHandler,
	activityHandler *handlers.ActivityHandler,
	externalDebtHandler *handlers.ExternalDebtHandler,
	waTemplateHandler *handlers.WATemplateHandler,
	invoiceSignatureHandler *handlers.InvoiceSignatureHandler,
	schoolBankHandler *handlers.SchoolBankHandler,
) {
	finance := rg.Group("/finance")
	{
		// ── Billing (SPP & Tagihan) ──
		if cfg.FeatureBilling {
			finance.POST("/bills", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.CreateBill)
			finance.GET("/bills", middleware.RoleMiddleware(1, 2, 3, 6, 7, 8, 9, 11), financeHandler.GetAllBills)
			finance.PUT("/bills/:id", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.UpdateBill)
			finance.DELETE("/bills/:id", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.DeleteBill)
			finance.GET("/bills/:id", middleware.RoleMiddleware(1, 2, 3, 6, 7, 8, 9, 11), financeHandler.GetBillByID)

			// Payments
			finance.POST("/payments", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.RecordPayment)
			finance.GET("/payments/pending", middleware.RoleMiddleware(1, 9, 11), financeHandler.GetPendingPayments)
			finance.POST("/payments/:id/approve", middleware.RoleMiddleware(1, 9, 11), financeHandler.ApprovePayment)
			finance.PUT("/payments/:id", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.UpdatePayment)
			finance.DELETE("/payments/:id", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.DeletePayment)
			finance.POST("/payment-proof", financeHandler.UploadPaymentProof)
			finance.POST("/bills/batch", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.CreateBillBatch)
			finance.POST("/bills/multi-payment", middleware.RoleMiddleware(1, 2, 3, 6, 7, 9, 11), financeHandler.MultiPayment)

			// Bill Templates
			finance.POST("/templates", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.CreateBillTemplate)
			finance.GET("/templates", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.GetBillTemplates)
			finance.DELETE("/templates/:id", middleware.RoleMiddleware(1, 2, 3, 9, 11), financeHandler.DeleteBillTemplate)
		}

		// ── Midtrans ──
		if cfg.FeatureMidtrans {
			finance.POST("/midtrans/create-transaction", midtransHandler.CreateSnapTransaction)
			finance.POST("/midtrans/check-status", midtransHandler.CheckTransactionStatus)
		}

		// ── Academic Years (always available — needed for many modules) ──
		finance.POST("/academic-years", middleware.RoleMiddleware(1, 2, 3, 9), financeExtendedHandler.CreateAcademicYear)
		finance.GET("/academic-years", financeExtendedHandler.GetAllAcademicYears)
		finance.PUT("/academic-years/:id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.UpdateAcademicYear)
		finance.DELETE("/academic-years/:id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.DeleteAcademicYear)
		finance.PUT("/academic-years/:id/set-active", middleware.RoleMiddleware(1, 9), financeExtendedHandler.SetActiveAcademicYear)
		finance.POST("/academic-years/rollover", middleware.RoleMiddleware(1, 9), financeExtendedHandler.RolloverAcademicYear)

		// ── Student Obligations (Tanggungan Siswa) ──
		if cfg.FeatureStudentObligations {
			finance.POST("/payment-types", middleware.RoleMiddleware(1, 9, 11), paymentTypeHandler.Create)
			finance.GET("/payment-types", middleware.RoleMiddleware(1, 8, 9, 11), paymentTypeHandler.GetAll)
			finance.PUT("/payment-types/:id", middleware.RoleMiddleware(1, 9, 11), paymentTypeHandler.Update)
			finance.DELETE("/payment-types/:id", middleware.RoleMiddleware(1, 9, 11), paymentTypeHandler.Delete)

			finance.POST("/student-obligations", middleware.RoleMiddleware(1, 9, 11), studentObligationHandler.Create)
			finance.POST("/student-obligations/bulk-assign", middleware.RoleMiddleware(1, 9, 11), studentObligationHandler.BulkAssign)
			finance.GET("/student-obligations", middleware.RoleMiddleware(1, 8, 9, 11), studentObligationHandler.GetAll)
			finance.GET("/student-obligations/student/:student_id", middleware.RoleMiddleware(1, 6, 7, 8, 9, 11), studentObligationHandler.GetByStudentID)
			finance.PUT("/student-obligations/:id", middleware.RoleMiddleware(1, 9, 11), studentObligationHandler.Update)
			finance.DELETE("/student-obligations/:id", middleware.RoleMiddleware(1, 9, 11), studentObligationHandler.Delete)
			finance.POST("/student-obligations/:id/pay", middleware.RoleMiddleware(1, 9, 11), studentObligationHandler.RecordPayment)
		}

		// ── Savings (Tabungan Siswa) ──
		if cfg.FeatureSavings {
			finance.GET("/savings", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.GetAllSavingAccounts)
			finance.POST("/savings/transactions", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.ProcessSavingTransaction)
			finance.POST("/savings/transfer", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.TransferSavings)
			finance.GET("/savings/transactions/:account_id", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.GetSavingTransactions)
			finance.GET("/savings/my", middleware.RoleMiddleware(6, 7), financeExtendedHandler.GetMySavings)
			finance.GET("/savings/my-children", middleware.RoleMiddleware(7), financeExtendedHandler.GetMyChildrenSavings)
			finance.GET("/savings/student/:student_id", middleware.RoleMiddleware(1, 6, 7, 9, 10, 11), financeExtendedHandler.GetStudentSavings)

			// Savings Operational (Pool-level)
			finance.POST("/savings/operational/withdraw", middleware.RoleMiddleware(1, 9), financeExtendedHandler.WithdrawSavingsOperational)
			finance.POST("/savings/operational/return", middleware.RoleMiddleware(1, 9), financeExtendedHandler.ReturnSavingsOperational)
			finance.GET("/savings/operational/history", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.GetSavingsOperationalHistory)
			finance.GET("/savings/operational/returns/:withdrawal_id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.GetSavingsOperationalReturns)
			finance.GET("/savings/operational/summary", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.GetSavingsPoolSummary)
			finance.GET("/savings/recap", middleware.RoleMiddleware(1, 9, 10, 11), financeExtendedHandler.GetSavingsRecap)
		}

		// ── Cash Ledger (BKU) ──
		if cfg.FeatureCashLedger {
			finance.POST("/cash-ledger", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.AddCashLedgerEntry)
			finance.GET("/cash-ledger", middleware.RoleMiddleware(1, 8, 9, 11), financeExtendedHandler.GetCashLedger)
			finance.PUT("/cash-ledger/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.UpdateCashLedgerEntry)
			finance.DELETE("/cash-ledger/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.DeleteCashLedgerEntry)
		}

		// ── Infaq Harian ──
		if cfg.FeatureInfaq {
			finance.POST("/daily-infaq", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.AddDailyInfaqEntry)
			finance.GET("/daily-infaq", middleware.RoleMiddleware(1, 8, 9, 11), financeExtendedHandler.GetDailyInfaq)
			finance.PUT("/daily-infaq/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.UpdateDailyInfaqEntry)
			finance.DELETE("/daily-infaq/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.DeleteDailyInfaqEntry)

			finance.POST("/infaq-types", middleware.RoleMiddleware(1, 9, 11), infaqTypeHandler.Create)
			finance.GET("/infaq-types", middleware.RoleMiddleware(1, 8, 9, 11), infaqTypeHandler.GetAll)
			finance.PUT("/infaq-types/:id", middleware.RoleMiddleware(1, 9, 11), infaqTypeHandler.Update)
			finance.DELETE("/infaq-types/:id", middleware.RoleMiddleware(1, 9, 11), infaqTypeHandler.Delete)
		}

		// ── Payroll (Penggajian) ──
		if cfg.FeaturePayroll {
			finance.POST("/payroll", middleware.RoleMiddleware(1, 9), payrollHandler.CreatePayroll)
			finance.GET("/payroll", middleware.RoleMiddleware(1, 2, 3, 4, 5, 8, 9, 10, 11), payrollHandler.GetPayrolls)
			finance.PUT("/payroll/:id", middleware.RoleMiddleware(1, 9), payrollHandler.UpdatePayroll)
			finance.DELETE("/payroll/:id", middleware.RoleMiddleware(1, 9), payrollHandler.DeletePayroll)
			finance.POST("/payroll/:id/pay", middleware.RoleMiddleware(1, 9), payrollHandler.Pay)

			finance.GET("/payroll/templates", middleware.RoleMiddleware(1, 9), payrollHandler.GetTemplates)
			finance.GET("/payroll/templates/:userId", middleware.RoleMiddleware(1, 9), payrollHandler.GetTemplateByUserID)
			finance.POST("/payroll/templates", middleware.RoleMiddleware(1, 9), payrollHandler.UpsertTemplate)
		}

		// ── Dashboard Analytics ──
		finance.GET("/dashboard", middleware.RoleMiddleware(1, 8, 9), financeExtendedHandler.GetDashboardAnalytics)

		// ── Transaction Codes ──
		finance.POST("/transaction-codes", middleware.RoleMiddleware(1, 9, 11), transactionCodeHandler.Create)
		finance.GET("/transaction-codes", middleware.RoleMiddleware(1, 8, 9, 10, 11), transactionCodeHandler.GetAll)
		finance.PUT("/transaction-codes/:id", middleware.RoleMiddleware(1, 9, 11), transactionCodeHandler.Update)
		finance.DELETE("/transaction-codes/:id", middleware.RoleMiddleware(1, 9, 11), transactionCodeHandler.Delete)
		finance.GET("/global-transactions", middleware.RoleMiddleware(1, 8, 9, 10, 11), transactionCodeHandler.GetGlobalTransactions)

		// ── RKAS / RAB (Budgeting) ──
		if cfg.FeatureRKAS {
			finance.POST("/budget-categories", middleware.RoleMiddleware(1, 9), budgetHandler.CreateCategory)
			finance.GET("/budget-categories", middleware.RoleMiddleware(1, 8, 9), budgetHandler.GetAllCategories)
			finance.PUT("/budget-categories/:id", middleware.RoleMiddleware(1, 9), budgetHandler.UpdateCategory)
			finance.DELETE("/budget-categories/:id", middleware.RoleMiddleware(1, 9), budgetHandler.DeleteCategory)

			finance.POST("/budgets", middleware.RoleMiddleware(1, 9), budgetHandler.Create)
			finance.GET("/budgets", middleware.RoleMiddleware(1, 8, 9), budgetHandler.GetAll)
			finance.PUT("/budgets/:id", middleware.RoleMiddleware(1, 9), budgetHandler.Update)
			finance.DELETE("/budgets/:id", middleware.RoleMiddleware(1, 9), budgetHandler.Delete)
			finance.PUT("/budgets/:id/realize", middleware.RoleMiddleware(1, 9), budgetHandler.Realize)
			finance.GET("/budgets/summary", middleware.RoleMiddleware(1, 8, 9), budgetHandler.GetSummary)
		}

		// ── Activities (Kegiatan Siswa) ──
		if cfg.FeatureActivities {
			finance.POST("/activities", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.Create)
			finance.GET("/activities", middleware.RoleMiddleware(1, 4, 5, 8, 9, 11), activityHandler.GetAllByAcademicYear)
			finance.GET("/activities/:id", middleware.RoleMiddleware(1, 4, 5, 8, 9, 11), activityHandler.GetByID)
			finance.PUT("/activities/:id", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.Update)
			finance.DELETE("/activities/:id", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.Delete)
			finance.GET("/activities/:id/summary", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.GetSummary)
			finance.POST("/activities/:id/obligations/bulk-assign", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.BulkAssignClass)
			finance.POST("/activities/:id/obligations/assign-student", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.AssignStudent)
			finance.GET("/activities/:id/obligations", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.GetObligations)
			finance.DELETE("/activities/obligations/:ob_id", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.DeleteObligation)
			finance.POST("/activities/obligations/:ob_id/pay", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.RecordPayment)
			finance.POST("/activities/:id/transactions", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.CreateTransaction)
			finance.GET("/activities/:id/transactions", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.GetTransactions)
			finance.DELETE("/activities/transactions/:tx_id", middleware.RoleMiddleware(1, 8, 9, 11), activityHandler.DeleteTransaction)
		}

		// ── External Debts (Catatan Hutang) ──
		if cfg.FeatureExternalDebts {
			finance.GET("/debts", middleware.RoleMiddleware(1, 9), externalDebtHandler.GetAll)
			finance.POST("/debts", middleware.RoleMiddleware(1, 9), externalDebtHandler.Create)
			finance.PUT("/debts/:id", middleware.RoleMiddleware(1, 9), externalDebtHandler.Update)
			finance.DELETE("/debts/:id", middleware.RoleMiddleware(1, 9), externalDebtHandler.Delete)
			finance.GET("/debts/:id/payments", middleware.RoleMiddleware(1, 9), externalDebtHandler.GetPayments)
			finance.POST("/debts/:id/pay", middleware.RoleMiddleware(1, 9), externalDebtHandler.RecordPayment)
		}

		// ── WA Templates ──
		if cfg.FeatureWAGateway {
			finance.POST("/wa-templates", middleware.RoleMiddleware(1, 9, 11), waTemplateHandler.Create)
			finance.GET("/wa-templates", middleware.RoleMiddleware(1, 9, 11), waTemplateHandler.GetAll)
			finance.PUT("/wa-templates/:id", middleware.RoleMiddleware(1, 9, 11), waTemplateHandler.Update)
			finance.DELETE("/wa-templates/:id", middleware.RoleMiddleware(1, 9, 11), waTemplateHandler.Delete)
		}

		// ── Invoice Signatures & Config (always available) ──
		finance.POST("/invoice/sign", middleware.RoleMiddleware(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11), invoiceSignatureHandler.SignInvoice)
		finance.GET("/invoice/number", middleware.RoleMiddleware(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11), invoiceSignatureHandler.GenerateNumber)
		finance.GET("/invoice/history", invoiceSignatureHandler.GetInvoiceHistory)
		finance.GET("/invoice-configs", middleware.RoleMiddleware(1, 9, 11), invoiceSignatureHandler.GetInvoiceConfigs)
		finance.PUT("/invoice-configs/:id", middleware.RoleMiddleware(1, 9, 11), invoiceSignatureHandler.UpdateInvoiceConfig)
		finance.POST("/invoice-configs/:id/reset", middleware.RoleMiddleware(1, 9, 11), invoiceSignatureHandler.ResetCounter)
		finance.GET("/stakeholders", middleware.RoleMiddleware(1, 9, 11), invoiceSignatureHandler.GetStakeholders)
		finance.PUT("/stakeholders/:id", middleware.RoleMiddleware(1, 9, 11), invoiceSignatureHandler.UpdateStakeholder)

		// ── School Bank Accounts ──
		finance.GET("/bank-accounts", middleware.RoleMiddleware(1, 2, 3, 9), schoolBankHandler.GetAll)
		finance.POST("/bank-accounts", middleware.RoleMiddleware(1, 9), schoolBankHandler.Create)
		finance.PUT("/bank-accounts/:id", middleware.RoleMiddleware(1, 9), schoolBankHandler.Update)
		finance.DELETE("/bank-accounts/:id", middleware.RoleMiddleware(1, 9), schoolBankHandler.Delete)
		finance.PUT("/bank-accounts/:id/primary", middleware.RoleMiddleware(1, 9), schoolBankHandler.SetPrimary)
	}
}
