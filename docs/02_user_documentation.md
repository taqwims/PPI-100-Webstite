# Panduan Pengguna — SDIT-An-Nur School Information System

**Versi Dokumen**: 1.0  
**Tanggal**: 24 April 2026

---

## 1. Pendahuluan

PPI-100 SIS adalah Sistem Informasi Sekolah terpadu yang mengelola seluruh aspek operasional sekolah mulai dari akademik, keuangan, hingga komunikasi orang tua. Sistem ini dapat diakses melalui browser web di komputer maupun perangkat mobile.

---

## 2. Akses Sistem

### 2.1 Login
1. Buka browser dan akses alamat sistem (contoh: `http://sekolah.example.com`)
2. Klik tombol **Login** atau akses `/login`
3. Masukkan **Email** dan **Password** yang telah diberikan
4. Klik **Masuk**
5. Sistem akan mengarahkan ke Dashboard sesuai peran (role) Anda

### 2.2 Peran Pengguna
Setiap pengguna memiliki peran yang menentukan menu dan fitur yang tersedia:

| Peran | Akses |
|-------|-------|
| **Super Admin** | Seluruh modul tanpa terkecuali |
| **Admin Unit** | Manajemen akademik dan administrasi per unit |
| **Bendahara** | Seluruh modul keuangan |
| **Pimpinan** | Dashboard eksekutif, laporan, persetujuan |
| **Guru** | Jadwal mengajar, input nilai, presensi, BK |
| **Wali Kelas** | Data siswa kelas, homeroom, rapor |
| **Siswa** | Jadwal, nilai, tagihan, e-learning |
| **Orang Tua** | Monitoring anak (tagihan, nilai, presensi, BK) |
| **Tata Usaha** | Tabungan, aset, administrasi |
| **Kas Umum** | Buku Kas Umum, Infaq harian |

---

## 3. Website Publik

Website publik dapat diakses tanpa login dan berisi informasi sekolah:

### 3.1 Halaman Utama (Home)
- Informasi umum tentang sekolah
- Pengumuman terbaru

### 3.2 Profil Sekolah
- Visi, misi, dan sejarah sekolah

### 3.3 Daftar Guru
- Profil guru dan tenaga pendidik

### 3.4 PPDB (Pendaftaran Peserta Didik Baru)
- Formulir pendaftaran online
- Status pendaftaran

### 3.5 Download
- Brosur, kalender akademik, dan dokumen lainnya

### 3.6 Alumni
- Testimoni dan profil alumni

### 3.7 Kontak
- Formulir pesan ke pihak sekolah

### 3.8 Verifikasi Kuitansi
- Halaman verifikasi keaslian kuitansi pembayaran menggunakan kode verifikasi

---

## 4. Panduan per Role

### 4.1 Super Admin / Admin Unit

#### Dashboard
- Ringkasan statistik: jumlah siswa, guru, pendapatan, tagihan
- Grafik keuangan

#### Manajemen Pengguna
1. Buka menu **Manajemen User**
2. Klik **Tambah User** untuk membuat akun baru
3. Isi: Nama, Email, Password, Role, Unit
4. Untuk siswa: isi NISN dan pilih Kelas
5. Untuk guru: isi NIP

#### Import Massal (Bulk Import)
1. Buka menu **Bulk Import**
2. Unduh template CSV
3. Isi data sesuai format
4. Upload file CSV
5. Sistem akan memproses dan menampilkan hasil (berhasil/gagal per baris)

#### Manajemen Akademik
- **Kelas**: Tambah/edit kelas, assign wali kelas
- **Mata Pelajaran**: Kelola daftar mapel per unit
- **Jadwal**: Atur jadwal pelajaran per kelas, hari, dan jam
- **Presensi**: Lihat rekap presensi siswa

#### Kenaikan Kelas
1. Buka menu **Kenaikan Kelas**
2. Pilih tahun ajaran dan kelas asal
3. Pilih siswa yang naik kelas
4. Tentukan kelas tujuan
5. Konfirmasi proses

#### Pengaturan Sekolah
- Konfigurasi: nama sekolah, alamat, logo
- Pengaturan fitur yang aktif

#### PPDB
- Lihat daftar pendaftar
- Ubah status: Pending → Accepted / Rejected
- Kelola pembayaran PPDB

#### Manajemen Aset
- Catat inventaris barang sekolah
- Kategori: Elektronik, Furnitur, Kendaraan, Bangunan, Perlengkapan
- Status: Aktif, Dalam Perbaikan, Dihapuskan
- Lihat rekap aset per kategori

#### Backup Database
- Buat backup database manual
- Beri label pada backup
- Restore dari backup sebelumnya

---

### 4.2 Bendahara / Teller

#### Tagihan Siswa (Billing)
1. Buka menu **Keuangan**
2. **Buat Tagihan**:
   - Pilih siswa atau buat tagihan massal (batch)
   - Isi: judul, jenis (SPP/Uang Pangkal/Uang Kegiatan), nominal, jatuh tempo
   - Bisa menggunakan **Template Tagihan** untuk mempercepat
3. **Catat Pembayaran**:
   - Pilih tagihan
   - Masukkan nominal yang dibayar
   - Pilih metode: Transfer, Cash, atau Midtrans
   - Upload bukti transfer (jika ada)
4. **Verifikasi Pembayaran**:
   - Buka menu **Verifikasi Pembayaran**
   - Periksa bukti transfer
   - Approve atau Reject pembayaran

#### Tanggungan Siswa (Student Obligations)
1. Buat **Jenis Pembayaran** (Payment Type): SPP Bulanan, Uang Pangkal, dll.
2. **Assign Tanggungan** ke siswa secara massal per kelas
3. Catat pembayaran tanggungan

#### Tabungan Siswa
1. Buka menu **Tabungan**
2. Cari siswa berdasarkan nama/kelas
3. **Setoran**: Masukkan nominal dan catatan
4. **Penarikan**: Masukkan nominal, siswa menandatangani
5. **Transfer**: Pindahkan saldo antar akun tabungan
6. Lihat rekap tabungan per kelas/periode

#### Buku Kas Umum (BKU)
1. Buka menu **Kas Umum**
2. Tambah entri: Tanggal, Sumber, Nama Item, Jenis (Pemasukan/Pengeluaran), Nominal
3. Pilih kode transaksi dan sumber dana
4. Filter berdasarkan tanggal/kategori

#### Infaq Harian
1. Buka menu **Infaq Harian**
2. Catat infaq masuk per hari/kelas
3. Catat pengeluaran dari dana infaq
4. Kelola jenis infaq (Infaq Jumat, Infaq Ramadhan, dll.)

#### Penggajian (Payroll)
1. Buat **Template Gaji** per karyawan (gaji pokok, tunjangan)
2. Buat slip gaji bulanan
3. Isi potongan (keterlambatan, infaq, kasbon)
4. Sistem menghitung gaji bersih otomatis
5. Tandai sebagai "Dibayar" setelah transfer

#### RKAS / RAB (Anggaran)
1. Buat **Kategori Anggaran**
2. Tambah item anggaran per tahun ajaran
3. Isi: nama item, kuantitas, harga satuan
4. Track realisasi anggaran
5. Lihat summary: rencana vs. realisasi

#### Catatan Hutang
1. Catat hutang ke pihak ketiga
2. Record pembayaran cicilan hutang
3. Tracking status: Belum Bayar → Sebagian → Lunas

#### Kegiatan Siswa
1. Buat kegiatan (misal: Study Tour, Camping)
2. Assign tanggungan biaya ke siswa per kelas
3. Catat pemasukan dari siswa
4. Catat pengeluaran untuk kegiatan
5. Lihat summary (total pemasukan vs pengeluaran)

#### Kuitansi & Invoice
- Cetak kuitansi pembayaran (PDF)
- Konfigurasi penomoran kuitansi
- Tanda tangan digital (HMAC-SHA256)
- Konfigurasi pejabat penandatangan

#### Rekening Sekolah
- Kelola daftar rekening bank sekolah
- Set rekening utama (primer)

---

### 4.3 Pimpinan

#### Dashboard Eksekutif
- Ringkasan keuangan: total pemasukan, pengeluaran, saldo
- Grafik tren keuangan
- Perbandingan anggaran vs. realisasi

#### Dashboard Keuangan
- Statistik tagihan: lunas, belum bayar, overdue
- Status RKAS

#### Laporan
- Generate laporan keuangan per periode
- Export ke PDF

---

### 4.4 Guru

#### Jadwal Mengajar
- Lihat jadwal mengajar per hari

#### Input Nilai
1. Pilih kelas dan mata pelajaran
2. Input nilai per siswa
3. Simpan

#### Presensi
1. Pilih jadwal pelajaran
2. Tandai kehadiran: Hadir, Sakit, Izin, Alpha, Terlambat
3. Metode: Manual atau QR Code

#### Bimbingan Konseling (BK)
- Catat pelanggaran siswa
- Buat surat pemanggilan orang tua
- Track status: Pending → Resolved

#### E-Learning
- Upload materi pelajaran (file)
- Buat tugas dengan deadline
- Lihat pengumpulan tugas siswa
- Input nilai tugas

---

### 4.5 Wali Kelas

#### Homeroom
- Lihat daftar siswa di kelas yang diampu
- Lihat detail siswa (presensi, nilai, BK)

#### Rapor
- Lihat dan cetak rapor per siswa

---

### 4.6 Siswa

#### Dashboard
- Ringkasan: jadwal hari ini, tagihan pending, tugas terbaru

#### Jadwal
- Lihat jadwal pelajaran per hari

#### Nilai
- Lihat nilai per mata pelajaran

#### Tagihan
- Lihat daftar tagihan
- Status pembayaran
- Bayar via Midtrans (online)
- Upload bukti transfer (manual)

#### E-Learning
- Lihat dan unduh materi
- Kumpulkan tugas

#### BK
- Lihat riwayat pelanggaran dan poin

#### Tabungan
- Lihat saldo dan riwayat transaksi tabungan

---

### 4.7 Orang Tua

#### Data Anak
- Lihat daftar anak yang terdaftar di sistem

#### Monitoring per Anak
- **Presensi**: Lihat riwayat kehadiran
- **Nilai**: Lihat nilai mata pelajaran
- **Tagihan**: Lihat status tagihan, bayar online
- **BK**: Lihat riwayat pelanggaran dan pemanggilan
- **Tabungan**: Lihat saldo tabungan anak

---

## 5. Notifikasi

Sistem mengirim notifikasi melalui:
1. **In-App Notification** — Notifikasi di dalam dashboard
2. **WhatsApp** — Reminder tagihan dan informasi penting (via Fonnte)

Jenis notifikasi:
- Tagihan baru / jatuh tempo
- Pembayaran berhasil
- Pemanggilan orang tua (BK)
- Tugas baru (E-Learning)
- Persetujuan RKAS

---

## 6. Pembayaran Online (Midtrans)

### Cara Membayar Online:
1. Buka halaman tagihan
2. Pilih tagihan yang ingin dibayar
3. Klik **Bayar Online**
4. Sistem akan menampilkan halaman pembayaran Midtrans (Snap)
5. Pilih metode pembayaran (Transfer, e-Wallet, dll.)
6. Ikuti instruksi pembayaran
7. Setelah pembayaran berhasil, status tagihan otomatis diperbarui

---

## 7. Pengaturan Profil

Semua pengguna dapat:
1. Mengubah nama dan foto profil
2. Mengubah nomor telepon dan alamat
3. Mengubah password

Akses melalui menu **Pengaturan** di dashboard.

---

## 8. Tips Penggunaan

- **Gunakan filter** pada halaman daftar untuk mempercepat pencarian
- **Tahun Ajaran Aktif** harus di-set terlebih dahulu sebelum menggunakan modul keuangan
- **Template Tagihan** sangat membantu untuk tagihan berulang (SPP bulanan)
- **Bulk Assign** tanggungan siswa per kelas untuk menghemat waktu
- **Backup database** secara berkala sebelum melakukan perubahan besar
- Kuitansi dapat **diverifikasi** keasliannya melalui halaman publik `/verify`
