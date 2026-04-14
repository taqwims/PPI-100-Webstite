package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/pkg/utils"
	"strings"
)

const studentRoleID = 6

type UserUsecase struct {
	userRepo    *postgres.UserRepository
	studentRepo *postgres.StudentRepository
}

func NewUserUsecase(userRepo *postgres.UserRepository, studentRepo *postgres.StudentRepository) *UserUsecase {
	return &UserUsecase{userRepo: userRepo, studentRepo: studentRepo}
}

func (u *UserUsecase) GetAllUsers(roleID uint) ([]domain.User, error) {
	return u.userRepo.GetAll(roleID)
}

func (u *UserUsecase) CreateUser(name, email, password string, roleID, unitID uint) error {
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return err
	}

	user := &domain.User{
		Name:         name,
		Email:        email,
		PasswordHash: hashedPassword,
		RoleID:       roleID,
		UnitID:       unitID,
	}

	return u.userRepo.Create(user)
}

func (u *UserUsecase) UpdateUser(user *domain.User) error {
	if user.PasswordHash != "" {
		hashedPassword, err := utils.HashPassword(user.PasswordHash)
		if err != nil {
			return err
		}
		user.PasswordHash = hashedPassword
	} else {
		// Fetch existing user to keep old password if not provided
		existingUser, err := u.userRepo.FindByID(user.ID.String())
		if err != nil {
			return err
		}
		user.PasswordHash = existingUser.PasswordHash
	}
	return u.userRepo.Update(user)
}

func (u *UserUsecase) DeleteUser(id string) error {
	return u.userRepo.Delete(id)
}

func (u *UserUsecase) GetUserByID(id string) (*domain.User, error) {
	return u.userRepo.FindByID(id)
}


// BulkCreateUsers creates multiple user accounts from a list of import rows.
// Valid rows are processed; invalid rows are recorded without stopping the batch.
// If role_id == 6 (Siswa) and class_id is provided, a Student record is also created.
func (u *UserUsecase) BulkCreateUsers(rows []domain.BulkUserImportRow) (*domain.BulkImportResult, error) {
	result := &domain.BulkImportResult{
		TotalRows: len(rows),
		Errors:    []domain.BulkImportRowError{},
	}

	// Track emails seen in this batch to detect intra-batch duplicates
	seenEmails := make(map[string]bool)

	for i, row := range rows {
		rowNum := i + 1

		// Validate required fields
		if row.Name == "" {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Field name wajib diisi",
			})
			continue
		}
		if row.Email == "" {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Field email wajib diisi",
			})
			continue
		}
		if row.Password == "" {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Field password wajib diisi",
			})
			continue
		}
		if row.RoleID == 0 {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Field role_id wajib diisi",
			})
			continue
		}
		if row.UnitID == 0 {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Field unit_id wajib diisi",
			})
			continue
		}

		// Check intra-batch duplicate email
		lowercaseEmail := strings.ToLower(row.Email)
		if seenEmails[lowercaseEmail] {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Email duplikat dalam file import",
			})
			continue
		}
		seenEmails[lowercaseEmail] = true

		// Check existing email in DB
		existing, _ := u.userRepo.FindByEmail(lowercaseEmail)
		if existing != nil {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: "Email sudah terdaftar",
			})
			continue
		}

		// Hash password
		hashedPassword, err := utils.HashPassword(row.Password)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: fmt.Sprintf("Gagal memproses password: %v", err),
			})
			continue
		}

		user := &domain.User{
			Name:         row.Name,
			Email:        row.Email,
			PasswordHash: hashedPassword,
			RoleID:       row.RoleID,
			UnitID:       row.UnitID,
		}

		if err := u.userRepo.Create(user); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, domain.BulkImportRowError{
				Row:    rowNum,
				Email:  row.Email,
				Reason: fmt.Sprintf("Gagal membuat akun: %v", err),
			})
			continue
		}

		// If role is Siswa (6) and class_id is provided, create Student record
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
			if err := u.studentRepo.Create(student); err != nil {
				// Student creation failed — rollback User creation
				u.userRepo.Delete(user.ID.String())
				result.Failed++
				result.Errors = append(result.Errors, domain.BulkImportRowError{
					Row:    rowNum,
					Email:  row.Email,
					Reason: fmt.Sprintf("Gagal membuat record Student: %v", err),
				})
				continue
			}
		}

		result.Success++
	}

	return result, nil
}
