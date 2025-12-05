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

func (u *AuthUsecase) UpdateProfile(userID string, name, email string) error {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	user.Name = name
	// Only update email if changed and not taken
	if user.Email != email {
		existing, _ := u.userRepo.FindByEmail(email)
		if existing != nil {
			return errors.New("email already taken")
		}
		user.Email = email
	}

	return u.userRepo.Update(user)
}

func (u *AuthUsecase) ChangePassword(userID, oldPassword, newPassword string) error {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if !utils.CheckPasswordHash(oldPassword, user.PasswordHash) {
		return errors.New("invalid old password")
	}

	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = hashedPassword
	return u.userRepo.Update(user)
}

func (u *AuthUsecase) UpdateProfilePicture(userID, photoURL string) error {
	user, err := u.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	user.PhotoURL = photoURL
	return u.userRepo.Update(user)
}
