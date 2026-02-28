package postgres

import (
	"ppi-100-sis/internal/domain"

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
	if err := r.db.Where("email = ?", email).Preload("Teacher").Preload("Parent").Preload("Student").First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("id = ?", id).Preload("Teacher").Preload("Parent").Preload("Student").First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetAll() ([]domain.User, error) {
	var users []domain.User
	err := r.db.Preload("Teacher").Preload("Parent").Preload("Student").Preload("Student.Class").Find(&users).Error
	return users, err
}

func (r *UserRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) Delete(id string) error {
	return r.db.Delete(&domain.User{}, "id = ?", id).Error
}
