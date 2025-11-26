package usecase

import (
	"errors"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/pkg/utils"
)

type AuthUsecase struct {
	userRepo *postgres.UserRepository
	cfg      *config.Config
}

func NewAuthUsecase(userRepo *postgres.UserRepository, cfg *config.Config) *AuthUsecase {
	return &AuthUsecase{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (u *AuthUsecase) Register(name, email, password string, roleID, unitID uint) error {
	existingUser, _ := u.userRepo.FindByEmail(email)
	if existingUser != nil {
		return errors.New("email already registered")
	}

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

func (u *AuthUsecase) Login(email, password string) (string, error) {
	user, err := u.userRepo.FindByEmail(email)
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return "", errors.New("invalid email or password")
	}

	token, err := utils.GenerateToken(user.ID, user.RoleID, user.UnitID, u.cfg)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (u *AuthUsecase) GetProfile(userID string) (*domain.User, error) {
	return u.userRepo.FindByID(userID)
}
