package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"strconv"
	"time"

	"github.com/google/uuid"
)

type StudentObligationUsecase struct {
	repo           *postgres.StudentObligationRepository
	paymentRepo    *postgres.PaymentTypeRepository
	financeUsecase *FinanceUsecase
	financeRepo    *postgres.FinanceRepository
}

func NewStudentObligationUsecase(repo *postgres.StudentObligationRepository, paymentRepo *postgres.PaymentTypeRepository, financeUsecase *FinanceUsecase, financeRepo *postgres.FinanceRepository) *StudentObligationUsecase {
	return &StudentObligationUsecase{repo: repo, paymentRepo: paymentRepo, financeUsecase: financeUsecase, financeRepo: financeRepo}
}

func (u *StudentObligationUsecase) Create(ob *domain.StudentObligation) error {
	pt, err := u.paymentRepo.GetByID(ob.PaymentTypeID)
	if err != nil {
		return err
	}
	ob.Amount = pt.Amount
	ob.PaidAmount = 0
	ob.Status = "Unpaid"
	err = u.repo.Create(ob)
	if err == nil {
		dueDate := time.Now().AddDate(0, 1, 0) // Default 1 month due date
		obID := ob.ID
		_ = u.financeUsecase.CreateBill(ob.StudentID, pt.Name, pt.Amount, dueDate, pt.Name, &ob.AcademicYearID, nil, false, &obID, nil)
	}
	return err
}

// BulkAssign creates obligations for all students in a class based on a payment type
// For Bulanan: creates one obligation per selected month (up to 12)
// For Tahunan with installments: creates N installment obligations
// For others: creates a single obligation
func (u *StudentObligationUsecase) BulkAssign(classID uint, paymentTypeID uint, academicYearID uint, selectedMonths []int, installmentCount int) (int, error) {
	// Get payment type to determine amount and schedule
	pt, err := u.paymentRepo.GetByID(paymentTypeID)
	if err != nil {
		return 0, err
	}

	// Get all active students in the class
	students, err := u.repo.GetStudentsByClassID(classID)
	if err != nil {
		return 0, err
	}

	if len(students) == 0 {
		return 0, nil
	}

	var obligations []domain.StudentObligation
	now := time.Now()

	for _, student := range students {
		switch pt.PaymentSchedule {
		case "Bulanan":
			// Generate one obligation per selected month
			months := selectedMonths
			if len(months) == 0 {
				// Default: all 12 months
				months = []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
			}
			for _, month := range months {
				// Due date: 10th of each billing month, based on academic year
				dueDate := time.Date(now.Year(), time.Month(month), 10, 0, 0, 0, 0, time.Local)
				// If month is before current month, assume next year
				if dueDate.Before(now) {
					dueDate = dueDate.AddDate(1, 0, 0)
				}
				obligations = append(obligations, domain.StudentObligation{
					StudentID:      student.ID,
					PaymentTypeID:  paymentTypeID,
					AcademicYearID: academicYearID,
					Amount:         pt.Amount,
					PaidAmount:     0,
					Status:         "Unpaid",
					BillingMonth:   month,
					DueDate:        &dueDate,
				})
			}

		case "Tahunan":
			if installmentCount > 1 {
				// Split into N installments
				installmentAmount := pt.Amount / float64(installmentCount)
				for i := 1; i <= installmentCount; i++ {
					dueDate := now.AddDate(0, i*3, 0) // Every 3 months by default
					obligations = append(obligations, domain.StudentObligation{
						StudentID:         student.ID,
						PaymentTypeID:     paymentTypeID,
						AcademicYearID:    academicYearID,
						Amount:            installmentAmount,
						PaidAmount:        0,
						Status:            "Unpaid",
						InstallmentNumber: i,
						TotalInstallments: installmentCount,
						DueDate:           &dueDate,
					})
				}
			} else {
				// Single yearly obligation
				dueDate := now.AddDate(0, 1, 0)
				obligations = append(obligations, domain.StudentObligation{
					StudentID:      student.ID,
					PaymentTypeID:  paymentTypeID,
					AcademicYearID: academicYearID,
					Amount:         pt.Amount,
					PaidAmount:     0,
					Status:         "Unpaid",
					DueDate:        &dueDate,
				})
			}

		default:
			// Semesteran, Bertahap — single obligation
			dueDate := now.AddDate(0, 1, 0)
			obligations = append(obligations, domain.StudentObligation{
				StudentID:      student.ID,
				PaymentTypeID:  paymentTypeID,
				AcademicYearID: academicYearID,
				Amount:         pt.Amount,
				PaidAmount:     0,
				Status:         "Unpaid",
				DueDate:        &dueDate,
			})
		}
	}

	if len(obligations) == 0 {
		return 0, nil
	}

	if err := u.repo.BulkCreate(obligations); err != nil {
		return 0, err
	}

	// Create bills with obligation links
	for i, ob := range obligations {
		if i < len(obligations) {
			obID := ob.ID
			var billDueDate time.Time
			if ob.DueDate != nil {
				billDueDate = *ob.DueDate
			} else {
				billDueDate = now.AddDate(0, 1, 0)
			}

			// Build title
			title := pt.Name
			if ob.BillingMonth > 0 {
				monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
				title = pt.Name + " - " + monthNames[ob.BillingMonth]
			} else if ob.TotalInstallments > 0 {
				title = pt.Name + " - Cicilan " + strconv.Itoa(ob.InstallmentNumber) + "/" + strconv.Itoa(ob.TotalInstallments)
			}

			_ = u.financeUsecase.CreateBill(ob.StudentID, title, ob.Amount, billDueDate, pt.Name, &academicYearID, nil, false, &obID, nil)
		}
	}

	return len(obligations), nil
}

// AssignToStudents is similar to BulkAssign but for a specific list of student IDs
func (u *StudentObligationUsecase) AssignToStudents(studentIDs []uuid.UUID, paymentTypeID uint, academicYearID uint, selectedMonths []int, installmentCount int) (int, error) {
	// Get payment type to determine amount and schedule
	pt, err := u.paymentRepo.GetByID(paymentTypeID)
	if err != nil {
		return 0, err
	}

	if len(studentIDs) == 0 {
		return 0, nil
	}

	var obligations []domain.StudentObligation
	now := time.Now()

	for _, studentID := range studentIDs {
		switch pt.PaymentSchedule {
		case "Bulanan":
			months := selectedMonths
			if len(months) == 0 {
				months = []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
			}
			for _, month := range months {
				dueDate := time.Date(now.Year(), time.Month(month), 10, 0, 0, 0, 0, time.Local)
				if dueDate.Before(now) {
					dueDate = dueDate.AddDate(1, 0, 0)
				}
				obligations = append(obligations, domain.StudentObligation{
					StudentID:      studentID,
					PaymentTypeID:  paymentTypeID,
					AcademicYearID: academicYearID,
					Amount:         pt.Amount,
					PaidAmount:     0,
					Status:         "Unpaid",
					BillingMonth:   month,
					DueDate:        &dueDate,
				})
			}

		case "Tahunan":
			if installmentCount > 1 {
				installmentAmount := pt.Amount / float64(installmentCount)
				for i := 1; i <= installmentCount; i++ {
					dueDate := now.AddDate(0, i*3, 0)
					obligations = append(obligations, domain.StudentObligation{
						StudentID:         studentID,
						PaymentTypeID:     paymentTypeID,
						AcademicYearID:    academicYearID,
						Amount:            installmentAmount,
						PaidAmount:        0,
						Status:            "Unpaid",
						InstallmentNumber: i,
						TotalInstallments: installmentCount,
						DueDate:           &dueDate,
					})
				}
			} else {
				dueDate := now.AddDate(0, 1, 0)
				obligations = append(obligations, domain.StudentObligation{
					StudentID:      studentID,
					PaymentTypeID:  paymentTypeID,
					AcademicYearID: academicYearID,
					Amount:         pt.Amount,
					PaidAmount:     0,
					Status:         "Unpaid",
					DueDate:        &dueDate,
				})
			}

		default:
			dueDate := now.AddDate(0, 1, 0)
			obligations = append(obligations, domain.StudentObligation{
				StudentID:      studentID,
				PaymentTypeID:  paymentTypeID,
				AcademicYearID: academicYearID,
				Amount:         pt.Amount,
				PaidAmount:     0,
				Status:         "Unpaid",
				DueDate:        &dueDate,
			})
		}
	}

	if len(obligations) == 0 {
		return 0, nil
	}

	if err := u.repo.BulkCreate(obligations); err != nil {
		return 0, err
	}

	for i, ob := range obligations {
		if i < len(obligations) {
			obID := ob.ID
			var billDueDate time.Time
			if ob.DueDate != nil {
				billDueDate = *ob.DueDate
			} else {
				billDueDate = now.AddDate(0, 1, 0)
			}

			title := pt.Name
			if ob.BillingMonth > 0 {
				monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
				title = pt.Name + " - " + monthNames[ob.BillingMonth]
			} else if ob.TotalInstallments > 0 {
				title = pt.Name + " - Cicilan " + strconv.Itoa(ob.InstallmentNumber) + "/" + strconv.Itoa(ob.TotalInstallments)
			}

			_ = u.financeUsecase.CreateBill(ob.StudentID, title, ob.Amount, billDueDate, pt.Name, &academicYearID, nil, false, &obID, nil)
		}
	}

	return len(obligations), nil
}

func (u *StudentObligationUsecase) GetAll(academicYearID uint, classID uint) ([]domain.StudentObligation, error) {
	return u.repo.GetAll(academicYearID, classID)
}

func (u *StudentObligationUsecase) GetByStudentID(studentID uuid.UUID, academicYearID uint) ([]domain.StudentObligation, error) {
	return u.repo.GetByStudentID(studentID, academicYearID)
}

func (u *StudentObligationUsecase) GetByID(id uuid.UUID) (*domain.StudentObligation, error) {
	return u.repo.GetByID(id)
}

func (u *StudentObligationUsecase) Update(ob *domain.StudentObligation) error {
	return u.repo.Update(ob)
}

func (u *StudentObligationUsecase) Delete(id uuid.UUID) error {
	return u.repo.Delete(id)
}

func (u *StudentObligationUsecase) RecordPayment(id uuid.UUID, amount float64) error {
	if err := u.repo.RecordPayment(id, amount); err != nil {
		return err
	}

	// Sync payment status to the linked Bill (if any)
	u.syncBillFromObligation(id)

	// Auto-create CashLedger entry (BKU)
	u.autoCashLedgerFromObligation(id, amount)

	return nil
}

// autoCashLedgerFromObligation creates an automatic CashLedger entry when a student obligation is paid
func (u *StudentObligationUsecase) autoCashLedgerFromObligation(obligationID uuid.UUID, amount float64) {
	if u.financeRepo == nil {
		return
	}

	ob, err := u.repo.GetByID(obligationID)
	if err != nil || ob == nil {
		return
	}

	pt, err := u.paymentRepo.GetByID(ob.PaymentTypeID)
	if err != nil || pt == nil {
		return
	}

	// Build descriptive item name
	itemName := pt.Name
	if ob.BillingMonth > 0 {
		monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
		if ob.BillingMonth <= 12 {
			itemName = pt.Name + " - " + monthNames[ob.BillingMonth]
		}
	} else if ob.TotalInstallments > 0 {
		itemName = pt.Name + " - Cicilan " + strconv.Itoa(ob.InstallmentNumber) + "/" + strconv.Itoa(ob.TotalInstallments)
	}

	entry := &domain.CashLedger{
		Date:              time.Now(),
		Source:            "Pembayaran Tanggungan Siswa",
		ItemName:          itemName,
		Type:              "Income",
		Amount:            amount,
		Category:          "Operasional",
		FundSource:        "Kas Umum",
		Notes:             "Auto-generated dari pembayaran tanggungan siswa",
		TransactionCodeID: pt.TransactionCodeID,
		AutoGenerated:     true,
	}
	_ = u.financeRepo.AddCashLedgerEntry(entry)
}

// syncBillFromObligation finds the Bill linked to this obligation and syncs the payment status
func (u *StudentObligationUsecase) syncBillFromObligation(obligationID uuid.UUID) {
	if u.financeRepo == nil {
		return
	}
	// Find bill by obligation_id
	bill, err := u.financeRepo.GetBillByObligationID(obligationID.String())
	if err != nil || bill == nil {
		return
	}

	// Get the current obligation status
	ob, err := u.repo.GetByID(obligationID)
	if err != nil {
		return
	}

	// Update bill to match obligation status
	bill.Status = ob.Status
	_ = u.financeRepo.UpdateBillStatus(bill.ID.String(), ob.Status)
}

func (u *StudentObligationUsecase) GetStudentsByClassID(classID uint) ([]domain.Student, error) {
	return u.repo.GetStudentsByClassID(classID)
}

func (u *StudentObligationUsecase) GetParentByStudentID(parentID *uuid.UUID) (*domain.Parent, *domain.User, error) {
	return u.repo.GetParentByStudentID(parentID)
}
