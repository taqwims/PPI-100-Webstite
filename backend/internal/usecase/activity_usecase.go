package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"time"

	"github.com/google/uuid"
)

type ActivityUsecase struct {
	activityRepo *postgres.ActivityRepository
	financeRepo  *postgres.FinanceRepository
}

func NewActivityUsecase(activityRepo *postgres.ActivityRepository, financeRepo *postgres.FinanceRepository) *ActivityUsecase {
	return &ActivityUsecase{
		activityRepo: activityRepo,
		financeRepo:  financeRepo,
	}
}

// ------------------- Activities -------------------

func (u *ActivityUsecase) Create(req *domain.Activity) error {
	if req.Name == "" || req.TargetAmount < 0 {
		return errors.New("invalid activity data")
	}
	return u.activityRepo.Create(req)
}

func (u *ActivityUsecase) GetAllByAcademicYear(academicYearID uint) ([]domain.Activity, error) {
	return u.activityRepo.GetAllByAcademicYear(academicYearID)
}

func (u *ActivityUsecase) GetAll() ([]domain.Activity, error) {
	return u.activityRepo.GetAll()
}

func (u *ActivityUsecase) GetByID(id uuid.UUID) (*domain.Activity, error) {
	return u.activityRepo.GetByID(id)
}

func (u *ActivityUsecase) Update(req *domain.Activity) error {
	existing, err := u.activityRepo.GetByID(req.ID)
	if err != nil {
		return err
	}
	existing.Name = req.Name
	existing.Description = req.Description
	existing.TargetAmount = req.TargetAmount
	existing.StartDate = req.StartDate
	existing.EndDate = req.EndDate
	existing.Status = req.Status
	return u.activityRepo.Update(existing)
}

func (u *ActivityUsecase) Delete(id uuid.UUID) error {
	return u.activityRepo.Delete(id)
}

// ------------------- Activity Obligations -------------------

func (u *ActivityUsecase) CreateObligation(req *domain.ActivityObligation) error {
	return u.activityRepo.CreateObligation(req)
}

func (u *ActivityUsecase) BulkAssignClass(activityID uuid.UUID, classID uint, createdByID uuid.UUID) (int, error) {
	return u.activityRepo.BulkAssignClass(activityID, classID, createdByID)
}

func (u *ActivityUsecase) AssignStudent(activityID uuid.UUID, studentID uuid.UUID, createdByID uuid.UUID) (*domain.ActivityObligation, error) {
	return u.activityRepo.AssignStudent(activityID, studentID, createdByID)
}

func (u *ActivityUsecase) GetObligationsByActivity(activityID uuid.UUID) ([]domain.ActivityObligation, error) {
	return u.activityRepo.GetObligationsByActivity(activityID)
}

func (u *ActivityUsecase) DeleteObligation(id uuid.UUID) error {
	return u.activityRepo.DeleteObligation(id)
}

func (u *ActivityUsecase) RecordPayment(obligationID uuid.UUID, amount float64, createdByID uuid.UUID) error {
	if amount <= 0 {
		return errors.New("amount must be greater than 0")
	}

	ob, err := u.activityRepo.GetObligationByID(obligationID)
	if err != nil {
		return err
	}

	if ob.Status == "Paid" {
		return errors.New("obligation is already fully paid")
	}

	// Update obligation
	ob.PaidAmount += amount
	if ob.PaidAmount >= ob.Amount {
		ob.Status = "Paid"
	} else {
		ob.Status = "Partial"
	}

	if err := u.activityRepo.UpdateObligation(ob); err != nil {
		return err
	}

	// Record Income Transaction
	tx := &domain.ActivityTransaction{
		ActivityID:      ob.ActivityID,
		TransactionType: "Income",
		Amount:          amount,
		Date:            time.Now(),
		Description:     "Pembayaran Kegiatan dari: " + ob.Student.User.Name,
		CreatedByID:     createdByID,
	}

	if err := u.activityRepo.CreateTransaction(tx); err != nil {
		return err
	}

	// Sync payment status to the linked Bill (if any)
	u.syncBillFromActivityObligation(obligationID, ob)

	return nil
}

// syncBillFromActivityObligation syncs payment status from ActivityObligation to linked Bill
func (u *ActivityUsecase) syncBillFromActivityObligation(obligationID uuid.UUID, ob *domain.ActivityObligation) {
	if u.financeRepo == nil {
		return
	}
	bill, err := u.financeRepo.GetBillByActivityObligationID(obligationID.String())
	if err != nil || bill == nil {
		return
	}
	_ = u.financeRepo.UpdateBillStatus(bill.ID.String(), ob.Status)
}

// ------------------- Activity Transactions -------------------

func (u *ActivityUsecase) CreateTransaction(req *domain.ActivityTransaction) error {
	if req.Amount <= 0 {
		return errors.New("amount must be greater than 0")
	}
	if req.TransactionType != "Income" && req.TransactionType != "Expense" {
		return errors.New("invalid transaction type")
	}
	req.Date = time.Now()
	return u.activityRepo.CreateTransaction(req)
}

func (u *ActivityUsecase) GetTransactionsByActivity(activityID uuid.UUID) ([]domain.ActivityTransaction, error) {
	return u.activityRepo.GetTransactionsByActivity(activityID)
}

func (u *ActivityUsecase) DeleteTransaction(id uuid.UUID) error {
	return u.activityRepo.DeleteTransaction(id)
}

// ------------------- Activity Financial Summary -------------------

func (u *ActivityUsecase) GetActivitySummary(activityID uuid.UUID) (map[string]interface{}, error) {
	// Calculate total income from student obligations (PaidAmount sum)
	obs, err := u.activityRepo.GetObligationsByActivity(activityID)
	if err != nil {
		return nil, err
	}

	var totalIncome float64
	for _, ob := range obs {
		totalIncome += ob.PaidAmount
	}

	// Calculate total expense from transactions
	txs, err := u.activityRepo.GetTransactionsByActivity(activityID)
	if err != nil {
		return nil, err
	}

	var totalExpense float64
	for _, tx := range txs {
		if tx.TransactionType == "Expense" {
			totalExpense += tx.Amount
		}
	}

	return map[string]interface{}{
		"total_income":  totalIncome,
		"total_expense": totalExpense,
		"balance":       totalIncome - totalExpense,
	}, nil
}
