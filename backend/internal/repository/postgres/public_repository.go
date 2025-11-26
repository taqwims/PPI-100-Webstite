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
