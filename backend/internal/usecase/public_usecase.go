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

func (u *PublicUsecase) GetAllPPDBRegistrations() ([]domain.PPDBRegistration, error) {
	return u.publicRepo.GetAllPPDBRegistrations()
}

func (u *PublicUsecase) GetPPDBRegistrationsByUnit(unitID uint) ([]domain.PPDBRegistration, error) {
	return u.publicRepo.GetPPDBRegistrationsByUnit(unitID)
}

func (u *PublicUsecase) UpdatePPDBStatus(id string, status string) error {
	return u.publicRepo.UpdatePPDBStatus(id, status)
}

func (u *PublicUsecase) CreatePublicTeacher(teacher domain.PublicTeacher) error {
	return u.publicRepo.CreatePublicTeacher(&teacher)
}

func (u *PublicUsecase) CreateDownload(download domain.Download) error {
	return u.publicRepo.CreateDownload(&download)
}

func (u *PublicUsecase) CreateAlumni(alumni domain.Alumni) error {
	return u.publicRepo.CreateAlumni(&alumni)
}

func (u *PublicUsecase) SubmitContact(msg domain.ContactMessage) error {
	return u.publicRepo.CreateContactMessage(&msg)
}

func (u *PublicUsecase) GetContactMessages() ([]domain.ContactMessage, error) {
	return u.publicRepo.GetAllContactMessages()
}

func (u *PublicUsecase) DeleteContactMessage(id string) error {
	return u.publicRepo.DeleteContactMessage(id)
}

func (u *PublicUsecase) UpdatePublicTeacher(teacher domain.PublicTeacher) error {
	return u.publicRepo.UpdatePublicTeacher(&teacher)
}

func (u *PublicUsecase) DeletePublicTeacher(id string) error {
	return u.publicRepo.DeletePublicTeacher(id)
}

func (u *PublicUsecase) UpdateDownload(download domain.Download) error {
	return u.publicRepo.UpdateDownload(&download)
}

func (u *PublicUsecase) DeleteDownload(id string) error {
	return u.publicRepo.DeleteDownload(id)
}

func (u *PublicUsecase) UpdateAlumni(alumni domain.Alumni) error {
	return u.publicRepo.UpdateAlumni(&alumni)
}

func (u *PublicUsecase) DeleteAlumni(id string) error {
	return u.publicRepo.DeleteAlumni(id)
}

func (u *PublicUsecase) DeletePPDBRegistration(id string) error {
	return u.publicRepo.DeletePPDBRegistration(id)
}
