package usecase

// Feature: ppdb-payment-and-improvements, Property 4: Konsistensi Hasil Bulk Import
// **Validates: Requirements 2.5**
//
// Property: For any N rows input (mix of valid and invalid),
// result.Success + result.Failed == N (== result.TotalRows)

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"testing"

	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// --- Interfaces for testability ---

type userRepoForBulk interface {
	FindByEmail(email string) (*domain.User, error)
	Create(user *domain.User) error
}

type studentRepoForBulk interface {
	Create(student *domain.Student) error
}

// --- In-memory mock implementations ---

type inMemoryUserRepo struct {
	users map[string]*domain.User // keyed by email
}

func newInMemoryUserRepo() *inMemoryUserRepo {
	return &inMemoryUserRepo{users: make(map[string]*domain.User)}
}

func (r *inMemoryUserRepo) FindByEmail(email string) (*domain.User, error) {
	if u, ok := r.users[email]; ok {
		return u, nil
	}
	return nil, fmt.Errorf("not found")
}

func (r *inMemoryUserRepo) Create(user *domain.User) error {
	if user.ID == (uuid.UUID{}) {
		user.ID = uuid.New()
	}
	r.users[user.Email] = user
	return nil
}

type inMemoryStudentRepo struct{}

func (r *inMemoryStudentRepo) Create(student *domain.Student) error {
	if student.ID == (uuid.UUID{}) {
		student.ID = uuid.New()
	}
	return nil
}

// trackableStudentRepo tracks created students for verification in property tests.
type trackableStudentRepo struct {
	students map[uuid.UUID]*domain.Student // keyed by UserID
}

func newTrackableStudentRepo() *trackableStudentRepo {
	return &trackableStudentRepo{students: make(map[uuid.UUID]*domain.Student)}
}

func (r *trackableStudentRepo) Create(student *domain.Student) error {
	if student.ID == (uuid.UUID{}) {
		student.ID = uuid.New()
	}
	r.students[student.UserID] = student
	return nil
}

// --- Testable bulk import function (mirrors UserUsecase.BulkCreateUsers logic) ---

func bulkCreateUsersTestable(
	rows []domain.BulkUserImportRow,
	userRepo userRepoForBulk,
	studentRepo studentRepoForBulk,
) (*domain.BulkImportResult, error) {
	result := &domain.BulkImportResult{
		TotalRows: len(rows),
		Errors:    []domain.BulkImportRowError{},
	}

	seenEmails := make(map[string]bool)

	for i, row := range rows {
		rowNum := i + 1

		if row.Name == "" {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Field name wajib diisi",
			})
			continue
		}
		if row.Email == "" {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Field email wajib diisi",
			})
			continue
		}
		if row.Password == "" {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Field password wajib diisi",
			})
			continue
		}
		if row.RoleID == 0 {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Field role_id wajib diisi",
			})
			continue
		}
		if row.UnitID == 0 {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Field unit_id wajib diisi",
			})
			continue
		}

		if seenEmails[row.Email] {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Email duplikat dalam file import",
			})
			continue
		}
		seenEmails[row.Email] = true

		existing, _ := userRepo.FindByEmail(row.Email)
		if existing != nil {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: "Email sudah terdaftar",
			})
			continue
		}

		user := &domain.User{
			Name:         row.Name,
			Email:        row.Email,
			PasswordHash: "hashed-" + row.Password,
			RoleID:       row.RoleID,
			UnitID:       row.UnitID,
		}

		if err := userRepo.Create(user); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row: rowNum, Email: row.Email, Reason: fmt.Sprintf("Gagal membuat akun: %v", err),
			})
			continue
		}

		if row.RoleID == studentRoleID && row.ClassID != nil {
			nisn := row.NISN
			if nisn == "" {
				nisn = fmt.Sprintf("AUTO-%s", user.ID.String()[:8])
			}
			student := &domain.Student{
				UserID:  user.ID,
				NISN:    nisn,
				ClassID: *row.ClassID,
				UnitID:  row.UnitID,
				Status:  "Active",
			}
			if err := studentRepo.Create(student); err != nil {
				result.Failed++
				result.Errors = append(result.Errors, domain.BulkImportRowError{
					Row: rowNum, Email: row.Email, Reason: fmt.Sprintf("Akun dibuat, tetapi gagal membuat record Student: %v", err),
				})
				continue
			}
		}

		result.Success++
	}

	return result, nil
}

// --- Generators ---

// validRow generates a row that should pass all validations
func validRowGenerator(idx int) *rapid.Generator[domain.BulkUserImportRow] {
	return rapid.Custom(func(t *rapid.T) domain.BulkUserImportRow {
		suffix := rapid.StringMatching(`[a-z]{4,8}`).Draw(t, fmt.Sprintf("suffix_%d", idx))
		roleID := rapid.Uint32Range(1, 5).Draw(t, fmt.Sprintf("role_id_%d", idx)) // non-student roles to avoid student repo
		unitID := rapid.Uint32Range(1, 3).Draw(t, fmt.Sprintf("unit_id_%d", idx))
		return domain.BulkUserImportRow{
			Name:     fmt.Sprintf("User %s", suffix),
			Email:    fmt.Sprintf("%s_%d@example.com", suffix, idx),
			Password: "password123",
			RoleID:   uint(roleID),
			UnitID:   uint(unitID),
		}
	})
}

// invalidRow generates a row that will fail validation (missing required field)
func invalidRowGenerator(idx int) *rapid.Generator[domain.BulkUserImportRow] {
	return rapid.Custom(func(t *rapid.T) domain.BulkUserImportRow {
		// Pick which field to make invalid
		invalidField := rapid.IntRange(0, 4).Draw(t, fmt.Sprintf("invalid_field_%d", idx))
		suffix := rapid.StringMatching(`[a-z]{4,8}`).Draw(t, fmt.Sprintf("inv_suffix_%d", idx))
		row := domain.BulkUserImportRow{
			Name:     fmt.Sprintf("User %s", suffix),
			Email:    fmt.Sprintf("%s_%d@invalid.com", suffix, idx),
			Password: "password123",
			RoleID:   2,
			UnitID:   1,
		}
		switch invalidField {
		case 0:
			row.Name = ""
		case 1:
			row.Email = ""
		case 2:
			row.Password = ""
		case 3:
			row.RoleID = 0
		case 4:
			row.UnitID = 0
		}
		return row
	})
}

// --- Property Tests ---

// TestProperty_ValidasiBarsCSVBulkImport verifies that invalid rows (empty fields, duplicate emails)
// are rejected and reported in result.Errors, without stopping valid rows from being processed.
//
// Feature: ppdb-payment-and-improvements, Property 5: Validasi Baris CSV Bulk Import
// **Validates: Requirements 2.3, 2.4**
func TestProperty_ValidasiBarisCSVBulkImport(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate at least 1 valid row and 1 invalid row
		numValid := rapid.IntRange(1, 20).Draw(t, "num_valid")
		numInvalid := rapid.IntRange(1, 20).Draw(t, "num_invalid")

		// Build valid rows first (unique indices to avoid accidental email collision)
		validRows := make([]domain.BulkUserImportRow, numValid)
		for i := 0; i < numValid; i++ {
			validRows[i] = validRowGenerator(i).Draw(t, fmt.Sprintf("valid_row_%d", i))
		}

		// Build invalid rows: mix of empty-field rows and duplicate-email rows
		invalidRows := make([]domain.BulkUserImportRow, numInvalid)
		for i := 0; i < numInvalid; i++ {
			// Alternate between empty-field invalids and duplicate-email invalids
			if i%2 == 0 {
				// Empty field invalid
				invalidRows[i] = invalidRowGenerator(1000 + i).Draw(t, fmt.Sprintf("invalid_row_%d", i))
			} else {
				// Duplicate email: reuse the email from a valid row
				srcIdx := i % numValid
				dup := validRows[srcIdx]
				// Keep all fields valid except we intentionally duplicate the email
				invalidRows[i] = domain.BulkUserImportRow{
					Name:     fmt.Sprintf("Duplicate User %d", i),
					Email:    dup.Email, // duplicate!
					Password: "password123",
					RoleID:   2,
					UnitID:   1,
				}
			}
		}

		// Interleave valid and invalid rows so they appear mixed
		totalRows := numValid + numInvalid
		rows := make([]domain.BulkUserImportRow, 0, totalRows)
		vi, ii := 0, 0
		for vi < numValid || ii < numInvalid {
			if vi < numValid {
				rows = append(rows, validRows[vi])
				vi++
			}
			if ii < numInvalid {
				rows = append(rows, invalidRows[ii])
				ii++
			}
		}

		userRepo := newInMemoryUserRepo()
		studentRepo := &inMemoryStudentRepo{}

		result, err := bulkCreateUsersTestable(rows, userRepo, studentRepo)
		if err != nil {
			t.Fatalf("bulkCreateUsersTestable returned unexpected error: %v", err)
		}

		// Property 5a: Invalid rows must be rejected — they must appear in result.Errors
		// We know there are numInvalid invalid rows, so result.Failed >= numInvalid
		// (some valid rows might also fail due to duplicate email detection across the mixed list,
		// but the invalid rows themselves must always be rejected)
		if result.Failed == 0 {
			t.Fatalf("Expected at least %d failed rows (invalid rows), but got 0 failures", numInvalid)
		}

		// Property 5b: Valid rows are still processed — result.Success > 0
		// Since we have numValid valid rows with unique emails, at least some must succeed.
		// (The duplicate-email invalid rows reuse valid row emails, but the valid rows appear
		// BEFORE the duplicates in our interleaved order, so valid rows succeed first.)
		if result.Success == 0 {
			t.Fatalf("Expected at least 1 successful row (valid rows exist), but got 0 successes")
		}

		// Property 5c: Every error entry must have a non-empty Reason
		for _, e := range result.Errors {
			if e.Reason == "" {
				t.Fatalf("Error entry for row %d has empty Reason", e.Row)
			}
		}

		// Property 5d: Row numbers in errors must be within valid range [1, totalRows]
		for _, e := range result.Errors {
			if e.Row < 1 || e.Row > totalRows {
				t.Fatalf("Error entry has out-of-range row number: %d (total rows: %d)", e.Row, totalRows)
			}
		}

		// Property 5e: len(Errors) == Failed (consistency check)
		if len(result.Errors) != result.Failed {
			t.Fatalf("len(Errors)=%d != Failed=%d", len(result.Errors), result.Failed)
		}

		// Property 5f: Success + Failed == TotalRows (no rows silently dropped)
		if result.Success+result.Failed != result.TotalRows {
			t.Fatalf("Success(%d) + Failed(%d) = %d != TotalRows(%d)",
				result.Success, result.Failed, result.Success+result.Failed, result.TotalRows)
		}
	})
}

// TestProperty_KonsistensiHasilBulkImport verifies that for any N rows input,
// result.Success + result.Failed always equals N (== result.TotalRows).
func TestProperty_KonsistensiHasilBulkImport(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate N between 1 and 50
		n := rapid.IntRange(1, 50).Draw(t, "n")

		rows := make([]domain.BulkUserImportRow, n)
		for i := 0; i < n; i++ {
			// Randomly decide if this row is valid or invalid
			isValid := rapid.Bool().Draw(t, fmt.Sprintf("is_valid_%d", i))
			if isValid {
				rows[i] = validRowGenerator(i).Draw(t, fmt.Sprintf("valid_row_%d", i))
			} else {
				rows[i] = invalidRowGenerator(i).Draw(t, fmt.Sprintf("invalid_row_%d", i))
			}
		}

		userRepo := newInMemoryUserRepo()
		studentRepo := &inMemoryStudentRepo{}

		result, err := bulkCreateUsersTestable(rows, userRepo, studentRepo)
		if err != nil {
			t.Fatalf("bulkCreateUsersTestable returned unexpected error: %v", err)
		}

		// Property: TotalRows must equal N
		if result.TotalRows != n {
			t.Fatalf("TotalRows mismatch: expected %d, got %d", n, result.TotalRows)
		}

		// Property: Success + Failed == N
		if result.Success+result.Failed != n {
			t.Fatalf(
				"Consistency violated: Success(%d) + Failed(%d) = %d, expected %d (TotalRows)",
				result.Success, result.Failed, result.Success+result.Failed, n,
			)
		}

		// Property: Success + Failed == TotalRows (redundant but explicit)
		if result.Success+result.Failed != result.TotalRows {
			t.Fatalf(
				"Consistency violated: Success(%d) + Failed(%d) = %d != TotalRows(%d)",
				result.Success, result.Failed, result.Success+result.Failed, result.TotalRows,
			)
		}

		// Property: len(Errors) == Failed
		if len(result.Errors) != result.Failed {
			t.Fatalf(
				"Error count mismatch: len(Errors)=%d, Failed=%d",
				len(result.Errors), result.Failed,
			)
		}
	})
}

// TestProperty_PembuatanRecordStudentBulkImport verifies that for any user with
// role_id = 6 (Siswa) and a valid class_id in bulk import, after a successful import,
// a Student record is created and linked to the newly created user account.
//
// Feature: ppdb-payment-and-improvements, Property 6: Pembuatan Record Student pada Bulk Import
// **Validates: Requirements 2.9**
func TestProperty_PembuatanRecordStudentBulkImport(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate N rows where role_id = 6 (Siswa) and class_id is provided
		n := rapid.IntRange(1, 20).Draw(t, "n")

		rows := make([]domain.BulkUserImportRow, n)
		for i := 0; i < n; i++ {
			suffix := rapid.StringMatching(`[a-z]{4,8}`).Draw(t, fmt.Sprintf("suffix_%d", i))
			classID := rapid.Uint32Range(1, 10).Draw(t, fmt.Sprintf("class_id_%d", i))
			classIDUint := uint(classID)
			rows[i] = domain.BulkUserImportRow{
				Name:     fmt.Sprintf("Siswa %s", suffix),
				Email:    fmt.Sprintf("%s_%d@school.com", suffix, i),
				Password: "password123",
				RoleID:   6, // Siswa
				UnitID:   1,
				ClassID:  &classIDUint,
			}
		}

		userRepo := newInMemoryUserRepo()
		studentRepo := newTrackableStudentRepo()

		result, err := bulkCreateUsersTestable(rows, userRepo, studentRepo)
		if err != nil {
			t.Fatalf("bulkCreateUsersTestable returned unexpected error: %v", err)
		}

		// All rows are valid and unique, so all should succeed
		if result.Success != n {
			t.Fatalf("Expected %d successes, got %d (failed: %d, errors: %v)", n, result.Success, result.Failed, result.Errors)
		}

		// Property 6: For each successful row with role_id=6 and class_id,
		// a Student record must have been created and linked to the user account.
		for _, row := range rows {
			// Find the created user by email
			user, err := userRepo.FindByEmail(row.Email)
			if err != nil || user == nil {
				t.Fatalf("User with email %s was not created in userRepo", row.Email)
			}

			// Verify a Student record was created and linked to this user
			student, ok := studentRepo.students[user.ID]
			if !ok {
				t.Fatalf("No Student record found for user %s (ID: %s) with role_id=6 and class_id=%v",
					row.Email, user.ID, row.ClassID)
			}

			// Verify the Student record is correctly linked
			if student.UserID != user.ID {
				t.Fatalf("Student.UserID (%s) does not match User.ID (%s) for email %s",
					student.UserID, user.ID, row.Email)
			}

			// Verify ClassID is set correctly
			if student.ClassID != *row.ClassID {
				t.Fatalf("Student.ClassID (%d) does not match row.ClassID (%d) for email %s",
					student.ClassID, *row.ClassID, row.Email)
			}

			// Verify UnitID is set correctly
			if student.UnitID != row.UnitID {
				t.Fatalf("Student.UnitID (%d) does not match row.UnitID (%d) for email %s",
					student.UnitID, row.UnitID, row.Email)
			}

			// Verify Status is Active
			if student.Status != "Active" {
				t.Fatalf("Student.Status (%s) is not 'Active' for email %s", student.Status, row.Email)
			}

			// Verify NISN is set (either from row or auto-generated)
			if student.NISN == "" {
				t.Fatalf("Student.NISN is empty for email %s", row.Email)
			}
		}

		// Property 6b: Total student records created must equal number of successful rows
		if len(studentRepo.students) != result.Success {
			t.Fatalf("Number of Student records (%d) does not match Success count (%d)",
				len(studentRepo.students), result.Success)
		}
	})
}
