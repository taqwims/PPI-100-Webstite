# Dokumen Requirements

## Pendahuluan

Dokumen ini mendefinisikan requirements untuk fitur-fitur baru dan perbaikan pada Sistem Informasi Manajemen Sekolah Islam (SDIT-SIMS). Fitur-fitur ini mencakup:

1. **Modul Pembayaran PPDB** — Pembayaran awal untuk calon siswa baru (murid PPDB) yang belum memiliki kelas, mencakup uang bangunan, uang tes kemampuan, dan mekanisme DP 50% uang bangunan sebagai syarat masuk otomatis.
2. **Bulk Pembuatan Akun** — Pembuatan akun pengguna (siswa/guru/orang tua) secara massal via import.
3. **Pembayaran Multi-Tagihan** — Kemampuan memilih dan membayar beberapa tagihan sekaligus dalam satu transaksi.
4. **Invoice Ukuran A5 (Half-A4)** — Format invoice yang dicetak dua per halaman A4 (ukuran A5).
5. **Tabungan per Kelas (Dropdown)** — Filter dropdown per kelas pada halaman manajemen tabungan.
6. **Rekap Tabungan** — Laporan rekap tabungan per bulan, per rentang tanggal, per semester, dan per tahun.
7. **Penggantian Tanda Tangan** — Mengganti peran "Ketua Yayasan" menjadi "Tata Usaha" pada blok tanda tangan invoice.
8. **Perbaikan Toast Notification** — Memastikan notifikasi toast muncul dengan benar dan konsisten di seluruh aplikasi.
9. **Pengelolaan Aset** — Pencatatan dan pengelolaan aset sekolah beserta siklus hidupnya, pencarian/filter, dan laporan rekap aset.

---

## Glosarium

- **System**: Sistem Informasi Manajemen Sekolah Islam (SDIT-SIMS) secara keseluruhan
- **Backend**: Aplikasi Go yang berjalan di server, menangani API dan business logic
- **Frontend**: Aplikasi React yang berjalan di browser
- **PPDB**: Penerimaan Peserta Didik Baru — proses pendaftaran calon siswa baru
- **PPDBRegistration**: Data pendaftaran calon siswa baru (`PPDBRegistration` di domain)
- **PPDBPayment**: Pembayaran yang dilakukan oleh calon siswa baru sebelum resmi menjadi siswa aktif
- **PPDBPaymentItem**: Komponen biaya dalam PPDBPayment (contoh: Uang Bangunan, Uang Tes Kemampuan)
- **DP_Uang_Bangunan**: Uang muka sebesar 50% dari total Uang Bangunan yang wajib dibayar sebagai syarat penerimaan
- **Bill**: Tagihan yang dimiliki oleh siswa aktif (`Bill` di domain)
- **Payment**: Pembayaran atas satu tagihan (`Payment` di domain)
- **MultiBillPayment**: Pembayaran yang mencakup lebih dari satu tagihan dalam satu transaksi
- **Invoice**: Dokumen keuangan yang dicetak sebagai bukti pembayaran
- **InvoiceTemplate**: Fungsi-fungsi pembuat PDF di `frontend/src/utils/invoiceTemplate.ts`
- **SavingAccount**: Akun tabungan milik satu siswa (`SavingAccount` di domain)
- **SavingTransaction**: Transaksi setoran atau penarikan tabungan (`SavingTransaction` di domain)
- **SavingRecap**: Laporan rekap tabungan yang dikelompokkan berdasarkan periode tertentu
- **StakeholderConfig**: Konfigurasi penandatangan invoice (`StakeholderConfig` di domain)
- **Tata_Usaha**: Staf administrasi sekolah yang menggantikan peran Ketua Yayasan pada tanda tangan invoice
- **BulkAccountImport**: Proses pembuatan banyak akun pengguna sekaligus dari file CSV/Excel
- **Class**: Kelas siswa (`Class` di domain)
- **AcademicYear**: Tahun ajaran aktif (`AcademicYear` di domain)
- **Role_ID**: Integer yang merepresentasikan peran user (1=Super Admin, 2=Admin MTS, 3=Admin MA, 9=Bendahara, 10=Tata Usaha)
- **Asset**: Entitas yang merepresentasikan aset fisik milik sekolah (`Asset` di domain)
- **AssetCategory**: Kategori pengelompokan aset (Elektronik, Furnitur, Kendaraan, Bangunan, Perlengkapan)
- **AssetStatus**: Status siklus hidup aset — `Aktif`, `Dalam Perbaikan`, atau `Dihapuskan`
- **AssetRecap**: Laporan ringkasan aset yang dikelompokkan berdasarkan kategori dan status

---

## Requirements

### Requirement 1: Modul Pembayaran PPDB

**User Story:** Sebagai bendahara sekolah, saya ingin dapat mencatat dan mengelola pembayaran dari calon siswa baru (PPDB) sebelum mereka resmi masuk kelas, sehingga proses administrasi keuangan PPDB dapat terlacak dan calon siswa yang sudah memenuhi syarat pembayaran dapat otomatis diterima.

#### Acceptance Criteria

1. THE System SHALL menyediakan entitas `PPDBPayment` yang menyimpan data pembayaran calon siswa baru, terhubung ke `PPDBRegistration` melalui `ppdb_registration_id`
2. THE System SHALL mendukung komponen biaya PPDB berikut sebagai `PPDBPaymentItem`: Uang Bangunan (wajib), Uang Tes Kemampuan (wajib), dan biaya tambahan lainnya yang dapat dikonfigurasi
3. WHEN calon siswa baru melakukan pembayaran, THE System SHALL mencatat setiap `PPDBPaymentItem` dengan nama komponen, jumlah yang seharusnya dibayar, dan jumlah yang sudah dibayar
4. THE System SHALL mewajibkan pembayaran DP_Uang_Bangunan minimal 50% dari total Uang Bangunan sebagai syarat penerimaan
5. WHEN total pembayaran DP_Uang_Bangunan mencapai 50% dari nominal Uang Bangunan yang ditetapkan, THE System SHALL secara otomatis mengubah status `PPDBRegistration` menjadi `Accepted`
6. IF pembayaran DP_Uang_Bangunan kurang dari 50% dari nominal Uang Bangunan, THEN THE System SHALL menolak perubahan status `PPDBRegistration` menjadi `Accepted` dan mengembalikan pesan error yang menjelaskan kekurangan pembayaran
7. THE System SHALL menyediakan endpoint API untuk membuat, membaca, memperbarui, dan menghapus `PPDBPayment`
8. THE System SHALL menyediakan halaman frontend untuk bendahara mencatat pembayaran PPDB, menampilkan rincian komponen biaya dan status pembayaran setiap calon siswa
9. WHEN pembayaran PPDB dicatat, THE System SHALL menghasilkan nomor invoice unik untuk `PPDBPayment` menggunakan mekanisme `InvoiceNumberConfig` yang sudah ada
10. THE System SHALL menampilkan status pembayaran PPDB pada halaman `AdminPPDB` dengan indikator visual yang membedakan: Belum Bayar, DP Terpenuhi, dan Lunas

---

### Requirement 2: Bulk Pembuatan Akun

**User Story:** Sebagai administrator sistem, saya ingin dapat membuat banyak akun pengguna sekaligus melalui import file, sehingga proses onboarding siswa baru di awal tahun ajaran dapat dilakukan secara efisien tanpa harus membuat akun satu per satu.

#### Acceptance Criteria

1. THE System SHALL menyediakan endpoint `POST /users/bulk` yang menerima daftar data pengguna dan membuat akun secara massal
2. THE System SHALL mendukung import data dari format CSV dengan kolom: `name`, `email`, `password`, `role_id`, `unit_id`, dan kolom opsional `nisn`, `class_id` (untuk siswa)
3. WHEN file CSV diupload, THE System SHALL memvalidasi setiap baris data sebelum memproses pembuatan akun
4. IF terdapat baris data yang tidak valid (email duplikat, field wajib kosong, format tidak sesuai), THEN THE System SHALL melaporkan baris mana yang gagal beserta alasannya, tanpa menghentikan pemrosesan baris lain yang valid
5. THE System SHALL mengembalikan ringkasan hasil bulk import: jumlah akun berhasil dibuat, jumlah yang gagal, dan detail error per baris
6. THE System SHALL menyediakan template CSV yang dapat diunduh dari frontend sebagai panduan format import
7. THE Frontend SHALL menampilkan halaman bulk import dengan fitur upload file, preview data sebelum diproses, dan tampilan hasil setelah import
8. WHEN bulk import selesai, THE System SHALL menampilkan notifikasi toast yang merangkum hasil: "X akun berhasil dibuat, Y akun gagal"
9. WHERE role_id adalah Siswa (6) dan class_id disediakan, THE System SHALL secara otomatis membuat record `Student` yang terhubung ke akun yang baru dibuat

---

### Requirement 3: Pembayaran Multi-Tagihan

**User Story:** Sebagai bendahara sekolah, saya ingin dapat memilih beberapa tagihan sekaligus dan memprosesnya dalam satu transaksi pembayaran, sehingga orang tua yang membayar beberapa tagihan sekaligus dapat dilayani lebih cepat dan efisien.

#### Acceptance Criteria

1. THE System SHALL menyediakan endpoint `POST /finance/bills/multi-payment` yang menerima daftar `bill_id` dan data pembayaran untuk memproses pembayaran beberapa tagihan sekaligus
2. WHEN multi-payment diproses, THE System SHALL membuat record `Payment` untuk setiap tagihan yang dipilih dalam satu operasi atomik (semua berhasil atau semua gagal)
3. THE System SHALL memvalidasi bahwa semua `bill_id` yang dikirim milik siswa yang sama sebelum memproses pembayaran
4. IF salah satu tagihan dalam daftar sudah berstatus `Paid`, THEN THE System SHALL mengembalikan error dan tidak memproses pembayaran apapun
5. THE System SHALL menghasilkan satu nomor invoice gabungan untuk seluruh multi-payment, dengan rincian setiap tagihan yang dibayar
6. THE Frontend SHALL menampilkan daftar tagihan dengan checkbox untuk memilih beberapa tagihan sekaligus
7. WHEN pengguna memilih beberapa tagihan, THE Frontend SHALL menampilkan total jumlah yang harus dibayar secara real-time
8. THE Frontend SHALL menghasilkan invoice gabungan dalam format PDF yang mencantumkan semua tagihan yang dibayar dalam satu dokumen
9. WHEN multi-payment berhasil, THE System SHALL memperbarui status setiap tagihan yang terlibat sesuai dengan jumlah yang dibayarkan

---

### Requirement 4: Invoice Ukuran A5 (Half-A4)

**User Story:** Sebagai bendahara sekolah, saya ingin invoice dicetak dalam ukuran A5 (setengah A4) sehingga kertas lebih hemat dan invoice lebih praktis untuk diarsipkan.

#### Acceptance Criteria

1. THE System SHALL menyediakan fungsi `generateInvoiceA5` di `InvoiceTemplate` yang menghasilkan dokumen PDF berukuran A5 (148mm × 210mm)
2. THE System SHALL mencetak dua invoice A5 dalam satu halaman A4 (portrait) dengan layout dua kolom atau dua baris
3. WHEN invoice A5 dicetak, THE System SHALL memuat semua informasi yang sama dengan invoice standar: nomor invoice, nama siswa, rincian tagihan, total, dan blok tanda tangan
4. THE System SHALL menyediakan opsi pada frontend untuk memilih format cetak: A4 standar atau A5 (dua per halaman)
5. WHEN format A5 dipilih, THE System SHALL menggunakan fungsi `drawStandardHeaderA5` yang sudah ada sebagai dasar header invoice
6. THE System SHALL memastikan teks dan elemen grafis pada invoice A5 tetap terbaca dengan ukuran font minimal 6pt

---

### Requirement 5: Tabungan per Kelas (Dropdown Filter)

**User Story:** Sebagai bendahara sekolah, saya ingin dapat memfilter daftar tabungan siswa berdasarkan kelas melalui dropdown, sehingga saya dapat dengan mudah melihat dan mengelola tabungan siswa per kelas tanpa harus mencari satu per satu.

#### Acceptance Criteria

1. THE System SHALL menyediakan parameter query `class_id` pada endpoint `GET /finance/savings/accounts` untuk memfilter akun tabungan berdasarkan kelas
2. THE Frontend SHALL menampilkan dropdown pemilihan kelas pada halaman manajemen tabungan (`Savings.tsx`)
3. WHEN kelas dipilih dari dropdown, THE Frontend SHALL memuat ulang daftar tabungan yang hanya menampilkan siswa dari kelas tersebut
4. THE Frontend SHALL menampilkan opsi "Semua Kelas" sebagai pilihan default yang menampilkan seluruh akun tabungan
5. WHEN filter kelas aktif, THE Frontend SHALL menampilkan label kelas yang sedang difilter pada header tabel tabungan
6. THE System SHALL memuat daftar kelas yang tersedia dari endpoint yang sudah ada (`/academic/classes`) untuk mengisi opsi dropdown

---

### Requirement 6: Rekap Tabungan

**User Story:** Sebagai bendahara sekolah, saya ingin dapat melihat dan mengekspor laporan rekap tabungan berdasarkan periode tertentu (per bulan, per rentang tanggal, per semester, atau per tahun), sehingga saya dapat melaporkan kondisi tabungan siswa kepada pimpinan sekolah secara berkala.

#### Acceptance Criteria

1. THE System SHALL menyediakan endpoint `GET /finance/savings/recap` yang menerima parameter: `period_type` (monthly/range/semester/yearly), `start_date`, `end_date`, `year`, `semester` (1 atau 2), dan `class_id` (opsional)
2. WHEN `period_type` adalah `monthly`, THE System SHALL mengembalikan rekap transaksi tabungan yang dikelompokkan per bulan dalam tahun yang ditentukan
3. WHEN `period_type` adalah `range`, THE System SHALL mengembalikan rekap transaksi tabungan dalam rentang tanggal `start_date` hingga `end_date`
4. WHEN `period_type` adalah `semester`, THE System SHALL mengembalikan rekap transaksi tabungan untuk semester 1 (Juli–Desember) atau semester 2 (Januari–Juni) dari tahun yang ditentukan
5. WHEN `period_type` adalah `yearly`, THE System SHALL mengembalikan rekap transaksi tabungan untuk seluruh tahun yang ditentukan
6. THE System SHALL mengembalikan data rekap yang mencakup: total setoran, total penarikan, saldo akhir per siswa, dan ringkasan keseluruhan
7. THE Frontend SHALL menampilkan halaman atau panel rekap tabungan dengan kontrol pemilihan periode (dropdown period_type, input tanggal, dan filter kelas)
8. THE Frontend SHALL menampilkan tabel rekap dengan kolom: nama siswa, kelas, total setoran, total penarikan, dan saldo akhir pada periode yang dipilih
9. THE Frontend SHALL menyediakan tombol ekspor PDF dan CSV untuk laporan rekap tabungan
10. WHEN ekspor PDF dilakukan, THE System SHALL menghasilkan dokumen PDF yang mencantumkan header sekolah, periode laporan, dan tabel rekap tabungan

---

### Requirement 7: Penggantian Tanda Tangan Invoice

**User Story:** Sebagai administrator sistem, saya ingin mengganti peran "Ketua Yayasan" menjadi "Tata Usaha" pada blok tanda tangan invoice, sehingga dokumen keuangan mencerminkan struktur organisasi yang sebenarnya.

#### Acceptance Criteria

1. THE System SHALL memperbarui data default `StakeholderConfig` sehingga peran `chairman` diganti dengan peran `admin_tu` (Tata Usaha)
2. THE System SHALL memperbarui label tampilan dari "Ketua Yayasan" menjadi "Tata Usaha" pada semua fungsi blok tanda tangan di `InvoiceTemplate`
3. WHEN invoice baru digenerate, THE System SHALL menggunakan label "Tata Usaha" sebagai pengganti "Ketua Yayasan" pada blok tanda tangan
4. THE System SHALL memperbarui nilai default pada fungsi `drawSignatureBlock` dan `drawSignatureBlockCompact` di `invoiceTemplate.ts` sehingga tidak lagi menggunakan `chairman` sebagai role default
5. THE System SHALL memperbarui fungsi `generateLocalSignatures` di `invoiceTemplate.ts` sehingga menggunakan kunci HMAC yang sesuai untuk role `admin_tu`
6. WHEN konfigurasi stakeholder diperbarui melalui halaman `InvoiceConfig`, THE System SHALL menyimpan perubahan dan menerapkannya pada semua invoice yang digenerate setelahnya
7. THE System SHALL memastikan invoice yang sudah ada sebelumnya tidak terpengaruh oleh perubahan konfigurasi tanda tangan (data historis tetap menggunakan nama yang tersimpan saat penandatanganan)

---

### Requirement 8: Perbaikan Toast Notification

**User Story:** Sebagai pengguna sistem, saya ingin notifikasi toast muncul dengan benar pada semua operasi yang relevan, sehingga saya mendapat umpan balik yang jelas atas setiap aksi yang saya lakukan.

#### Acceptance Criteria

1. THE Frontend SHALL menampilkan toast sukses setelah setiap operasi berhasil: pembuatan, pembaruan, dan penghapusan data
2. THE Frontend SHALL menampilkan toast error dengan pesan yang deskriptif ketika operasi API gagal
3. WHEN API mengembalikan error 4xx atau 5xx, THE Frontend SHALL menampilkan pesan error dari response body (`error` atau `message` field) pada toast, bukan pesan generik
4. THE Frontend SHALL memastikan toast tidak muncul duplikat ketika satu operasi memicu beberapa event error secara bersamaan
5. IF toast error sudah ditampilkan oleh interceptor API global, THEN THE Frontend SHALL tidak menampilkan toast error tambahan dari handler lokal komponen untuk error yang sama
6. THE Frontend SHALL menggunakan library toast yang konsisten di seluruh aplikasi (tidak mencampur beberapa library toast berbeda)


---

### Requirement 9: Pengelolaan Aset

**User Story:** Sebagai administrator sekolah, saya ingin dapat mencatat dan mengelola aset milik sekolah beserta siklus hidupnya, sehingga inventaris aset sekolah dapat terpantau dengan baik dan laporan kondisi aset dapat dihasilkan kapan saja.

#### Acceptance Criteria

1. THE System SHALL menyediakan entitas `Asset` yang menyimpan atribut: nama aset, kategori, kondisi, lokasi, nilai perolehan, dan tanggal perolehan
2. THE System SHALL mendukung kategori aset yang dapat dikonfigurasi, minimal mencakup: Elektronik, Furnitur, Kendaraan, Bangunan, dan Perlengkapan
3. THE System SHALL mendukung tiga status siklus hidup aset: `Aktif`, `Dalam Perbaikan`, dan `Dihapuskan`
4. THE System SHALL menyediakan endpoint `POST /assets` untuk membuat data aset baru dengan validasi field wajib: nama, kategori, kondisi, lokasi, nilai perolehan, dan tanggal perolehan
5. THE System SHALL menyediakan endpoint `GET /assets` yang mengembalikan daftar aset dengan dukungan parameter query: `kategori`, `kondisi`, `status`, `lokasi`, dan `keyword` untuk pencarian berdasarkan nama aset
6. THE System SHALL menyediakan endpoint `GET /assets/:id` untuk mengambil detail satu aset berdasarkan ID
7. THE System SHALL menyediakan endpoint `PUT /assets/:id` untuk memperbarui data aset, termasuk perubahan status siklus hidup
8. THE System SHALL menyediakan endpoint `DELETE /assets/:id` untuk menghapus data aset secara permanen
9. WHEN status aset diubah menjadi `Dihapuskan`, THE System SHALL mencatat tanggal penghapusan secara otomatis pada field `deleted_at` di record aset
10. THE System SHALL menyediakan endpoint `GET /assets/recap` yang mengembalikan ringkasan aset: jumlah aset per kategori, jumlah aset per status, dan total nilai aset keseluruhan
11. THE Frontend SHALL menampilkan halaman manajemen aset dengan tabel yang memuat kolom: nama, kategori, kondisi, lokasi, nilai perolehan, tanggal perolehan, dan status
12. THE Frontend SHALL menyediakan form tambah dan edit aset dengan validasi input pada sisi klien sebelum dikirim ke API
13. WHEN pengguna mengisi form aset, THE Frontend SHALL menampilkan dropdown untuk field kategori, kondisi, dan status yang diisi dari data yang tersedia
14. THE Frontend SHALL menyediakan fitur pencarian dan filter aset berdasarkan kategori, kondisi, status, dan kata kunci nama aset
15. WHEN filter atau pencarian diterapkan, THE Frontend SHALL memuat ulang daftar aset secara real-time tanpa reload halaman penuh
16. THE Frontend SHALL menampilkan halaman atau panel rekap aset yang memuat ringkasan jumlah aset per kategori, per status, dan total nilai aset
17. THE Frontend SHALL menyediakan tombol ekspor PDF dan CSV untuk laporan rekap aset
18. WHEN ekspor PDF dilakukan, THE System SHALL menghasilkan dokumen PDF yang mencantumkan header sekolah, tanggal laporan, dan tabel rekap aset
19. IF nilai perolehan aset yang diinput bukan angka positif, THEN THE System SHALL mengembalikan pesan error validasi yang menjelaskan format yang benar
20. IF tanggal perolehan aset yang diinput melebihi tanggal hari ini, THEN THE System SHALL mengembalikan pesan error validasi bahwa tanggal perolehan tidak boleh di masa depan
