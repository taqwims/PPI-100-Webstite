package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/pkg/utils"
)

type UserUsecase struct {
	userRepo *postgres.UserRepository
}

func NewUserUsecase(userRepo *postgres.UserRepository) *UserUsecase {
	return &UserUsecase{userRepo: userRepo}
}

func (u *UserUsecase) GetAllUsers() ([]domain.User, error) {
	return u.userRepo.GetAll()
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
	// If password is changed, hash it (logic needs to be handled carefully, for now assume simple update)
	return u.userRepo.Update(user)
}

func (u *UserUsecase) DeleteUser(id string) error {
	return u.userRepo.Delete(id)
}
