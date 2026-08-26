package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SchoolSettingRepository struct {
	db *gorm.DB
}

func NewSchoolSettingRepository(db *gorm.DB) *SchoolSettingRepository {
	return &SchoolSettingRepository{db: db}
}

func (r *SchoolSettingRepository) GetAll() ([]domain.SchoolSetting, error) {
	var settings []domain.SchoolSetting
	err := r.db.Order("id ASC").Find(&settings).Error
	return settings, err
}

func (r *SchoolSettingRepository) GetByKey(key string) (*domain.SchoolSetting, error) {
	var setting domain.SchoolSetting
	err := r.db.Where("key = ?", key).First(&setting).Error
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func (r *SchoolSettingRepository) BulkUpdate(settings []domain.SchoolSetting) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, s := range settings {
			if err := tx.Model(&domain.SchoolSetting{}).
				Where("key = ?", s.Key).
				Update("value", s.Value).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *SchoolSettingRepository) GetUnits() ([]domain.Unit, error) {
	var units []domain.Unit
	err := r.db.Preload("Foundation").Find(&units).Error
	return units, err
}

func (r *SchoolSettingRepository) GetActiveUnits() ([]domain.Unit, error) {
	var units []domain.Unit
	err := r.db.Preload("Foundation").Where("is_active = ?", true).Find(&units).Error
	return units, err
}

func (r *SchoolSettingRepository) GetFoundations() ([]domain.Foundation, error) {
	var foundations []domain.Foundation
	err := r.db.Find(&foundations).Error
	return foundations, err
}

// Seed creates default school settings if they don't exist yet.
// It reads initial values from the provided defaults map (typically from env vars).
func (r *SchoolSettingRepository) Seed(defaults map[string]string) error {
	seedSettings := []domain.SchoolSetting{
		{Key: "school_name", Value: defaults["school_name"], Description: "Nama Sekolah", IsAdminEdit: true},
		{Key: "school_address", Value: defaults["school_address"], Description: "Alamat Sekolah", IsAdminEdit: true},
		{Key: "school_logo_url", Value: defaults["school_logo_url"], Description: "URL Logo Sekolah", IsAdminEdit: true},
		{Key: "school_phone", Value: "", Description: "Nomor Telepon Sekolah", IsAdminEdit: true},
		{Key: "school_email", Value: "", Description: "Email Sekolah", IsAdminEdit: true},
		{Key: "school_npsn", Value: "", Description: "NPSN Sekolah", IsAdminEdit: true},
		{Key: "foundation_name", Value: "", Description: "Nama Yayasan (Developer Only)", IsAdminEdit: true}, // initially true, updated below
		{Key: "landing_hero_title", Value: "Masa Depan Cerah Dimulai dari Sini", Description: "Judul Hero Landing Page", IsAdminEdit: true},
		{Key: "landing_hero_subtitle", Value: "Mendidik generasi unggul dengan akhlak islami, penguasaan sains, dan kecakapan masa depan.", Description: "Sub-judul Hero Landing Page", IsAdminEdit: true},
		{Key: "landing_about_title", Value: "Keunggulan Kami", Description: "Judul Bagian Tentang Kami", IsAdminEdit: true},
		{Key: "landing_about_desc", Value: "Fasilitas modern dan kurikulum terintegrasi untuk mendukung perkembangan santri secara holistik.", Description: "Deskripsi Bagian Tentang Kami", IsAdminEdit: true},
		{Key: "landing_cta_title", Value: "Siap Bergabung Menjadi Bagian dari Keluarga Besar Kami?", Description: "Judul Call to Action (CTA)", IsAdminEdit: true},
		{Key: "landing_cta_desc", Value: "Pendaftaran Santri Baru Tahun Ajaran 2025/2026 telah dibuka. Segera daftarkan putra-putri Anda.", Description: "Deskripsi Call to Action (CTA)", IsAdminEdit: true},
		{Key: "enable_wa_notifications", Value: "true", Description: "Aktifkan Notifikasi WhatsApp", IsAdminEdit: true},
		{Key: "fonnte_token", Value: defaults["fonnte_token"], Description: "Token API Fonnte", IsAdminEdit: true},
		{Key: "app_notif_bill_student_title", Value: "Tagihan Baru", Description: "Judul Notifikasi Tagihan Baru (Siswa)", IsAdminEdit: true},
		{Key: "app_notif_bill_student_body", Value: "Anda memiliki tagihan baru: {nama_tagihan}", Description: "Konten Notifikasi Tagihan Baru (Siswa)", IsAdminEdit: true},
		{Key: "app_notif_bill_parent_title", Value: "Tagihan Baru untuk Anak Anda", Description: "Judul Notifikasi Tagihan Baru (Wali)", IsAdminEdit: true},
		{Key: "app_notif_bill_parent_body", Value: "Tagihan baru untuk {nama_siswa}: {nama_tagihan}", Description: "Konten Notifikasi Tagihan Baru (Wali)", IsAdminEdit: true},
		{Key: "app_notif_payment_student_title", Value: "Pembayaran Berhasil", Description: "Judul Notifikasi Pembayaran Berhasil (Siswa)", IsAdminEdit: true},
		{Key: "app_notif_payment_student_body", Value: "Pembayaran {nama_tagihan} sebesar {nominal} telah diverifikasi.", Description: "Konten Notifikasi Pembayaran Berhasil (Siswa)", IsAdminEdit: true},
		{Key: "app_notif_payment_parent_title", Value: "Pembayaran Tagihan Anak Berhasil", Description: "Judul Notifikasi Pembayaran Berhasil (Wali)", IsAdminEdit: true},
		{Key: "app_notif_payment_parent_body", Value: "Pembayaran {nama_tagihan} untuk {nama_siswa} sebesar {nominal} telah diverifikasi.", Description: "Konten Notifikasi Pembayaran Berhasil (Wali)", IsAdminEdit: true},
		{Key: "wa_notif_payment_body", Value: "*BUKTI PEMBAYARAN - {nama_sekolah}*\n\nTerima kasih, pembayaran sebesar *{jumlah_bayar}* untuk tagihan *{nama_tagihan}* an. *{nama_siswa}* telah kami terima dan diverifikasi.\n\nTanggal Pembayaran: {tanggal_bayar}\nMetode: {metode_pembayaran}\n\nSemoga berkah.", Description: "Format Pesan WA Bukti Pembayaran Berhasil", IsAdminEdit: true},
		{Key: "active_payment_gateway", Value: "midtrans", Description: "Payment Gateway Aktif (midtrans/xendit/mayar/none)", IsAdminEdit: true},
		{Key: "midtrans_server_key", Value: defaults["midtrans_server_key"], Description: "Midtrans Server Key", IsAdminEdit: true},
		{Key: "midtrans_client_key", Value: defaults["midtrans_client_key"], Description: "Midtrans Client Key", IsAdminEdit: true},
		{Key: "midtrans_is_production", Value: "false", Description: "Midtrans Mode Production (true/false)", IsAdminEdit: true},
		{Key: "xendit_secret_key", Value: "", Description: "Xendit Secret Key", IsAdminEdit: true},
		{Key: "xendit_public_key", Value: "", Description: "Xendit Public Key", IsAdminEdit: true},
		{Key: "xendit_webhook_token", Value: "", Description: "Xendit Webhook Token", IsAdminEdit: true},
		{Key: "xendit_is_production", Value: "false", Description: "Xendit Mode Production (true/false)", IsAdminEdit: true},
		{Key: "mayar_api_key", Value: "", Description: "Mayar API Key", IsAdminEdit: true},
		{Key: "mayar_webhook_token", Value: "", Description: "Mayar Webhook Token", IsAdminEdit: true},
		{Key: "mayar_is_production", Value: "false", Description: "Mayar Mode Production (true/false)", IsAdminEdit: true},
	}

	for _, s := range seedSettings {
		// Only insert if not exists — don't overwrite existing values
		r.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "key"}},
			DoNothing: true,
		}).Create(&s)
	}

	// Fix developer-only fields (GORM ignores false because it's a zero value with default:true)
	r.db.Model(&domain.SchoolSetting{}).Where("key = ?", "foundation_name").Update("is_admin_edit", false)

	return nil
}
