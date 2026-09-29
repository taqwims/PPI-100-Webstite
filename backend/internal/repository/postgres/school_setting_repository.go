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
			var existing domain.SchoolSetting
			if err := tx.Where("key = ?", s.Key).First(&existing).Error; err != nil {
				s.IsAdminEdit = true
				if err := tx.Create(&s).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Model(&domain.SchoolSetting{}).
					Where("key = ?", s.Key).
					Update("value", s.Value).Error; err != nil {
					return err
				}
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
		{Key: "landing_slide_1_image", Value: "/images/slider_1.png", Description: "Gambar Slide 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_1_title", Value: "Generasi Qur'ani", Description: "Judul Slide 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_1_subtitle", Value: "Mencetak kader ulama dan pemimpin masa depan yang berakhlak mulia, cerdas, dan berwawasan global.", Description: "Subjudul Slide 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_1_cta", Value: "Daftar Sekarang", Description: "Tombol Slide 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_1_link", Value: "/ppdb", Description: "Link Slide 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_2_image", Value: "/images/slider_2.png", Description: "Gambar Slide 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_2_title", Value: "Lingkungan Islami", Description: "Judul Slide 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_2_subtitle", Value: "Suasana pesantren yang kondusif untuk ibadah dan belajar dengan fasilitas masjid yang megah.", Description: "Subjudul Slide 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_2_cta", Value: "Lihat Profil", Description: "Tombol Slide 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_2_link", Value: "/profile", Description: "Link Slide 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_3_image", Value: "/images/slider_3.png", Description: "Gambar Slide 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_3_title", Value: "Ekstrakurikuler Unggulan", Description: "Judul Slide 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_3_subtitle", Value: "Mengembangkan minat dan bakat santri melalui berbagai kegiatan positif dan berprestasi.", Description: "Subjudul Slide 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_3_cta", Value: "Kegiatan Kami", Description: "Tombol Slide 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_slide_3_link", Value: "/profile", Description: "Link Slide 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_about_title", Value: "Keunggulan Kami", Description: "Judul Bagian Tentang Kami", IsAdminEdit: true},
		{Key: "landing_about_desc", Value: "Fasilitas modern dan kurikulum terintegrasi untuk mendukung perkembangan santri secara holistik.", Description: "Deskripsi Bagian Tentang Kami", IsAdminEdit: true},
		{Key: "landing_feature_1_title", Value: "Kurikulum Terpadu", Description: "Judul Fitur 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_feature_1_desc", Value: "Memadukan kurikulum nasional (Kemendikbud) dan kepesantrenan untuk keseimbangan ilmu dunia dan akhirat.", Description: "Deskripsi Fitur 1 Landing Page", IsAdminEdit: true},
		{Key: "landing_feature_2_title", Value: "Pembinaan Karakter", Description: "Judul Fitur 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_feature_2_desc", Value: "Program pembinaan akhlak, adab, dan kepemimpinan yang intensif 24 jam dalam lingkungan asrama.", Description: "Deskripsi Fitur 2 Landing Page", IsAdminEdit: true},
		{Key: "landing_feature_3_title", Value: "Ekstrakurikuler", Description: "Judul Fitur 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_feature_3_desc", Value: "Beragam kegiatan untuk mengembangkan minat dan bakat santri, mulai dari olahraga, seni, hingga teknologi.", Description: "Deskripsi Fitur 3 Landing Page", IsAdminEdit: true},
		{Key: "landing_cta_title", Value: "Siap Bergabung Menjadi Bagian dari Keluarga Besar Kami?", Description: "Judul Call to Action (CTA)", IsAdminEdit: true},
		{Key: "landing_cta_desc", Value: "Pendaftaran Santri Baru Tahun Ajaran 2025/2026 telah dibuka. Segera daftarkan putra-putri Anda.", Description: "Deskripsi Call to Action (CTA)", IsAdminEdit: true},
		{Key: "landing_cta_btn1_text", Value: "Daftar Sekarang", Description: "Teks Tombol Utama CTA Landing Page", IsAdminEdit: true},
		{Key: "landing_cta_btn1_link", Value: "/ppdb", Description: "Link Tombol Utama CTA Landing Page", IsAdminEdit: true},
		{Key: "landing_cta_btn2_text", Value: "Hubungi Kami", Description: "Teks Tombol Kedua CTA Landing Page", IsAdminEdit: true},
		{Key: "landing_cta_btn2_link", Value: "/contact", Description: "Link Tombol Kedua CTA Landing Page", IsAdminEdit: true},

		// Profile Page
		{Key: "profile_hero_badge", Value: "Tentang Kami", Description: "Badge Header Profil", IsAdminEdit: true},
		{Key: "profile_hero_title_1", Value: "Mengenal Lebih Dekat", Description: "Judul Baris 1 Header Profil", IsAdminEdit: true},
		{Key: "profile_hero_title_2", Value: "SDIT AN-NUR", Description: "Judul Baris 2 Header Profil", IsAdminEdit: true},
		{Key: "profile_hero_desc", Value: "Lembaga pendidikan Islam yang berkomitmen mencetak generasi unggul, berakhlak mulia, dan siap menghadapi tantangan zaman.", Description: "Deskripsi Header Profil", IsAdminEdit: true},
		{Key: "profile_visi_title", Value: "Visi", Description: "Judul Visi Profil", IsAdminEdit: true},
		{Key: "profile_visi_text", Value: "Terwujudnya Pesantren Persatuan Islam yang unggul dalam tafaqquh fiddin, sains, dan teknologi, serta melahirkan kader ulama dan zuama yang berakhlakul karimah.", Description: "Teks Visi Profil", IsAdminEdit: true},
		{Key: "profile_misi_title", Value: "Misi", Description: "Judul Misi Profil", IsAdminEdit: true},
		{Key: "profile_misi_points", Value: "Menyelenggarakan pendidikan kepesantrenan yang berkualitas.\nMengembangkan potensi santri dalam bidang sains dan teknologi.\nMembina akhlak mulia melalui pembiasaan ibadah dan keteladanan.\nMempersiapkan kader pemimpin umat yang amanah dan profesional.", Description: "Poin-poin Misi Profil (1 baris per poin)", IsAdminEdit: true},
		{Key: "profile_sejarah_badge", Value: "Sejarah Perjalanan", Description: "Badge Sejarah Profil", IsAdminEdit: true},
		{Key: "profile_sejarah_title", Value: "Dedikasi Untuk Umat Sejak Awal Berdiri", Description: "Judul Sejarah Profil", IsAdminEdit: true},
		{Key: "profile_sejarah_p1", Value: "SDIT An-Nur didirikan dengan semangat untuk mencerdaskan kehidupan bangsa dan menegakkan syariat Islam.", Description: "Paragraf 1 Sejarah Profil", IsAdminEdit: true},
		{Key: "profile_sejarah_p2", Value: "Sejak awal berdirinya, pesantren ini telah berkontribusi dalam melahirkan lulusan yang berkiprah di berbagai bidang, baik keagamaan maupun kemasyarakatan. Kami terus berkomitmen untuk menjaga tradisi keilmuan Islam sambil beradaptasi dengan perkembangan zaman.", Description: "Paragraf 2 Sejarah Profil", IsAdminEdit: true},
		{Key: "profile_stat_1_val", Value: "1000+", Description: "Nilai Statistik 1 Profil", IsAdminEdit: true},
		{Key: "profile_stat_1_label", Value: "Alumni", Description: "Label Statistik 1 Profil", IsAdminEdit: true},
		{Key: "profile_stat_2_val", Value: "50+", Description: "Nilai Statistik 2 Profil", IsAdminEdit: true},
		{Key: "profile_stat_2_label", Value: "Penghargaan", Description: "Label Statistik 2 Profil", IsAdminEdit: true},
		{Key: "profile_stat_3_val", Value: "15+", Description: "Nilai Statistik 3 Profil", IsAdminEdit: true},
		{Key: "profile_stat_3_label", Value: "Program Studi", Description: "Label Statistik 3 Profil", IsAdminEdit: true},
		{Key: "profile_stat_4_val", Value: "100%", Description: "Nilai Statistik 4 Profil", IsAdminEdit: true},
		{Key: "profile_stat_4_label", Value: "Lulusan Berkualitas", Description: "Label Statistik 4 Profil", IsAdminEdit: true},

		// PPDB Page
		{Key: "ppdb_hero_badge", Value: "Penerimaan Santri Baru", Description: "Badge Header PPDB", IsAdminEdit: true},
		{Key: "ppdb_hero_title_1", Value: "Bergabunglah Menjadi", Description: "Judul Baris 1 PPDB", IsAdminEdit: true},
		{Key: "ppdb_hero_title_2", Value: "Bagian Dari Kami", Description: "Judul Baris 2 PPDB", IsAdminEdit: true},
		{Key: "ppdb_hero_desc", Value: "Isi formulir di bawah ini untuk mendaftarkan putra-putri Anda di lembaga pendidikan kami.", Description: "Deskripsi Header PPDB", IsAdminEdit: true},
		{Key: "ppdb_schedule_info", Value: "Gelombang 1: 1 Januari - 31 Maret\nGelombang 2: 1 April - 30 Juni\nTes Seleksi & Wawancara: Setiap Hari Sabtu", Description: "Informasi Gelombang & Jadwal PPDB", IsAdminEdit: true},
		{Key: "ppdb_requirements_info", Value: "1. Mengisi Formulir Pendaftaran Online\n2. Fotokopi Akta Kelahiran & Kartu Keluarga (KK)\n3. Pas Foto Berwarna 3x4 (2 lembar)\n4. Surat Keterangan Lulus / Ijazah dari sekolah sebelumnya", Description: "Syarat & Ketentuan PPDB", IsAdminEdit: true},
		{Key: "ppdb_contact_wa", Value: "+62 812-3456-7890", Description: "No WhatsApp Helpdesk PPDB", IsAdminEdit: true},

		// Contact & Footer & Social Media
		{Key: "contact_hero_title_1", Value: "Hubungi", Description: "Judul Baris 1 Halaman Kontak", IsAdminEdit: true},
		{Key: "contact_hero_title_2", Value: "Kami", Description: "Judul Baris 2 Halaman Kontak", IsAdminEdit: true},
		{Key: "contact_hero_desc", Value: "Kami siap membantu menjawab pertanyaan Anda seputar sekolah kami.", Description: "Deskripsi Header Kontak", IsAdminEdit: true},
		{Key: "contact_working_hours", Value: "Sabtu - Kamis: 07.00 - 16.00 WIB\nJumat: Libur", Description: "Jam Operasional Kantor", IsAdminEdit: true},
		{Key: "contact_maps_embed", Value: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3955.8361602579007!2d108.6082958!3d-7.4833368!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e658ff346b000e5%3A0x1474cc840c47253f!2sSDIT%20AN-NUR%20BANJARSARI!5e0!3m2!1sen!2sid!4v1776839051104!5m2!1sen!2sid", Description: "URL Embed Google Maps", IsAdminEdit: true},
		{Key: "teachers_page_title", Value: "Dewan Asatidz & Guru", Description: "Judul Halaman Guru", IsAdminEdit: true},
		{Key: "teachers_page_desc", Value: "Mengenal lebih dekat para pengajar yang berdedikasi membimbing santri menuju kesuksesan dunia dan akhirat.", Description: "Deskripsi Halaman Guru", IsAdminEdit: true},
		{Key: "downloads_page_title", Value: "Pusat Unduhan", Description: "Judul Halaman Unduhan", IsAdminEdit: true},
		{Key: "downloads_page_desc", Value: "Akses berbagai dokumen penting, brosur, dan kalender akademik resmi sekolah.", Description: "Deskripsi Halaman Unduhan", IsAdminEdit: true},
		{Key: "alumni_page_title", Value: "Kisah Alumni", Description: "Judul Halaman Alumni", IsAdminEdit: true},
		{Key: "alumni_page_desc", Value: "Inspirasi dari para alumni yang telah berkiprah di berbagai bidang, membawa nilai-nilai luhur ke masyarakat luas.", Description: "Deskripsi Halaman Alumni", IsAdminEdit: true},
		{Key: "social_instagram", Value: "https://www.instagram.com", Description: "Tautan Instagram Sekolah", IsAdminEdit: true},
		{Key: "social_facebook", Value: "https://www.facebook.com", Description: "Tautan Facebook Sekolah", IsAdminEdit: true},
		{Key: "social_youtube", Value: "https://www.youtube.com", Description: "Tautan YouTube Sekolah", IsAdminEdit: true},
		{Key: "social_tiktok", Value: "", Description: "Tautan TikTok Sekolah", IsAdminEdit: true},
		{Key: "social_whatsapp", Value: "", Description: "Tautan WhatsApp Resmi Sekolah", IsAdminEdit: true},
		{Key: "footer_copyright", Value: "© 2026 SDIT An-Nur Banjarsari. All rights reserved.", Description: "Teks Copyright Footer", IsAdminEdit: true},
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
		{Key: "enable_rfid_attendance", Value: "true", Description: "Aktifkan Fitur Presensi RFID & NFC", IsAdminEdit: true},
		{Key: "enable_attendance_wa_notif", Value: "true", Description: "Aktifkan Notifikasi WhatsApp Presensi", IsAdminEdit: true},
		{Key: "attendance_entry_start", Value: "06:00", Description: "Jam Mulai Presensi Masuk (HH:MM)", IsAdminEdit: true},
		{Key: "attendance_late_threshold", Value: "07:15", Description: "Batas Waktu Hadir Tepat Waktu (HH:MM)", IsAdminEdit: true},
		{Key: "attendance_exit_start", Value: "14:00", Description: "Jam Mulai Presensi Pulang (HH:MM)", IsAdminEdit: true},
		{Key: "attendance_cooldown_minutes", Value: "3", Description: "Jeda Anti Double-Tap (Menit)", IsAdminEdit: true},
		{Key: "rfid_device_api_key", Value: "", Description: "API Key Perangkat Scanner IoT (ESP32/Gerbang)", IsAdminEdit: true},
		{Key: "wa_notif_attendance_in", Value: "Assalamu'alaikum Wr. Wb.\n\nDiberitahukan bahwa ananda *{nama_siswa}* ({kelas}) telah hadir di sekolah pada pukul *{waktu}* WIB.\nStatus: *{status}*.\n\nTerima kasih.", Description: "Format Pesan WA Presensi Masuk", IsAdminEdit: true},
		{Key: "wa_notif_attendance_out", Value: "Assalamu'alaikum Wr. Wb.\n\nDiberitahukan bahwa ananda *{nama_siswa}* ({kelas}) telah selesai KBM dan melakukan presensi pulang pada pukul *{waktu}* WIB.\n\nTerima kasih.", Description: "Format Pesan WA Presensi Pulang", IsAdminEdit: true},
		{Key: "allow_delete_paid_obligations", Value: "false", Description: "Izinkan Hapus Tanggungan Terbayar (Mode Koreksi Transaksi)", IsAdminEdit: true},
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
