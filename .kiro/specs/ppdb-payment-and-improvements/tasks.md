# Rencana Implementasi: PPDB Payment & Improvements

## Ikhtisar

Implementasi sembilan fitur baru dan perbaikan pada SDIT-SIMS menggunakan Go (clean architecture) di backend dan React + TypeScript di frontend. Setiap fitur mengikuti alur: Domain → Repository → Usecase → Handler → Route → Frontend.

Property-based test menggunakan library `pgregory.net/rapid` (Go).

---

## Tasks

- [x] 1. Modul Pembayaran PPDB — Backend
  - [x] 1.1 Tambahkan model `PPDBPayment` dan `PPDBPaymentItem` ke `backend/internal/domain/models.go`
    - Definisikan struct sesuai desain: field `PPDBRegistrationID`, `InvoiceNumber`, `TotalAmount`, `PaidAmount`, `Status`, relasi `Items`
    - Definisikan struct `PPDBPaymentItem` dengan field `ItemName`, `ExpectedAmount`, `PaidAmount`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Buat `PPDBPaymentRepository` di `backend/internal/repository/postgres/ppdb_payment_repository.go`
    - Implementasikan method: `Create`, `GetByID`, `GetByRegistrationID`, `GetAll`, `Update`, `Delete`
    - Sertakan preload relasi `Items` dan `PPDBRegistration`
    - _Requirements: 1.7_

  - [x] 1.3 Buat `PPDBPaymentUsecase` di `backend/internal/usecase/ppdb_payment_usecase.go`
    - Implementasikan logika DP: hitung `dp_percentage = paid_amount / expected_amount` untuk item "Uang Bangunan"
    - Jika `dp_percentage >= 0.5`, ubah status `PPDBRegistration` menjadi `Accepted` secara otomatis
    - Jika `dp_percentage < 0.5`, kembalikan error dengan pesan kekurangan pembayaran (HTTP 422)
    - Hitung status `PPDBPayment`: `Belum Bayar` → `DP Terpenuhi` → `Lunas`
    - Gunakan `InvoiceNumberConfig` untuk generate nomor invoice unik
    - _Requirements: 1.4, 1.5, 1.6, 1.9_

  - [x] 1.4 Tulis property test untuk logika threshold DP Uang Bangunan
    - **Properti 1: Threshold DP Uang Bangunan**
    - Generate sembarang `expected_amount` (positif) dan `paid_amount` (0 hingga expected_amount * 2)
    - Verifikasi: jika `paid_amount / expected_amount >= 0.5` → status harus `Accepted`; jika < 0.5 → status tidak boleh `Accepted`
    - **Memvalidasi: Requirements 1.4, 1.5, 1.6**

  - [x] 1.5 Tulis property test untuk keunikan nomor invoice PPDB
    - **Properti 2: Nomor Invoice PPDB Unik**
    - Generate N pembayaran PPDB (N antara 2–50), verifikasi semua nomor invoice berbeda
    - **Memvalidasi: Requirements 1.9**

  - [x] 1.6 Tulis property test untuk round-trip item pembayaran PPDB
    - **Properti 3: Pencatatan Item Pembayaran PPDB (Round-Trip)**
    - Generate daftar `PPDBPaymentItem` acak, simpan via mock repository, ambil kembali, verifikasi data identik
    - **Memvalidasi: Requirements 1.3**

  - [x] 1.7 Buat `PPDBPaymentHandler` di `backend/internal/delivery/http/handlers/ppdb_payment_handler.go`
    - Implementasikan handler: `CreatePayment`, `GetPayments`, `GetPaymentByID`, `UpdatePayment`, `DeletePayment`
    - _Requirements: 1.7_

  - [x] 1.8 Daftarkan route PPDB Payment di file routes
    - `POST /ppdb/payments`, `GET /ppdb/payments`, `GET /ppdb/payments/:id`, `PUT /ppdb/payments/:id`, `DELETE /ppdb/payments/:id`
    - Hubungkan handler ke usecase dan repository di dependency injection (`cmd/api/main.go`)
    - _Requirements: 1.7_

- [x] 2. Modul Pembayaran PPDB — Frontend
  - [x] 2.1 Buat halaman `PPDBPayment.tsx` di `frontend/src/pages/admin/`
    - Tampilkan daftar pembayaran PPDB dengan status badge: `Belum Bayar`, `DP Terpenuhi`, `Lunas`
    - Integrasikan sebagai tab baru di `AdminPPDB.tsx`
    - _Requirements: 1.8, 1.10_

  - [x] 2.2 Buat komponen `PPDBPaymentForm` untuk input pembayaran
    - Form dengan field: pilih calon siswa (dari `PPDBRegistration`), rincian item biaya, jumlah yang dibayar
    - Validasi client-side sebelum submit
    - Tampilkan toast sukses setelah pembayaran berhasil dicatat
    - _Requirements: 1.3, 1.8_

  - [x] 2.3 Buat komponen `PPDBPaymentStatusBadge` untuk indikator visual status
    - Warna berbeda untuk setiap status: merah (Belum Bayar), kuning (DP Terpenuhi), hijau (Lunas)
    - _Requirements: 1.10_

- [x] 3. Checkpoint — Pastikan semua tests modul PPDB Payment lulus
  - Pastikan semua tests lulus, tanyakan kepada user jika ada pertanyaan.

- [x] 4. Bulk Pembuatan Akun — Backend
  - [x] 4.1 Tambahkan struct `BulkUserImportRow`, `BulkImportResult`, `BulkImportRowError` ke domain atau usecase
    - Definisikan sesuai desain
    - _Requirements: 2.1, 2.5_

  - [x] 4.2 Implementasikan method `BulkCreateUsers` di `UserUsecase`
    - Iterasi setiap baris, validasi email duplikat dan field wajib
    - Baris valid → buat akun; baris tidak valid → catat error tanpa menghentikan proses
    - Jika `role_id = 6` (Siswa) dan `class_id` tersedia → buat record `Student` yang terhubung
    - Kembalikan `BulkImportResult` dengan ringkasan sukses/gagal
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.9_

  - [x] 4.3 Tulis property test untuk konsistensi hasil bulk import
    - **Properti 4: Konsistensi Hasil Bulk Import**
    - Generate N baris (campuran valid dan tidak valid), verifikasi `success + failed == N`
    - **Memvalidasi: Requirements 2.5**

  - [x] 4.4 Tulis property test untuk validasi baris CSV bulk import
    - **Properti 5: Validasi Baris CSV Bulk Import**
    - Generate baris tidak valid (email duplikat, field kosong), verifikasi baris tersebut ditolak tanpa menghentikan baris lain yang valid
    - **Memvalidasi: Requirements 2.3, 2.4**

  - [x] 4.5 Tulis property test untuk pembuatan record Student pada bulk import
    - **Properti 6: Pembuatan Record Student pada Bulk Import**
    - Generate user dengan `role_id = 6` dan `class_id` valid, verifikasi record `Student` terbuat dan terhubung ke akun
    - **Memvalidasi: Requirements 2.9**

  - [x] 4.6 Tambahkan method `BulkCreateUsers` di `UserHandler` dan daftarkan route `POST /users/bulk`
    - Handler menerima JSON array data pengguna
    - _Requirements: 2.1_

- [ ] 5. Bulk Pembuatan Akun — Frontend
  - [x] 5.1 Buat halaman `BulkImport.tsx` di `frontend/src/pages/admin/`
    - Fitur upload file CSV, preview data sebelum diproses
    - Tampilkan tabel hasil setelah import: baris sukses dan baris gagal beserta alasannya
    - _Requirements: 2.7_

  - [x] 5.2 Implementasikan fungsi `parseCSV` dan `downloadCSVTemplate` di frontend
    - `downloadCSVTemplate` menghasilkan file CSV template dengan header: `name,email,password,role_id,unit_id,nisn,class_id`
    - `parseCSV` mem-parse file CSV yang diupload menjadi array objek
    - _Requirements: 2.2, 2.6_

  - [x] 5.3 Tampilkan toast notifikasi ringkasan setelah bulk import selesai
    - Format: "X akun berhasil dibuat, Y akun gagal"
    - _Requirements: 2.8_

- [x] 6. Pembayaran Multi-Tagihan — Backend
  - [x] 6.1 Implementasikan method `ProcessMultiPayment` di `FinanceUsecase`
    - Validasi semua `bill_id` milik siswa yang sama
    - Validasi tidak ada tagihan yang sudah berstatus `Paid`
    - Buat record `Payment` untuk setiap tagihan dalam satu operasi atomik (database transaction)
    - Generate satu nomor invoice gabungan menggunakan `InvoiceNumberConfig` tipe `MultiBill`
    - Perbarui status setiap tagihan sesuai jumlah yang dibayarkan
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9_

  - [x] 6.2 Tulis property test untuk atomisitas multi-payment
    - **Properti 7: Atomisitas Multi-Payment**
    - Generate daftar tagihan yang mengandung setidaknya satu tagihan tidak valid (sudah Paid atau milik siswa berbeda)
    - Verifikasi tidak ada satu pun record `Payment` yang dibuat
    - **Memvalidasi: Requirements 3.2, 3.3, 3.4**

  - [x] 6.3 Tulis property test untuk pembaruan status tagihan setelah multi-payment
    - **Properti 8: Pembaruan Status Tagihan setelah Multi-Payment**
    - Generate multi-payment yang berhasil, verifikasi status setiap tagihan diperbarui dengan benar (Partial atau Paid)
    - **Memvalidasi: Requirements 3.9**

  - [x] 6.4 Tambahkan method `MultiPayment` di `FinanceHandler` dan daftarkan route `POST /finance/bills/multi-payment`
    - _Requirements: 3.1_

- [x] 7. Pembayaran Multi-Tagihan — Frontend
  - [x] 7.1 Buat komponen `MultiBillSelector` dengan checkbox list tagihan
    - Tampilkan daftar tagihan siswa dengan checkbox untuk memilih beberapa sekaligus
    - Hitung dan tampilkan total jumlah yang harus dibayar secara real-time saat checkbox berubah
    - _Requirements: 3.6, 3.7_

  - [x] 7.2 Integrasikan `MultiBillSelector` ke halaman `Finance.tsx` atau `StudentBillSummary.tsx`
    - Tambahkan tombol "Bayar Terpilih" yang aktif hanya jika minimal 2 tagihan dipilih
    - Setelah multi-payment berhasil, tampilkan toast sukses dan refresh daftar tagihan
    - _Requirements: 3.6_

  - [x] 7.3 Implementasikan generate invoice gabungan PDF untuk multi-payment
    - Invoice mencantumkan semua tagihan yang dibayar dalam satu dokumen
    - _Requirements: 3.5, 3.8_

- [x] 8. Checkpoint — Pastikan semua tests modul Bulk Import dan Multi-Payment lulus
  - Pastikan semua tests lulus, tanyakan kepada user jika ada pertanyaan.

- [x] 9. Invoice Ukuran A5 — Frontend
  - [x] 9.1 Buat fungsi `generateInvoiceA5` di `frontend/src/utils/invoiceTemplate.ts`
    - Buat dokumen PDF berukuran A5 (148mm × 210mm) menggunakan `drawStandardHeaderA5` yang sudah ada
    - Muat semua informasi yang sama dengan invoice standar: nomor invoice, nama siswa, rincian tagihan, total, blok tanda tangan
    - Pastikan ukuran font minimal 6pt agar tetap terbaca
    - _Requirements: 4.1, 4.3, 4.5, 4.6_

  - [x] 9.2 Buat fungsi `generateInvoiceA5Double` untuk mencetak dua invoice A5 dalam satu halaman A4
    - Layout dua baris pada halaman A4 portrait (masing-masing invoice menempati setengah halaman)
    - _Requirements: 4.2_

  - [x] 9.3 Tambahkan opsi format cetak di komponen invoice yang sudah ada
    - Dropdown atau toggle: "A4 Standar" / "A5 (2 per halaman)"
    - _Requirements: 4.4_

- [x] 10. Tabungan per Kelas — Dropdown Filter
  - [x] 10.1 Modifikasi query `GetAccounts` di `SavingsRepository` untuk mendukung parameter `class_id`
    - Tambahkan JOIN ke tabel `students` dan filter `WHERE students.class_id = ?` jika `class_id` diberikan
    - _Requirements: 5.1_

  - [x] 10.2 Tulis property test untuk filter kelas pada tabungan
    - **Properti 9: Filter Kelas pada Tabungan**
    - Generate sembarang `class_id`, verifikasi semua akun tabungan yang dikembalikan milik siswa di kelas tersebut
    - **Memvalidasi: Requirements 5.1**

  - [x] 10.3 Modifikasi handler `GET /finance/savings/accounts` untuk menerima query param `class_id`
    - _Requirements: 5.1_

  - [x] 10.4 Modifikasi `Savings.tsx` di frontend — tambahkan dropdown pemilihan kelas
    - Isi opsi dropdown dari endpoint `/academic/classes`
    - Tambahkan opsi "Semua Kelas" sebagai default
    - Saat kelas dipilih, reload daftar tabungan dengan filter `class_id`
    - Tampilkan label kelas yang sedang difilter pada header tabel
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 11. Rekap Tabungan — Backend
  - [x] 11.1 Tambahkan struct `SavingsRecapParams`, `SavingsRecapRow`, `SavingsRecapResponse` ke domain
    - Definisikan sesuai desain
    - _Requirements: 6.1, 6.6_

  - [x] 11.2 Implementasikan method `GetSavingsRecap` di `SavingsRepository`
    - Query agregasi berdasarkan `period_type`: `monthly`, `range`, `semester`, `yearly`
    - Semester 1 = Juli–Desember, Semester 2 = Januari–Juni
    - Filter opsional `class_id`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 11.3 Tulis property test untuk konsistensi saldo rekap tabungan
    - **Properti 10: Konsistensi Saldo Rekap Tabungan**
    - Generate transaksi setoran dan penarikan acak, verifikasi `end_balance = total_deposit - total_withdraw`
    - **Memvalidasi: Requirements 6.6**

  - [x] 11.4 Tulis property test untuk filter tanggal rekap tabungan
    - **Properti 11: Filter Tanggal Rekap Tabungan**
    - Generate rentang tanggal acak, verifikasi semua transaksi dalam rekap berada dalam rentang tersebut (inklusif)
    - **Memvalidasi: Requirements 6.3**

  - [x] 11.5 Implementasikan method `GetSavingsRecap` di `SavingsUsecase` dan handler `GET /finance/savings/recap`
    - _Requirements: 6.1_

- [x] 12. Rekap Tabungan — Frontend
  - [x] 12.1 Buat panel atau tab `SavingsRecap.tsx` di halaman `Savings.tsx`
    - Kontrol pemilihan periode: dropdown `period_type`, input tanggal, filter kelas
    - Tabel rekap: nama siswa, kelas, total setoran, total penarikan, saldo akhir
    - _Requirements: 6.7, 6.8_

  - [x] 12.2 Implementasikan ekspor PDF dan CSV untuk rekap tabungan
    - PDF menggunakan `jsPDF` dengan header sekolah, periode laporan, dan tabel rekap
    - _Requirements: 6.9, 6.10_

- [x] 13. Checkpoint — Pastikan semua tests modul Tabungan lulus
  - Pastikan semua tests lulus, tanyakan kepada user jika ada pertanyaan.

- [x] 14. Penggantian Tanda Tangan Invoice
  - [x] 14.1 Modifikasi `invoiceTemplate.ts` — ganti default `chairman` menjadi `admin_tu`
    - Di fungsi `drawSignatureBlock` dan `drawSignatureBlockCompact`: ganti entry default `{ role: 'chairman', role_label: 'Ketua Yayasan', ... }` menjadi `{ role: 'admin_tu', role_label: 'Tata Usaha', ... }`
    - Tambahkan key `admin_tu` ke record `KEYS` di fungsi `generateLocalSignatures`
    - Perbarui array `roles` dan `labels` di `generateLocalSignatures` untuk menggunakan `admin_tu`
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 14.2 Perbarui seed/default data `StakeholderConfig` di backend
    - Ganti role `chairman` menjadi `admin_tu` dengan `display_label = "Tata Usaha"` pada data default
    - _Requirements: 7.1, 7.6_

- [x] 15. Perbaikan Toast Notification — Frontend
  - [x] 15.1 Audit seluruh komponen frontend yang menggunakan toast notification
    - Identifikasi komponen yang menggunakan library berbeda atau menampilkan toast error duplikat
    - _Requirements: 8.6_

  - [x] 15.2 Pindahkan penanganan error ke interceptor Axios global di `frontend/src/services/api.ts`
    - Implementasikan interceptor response yang membaca field `error` atau `message` dari response body
    - Tampilkan toast error satu kali dari interceptor; gunakan flag `_suppressToast` untuk mencegah duplikasi
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 15.3 Refactor komponen yang memiliki toast error duplikat
    - Hapus toast error lokal dari handler komponen untuk error yang sudah ditangani interceptor
    - Pastikan toast sukses tetap ditampilkan oleh handler lokal komponen
    - Pastikan hanya satu library toast (`react-hot-toast`) yang digunakan di seluruh aplikasi
    - _Requirements: 8.1, 8.4, 8.5, 8.6_

- [x] 16. Pengelolaan Aset — Backend
  - [x] 16.1 Tambahkan model `Asset`, `AssetRecap`, `AssetCategoryCount`, `AssetStatusCount` ke `backend/internal/domain/models.go`
    - Definisikan struct sesuai desain: field `Name`, `Category`, `Condition`, `Location`, `AcquisitionValue`, `AcquisitionDate`, `Status`, `DeletedAt`, `Notes`, `CreatedByID`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 16.2 Buat `AssetRepository` di `backend/internal/repository/postgres/asset_repository.go`
    - Implementasikan method: `Create`, `GetByID`, `GetAll` (dengan filter `kategori`, `kondisi`, `status`, `lokasi`, `keyword`), `Update`, `Delete`, `GetRecap`
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 9.10_

  - [x] 16.3 Tulis property test untuk filter aset
    - **Properti 12: Filter Aset**
    - Generate kombinasi filter acak (`kategori`, `kondisi`, `status`, `lokasi`, `keyword`), verifikasi semua aset yang dikembalikan memenuhi semua filter yang diterapkan
    - **Memvalidasi: Requirements 9.5**

  - [x] 16.4 Tulis property test untuk konsistensi rekap aset
    - **Properti 13: Rekap Aset Konsisten dengan Data Aktual**
    - Generate kumpulan aset acak, verifikasi jumlah per kategori dan total nilai dalam rekap sesuai data aktual
    - **Memvalidasi: Requirements 9.10**

  - [x] 16.5 Buat `AssetUsecase` di `backend/internal/usecase/asset_usecase.go`
    - Implementasikan logika: validasi `acquisition_value > 0`, validasi `acquisition_date` tidak di masa depan
    - Saat status diubah menjadi `Dihapuskan`, isi `deleted_at` secara otomatis
    - _Requirements: 9.9, 9.19, 9.20_

  - [x] 16.6 Tulis property test untuk pencatatan tanggal penghapusan aset
    - **Properti 14: Pencatatan Tanggal Penghapusan Aset**
    - Generate aset dengan status diubah menjadi `Dihapuskan`, verifikasi `deleted_at` tidak null dan terisi timestamp saat perubahan
    - **Memvalidasi: Requirements 9.9**

  - [x] 16.7 Tulis property test untuk validasi nilai perolehan aset
    - **Properti 15: Validasi Nilai Perolehan Aset**
    - Generate nilai perolehan tidak valid (nol, negatif, atau bukan angka), verifikasi sistem menolak dan mengembalikan pesan error
    - **Memvalidasi: Requirements 9.19**

  - [x] 16.8 Buat `AssetHandler` di `backend/internal/delivery/http/handlers/asset_handler.go`
    - Implementasikan handler: `CreateAsset`, `GetAssets`, `GetAssetByID`, `UpdateAsset`, `DeleteAsset`, `GetAssetRecap`
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 9.10_

  - [x] 16.9 Daftarkan route aset di file routes dan hubungkan dependency injection
    - `POST /assets`, `GET /assets`, `GET /assets/:id`, `PUT /assets/:id`, `DELETE /assets/:id`, `GET /assets/recap`
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 9.10_

- [x] 17. Pengelolaan Aset — Frontend
  - [x] 17.1 Buat halaman `Assets.tsx` di `frontend/src/pages/admin/`
    - Tabel aset dengan kolom: nama, kategori, kondisi, lokasi, nilai perolehan, tanggal perolehan, status
    - Fitur pencarian dan filter berdasarkan kategori, kondisi, status, dan kata kunci nama
    - Filter diterapkan secara real-time tanpa reload halaman penuh
    - _Requirements: 9.11, 9.14, 9.15_

  - [x] 17.2 Buat komponen `AssetForm` untuk tambah dan edit aset
    - Dropdown untuk field kategori, kondisi, dan status
    - Validasi input client-side sebelum submit
    - _Requirements: 9.12, 9.13_

  - [x] 17.3 Buat panel `AssetRecapPanel` untuk rekap aset
    - Tampilkan ringkasan: jumlah aset per kategori, per status, dan total nilai aset
    - Tombol ekspor PDF dan CSV
    - PDF menggunakan `jsPDF` dengan header sekolah, tanggal laporan, dan tabel rekap
    - _Requirements: 9.16, 9.17, 9.18_

- [x] 18. Checkpoint Akhir — Pastikan semua tests lulus
  - Pastikan semua tests lulus, tanyakan kepada user jika ada pertanyaan.

---

## Catatan

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk keterlacakan
- Property test menggunakan `pgregory.net/rapid` dengan minimal 100 iterasi per properti
- Setiap property test diberi tag komentar: `// Feature: ppdb-payment-and-improvements, Property N: <teks properti>`
- Unit test berbasis contoh tetap diperlukan untuk endpoint API, rendering PDF, dan form validasi frontend
