package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"strconv"
	"time"

	"github.com/google/uuid"
)

type StudentObligationUsecase struct {
	repo              *postgres.StudentObligationRepository
	paymentRepo       *postgres.PaymentTypeRepository
	financeUsecase    *FinanceUsecase
	financeRepo       *postgres.FinanceRepository
	budgetRepo        *postgres.BudgetRepository
	schoolSettingRepo *postgres.SchoolSettingRepository
}

func NewStudentObligationUsecase(repo *postgres.StudentObligationRepository, paymentRepo *postgres.PaymentTypeRepository, financeUsecase *FinanceUsecase, financeRepo *postgres.FinanceRepository, budgetRepo *postgres.BudgetRepository) *StudentObligationUsecase {
	return &StudentObligationUsecase{repo: repo, paymentRepo: paymentRepo, financeUsecase: financeUsecase, financeRepo: financeRepo, budgetRepo: budgetRepo}
}

func (u *StudentObligationUsecase) SetSchoolSettingRepo(r *postgres.SchoolSettingRepository) {
	u.schoolSettingRepo = r
}

func (u *StudentObligationUsecase) Create(ob *domain.StudentObligation) error {
	pt, err := u.paymentRepo.GetByID(ob.PaymentTypeID)
	if err != nil {
		return err
	}
	ob.Amount = pt.Amount
	if ob.TotalInstallments > 1 {
		ob.Amount = pt.Amount / float64(ob.TotalInstallments)
	}
	ob.PaidAmount = 0
	ob.Status = "Unpaid"

	// Calculate due date if not provided
	if ob.DueDate == nil {
		ay, err := u.repo.GetAcademicYearByID(ob.AcademicYearID)
		if err == nil && ob.BillingMonth > 0 {
			ayStartYear := ay.StartDate.Year()
			ayStartMonth := int(ay.StartDate.Month())
			targetYear := ayStartYear
			if ob.BillingMonth < ayStartMonth && ayStartMonth > 1 {
				targetYear++
			}
			dueDate := time.Date(targetYear, time.Month(ob.BillingMonth), 10, 0, 0, 0, 0, time.Local)
			ob.DueDate = &dueDate
		} else if err == nil && ob.InstallmentNumber > 0 {
			dueDate := ay.StartDate.AddDate(0, (ob.InstallmentNumber-1)*3, 0)
			ob.DueDate = &dueDate
		} else {
			dueDate := time.Now().AddDate(0, 1, 0)
			ob.DueDate = &dueDate
		}
	}

	err = u.repo.Create(ob)
	if err == nil {
		obID := ob.ID
		title := pt.Name
		if ob.BillingMonth > 0 {
			monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
			if ob.BillingMonth <= 12 {
				title = pt.Name + " - " + monthNames[ob.BillingMonth]
			}
		} else if ob.TotalInstallments > 0 {
			title = pt.Name + " - Cicilan " + strconv.Itoa(ob.InstallmentNumber) + "/" + strconv.Itoa(ob.TotalInstallments)
		}

		billDueDate := *ob.DueDate
		_ = u.financeUsecase.CreateBill(ob.StudentID, title, ob.Amount, billDueDate, pt.Name, &ob.AcademicYearID, pt.TransactionCodeID, false, &obID, nil)
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
	
	// Get academic year to determine correct calendar years for months
	ay, err := u.repo.GetAcademicYearByID(academicYearID)
	if err != nil {
		return 0, err
	}
	ayStartYear := ay.StartDate.Year()
	ayStartMonth := int(ay.StartDate.Month())

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
				// Determine correct calendar year based on academic year start
				// e.g. If AY starts in July (7), then months 7-12 are in start year, 1-6 in next year
				targetYear := ayStartYear
				if month < ayStartMonth && ayStartMonth > 1 {
					targetYear++
				}
				
				dueDate := time.Date(targetYear, time.Month(month), 10, 0, 0, 0, 0, time.Local)
				
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
				baseDate := ay.StartDate
				for i := 1; i <= installmentCount; i++ {
					dueDate := baseDate.AddDate(0, (i-1)*3, 0) // Spread installments starting from AY start
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
				dueDate := ay.StartDate.AddDate(0, 1, 0) // Default 1 month after AY starts
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

			_ = u.financeUsecase.CreateBill(ob.StudentID, title, ob.Amount, billDueDate, pt.Name, &academicYearID, pt.TransactionCodeID, false, &obID, nil)
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
	
	// Get academic year to determine correct calendar years for months
	ay, err := u.repo.GetAcademicYearByID(academicYearID)
	if err != nil {
		return 0, err
	}
	ayStartYear := ay.StartDate.Year()
	ayStartMonth := int(ay.StartDate.Month())

	for _, studentID := range studentIDs {
		switch pt.PaymentSchedule {
		case "Bulanan":
			months := selectedMonths
			if len(months) == 0 {
				months = []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
			}
			for _, month := range months {
				targetYear := ayStartYear
				if month < ayStartMonth && ayStartMonth > 1 {
					targetYear++
				}
				
				dueDate := time.Date(targetYear, time.Month(month), 10, 0, 0, 0, 0, time.Local)
				
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
				baseDate := ay.StartDate
				for i := 1; i <= installmentCount; i++ {
					dueDate := baseDate.AddDate(0, (i-1)*3, 0)
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
				dueDate := ay.StartDate.AddDate(0, 1, 0)
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

			_ = u.financeUsecase.CreateBill(ob.StudentID, title, ob.Amount, billDueDate, pt.Name, &academicYearID, pt.TransactionCodeID, false, &obID, nil)
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

func (u *StudentObligationUsecase) isForceDeletePaidAllowed() bool {
	if u.schoolSettingRepo == nil {
		return false
	}
	s, err := u.schoolSettingRepo.GetByKey("allow_delete_paid_obligations")
	if err != nil || s == nil {
		return false
	}
	return s.Value == "true"
}

func (u *StudentObligationUsecase) Delete(id uuid.UUID) error {
	ob, err := u.repo.GetByID(id)
	if err != nil {
		return err
	}

	// Safety check: if payments have been made
	if ob.PaidAmount > 0 {
		if !u.isForceDeletePaidAllowed() {
			return errors.New("tidak bisa menghapus tanggungan yang sudah memiliki riwayat pembayaran. Aktifkan fitur 'Izinkan Hapus Tanggungan Terbayar' di Pengaturan Sekolah jika ingin menghapus paksa/koreksi")
		}
	}

	var bill *domain.Bill
	if u.financeRepo != nil {
		b, err := u.financeRepo.GetBillByObligationID(id.String())
		if err == nil && b != nil {
			bill = b
		}
	}

	// If there are payments or paid amount, reverse & clean up related records
	if ob.PaidAmount > 0 || (bill != nil && len(bill.Payments) > 0) {
		// 1. Delete all payments associated with this bill
		if bill != nil && u.financeRepo != nil {
			_ = u.financeRepo.DeletePaymentsByBillID(bill.ID.String())
		}

		// 2. Revert RKAS budget realization
		pt, _ := u.paymentRepo.GetByID(ob.PaymentTypeID)
		if u.budgetRepo != nil && pt != nil && pt.TransactionCodeID != nil && *pt.TransactionCodeID > 0 {
			_ = u.budgetRepo.SubtractRealizationByTransactionCodeID(*pt.TransactionCodeID, ob.PaidAmount, ob.BillingMonth)
		}

		// 3. Remove CashLedger entries (BKU)
		if u.financeRepo != nil {
			studentName := ""
			if ob.Student.User.Name != "" {
				studentName = ob.Student.User.Name
			}
			billTitle := ""
			if bill != nil {
				billTitle = bill.Title
			}
			ptName := ""
			var tcID *uint
			if pt != nil {
				ptName = pt.Name
				tcID = pt.TransactionCodeID
			}
			_ = u.financeRepo.DeleteCashLedgersForObligation(id, studentName, billTitle, ptName, tcID)
		}
	}

	// Delete linked bill and bill items if exists
	if bill != nil && u.financeRepo != nil {
		_ = u.financeRepo.DeleteBillItemsByBillID(bill.ID.String())
		_ = u.financeRepo.DeleteBill(bill.ID.String())
	}

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

	// Auto-realize RKAS budget
	u.autoRealizeRKAS(id, amount)

	return nil
}

// autoRealizeRKAS updates RKAS realization when a student obligation is paid
func (u *StudentObligationUsecase) autoRealizeRKAS(obligationID uuid.UUID, amount float64) {
	if u.budgetRepo == nil {
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

	if pt.TransactionCodeID == nil || *pt.TransactionCodeID == 0 {
		return
	}

	_ = u.budgetRepo.AddRealizationByTransactionCodeID(*pt.TransactionCodeID, amount, ob.BillingMonth)
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
		ObligationID:      &obligationID,
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

func (u *StudentObligationUsecase) BulkDelete(paymentTypeID uint, academicYearID uint, classID uint) error {
	obs, err := u.repo.GetAll(academicYearID, classID)
	if err != nil {
		return err
	}

	allowForceDelete := u.isForceDeletePaidAllowed()

	for _, ob := range obs {
		if ob.PaymentTypeID == paymentTypeID {
			if ob.PaidAmount == 0 || allowForceDelete {
				_ = u.Delete(ob.ID)
			}
		}
	}

	if !allowForceDelete {
		return u.repo.BulkDelete(paymentTypeID, academicYearID, classID)
	}
	return nil
}
