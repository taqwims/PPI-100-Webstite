# Requirements Document

## Introduction

Improvement plan untuk project Sistem Informasi Manajemen Sekolah Islam (SDIT/MTS/MA) yang sudah berjalan. Project ini adalah full-stack application dengan backend Go (Gin + GORM + PostgreSQL) menggunakan clean architecture, dan frontend React 19 + TypeScript + Vite + TailwindCSS. Improvement ini mencakup lima area utama: perbaikan arsitektur backend, penguatan keamanan, refactoring frontend, penambahan test coverage, dan cleanup file-file sisa development. Semua perbaikan dikerjakan bertahap tanpa memutus fungsionalitas yang sudah berjalan.

## Glossary

- **System**: Sistem Informasi Manajemen Sekolah Islam (SIMS) secara keseluruhan
- **Backend**: Aplikasi Go yang berjalan di server, menangani API dan business logic
- **Frontend**: Aplikasi React yang berjalan di browser
- **Handler**: Layer HTTP handler di `backend/internal/delivery/http/handlers/`
- **Usecase**: Layer business logic di `backend/internal/usecase/`
- **Repository**: Layer akses database di `backend/internal/repository/`
- **Clean_Architecture**: Pola arsitektur Handler → Usecase → Repository → Domain
- **Direct_DB_Handler**: Handler yang menerima `*gorm.DB` langsung, bypass usecase layer
- **Debug_File**: File Go di root backend yang berisi kode debug/scratch (`debug_verify.go`, `debug_verify_utils.go`, `scratch_debug_history.go`, `scratch_debug_sigs.go`, `search_code.go`, `test_pay.go`)
- **Role_Middleware**: Fungsi `middleware.RoleMiddleware(...)` yang membatasi akses endpoint berdasarkan role ID
- **PrivateRoute**: Komponen React yang melindungi route dari akses tanpa autentikasi
- **AuthContext**: React context yang menyimpan state autentikasi user
- **API_Client**: Instance axios di `frontend/src/services/api.ts`
- **Custom_Hook**: React hook reusable di `frontend/src/hooks/`
- **Global_State**: State management terpusat menggunakan Zustand atau React Query
- **Type_Definition**: TypeScript interface/type di `frontend/src/types/`
- **Token**: JWT access token yang digunakan untuk autentikasi API
- **localStorage**: Browser storage yang saat ini digunakan untuk menyimpan Token
- **httpOnly_Cookie**: Cookie yang tidak dapat diakses JavaScript, lebih aman dari XSS
- **XSS**: Cross-Site Scripting, serangan injeksi script berbahaya
- **Role_ID**: Integer yang merepresentasikan peran user (1=Super Admin, 2=Admin MTS, 3=Admin MA, 4=Guru, 5=Wali Kelas, 6=Siswa, 7=Orang Tua, 8=Pimpinan, 9=Bendahara, 10=Tata Usaha, 11=Petugas Infaq)
- **Vitest**: Test runner yang sudah terinstall di frontend
- **go_test**: Framework testing bawaan Go
- **Module_Name**: Nama module Go di `go.mod`, saat ini `ppi-100-sis`

---

## Requirements

### Requirement 1: Refactor Direct-DB Handlers ke Clean Architecture

**User Story:** Sebagai developer, saya ingin semua handler mengikuti pola Clean Architecture (Handler → Usecase → Repository), sehingga business logic terisolasi, mudah ditest, dan konsisten di seluruh codebase.

#### Acceptance Criteria

1. THE Backend SHALL memiliki usecase layer untuk setiap handler yang saat ini bypass usecase (`InfaqTypeHandler`, `WATemplateHandler`, `ExternalDebtHandler`, `InvoiceSignatureHandler`)
2. WHEN handler `InfaqTypeHandler` direfactor, THE Backend SHALL menggunakan `InfaqTypeUsecase` sebagai intermediary antara handler dan repository, bukan `*gorm.DB` langsung
3. WHEN handler `WATemplateHandler` direfactor, THE Backend SHALL menggunakan `WATemplateUsecase` sebagai intermediary antara handler dan repository, bukan `*gorm.DB` langsung
4. WHEN handler `ExternalDebtHandler` direfactor, THE Backend SHALL menggunakan `ExternalDebtUsecase` sebagai intermediary antara handler dan repository, bukan `*gorm.DB` langsung
5. WHEN handler `InvoiceSignatureHandler` direfactor, THE Backend SHALL menggunakan `InvoiceSignatureUsecase` sebagai intermediary antara handler dan repository, bukan `*gorm.DB` langsung
6. THE Backend SHALL memiliki repository interface untuk setiap domain baru (`InfaqTypeRepository`, `WATemplateRepository`, `ExternalDebtRepository`, `InvoiceSignatureRepository`) di folder `backend/internal/repository/postgres/`
7. WHEN refactoring selesai, THE Backend SHALL tetap mengekspos semua endpoint yang sama dengan response format yang identik sehingga tidak ada breaking change ke frontend
8. THE Backend SHALL menghapus parameter `*gorm.DB` dari constructor semua handler yang telah direfactor dan menggantinya dengan usecase interface

---

### Requirement 2: Hapus File Debug dan Cleanup Struktur

**User Story:** Sebagai developer, saya ingin repository bersih dari file debug dan folder kosong, sehingga codebase mudah dinavigasi dan tidak ada kebingungan tentang file mana yang aktif digunakan.

#### Acceptance Criteria

1. THE Backend SHALL tidak memiliki file debug di root directory (`debug_verify.go`, `debug_verify_utils.go`, `scratch_debug_history.go`, `scratch_debug_sigs.go`, `search_code.go`, `test_pay.go`)
2. THE Backend SHALL tidak memiliki folder kosong yang tidak digunakan (`backend/internal/handler/`, `backend/internal/middleware/`, `backend/config/`)
3. THE Backend SHALL tidak memiliki file duplikat repository (`backend/internal/repository/finance_extended_repository.go` yang merupakan duplikat dari `backend/internal/repository/postgres/finance_extended_repository.go`)
4. THE Backend SHALL tidak memiliki file SQLite `ppi.db` di root backend directory
5. WHEN cleanup dilakukan, THE Backend SHALL tetap dapat di-build tanpa error (`go build ./...` sukses)
6. THE Backend SHALL memiliki module name di `go.mod` yang konsisten dengan nama project SDIT (bukan `ppi-100-sis`)

---

### Requirement 3: Konsistensi Role-Based Access Control di Backend

**User Story:** Sebagai administrator sistem, saya ingin semua endpoint yang sensitif memiliki role restriction yang konsisten, sehingga tidak ada endpoint yang secara tidak sengaja dapat diakses oleh role yang tidak berwenang.

#### Acceptance Criteria

1. THE Backend SHALL menerapkan `Role_Middleware` pada endpoint `GET /finance/bills` dengan role yang sesuai (minimal role 1, 2, 3, 8, 9)
2. THE Backend SHALL menerapkan `Role_Middleware` pada semua endpoint finance yang saat ini hanya dilindungi `AuthMiddleware` tanpa role restriction
3. WHEN audit role dilakukan, THE Backend SHALL memiliki dokumentasi atau komentar yang menjelaskan role mana yang diizinkan untuk setiap group endpoint
4. IF user dengan role yang tidak diizinkan mengakses endpoint yang dibatasi, THEN THE Backend SHALL mengembalikan HTTP 403 Forbidden dengan pesan error yang jelas
5. THE Backend SHALL memiliki konsistensi antara role yang diizinkan di route definition dan business logic di usecase layer

---

### Requirement 4: Keamanan Token Autentikasi

**User Story:** Sebagai pengguna sistem, saya ingin token autentikasi disimpan dengan cara yang aman dari serangan XSS, sehingga akun saya tidak dapat dibajak melalui injeksi script berbahaya.

#### Acceptance Criteria

1. THE Backend SHALL menyediakan endpoint `POST /auth/logout` yang menghapus httpOnly cookie saat user logout
2. THE Backend SHALL menyediakan mekanisme refresh token atau validasi session yang tidak bergantung pada localStorage
3. WHEN user berhasil login, THE Backend SHALL mengirimkan Token melalui httpOnly cookie sebagai alternatif atau pengganti response body
4. THE Frontend SHALL memiliki interceptor di `API_Client` yang menangani response HTTP 401 dengan melakukan logout otomatis dan redirect ke halaman login
5. THE Frontend SHALL memiliki interceptor di `API_Client` yang menampilkan pesan error yang user-friendly untuk semua response error (4xx, 5xx)
6. IF Token di localStorage sudah ada, THEN THE Frontend SHALL tetap berfungsi untuk backward compatibility selama masa transisi migrasi ke httpOnly cookie

---

### Requirement 5: Role-Based Route Protection di Frontend

**User Story:** Sebagai administrator, saya ingin route di frontend dilindungi berdasarkan role user, sehingga user tidak dapat mengakses halaman yang bukan haknya meskipun mereka sudah login.

#### Acceptance Criteria

1. THE Frontend SHALL memiliki komponen `RoleRoute` yang menerima parameter `allowedRoles` dan melakukan redirect jika role user tidak sesuai
2. WHEN user dengan role Siswa (6) mencoba mengakses route `/dashboard/users`, THE Frontend SHALL melakukan redirect ke halaman yang sesuai dengan role-nya
3. WHEN user dengan role Orang Tua (7) mencoba mengakses route `/dashboard/finance`, THE Frontend SHALL melakukan redirect ke halaman yang sesuai dengan role-nya
4. THE Frontend SHALL menerapkan `RoleRoute` pada semua route admin dan finance yang saat ini hanya dilindungi `PrivateRoute`
5. IF user tidak memiliki akses ke route yang diminta, THEN THE Frontend SHALL menampilkan halaman 403 atau redirect ke dashboard default sesuai role-nya

---

### Requirement 6: Centralized Type Definitions di Frontend

**User Story:** Sebagai developer frontend, saya ingin semua TypeScript type dan interface didefinisikan di satu tempat terpusat, sehingga tidak ada duplikasi type dan perubahan model cukup dilakukan di satu file.

#### Acceptance Criteria

1. THE Frontend SHALL memiliki file type definitions terpusat di `frontend/src/types/` yang mencakup semua domain model (User, Student, Teacher, Bill, Payment, Payroll, dll)
2. THE Frontend SHALL memiliki type definitions yang konsisten dengan response shape dari Backend API
3. WHEN type definition diperbarui, THE Frontend SHALL menggunakan type yang sama di semua komponen dan halaman yang menggunakan data tersebut
4. THE Frontend SHALL memiliki type untuk semua API request dan response yang digunakan di seluruh aplikasi
5. THE Frontend SHALL tidak mendefinisikan interface yang sama secara inline di multiple komponen atau halaman

---

### Requirement 7: Custom Hooks untuk Data Fetching

**User Story:** Sebagai developer frontend, saya ingin logic data fetching dienkapsulasi dalam custom hooks yang reusable, sehingga tidak ada duplikasi kode fetch di setiap halaman dan state management lebih konsisten.

#### Acceptance Criteria

1. THE Frontend SHALL memiliki custom hooks di `frontend/src/hooks/` untuk setiap domain utama (useStudents, useBills, usePayroll, useFinance, dll)
2. WHEN custom hook digunakan, THE Frontend SHALL mengembalikan `{ data, loading, error, refetch }` atau equivalent React Query pattern yang konsisten
3. THE Frontend SHALL menggunakan `@tanstack/react-query` (sudah terinstall) sebagai foundation untuk data fetching dan caching di custom hooks
4. WHEN data fetching error terjadi, THE Frontend SHALL menangani error secara konsisten melalui custom hook tanpa perlu error handling manual di setiap komponen
5. THE Frontend SHALL memiliki minimal satu custom hook per domain yang menggantikan fetch logic yang tersebar di halaman-halaman terkait

---

### Requirement 8: Global State Management

**User Story:** Sebagai developer frontend, saya ingin ada global state management yang terstruktur untuk state yang perlu di-share antar komponen, sehingga tidak ada prop drilling dan state yang tidak konsisten.

#### Acceptance Criteria

1. THE Frontend SHALL memiliki global state store di `frontend/src/store/` menggunakan Zustand atau React Context yang terstruktur
2. THE Frontend SHALL memindahkan state `AuthContext` yang sudah ada ke dalam store yang konsisten dengan pola global state yang dipilih
3. WHEN user melakukan aksi yang mengubah global state (login, logout, update profile), THE Frontend SHALL memperbarui global state secara konsisten di semua komponen yang menggunakannya
4. THE Frontend SHALL memiliki store terpisah untuk domain yang berbeda (authStore, uiStore) untuk menghindari satu store yang terlalu besar
5. WHERE fitur academic year context sudah ada (`AcademicYearContext`), THE Frontend SHALL mengintegrasikannya ke dalam pola global state yang dipilih

---

### Requirement 9: Test Coverage Backend

**User Story:** Sebagai developer, saya ingin ada test coverage untuk business logic di backend, sehingga regression dapat terdeteksi lebih awal dan refactoring dapat dilakukan dengan lebih percaya diri.

#### Acceptance Criteria

1. THE Backend SHALL memiliki unit test untuk setiap usecase yang baru dibuat (InfaqTypeUsecase, WATemplateUsecase, ExternalDebtUsecase, InvoiceSignatureUsecase)
2. THE Backend SHALL memiliki unit test untuk usecase yang sudah ada dengan coverage minimal pada happy path dan error path utama (AuthUsecase, FinanceUsecase)
3. WHEN unit test dijalankan dengan `go test ./...`, THE Backend SHALL menjalankan semua test tanpa error
4. THE Backend SHALL menggunakan mock untuk repository layer dalam unit test usecase, sehingga test tidak bergantung pada database
5. THE Backend SHALL memiliki test untuk middleware `AuthMiddleware` dan `RoleMiddleware` yang memverifikasi behavior autentikasi dan otorisasi
6. FOR ALL usecase functions yang memiliki kondisi error, THE Backend SHALL memiliki test case yang memverifikasi error handling berjalan dengan benar

---

### Requirement 10: Test Coverage Frontend

**User Story:** Sebagai developer, saya ingin ada test coverage untuk komponen dan hooks di frontend, sehingga perubahan UI tidak secara tidak sengaja merusak fungsionalitas yang sudah ada.

#### Acceptance Criteria

1. THE Frontend SHALL memiliki unit test untuk semua custom hooks yang dibuat di Requirement 7 menggunakan Vitest dan `@testing-library/react`
2. THE Frontend SHALL memiliki unit test untuk komponen `PrivateRoute` dan `RoleRoute` yang memverifikasi redirect behavior
3. WHEN test dijalankan dengan `vitest --run`, THE Frontend SHALL menjalankan semua test tanpa error
4. THE Frontend SHALL memiliki test untuk `AuthContext` yang memverifikasi login, logout, dan token persistence
5. THE Frontend SHALL memiliki test untuk `API_Client` interceptors yang memverifikasi handling 401 dan error responses
6. FOR ALL custom hooks, THE Frontend SHALL memiliki test yang memverifikasi loading state, success state, dan error state

---

### Requirement 11: Perbaikan Module Name dan Konsistensi Konfigurasi

**User Story:** Sebagai developer, saya ingin konfigurasi project konsisten dan mencerminkan nama project yang sebenarnya, sehingga tidak ada kebingungan saat onboarding developer baru.

#### Acceptance Criteria

1. THE Backend SHALL memiliki module name di `go.mod` yang mencerminkan nama project SDIT (contoh: `sdit-sims` atau `school-management-system`)
2. WHEN module name diubah, THE Backend SHALL memperbarui semua import path di seluruh file Go yang menggunakan module name lama
3. WHEN module name diubah, THE Backend SHALL tetap dapat di-build tanpa error (`go build ./...` sukses)
4. THE Backend SHALL memiliki file `.env.example` yang mendokumentasikan semua environment variable yang dibutuhkan
5. THE Backend SHALL tidak memiliki hardcoded credential atau secret di source code yang di-commit ke repository
