package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type WATemplateUsecase interface {
	Create(req *domain.WATemplate) error
	GetAll() ([]domain.WATemplate, error)
	Update(id uint, req *domain.WATemplate) error
	Delete(id uint) error
	GetNotificationSettings() ([]domain.SchoolSetting, error)
	UpdateNotificationSettings(settings []domain.SchoolSetting) error
}

type waTemplateUsecase struct {
	repo postgres.WATemplateRepository
}

func NewWATemplateUsecase(repo postgres.WATemplateRepository) WATemplateUsecase {
	return &waTemplateUsecase{repo: repo}
}

func (u *waTemplateUsecase) Create(req *domain.WATemplate) error {
	if req.Name == "" {
		return errors.New("nama template tidak boleh kosong")
	}
	if req.BodyTemplate == "" {
		return errors.New("isi template tidak boleh kosong")
	}
	return u.repo.Create(req)
}

func (u *waTemplateUsecase) GetAll() ([]domain.WATemplate, error) {
	return u.repo.GetAll()
}

func (u *waTemplateUsecase) Update(id uint, req *domain.WATemplate) error {
	if req.Name == "" {
		return errors.New("nama template tidak boleh kosong")
	}
	if req.BodyTemplate == "" {
		return errors.New("isi template tidak boleh kosong")
	}
	return u.repo.Update(id, req.Name, req.BodyTemplate, req.IsDefault)
}

func (u *waTemplateUsecase) Delete(id uint) error {
	return u.repo.Delete(id)
}

func (u *waTemplateUsecase) GetNotificationSettings() ([]domain.SchoolSetting, error) {
	return u.repo.GetNotificationSettings()
}

func (u *waTemplateUsecase) UpdateNotificationSettings(settings []domain.SchoolSetting) error {
	return u.repo.UpdateNotificationSettings(settings)
}
