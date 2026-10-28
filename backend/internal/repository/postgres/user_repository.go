package postgres

import (
	"ppi-100-sis/internal/domain"
	"time"

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
		Preload("Teacher").
		Preload("Parent").
		Preload("Student").
		Preload("Student.Class").
		Preload("Student.Parent").
		Preload("Student.Parent.User").
		First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByEmailForAuth fetches only the required authentication fields for fast login (no heavy preloads)
func (r *UserRepository) FindByEmailForAuth(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
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
		Where("role_id NOT IN (6, 7)").
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
		Preload("Teacher").
		Preload("Parent").
		Preload("Student").
		Preload("Student.Class").
		Preload("Student.Parent").
		Preload("Student.Parent.User").
		First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetAll(roleID uint) ([]domain.User, error) {
	var users []domain.User
	query := r.db.
		Preload("Teacher").
		Preload("Parent").
		Preload("Student").
		Preload("Student.Class").
		Preload("Student.Parent").
		Preload("Student.Parent.User")
	if roleID != 0 {
		query = query.Where("role_id = ?", roleID)
	}
	err := query.Find(&users).Error
	return users, err
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
