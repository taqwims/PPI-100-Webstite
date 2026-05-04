# Technical Documentation — SDIT-An-Nur School Information System

**Versi Dokumen**: 1.0  
**Tanggal**: 24 April 2026  
**Module Name**: `SDIT-Finance`

---

## 1. Ringkasan Sistem

PPI-100 SIS (School Information System) adalah sistem manajemen sekolah terintegrasi yang mencakup modul akademik, keuangan, BK, e-learning, PPDB, aset, dan website publik. Sistem dibangun dengan arsitektur **Separated Frontend-Backend** menggunakan REST API.

---

## 2. Technology Stack

### 2.1 Backend
| Komponen | Teknologi | Versi |
|---|---|---|
| Bahasa | Go | 1.25.4 |
| Web Framework | Gin | v1.11.0 |
| ORM | GORM | v1.31.1 |
| Database Driver | pgx (via gorm) | v5.6.0 |
| Authentication | JWT (golang-jwt) | v5.3.0 |
| UUID | google/uuid | v1.6.0 |
| Env Config | godotenv | v1.5.1 |
| Payment Gateway | Midtrans Go | v1.3.8 |
| Password Hashing | golang.org/x/crypto (bcrypt) | v0.45.0 |

### 2.2 Frontend
| Komponen | Teknologi | Versi |
|---|---|---|
| Library | React | 19.2.0 |
| Bahasa | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.2.4 |
| Routing | React Router DOM | 7.9.6 |
| State (Global) | Zustand | 5.0.12 |
| State (Server) | TanStack React Query | 5.90.11 |
| HTTP Client | Axios | 1.13.2 |
| Styling | TailwindCSS | 3.4.17 |
| Animation | Framer Motion | 12.23.25 |
| Icons | Lucide React | 0.554.0 |
| Charts | Recharts | 3.7.0 |
| PDF Generation | jsPDF + jspdf-autotable | 4.2.0 / 5.0.7 |
| UI Primitives | Headless UI | 2.2.9 |
| Toast | React Hot Toast | 2.6.0 |
| QR Code | qrcode | 1.5.4 |

### 2.3 Infrastructure
| Komponen | Teknologi |
|---|---|
| Database | PostgreSQL 15 (Alpine) |
| Containerization | Docker + Docker Compose |
| Frontend Server (Prod) | Nginx (Alpine) |
| Orchestration | Makefile |

---

## 3. Arsitektur Sistem

### 3.1 High-Level Architecture

```
┌──────────────┐     HTTP/REST     ┌──────────────┐     SQL      ┌──────────────┐
│   Frontend   │ ◄──────────────► │   Backend    │ ◄──────────► │  PostgreSQL  │
│  React+Vite  │     :3001/80      │   Go + Gin   │   :5435/5432 │     15       │
└──────────────┘                   └──────────────┘              └──────────────┘
                                          │
                                          ├──► Midtrans (Payment Gateway)
                                          └──► Fonnte (WhatsApp Gateway)
```

### 3.2 Backend — Clean Architecture

Backend mengadopsi pola **Clean Architecture** dengan 4 layer:

```
cmd/                          # Entry points (main.go)
├── api/                      # HTTP Server
├── init_app/                 # App initialization
├── init_admin/               # Admin seeder
├── seeder/                   # Data seeder
├── drop_table/               # Table dropper
├── tester/                   # Test utilities
└── tools/                    # CLI tools

internal/
├── config/                   # Configuration (env-based)
├── domain/                   # Entity & Model definitions (13 files)
├── usecase/                  # Business Logic (38 files, incl. tests)
├── repository/               # Data Access Layer
│   ├── postgres/             # PostgreSQL implementations (29 files)
│   └── mocks/                # Mock repositories for testing
├── delivery/http/
│   ├── handlers/             # HTTP Handlers (29 files)
│   ├── routes/               # Route registrations (5 files)
│   └── middleware/           # Auth, CORS, Feature middleware
└── utils/                    # Shared utilities

pkg/
├── storage/                  # File storage utilities
└── utils/                    # JWT, hashing, etc.
```

**Alur request:**
```
HTTP Request → Middleware (CORS, Auth, RBAC) → Handler → Usecase → Repository → PostgreSQL
```

### 3.3 Frontend Architecture

```
src/
├── App.tsx                   # Root component + routing
├── main.tsx                  # Entry point
├── index.css                 # Global styles
├── context/                  # React Contexts (Auth, AcademicYear)
├── store/                    # Zustand stores (auth, feature, UI)
├── hooks/                    # Custom hooks (10 hooks)
├── services/                 # Axios API client
├── types/                    # TypeScript type definitions
├── utils/                    # Helper functions
├── components/               # Reusable UI components
│   ├── layouts/              # Dashboard & Public layouts
│   ├── ui/                   # Base UI components
│   ├── admin/                # Admin-specific components
│   ├── finance/              # Finance-specific components
│   └── public/               # Public website components
└── pages/                    # Page components (organized by role)
    ├── admin/                # 21 pages
    ├── finance/              # 27 pages
    ├── teacher/              # 7 pages
    ├── student/              # 5 pages
    ├── parent/               # 5 pages
    └── public/               # 8 pages
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

1. User login via `POST /api/auth/login` dengan email + password
2. Backend memverifikasi password (bcrypt) dan menghasilkan **JWT Token**
3. Token disimpan sebagai **httpOnly cookie** (utama) dengan fallback ke `Authorization: Bearer` header
4. Setiap request terproteksi melewati `AuthMiddleware` yang memvalidasi token
5. Claims (userID, roleID, unitID) di-inject ke Gin context

### 4.2 Role-Based Access Control (RBAC)

Sistem memiliki **11 role** yang dikontrol via `RoleMiddleware`:

| Role ID | Nama Role | Akses Utama |
|---------|-----------|-------------|
| 1 | Super Admin | Full access ke semua modul |
| 2 | Admin MTS | Manajemen unit MTS |
| 3 | Admin MA | Manajemen unit MA |
| 4 | Guru | Jadwal, nilai, presensi, BK |
| 5 | Wali Kelas | Homeroom, rapor, data siswa kelas |
| 6 | Siswa | Tagihan, jadwal, e-learning, nilai |
| 7 | Orang Tua | Monitoring anak (tagihan, nilai, BK) |
| 8 | Pimpinan | Dashboard eksekutif, laporan keuangan |
| 9 | Bendahara (Teller) | Full akses keuangan |
| 10 | Tata Usaha | Tabungan, aset, administrasi |
| 11 | Kas Umum | Buku Kas Umum, Infaq harian |

### 4.3 Multi-Unit Support

Sistem mendukung multi-unit (MTS, MA, SDIT, dll.) melalui field `unit_id` pada entitas User, Student, Teacher, dan Class. Unit yang aktif dikonfigurasi melalui env `ENABLED_UNIT_IDS`.

---

## 5. Feature Flags

Sistem menggunakan **Feature Flags** berbasis environment variable untuk mengaktifkan/menonaktifkan modul:

| Feature Flag | Default | Deskripsi |
|---|---|---|
| `FEATURE_BILLING` | `true` | Tagihan & Pembayaran SPP |
| `FEATURE_STUDENT_OBLIGATIONS` | `true` | Tanggungan Siswa |
| `FEATURE_MIDTRANS` | `true` | Payment Gateway Midtrans |
| `FEATURE_SAVINGS` | `true` | Tabungan Siswa |
| `FEATURE_CASH_LEDGER` | `true` | Buku Kas Umum (BKU) |
| `FEATURE_INFAQ` | `true` | Infaq Harian |
| `FEATURE_ACTIVITIES` | `true` | Kegiatan Siswa |
| `FEATURE_PPDB` | `true` | Penerimaan Peserta Didik Baru |
| `FEATURE_WA_GATEWAY` | `true` | Notifikasi WhatsApp |
| `FEATURE_PUBLIC_WEBSITE` | `true` | Website Publik |
| `FEATURE_PAYROLL` | `false` | Penggajian |
| `FEATURE_RKAS` | `false` | RAB/RKAS (Anggaran) |
| `FEATURE_ASSETS` | `false` | Manajemen Aset |
| `FEATURE_EXTERNAL_DEBTS` | `false` | Catatan Hutang |
| `FEATURE_ELEARNING` | `false` | E-Learning |
| `FEATURE_BK` | `false` | Bimbingan Konseling |

---

## 6. Database Schema

### 6.1 Daftar Tabel (43 Tabel)

**Core & Auth (6 tabel):**
- `users` — Data pengguna (semua role)
- `roles` — Master role
- `units` — Unit sekolah (MTS, MA, SDIT)
- `foundations` — Yayasan
- `school_settings` — Pengaturan sekolah (key-value)
- `school_bank_accounts` — Rekening bank sekolah

**Akademik (7 tabel):**
- `students` — Data siswa
- `parents` — Data orang tua
- `teachers` — Data guru
- `classes` — Data kelas
- `subjects` — Mata pelajaran
- `schedules` — Jadwal pelajaran
- `attendances` — Presensi siswa

**Akademik Extended (2 tabel):**
- `academic_years` — Tahun ajaran
- `student_class_histories` — Riwayat kelas siswa

**Keuangan Inti (7 tabel):**
- `bills` — Tagihan siswa
- `bill_items` — Rincian item tagihan
- `bill_templates` — Template tagihan
- `payments` — Pembayaran
- `payment_types` — Jenis pembayaran
- `student_obligations` — Tanggungan siswa
- `transaction_codes` — Kode transaksi akuntansi

**Keuangan Extended (10 tabel):**
- `saving_accounts` — Akun tabungan siswa
- `saving_transactions` — Transaksi tabungan
- `savings_operational_withdrawals` — Penarikan operasional tabungan
- `savings_operational_returns` — Pengembalian operasional tabungan
- `cash_ledgers` — Buku Kas Umum
- `daily_infaqs` — Infaq harian
- `infaq_types` — Jenis infaq
- `payrolls` — Slip gaji
- `payroll_templates` — Template gaji karyawan
- `external_debts` — Catatan hutang
- `external_debt_payments` — Pembayaran hutang

**Anggaran (2 tabel):**
- `budgets` — Item anggaran RKAS/RAB
- `budget_categories` — Kategori anggaran

**Kegiatan (3 tabel):**
- `activities` — Kegiatan siswa
- `activity_obligations` — Tanggungan per siswa per kegiatan
- `activity_transactions` — Transaksi keuangan kegiatan

**PPDB (3 tabel):**
- `ppdb_registrations` — Pendaftaran PPDB
- `ppdb_payments` — Pembayaran PPDB
- `ppdb_payment_items` — Rincian item pembayaran PPDB

**BK (3 tabel):**
- `violations` — Master jenis pelanggaran
- `student_violations` — Catatan pelanggaran siswa
- `bk_calls` — Pemanggilan orang tua

**E-Learning (3 tabel):**
- `materials` — Materi pelajaran
- `tasks` — Tugas
- `task_submissions` — Pengumpulan tugas

**Komunikasi (4 tabel):**
- `notifications` — Notifikasi in-app
- `notification_tokens` — Token push notification
- `contact_messages` — Pesan kontak publik
- `wa_templates` — Template WhatsApp

**Aset (2 tabel):**
- `assets` — Inventaris barang
- `asset_categories` — Kategori aset

**Invoice & Tanda Tangan (3 tabel):**
- `invoice_signatures` — Tanda tangan digital kuitansi
- `invoice_number_configs` — Konfigurasi penomoran kuitansi
- `stakeholder_configs` — Konfigurasi pejabat penandatangan

**Website Publik (3 tabel):**
- `public_teachers` — Profil guru untuk website
- `downloads` — File unduhan publik
- `alumni` — Data alumni

**System (1 tabel):**
- `database_backups` — Riwayat backup database

### 6.2 ERD Ringkas (Relasi Utama)

```mermaid
erDiagram
    User ||--o| Student : "has"
    User ||--o| Parent : "has"
    User ||--o| Teacher : "has"
    User }o--|| Role : "belongs to"
    User }o--|| Unit : "belongs to"
    Student }o--|| Class : "enrolled in"
    Student }o--o| Parent : "child of"
    Class }o--o| Teacher : "homeroom"
    Class }o--|| Unit : "belongs to"
    Schedule }o--|| Class : "for"
    Schedule }o--|| Subject : "of"
    Schedule }o--|| Teacher : "taught by"
    Attendance }o--|| Student : "of"
    Attendance }o--|| Schedule : "for"
    Bill }o--|| Student : "billed to"
    Bill ||--o{ BillItem : "contains"
    Bill ||--o{ Payment : "paid via"
    StudentObligation }o--|| Student : "assigned to"
    StudentObligation }o--|| PaymentType : "type"
    SavingAccount ||--|| Student : "owned by"
    SavingAccount ||--o{ SavingTransaction : "has"
    Payroll }o--|| User : "for employee"
    Activity ||--o{ ActivityObligation : "assigns"
    Activity ||--o{ ActivityTransaction : "has"
```

---

## 7. API Endpoints

### 7.1 Public Routes (Tanpa Auth)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/public/*` | Website publik (profil, guru, download, alumni, kontak) |
| POST | `/api/midtrans/callback` | Webhook Midtrans |
| GET | `/api/verify/:code` | Verifikasi kuitansi |

### 7.2 Protected Route Groups
- `/api/finance/*` — Semua endpoint keuangan (billing, savings, payroll, dll.)
- `/api/academic/*` — Akademik, presensi, jadwal, nilai
- `/api/admin/*` — User management, PPDB, aset, backup, notifikasi
- `/api/profile/*` — Profil pengguna

### 7.3 Jumlah Endpoint per Modul
| Modul | Jumlah Endpoint (Approx.) |
|-------|---------------------------|
| Finance (Billing + Payment) | ~15 |
| Student Obligations | ~8 |
| Savings | ~12 |
| Cash Ledger | ~4 |
| Infaq | ~8 |
| Payroll | ~7 |
| RKAS/Budget | ~8 |
| Activities | ~14 |
| External Debts | ~6 |
| Invoice & Signature | ~8 |
| Academic | ~10 |
| BK | ~6 |
| E-Learning | ~8 |
| PPDB | ~5 |
| Admin (Users, Assets, etc.) | ~15 |
| Public | ~10 |
| **Total** | **~150+** |

---

## 8. Deployment

### 8.1 Docker Compose Services

```yaml
services:
  postgres:    # PostgreSQL 15 Alpine — port 5435:5432
  backend:     # Go API (multi-stage build) — port 8081:8080
  frontend:    # React (Nginx) — port 3001:80
```

### 8.2 Build Commands (Makefile)

```bash
make up      # docker compose up -d
make down    # docker compose down
make build   # docker compose up -d --build
make logs    # docker compose logs -f
```

### 8.3 Environment Variables

File `.env` di root dan di masing-masing folder `backend/` dan `frontend/`. Konfigurasi utama:
- Database: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- Auth: `JWT_SECRET`
- Payment: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`
- WhatsApp: `FONNTE_TOKEN`
- Feature flags: `FEATURE_*`
- Branding: `SCHOOL_NAME`, `SCHOOL_LOGO_URL`, `SCHOOL_ADDRESS`

### 8.4 Database Migration

Menggunakan **GORM AutoMigrate** — migrasi otomatis saat aplikasi startup. Tidak menggunakan migration files manual.

---

## 9. Security

| Aspek | Implementasi |
|-------|--------------|
| Password | Bcrypt hashing |
| Token | JWT dengan expiry |
| Token Storage | httpOnly cookie (XSS-safe) |
| CORS | Middleware Gin |
| RBAC | Role middleware per endpoint |
| Invoice Verification | HMAC-SHA256 digital signature |
| File Upload | Restricted to `/uploads` directory |

---

## 10. External Integrations

| Service | Provider | Fungsi |
|---------|----------|--------|
| Payment Gateway | Midtrans (Snap) | Pembayaran online |
| WhatsApp Gateway | Fonnte | Notifikasi tagihan & reminder |

---

## 11. Testing

Backend memiliki unit test files:
- `asset_test.go` — Test manajemen aset
- `bulk_import_test.go` — Test import massal
- `multi_payment_test.go` — Test multi-payment
- `ppdb_payment_usecase_test.go` — Test pembayaran PPDB
- `savings_filter_test.go` — Test filter tabungan
- `savings_recap_test.go` — Test rekap tabungan

Frontend menggunakan **Vitest** + **Testing Library** (React + jsdom).
