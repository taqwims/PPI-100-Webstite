package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type PublicRepository struct {
	db *gorm.DB
}

func NewPublicRepository(db *gorm.DB) *PublicRepository {
	return &PublicRepository{db: db}
}

// Public Teacher
func (r *PublicRepository) GetAllPublicTeachers() ([]domain.PublicTeacher, error) {
	var teachers []domain.PublicTeacher
	err := r.db.Find(&teachers).Error
	return teachers, err
}

func (r *PublicRepository) CreatePublicTeacher(teacher *domain.PublicTeacher) error {
	return r.db.Create(teacher).Error
}

// Download
func (r *PublicRepository) GetAllDownloads() ([]domain.Download, error) {
	var downloads []domain.Download
	err := r.db.Find(&downloads).Error
	return downloads, err
}

func (r *PublicRepository) CreateDownload(download *domain.Download) error {
	return r.db.Create(download).Error
}

// Alumni
func (r *PublicRepository) GetAllAlumni() ([]domain.Alumni, error) {
	var alumni []domain.Alumni
	err := r.db.Find(&alumni).Error
	return alumni, err
}

func (r *PublicRepository) CreateAlumni(alumni *domain.Alumni) error {
	return r.db.Create(alumni).Error
}

// PPDB
func (r *PublicRepository) CreatePPDBRegistration(reg *domain.PPDBRegistration) error {
	return r.db.Create(reg).Error
}

func (r *PublicRepository) GetAllPPDBRegistrations() ([]domain.PPDBRegistration, error) {
	var registrations []domain.PPDBRegistration
	err := r.db.Order("created_at desc").Find(&registrations).Error
	return registrations, err
}

func (r *PublicRepository) GetPPDBRegistrationsByUnit(unitID uint) ([]domain.PPDBRegistration, error) {
	var registrations []domain.PPDBRegistration
	err := r.db.Where("unit_id = ?", unitID).Order("created_at desc").Find(&registrations).Error
	return registrations, err
}

func (r *PublicRepository) UpdatePPDBStatus(id string, status string) error {
	return r.db.Model(&domain.PPDBRegistration{}).Where("id = ?", id).Update("status", status).Error
}

// Contact
func (r *PublicRepository) CreateContactMessage(msg *domain.ContactMessage) error {
	return r.db.Create(msg).Error
}

func (r *PublicRepository) GetAllContactMessages() ([]domain.ContactMessage, error) {
	var messages []domain.ContactMessage
	err := r.db.Order("created_at desc").Find(&messages).Error
	return messages, err
}

func (r *PublicRepository) DeleteContactMessage(id string) error {
	return r.db.Delete(&domain.ContactMessage{}, "id = ?", id).Error
}

// Update & Delete for Public Content
func (r *PublicRepository) UpdatePublicTeacher(teacher *domain.PublicTeacher) error {
	return r.db.Save(teacher).Error
}

func (r *PublicRepository) DeletePublicTeacher(id string) error {
	return r.db.Delete(&domain.PublicTeacher{}, "id = ?", id).Error
}

func (r *PublicRepository) UpdateDownload(download *domain.Download) error {
	return r.db.Save(download).Error
}

func (r *PublicRepository) DeleteDownload(id string) error {
	return r.db.Delete(&domain.Download{}, "id = ?", id).Error
}

func (r *PublicRepository) UpdateAlumni(alumni *domain.Alumni) error {
	return r.db.Save(alumni).Error
}

func (r *PublicRepository) DeleteAlumni(id string) error {
	return r.db.Delete(&domain.Alumni{}, "id = ?", id).Error
}

func (r *PublicRepository) DeletePPDBRegistration(id string) error {
	return r.db.Delete(&domain.PPDBRegistration{}, "id = ?", id).Error
}
