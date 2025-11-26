package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type PublicUsecase struct {
	publicRepo *postgres.PublicRepository
}

func NewPublicUsecase(publicRepo *postgres.PublicRepository) *PublicUsecase {
	return &PublicUsecase{publicRepo: publicRepo}
}

func (u *PublicUsecase) GetPublicTeachers() ([]domain.PublicTeacher, error) {
	return u.publicRepo.GetAllPublicTeachers()
}

func (u *PublicUsecase) GetDownloads() ([]domain.Download, error) {
	return u.publicRepo.GetAllDownloads()
}

func (u *PublicUsecase) GetAlumni() ([]domain.Alumni, error) {
	return u.publicRepo.GetAllAlumni()
}

func (u *PublicUsecase) RegisterPPDB(reg domain.PPDBRegistration) error {
	reg.Status = "Pending"
	return u.publicRepo.CreatePPDBRegistration(&reg)
}
