package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByEmail(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("email = ?", email).
		Preload("Roles").
		Preload("Teacher").
		Preload("Parent").
		Preload("Student").
		Preload("Student.Class").
		Preload("Student.Parent").
		Preload("Student.Parent.User").
		First(&user).Error; err != nil {
		return nil, err
	}
	user.PopulateRoleIDs()
	return &user, nil
}

// FindByEmailForAuth fetches authentication fields & roles for fast login and JWT generation
func (r *UserRepository) FindByEmailForAuth(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("email = ?", email).
		Preload("Roles").
		First(&user).Error; err != nil {
		return nil, err
	}
	user.PopulateRoleIDs()
	return &user, nil
}

// UpdatePasswordHash updates the password hash (used for smooth migration from cost 14 to cost 10)
func (r *UserRepository) UpdatePasswordHash(userID string, newHash string) error {
	return r.db.Model(&domain.User{}).Where("id = ?", userID).Update("password_hash", newHash).Error
}

// GetStaffUsers returns only staff members (excluding students role 6 and parents role 7) with lightweight fields
func (r *UserRepository) GetStaffUsers() ([]domain.User, error) {
	var users []domain.User
	err := r.db.Select("id, name, email, phone, role_id, unit_id").
		Where("role_id NOT IN (6, 7) OR id IN (SELECT user_id FROM user_roles WHERE role_id NOT IN (6, 7))").
		Order("name asc").
		Find(&users).Error
	return users, err
}

func (r *UserRepository) FindByEmailUnscoped(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Unscoped().Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("id = ?", id).
		Preload("Roles").
		Preload("Teacher").
		Preload("Parent").
		Preload("Student").
		Preload("Student.Class").
		Preload("Student.Parent").
		Preload("Student.Parent.User").
		First(&user).Error; err != nil {
		return nil, err
	}
	user.PopulateRoleIDs()
	return &user, nil
}

func (r *UserRepository) GetAll(roleID uint) ([]domain.User, error) {
	var users []domain.User
	query := r.db.
		Preload("Roles").
		Preload("Teacher").
		Preload("Parent").
		Preload("Student").
		Preload("Student.Class").
		Preload("Student.Parent").
		Preload("Student.Parent.User")
	if roleID != 0 {
		query = query.Where("role_id = ? OR id IN (SELECT user_id FROM user_roles WHERE role_id = ?)", roleID, roleID)
	}
	err := query.Find(&users).Error
	if err == nil {
		for i := range users {
			users[i].PopulateRoleIDs()
		}
	}
	return users, err
}

// SetUserRoles mengupdate seluruh role yang dimiliki oleh user
func (r *UserRepository) SetUserRoles(userID uuid.UUID, roleIDs []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Hapus role lama
		if err := tx.Where("user_id = ?", userID).Delete(&domain.UserRole{}).Error; err != nil {
			return err
		}

		if len(roleIDs) == 0 {
			return nil
		}

		// Insert role baru
		userRoles := make([]domain.UserRole, 0, len(roleIDs))
		seen := make(map[uint]bool)
		for _, rid := range roleIDs {
			if rid > 0 && !seen[rid] {
				seen[rid] = true
				userRoles = append(userRoles, domain.UserRole{
					UserID: userID,
					RoleID: rid,
				})
			}
		}

		if len(userRoles) > 0 {
			if err := tx.Create(&userRoles).Error; err != nil {
				return err
			}
			// Update role_id utama pada tabel users
			if err := tx.Model(&domain.User{}).Where("id = ?", userID).Update("role_id", roleIDs[0]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *UserRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) Delete(id string) error {
	return r.db.Delete(&domain.User{}, "id = ?", id).Error
}

func (r *UserRepository) GetUsersByRole(roleID uint) ([]domain.User, error) {
	var users []domain.User
	err := r.db.Where("role_id = ?", roleID).Find(&users).Error
	return users, err
}

func (r *UserRepository) UpdateFaceBiometric(userID string, embedding string, photoURL string, registeredAt *time.Time) error {
	updates := map[string]interface{}{
		"face_embedding":     embedding,
		"face_registered_at": registeredAt,
	}
	if photoURL != "" {
		updates["face_photo_url"] = photoURL
	}
	return r.db.Model(&domain.User{}).Where("id = ?", userID).Updates(updates).Error
}

func (r *UserRepository) RemoveFaceBiometric(userID string) error {
	return r.db.Model(&domain.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"face_embedding":     "",
		"face_registered_at": nil,
	}).Error
}

func (r *UserRepository) GetUsersWithFaceBiometric(unitID uint) ([]domain.User, error) {
	var users []domain.User
	query := r.db.Where("face_embedding IS NOT NULL AND face_embedding != ''").
		Preload("Teacher").
		Preload("Student").
		Preload("Student.Class")
	if unitID > 0 {
		query = query.Where("unit_id = ?", unitID)
	}
	err := query.Find(&users).Error
	return users, err
}

func (r *UserRepository) CountUsers() (int64, error) {
	var count int64
	err := r.db.Model(&domain.User{}).Where("deleted_at IS NULL").Count(&count).Error
	return count, err
}
