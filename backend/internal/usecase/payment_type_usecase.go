package usecase

import (
	"errors"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type PaymentTypeUsecase struct {
	repo              *postgres.PaymentTypeRepository
	obligationRepo    *postgres.StudentObligationRepository
	obligationUsecase *StudentObligationUsecase
	schoolSettingRepo *postgres.SchoolSettingRepository
}

func NewPaymentTypeUsecase(repo *postgres.PaymentTypeRepository) *PaymentTypeUsecase {
	return &PaymentTypeUsecase{repo: repo}
}

func (u *PaymentTypeUsecase) SetDependencies(obligationRepo *postgres.StudentObligationRepository, obligationUsecase *StudentObligationUsecase, schoolSettingRepo *postgres.SchoolSettingRepository) {
	u.obligationRepo = obligationRepo
	u.obligationUsecase = obligationUsecase
	u.schoolSettingRepo = schoolSettingRepo
}

func (u *PaymentTypeUsecase) Create(pt *domain.PaymentType) error {
	return u.repo.Create(pt)
}

func (u *PaymentTypeUsecase) GetAll(academicYearID uint) ([]domain.PaymentType, error) {
	return u.repo.GetAll(academicYearID)
}

func (u *PaymentTypeUsecase) GetByID(id uint) (*domain.PaymentType, error) {
	return u.repo.GetByID(id)
}

func (u *PaymentTypeUsecase) Update(pt *domain.PaymentType) error {
	return u.repo.Update(pt)
}

func (u *PaymentTypeUsecase) Delete(id uint) error {
	if u.obligationRepo != nil && u.obligationUsecase != nil {
		obs, err := u.obligationRepo.GetByPaymentTypeID(id)
		if err == nil && len(obs) > 0 {
			hasPaid := false
			for _, ob := range obs {
				if ob.PaidAmount > 0 {
					hasPaid = true
					break
				}
			}

			if hasPaid {
				allowed := false
				if u.schoolSettingRepo != nil {
					if s, err := u.schoolSettingRepo.GetByKey("allow_delete_paid_obligations"); err == nil && s.Value == "true" {
						allowed = true
					}
				}
				if !allowed {
					return errors.New("tidak bisa menghapus jenis pembayaran karena terdapat tanggungan yang sudah memiliki riwayat pembayaran. Aktifkan fitur 'Izinkan Hapus Tanggungan Terbayar' di Pengaturan Sekolah jika ingin menghapus paksa/koreksi")
				}
			}

			// Delete all obligations under this payment type
			for _, ob := range obs {
				if err := u.obligationUsecase.Delete(ob.ID); err != nil {
					return err
				}
			}
		}
	}

	return u.repo.Delete(id)
}
