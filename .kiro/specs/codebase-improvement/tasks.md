# Implementation Plan: Codebase Improvement

## Overview

Rencana implementasi bertahap untuk memperbaiki kualitas codebase SDIT-SIMS. Urutan task dirancang dari yang paling aman (cleanup) ke yang paling berisiko (module name migration), dengan mempertimbangkan dependencies antar task.

## Tasks

- [x] 1. Cleanup file debug dan folder kosong
  - [x] 1.1 Hapus file debug dari root backend
    - Hapus `backend/debug_verify.go` dan `backend/debug_verify_utils.go`
    - Cek dan hapus file debug lain jika ada: `scratch_debug_history.go`, `scratch_debug_sigs.go`, `search_code.go`, `test_pay.go`
    - Hapus file `backend/ppi.db` jika ada
    - Jalankan `go build ./...` untuk memastikan tidak ada error
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 1.2 Hapus folder kosong dan file duplikat
    - Hapus folder kosong `backend/internal/handler/` dan `backend/internal/middleware/`
    - Hapus folder kosong `backend/config/`
    - Hapus file duplikat `backend/internal/repository/finance_extended_repository.go` (bukan yang di subfolder `postgres/`)
    - Jalankan `go build ./...` untuk memastikan tidak ada error
    - _Requirements: 2.2, 2.3, 2.5_

- [x] 2. Buat domain errors dan tambah logout endpoint
  - [x] 2.1 Buat file `backend/internal/domain/errors.go` dengan sentinel errors
    - Definisikan `ErrNotFound`, `ErrValidation`, `ErrForbidden`, `ErrConflict`
    - _Requirements: 1.1_

  - [x] 2.2 Tambah endpoint logout dan update Login untuk set httpOnly cookie
    - Di `backend/internal/delivery/http/handlers/auth_handler.go`, tambah method `Logout` yang menghapus cookie `token`
    - Update method `Login` untuk set httpOnly cookie `token` sekaligus tetap return token di response body (backward compat)
    - Daftarkan route `POST /auth/logout` di `backend/internal/delivery/http/routes/routes.go`
    - _Requirements: 4.1, 4.3_

  - [x] 2.3 Update `AuthMiddleware` untuk support cookie DAN Bearer token
    - Di `backend/internal/delivery/http/middleware/auth.go`, update middleware untuk coba baca token dari httpOnly cookie terlebih dahulu, lalu fallback ke Authorization Bearer header
    - _Requirements: 4.3, 4.6_

  - [ ]* 2.4 Tulis unit test untuk AuthMiddleware
    - Test bahwa request dengan Bearer token valid diteruskan ke handler
    - Test bahwa request dengan httpOnly cookie valid diteruskan ke handler
    - Test bahwa request tanpa token mendapat 401
    - **Property 9: AuthMiddleware accepts both cookie and Bearer token**
    - **Validates: Requirements 4.3, 4.6**
    - _Requirements: 9.5_

- [x] 3. Refactor InfaqType handler ke clean architecture
  - [x] 3.1 Buat repository interface `InfaqTypeRepository` dan implementasinya
    - Buat file `backend/internal/repository/infaq_type_repository.go` dengan interface `InfaqTypeRepository` (Create, GetAll, GetByID, Update, Delete)
    - Buat file `backend/internal/repository/postgres/infaq_type_repository.go` dengan struct `infaqTypeRepository` yang mengimplementasikan interface tersebut menggunakan GORM
    - _Requirements: 1.1, 1.6_

  - [x] 3.2 Buat `InfaqTypeUsecase` interface dan implementasinya
    - Buat file `backend/internal/usecase/infaq_type_usecase.go` dengan interface `InfaqTypeUsecase` dan struct `infaqTypeUsecase`
    - Implementasikan method: `Create`, `GetAll`, `Update`, `Delete`
    - Gunakan `domain.ErrNotFound` dan `domain.ErrValidation` untuk error handling
    - _Requirements: 1.1, 1.2_

  - [x] 3.3 Refactor `InfaqTypeHandler` untuk menggunakan usecase
    - Update `backend/internal/delivery/http/handlers/finance_extended_handler.go` atau buat handler baru
    - Ganti field `db *gorm.DB` dengan `usecase InfaqTypeUsecase` di struct handler
    - Update constructor `NewInfaqTypeHandler` untuk menerima usecase bukan `*gorm.DB`
    - Update `routes.go` untuk meng-inject usecase ke handler
    - _Requirements: 1.2, 1.7, 1.8_

  - [ ]* 3.4 Tulis unit test untuk `InfaqTypeUsecase`
    - Generate mock dengan `mockgen -source=internal/repository/infaq_type_repository.go -destination=internal/repository/mocks/mock_infaq_type_repository.go`
    - Test `Create`: happy path dan repository error
    - Test `GetAll`: happy path dan repository error
    - Test `Update`: happy path, not found, dan repository error
    - Test `Delete`: happy path dan not found
    - **Property 10: Usecase error propagation**
    - **Validates: Requirements 9.1, 9.6**
    - _Requirements: 9.1, 9.4_

- [x] 4. Refactor WATemplate handler ke clean architecture
  - [x] 4.1 Buat repository interface `WATemplateRepository` dan implementasinya
    - Buat file `backend/internal/repository/wa_template_repository.go` dengan interface `WATemplateRepository`
    - Buat file `backend/internal/repository/postgres/wa_template_repository.go` dengan implementasi GORM
    - _Requirements: 1.1, 1.6_

  - [x] 4.2 Buat `WATemplateUsecase` interface dan implementasinya
    - Buat file `backend/internal/usecase/wa_template_usecase.go` dengan interface dan implementasi
    - Implementasikan method: `Create`, `GetAll`, `Update`, `Delete`
    - _Requirements: 1.1, 1.3_

  - [x] 4.3 Refactor `WATemplateHandler` untuk menggunakan usecase
    - Ganti `db *gorm.DB` dengan `usecase WATemplateUsecase`
    - Update constructor dan `routes.go`
    - _Requirements: 1.3, 1.7, 1.8_

  - [ ]* 4.4 Tulis unit test untuk `WATemplateUsecase`
    - Generate mock `WATemplateRepository`
    - Test semua method: happy path dan error path
    - **Property 10: Usecase error propagation**
    - **Validates: Requirements 9.1, 9.6**
    - _Requirements: 9.1, 9.4_

- [x] 5. Refactor ExternalDebt handler ke clean architecture
  - [x] 5.1 Buat repository interface `ExternalDebtRepository` dan implementasinya
    - Buat file `backend/internal/repository/external_debt_repository.go` dengan interface `ExternalDebtRepository` (GetAll, Create, GetByID, Update, Delete, GetPayments, CreatePayment, RecalcStatus)
    - Buat file `backend/internal/repository/postgres/external_debt_repository.go` dengan implementasi GORM
    - Pindahkan logika `recalcStatus` dari handler ke repository implementation
    - _Requirements: 1.1, 1.6_

  - [x] 5.2 Buat `ExternalDebtUsecase` interface dan implementasinya
    - Buat file `backend/internal/usecase/external_debt_usecase.go`
    - Implementasikan method: `GetAll`, `Create`, `Update`, `Delete`, `GetPayments`, `RecordPayment`
    - `RecordPayment` harus menggunakan database transaction untuk atomicity (create payment + update debt status + create BKU/Infaq entry)
    - Gunakan `domain.ErrNotFound` dan `domain.ErrValidation`
    - _Requirements: 1.1, 1.4_

  - [x] 5.3 Refactor `ExternalDebtHandler` untuk menggunakan usecase
    - Ganti `db *gorm.DB` dengan `usecase ExternalDebtUsecase`
    - Update constructor dan `routes.go`
    - _Requirements: 1.4, 1.7, 1.8_

  - [ ]* 5.4 Tulis unit test untuk `ExternalDebtUsecase`
    - Generate mock `ExternalDebtRepository`
    - Test `RecordPayment`: happy path, overpayment error, not found
    - Test status calculation: Unpaid → Partial → Paid
    - **Property 3: ExternalDebt status calculation invariant**
    - **Validates: Requirements 1.4, 9.1**
    - _Requirements: 9.1, 9.4, 9.6_

- [x] 6. Refactor InvoiceSignature handler ke clean architecture
  - [x] 6.1 Buat repository interface `InvoiceSignatureRepository` dan implementasinya
    - Buat file `backend/internal/repository/invoice_signature_repository.go` dengan interface lengkap (FindByTypeAndRef, CreateSignatures, UpdateVerificationCode, FindByVerificationCode, FindByShortCode, GetInvoiceHistory, GetConfigs, GetConfigByType, SaveConfig, GetStakeholders, SaveStakeholder)
    - Buat file `backend/internal/repository/postgres/invoice_signature_repository.go` dengan implementasi GORM
    - Pindahkan semua query DB dari handler ke repository
    - _Requirements: 1.1, 1.6_

  - [x] 6.2 Buat `InvoiceSignatureUsecase` interface dan implementasinya
    - Buat file `backend/internal/usecase/invoice_signature_usecase.go`
    - Implementasikan method: `SignInvoice`, `VerifyInvoice`, `GenerateNumber`, `GetInvoiceHistory`, `GetInvoiceConfigs`, `UpdateInvoiceConfig`, `ResetCounter`, `GetStakeholders`, `UpdateStakeholder`
    - Pindahkan business logic (generate signatures, verify, generate number) dari handler ke usecase
    - _Requirements: 1.1, 1.5_

  - [x] 6.3 Refactor `InvoiceSignatureHandler` untuk menggunakan usecase
    - Ganti `db *gorm.DB` dengan `usecase InvoiceSignatureUsecase`
    - Update constructor dan `routes.go`
    - _Requirements: 1.5, 1.7, 1.8_

  - [ ]* 6.4 Tulis unit test untuk `InvoiceSignatureUsecase`
    - Generate mock `InvoiceSignatureRepository`
    - Test `SignInvoice`: new invoice dan already signed
    - Test `VerifyInvoice`: valid code dan invalid code
    - Test `GenerateNumber`: dengan config dan default
    - **Property 10: Usecase error propagation**
    - **Validates: Requirements 9.1, 9.6**
    - _Requirements: 9.1, 9.4_

- [x] 7. Checkpoint backend refactoring
  - Jalankan `go build ./...` dan pastikan semua handler baru ter-compile
  - Pastikan semua 4 handler sudah tidak menggunakan `*gorm.DB` langsung
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Role-based access control audit dan perbaikan backend
  - [x] 8.1 Audit dan tambah `RoleMiddleware` pada endpoint yang belum terlindungi
    - Di `routes.go`, tambah `middleware.RoleMiddleware(1, 2, 3, 8, 9)` pada `GET /finance/bills` yang saat ini hanya dilindungi `AuthMiddleware`
    - Tambah role restriction pada `POST /finance/bills`, `PUT /finance/bills/:id`, `DELETE /finance/bills/:id`, `POST /finance/payments`, `PUT /finance/payments/:id`, `DELETE /finance/payments/:id`
    - Tambah role restriction pada endpoint `/users/` (hanya role 1, 2, 3)
    - Tambah komentar di `routes.go` yang menjelaskan role yang diizinkan untuk setiap group endpoint
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 8.2 Tulis unit test untuk `RoleMiddleware`
    - Test bahwa role yang tidak diizinkan mendapat HTTP 403
    - Test bahwa role yang diizinkan diteruskan ke handler (tidak mendapat 403)
    - **Property 1: Role middleware blocks unauthorized access**
    - **Property 2: Role middleware allows authorized access**
    - **Validates: Requirements 3.4**
    - _Requirements: 9.5_

- [x] 9. Frontend: Centralized type definitions
  - [x] 9.1 Buat file `frontend/src/types/index.ts` dengan semua domain types
    - Definisikan interface: `User`, `TeacherProfile`, `StudentProfile`, `ParentProfile`, `Student`, `Teacher`, `Class`, `Subject`, `Bill`, `BillItem`, `Payment`, `Payroll`, `PayrollTemplate`, `InfaqType`, `WATemplate`, `ExternalDebt`, `ExternalDebtPayment`, `AcademicYear`, `PaymentType`, `StudentObligation`, `CashLedger`, `DailyInfaq`, `Budget`, `TransactionCode`, `Notification`
    - Pastikan semua type konsisten dengan response shape dari backend API
    - _Requirements: 6.1, 6.2_

  - [x] 9.2 Buat file `frontend/src/types/api.ts` dengan request/response types
    - Definisikan: `LoginRequest`, `LoginResponse`, `PaginatedResponse<T>`, `ApiError`
    - Definisikan request types untuk create/update operations utama
    - _Requirements: 6.4_

- [x] 10. Frontend: Zustand stores
  - [x] 10.1 Install Zustand jika belum ada, buat `frontend/src/store/authStore.ts`
    - Buat `useAuthStore` dengan state: `user`, `token`, `isAuthenticated`
    - Implementasikan actions: `login(token)`, `logout()`, `setUser(user)`
    - Gunakan `persist` middleware Zustand untuk menyimpan ke localStorage
    - Import type `User` dari `src/types/index.ts`
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 10.2 Buat `frontend/src/store/uiStore.ts`
    - Buat `useUIStore` dengan state: `activeAcademicYearId`, `sidebarOpen`
    - Implementasikan actions: `setActiveAcademicYear(id)`, `toggleSidebar()`
    - Integrasikan logika dari `AcademicYearContext` yang sudah ada ke store ini
    - _Requirements: 8.4, 8.5_

  - [x] 10.3 Update `AuthContext` untuk menggunakan `useAuthStore`
    - Refactor `frontend/src/context/AuthContext.tsx` agar `AuthProvider` dan `useAuth` menggunakan `useAuthStore` sebagai backing store
    - Pertahankan API `useAuth()` yang sama agar tidak ada breaking change di komponen yang sudah ada
    - _Requirements: 8.2, 8.3_

  - [ ]* 10.4 Tulis unit test untuk `authStore`
    - Test `login`: token tersimpan di store dan localStorage
    - Test `logout`: token dihapus dari store dan localStorage
    - Test `setUser`: user state terupdate
    - **Property 8: Auth state consistency across store subscribers**
    - **Validates: Requirements 8.3**
    - _Requirements: 10.4_

- [x] 11. Frontend: API client interceptors
  - [x] 11.1 Update `frontend/src/services/api.ts` dengan response interceptor
    - Tambah response interceptor yang menangani HTTP 401: panggil `useAuthStore.getState().logout()` dan redirect ke `/login`
    - Tambah response interceptor yang menampilkan toast error untuk semua response 4xx dan 5xx
    - Ekstrak pesan error dari `error.response?.data?.error` atau `error.response?.data?.message` dengan fallback ke pesan generik
    - _Requirements: 4.4, 4.5_

  - [ ]* 11.2 Tulis unit test untuk API client interceptors
    - Setup MSW (Mock Service Worker) di `frontend/src/test/server.ts`
    - Test interceptor 401: logout dipanggil dan redirect ke `/login`
    - Test interceptor error: toast error ditampilkan untuk 4xx dan 5xx
    - **Property 4: API interceptor handles all 401 responses**
    - **Property 5: API interceptor shows error for all error responses**
    - **Validates: Requirements 4.4, 4.5**
    - _Requirements: 10.5_

- [x] 12. Frontend: Custom hooks dengan React Query
  - [x] 12.1 Setup React Query provider di `frontend/src/main.tsx`
    - Buat `QueryClient` dan wrap aplikasi dengan `QueryClientProvider`
    - Konfigurasi default options: `staleTime`, `retry`
    - _Requirements: 7.3_

  - [x] 12.2 Buat `frontend/src/hooks/useAuth.ts`
    - Hook yang mengekspos `user`, `token`, `isAuthenticated`, `login`, `logout` dari `useAuthStore`
    - Tambah mutation untuk fetch user profile saat token ada
    - _Requirements: 7.1_

  - [x] 12.3 Buat `frontend/src/hooks/useStudents.ts`
    - `useStudents()`: query ke `GET /students/` dengan React Query
    - `useCreateStudent()`: mutation untuk `POST /students/`
    - `useUpdateStudent()`: mutation untuk `PUT /students/:id`
    - `useDeleteStudent()`: mutation untuk `DELETE /students/:id`
    - Semua hooks return shape `{ data, isLoading, error, refetch }`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 12.4 Buat `frontend/src/hooks/useBills.ts`
    - `useBills(filters?)`: query ke `GET /finance/bills`
    - `useCreateBill()`, `useUpdateBill()`, `useDeleteBill()`: mutations
    - `useRecordPayment()`: mutation untuk `POST /finance/payments`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 12.5 Buat `frontend/src/hooks/usePayroll.ts`
    - `usePayrolls(filters?)`: query ke `GET /finance/payroll`
    - `useCreatePayroll()`, `useUpdatePayroll()`, `useDeletePayroll()`, `usePayPayroll()`: mutations
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 12.6 Buat `frontend/src/hooks/useFinance.ts`
    - `useCashLedger(filters?)`: query ke `GET /finance/cash-ledger`
    - `useDailyInfaq(filters?)`: query ke `GET /finance/daily-infaq`
    - `useInfaqTypes()`: query ke `GET /finance/infaq-types`
    - `useWATemplates()`: query ke `GET /finance/wa-templates`
    - `useExternalDebts()`: query ke `GET /finance/debts`
    - Mutations untuk create/update/delete masing-masing
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 12.7 Tulis unit test untuk custom hooks
    - Setup `renderHook` wrapper dengan `QueryClientProvider`
    - Test `useStudents`: loading state, success state, error state
    - Test `useBills`: loading state, success state, error state
    - Test `useAuth`: login dan logout behavior
    - **Property 7: Custom hook return shape consistency**
    - **Validates: Requirements 7.2**
    - _Requirements: 10.1, 10.6_

- [x] 13. Frontend: RoleRoute component
  - [x] 13.1 Buat `frontend/src/components/RoleRoute.tsx`
    - Komponen menerima props: `children`, `allowedRoles: number[]`, `fallback?`
    - Jika user null, redirect ke `/login`
    - Jika `user.role_id` tidak ada di `allowedRoles`, redirect ke default route sesuai role atau render `fallback`
    - Implementasikan fungsi `getDefaultRoute(roleId: number)` dengan mapping semua 11 role
    - Import `user` dari `useAuthStore`
    - _Requirements: 5.1, 5.5_

  - [x] 13.2 Terapkan `RoleRoute` pada route admin dan finance di `App.tsx`
    - Wrap route `/dashboard/users` dengan `RoleRoute allowedRoles={[1, 2, 3]}`
    - Wrap route `/dashboard/finance/*` dengan `RoleRoute allowedRoles={[1, 2, 3, 8, 9]}`
    - Wrap route `/dashboard/payroll` dengan `RoleRoute allowedRoles={[1, 9]}`
    - Wrap route `/dashboard/principal/*` dengan `RoleRoute allowedRoles={[1, 8]}`
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 13.3 Tulis unit test untuk `RoleRoute` dan `PrivateRoute`
    - Test `RoleRoute`: render children jika role diizinkan
    - Test `RoleRoute`: redirect jika role tidak diizinkan
    - Test `RoleRoute`: redirect ke login jika user null
    - Test `PrivateRoute`: render children jika authenticated
    - Test `PrivateRoute`: redirect ke login jika tidak authenticated
    - **Property 6: RoleRoute redirects unauthorized roles**
    - **Validates: Requirements 5.4, 5.5**
    - _Requirements: 10.2_

- [x] 14. Checkpoint frontend
  - Jalankan `npx vitest --run` dan pastikan semua test lulus
  - Pastikan aplikasi masih berjalan normal (tidak ada breaking change)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Backend: unit tests untuk usecase yang sudah ada
  - [x] 15.1 Buat direktori `backend/internal/repository/mocks/` dan generate semua mock
    - Jalankan `mockgen` untuk semua repository interface yang sudah ada dan yang baru dibuat
    - _Requirements: 9.4_

  - [ ]* 15.2 Tulis unit test untuk `AuthUsecase`
    - Test `Login`: happy path (return token), user not found, wrong password
    - Test `Register`: happy path, duplicate email
    - _Requirements: 9.2, 9.6_

  - [ ]* 15.3 Tulis unit test untuk `FinanceUsecase` (happy path dan error path utama)
    - Test `CreateBill`: happy path dan validation error
    - Test `RecordPayment`: happy path dan bill not found
    - _Requirements: 9.2, 9.6_

- [ ] 16. Checkpoint akhir sebelum module migration
  - Jalankan `go test ./...` di backend dan pastikan semua test lulus
  - Jalankan `go build ./...` dan pastikan build sukses
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Module name migration (paling berisiko, lakukan terakhir)
  - [ ] 17.1 Update `go.mod` untuk mengubah module name
    - Ubah baris pertama `go.mod` dari `module ppi-100-sis` menjadi `module sdit-sims`
    - _Requirements: 11.1_

  - [ ] 17.2 Update semua import path di seluruh file Go
    - Jalankan find-and-replace global: ganti semua `"ppi-100-sis/` menjadi `"sdit-sims/` di semua file `.go`
    - File yang perlu diupdate mencakup semua file di `backend/internal/`, `backend/cmd/`, dan `backend/pkg/`
    - _Requirements: 11.2_

  - [ ] 17.3 Verifikasi build setelah module migration
    - Jalankan `go build ./...` dan pastikan tidak ada error
    - Jalankan `go test ./...` dan pastikan semua test masih lulus
    - _Requirements: 11.3_

  - [x] 17.4 Buat file `backend/.env.example`
    - Dokumentasikan semua environment variable yang dibutuhkan: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `WA_API_URL`, `WA_API_KEY`
    - Pastikan tidak ada hardcoded credential di source code
    - _Requirements: 11.4, 11.5_

- [x] 18. Final checkpoint
  - Jalankan `go build ./...` dan `go test ./...` di backend
  - Jalankan `npx vitest --run` di frontend
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Urutan task dirancang dari risiko rendah ke tinggi: cleanup → refactor → security → frontend → tests → migration
- Task 17 (module migration) harus dilakukan terakhir karena mengubah semua import path sekaligus
- Checkpoint di task 7, 14, 16, dan 18 memastikan validasi inkremental
- Property tests memvalidasi correctness properties yang didefinisikan di design document
