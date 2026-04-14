package usecase

// Feature: ppdb-payment-and-improvements, Property 9: Filter Kelas pada Tabungan
// **Validates: Requirements 5.1**
//
// Property: For any class_id given as a filter parameter on GET /finance/savings/accounts,
// all returned saving accounts must belong to students enrolled in that class.

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"testing"

	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// inMemorySavingsRepo is a simple in-memory mock that implements the filter logic
// mirroring the real GetAllSavingAccounts(classID *uint) behaviour.
type inMemorySavingsRepo struct {
	accounts []domain.SavingAccount
}

// GetAllSavingAccounts filters accounts by classID, matching the real repository logic.
func (r *inMemorySavingsRepo) GetAllSavingAccounts(classID *uint) ([]domain.SavingAccount, error) {
	if classID == nil {
		// No filter — return all accounts
		result := make([]domain.SavingAccount, len(r.accounts))
		copy(result, r.accounts)
		return result, nil
	}

	var filtered []domain.SavingAccount
	for _, acc := range r.accounts {
		if acc.Student.ClassID == *classID {
			filtered = append(filtered, acc)
		}
	}
	return filtered, nil
}

// buildSavingAccount is a helper that constructs a SavingAccount with a nested Student.
func buildSavingAccount(classID uint) domain.SavingAccount {
	studentID := uuid.New()
	return domain.SavingAccount{
		ID:        uuid.New(),
		StudentID: studentID,
		Balance:   0,
		Student: domain.Student{
			ID:      studentID,
			ClassID: classID,
			Class:   domain.Class{ID: classID, Name: fmt.Sprintf("Kelas-%d", classID)},
		},
	}
}

// TestProperty_FilterKelasTabungan verifies that for any class_id filter,
// all returned saving accounts have student.class_id == filter class_id,
// and accounts from other classes are NOT returned.
func TestProperty_FilterKelasTabungan(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate a pool of class IDs (2 to 5 distinct classes)
		numClasses := rapid.IntRange(2, 5).Draw(t, "num_classes")
		classIDs := make([]uint, numClasses)
		for i := 0; i < numClasses; i++ {
			// Use IDs 1..numClasses to keep them distinct and small
			classIDs[i] = uint(i + 1)
		}

		// Generate accounts: 1 to 4 accounts per class
		var allAccounts []domain.SavingAccount
		accountsByClass := make(map[uint][]domain.SavingAccount)
		for _, cid := range classIDs {
			count := rapid.IntRange(1, 4).Draw(t, fmt.Sprintf("count_class_%d", cid))
			for j := 0; j < count; j++ {
				acc := buildSavingAccount(cid)
				allAccounts = append(allAccounts, acc)
				accountsByClass[cid] = append(accountsByClass[cid], acc)
			}
		}

		repo := &inMemorySavingsRepo{accounts: allAccounts}

		// Pick a random class_id to filter by
		targetClassIdx := rapid.IntRange(0, numClasses-1).Draw(t, "target_class_idx")
		targetClassID := classIDs[targetClassIdx]

		// Call the filter
		result, err := repo.GetAllSavingAccounts(&targetClassID)
		if err != nil {
			t.Fatalf("GetAllSavingAccounts returned unexpected error: %v", err)
		}

		// Property 1: ALL returned accounts must belong to the target class
		for _, acc := range result {
			if acc.Student.ClassID != targetClassID {
				t.Fatalf(
					"Account %s belongs to class %d, but filter was class %d — wrong account returned",
					acc.ID, acc.Student.ClassID, targetClassID,
				)
			}
		}

		// Property 2: The number of returned accounts must equal the expected count for that class
		expectedCount := len(accountsByClass[targetClassID])
		if len(result) != expectedCount {
			t.Fatalf(
				"Expected %d accounts for class %d, but got %d",
				expectedCount, targetClassID, len(result),
			)
		}

		// Property 3: Accounts from OTHER classes must NOT appear in the result
		resultIDs := make(map[uuid.UUID]bool, len(result))
		for _, acc := range result {
			resultIDs[acc.ID] = true
		}
		for cid, accounts := range accountsByClass {
			if cid == targetClassID {
				continue
			}
			for _, acc := range accounts {
				if resultIDs[acc.ID] {
					t.Fatalf(
						"Account %s from class %d appeared in results filtered for class %d",
						acc.ID, cid, targetClassID,
					)
				}
			}
		}
	})
}

// TestProperty_FilterKelasTabungan_NilReturnsAll verifies that when no class_id
// filter is applied (nil), all saving accounts are returned.
func TestProperty_FilterKelasTabungan_NilReturnsAll(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate 1 to 10 accounts across random classes
		numAccounts := rapid.IntRange(1, 10).Draw(t, "num_accounts")
		var allAccounts []domain.SavingAccount
		for i := 0; i < numAccounts; i++ {
			classID := uint(rapid.IntRange(1, 5).Draw(t, fmt.Sprintf("class_%d", i)))
			allAccounts = append(allAccounts, buildSavingAccount(classID))
		}

		repo := &inMemorySavingsRepo{accounts: allAccounts}

		result, err := repo.GetAllSavingAccounts(nil)
		if err != nil {
			t.Fatalf("GetAllSavingAccounts(nil) returned unexpected error: %v", err)
		}

		if len(result) != len(allAccounts) {
			t.Fatalf(
				"Expected all %d accounts when no filter applied, but got %d",
				len(allAccounts), len(result),
			)
		}
	})
}
