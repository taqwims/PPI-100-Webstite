# Design Document: Codebase Improvement

## Overview

Dokumen ini mendeskripsikan desain teknis untuk improvement Sistem Informasi Manajemen Sekolah Islam (SDIT-SIMS). Project ini adalah full-stack application dengan backend Go (Gin + GORM + PostgreSQL) menggunakan clean architecture, dan frontend React 19 + TypeScript + Vite + TailwindCSS.

Improvement mencakup 11 area yang saling berkaitan:
1. Refactor 4 handler yang bypass usecase layer ke clean architecture
2. Cleanup file debug dan folder kosong
3. Konsistensi role-based access control di backend
4. Keamanan token autentikasi (localStorage → httpOnly cookie)
5. Role-based route protection di frontend
6. Centralized TypeScript type definitions
7. Custom hooks architecture dengan React Query
8. Global state management dengan Zustand
9. Test coverage backend (go test + mock)
10. Test coverage frontend (Vitest)
11. Module name migration dari `ppi-100-sis` ke `sdit-sims`

Semua perubahan dikerjakan bertahap tanpa memutus fungsionalitas yang sudah berjalan.

---

## Architecture

### Current State

```
Backend (Go):
  cmd/api/main.go
  internal/
    config/
    delivery/http/
      handlers/     ← 4 handler bypass usecase (direct *gorm.DB)
      middleware/
      routes/
    domain/         ← models
    repository/
      postgres/     ← concrete implementations
    usecase/        ← business logic
  pkg/utils/

Frontend (React):
  src/
    context/        ← AuthContext, AcademicYearContext (manual state)
    hooks/          ← KOSONG
    store/          ← KOSONG
    types/          ← KOSONG
    services/api.ts ← axios tanpa interceptor error handling
    App.tsx         ← semua routes tanpa role protection
```

### Target State

```
Backend (Go):
  internal/
    delivery/http/handlers/  ← semua handler via usecase interface
    repository/
      interfaces/            ← repository interfaces (baru)
      postgres/              ← concrete implementations
    usecase/                 ← semua domain memiliki usecase

Frontend (React):
  src/
    types/
      index.ts               ← semua domain types
      api.ts                 ← request/response types
    hooks/
      useStudents.ts
      useBills.ts
      usePayroll.ts
      useFinance.ts
      useAuth.ts
      (per domain)
    store/
      authStore.ts           ← Zustand auth store
      uiStore.ts             ← Zustand UI store
    services/api.ts          ← axios dengan interceptors lengkap
    components/
      RoleRoute.tsx          ← role-based route guard
```

### Dependency Flow (Clean Architecture)

```
HTTP Request
    ↓
Handler (delivery layer)
    ↓ calls interface
Usecase (business logic)
    ↓ calls interface
Repository Interface
    ↓ implemented by
Postgres Repository
    ↓
Database (PostgreSQL)
```

---

## Components and Interfaces

### 1. Backend: New Usecase Interfaces

Setiap domain baru membutuhkan interface di usecase layer agar handler tidak bergantung pada concrete implementation.

#### InfaqType

```go
// internal/usecase/infaq_type_usecase.go
type InfaqTypeUsecase interface {
    Create(req *domain.InfaqType) error
    GetAll() ([]domain.InfaqType, error)
    Update(id uint, req *domain.InfaqType) error
    Delete(id uint) error
}
```

#### WATemplate

```go
// internal/usecase/wa_template_usecase.go
type WATemplateUsecase interface {
    Create(req *domain.WATemplate) error
    GetAll() ([]domain.WATemplate, error)
    Update(id uint, req *domain.WATemplate) error
    Delete(id uint) error
}
```

#### ExternalDebt

```go
// internal/usecase/external_debt_usecase.go
type ExternalDebtUsecase interface {
    GetAll() ([]domain.ExternalDebt, error)
    Create(req *domain.ExternalDebt, createdByID uuid.UUID) (*domain.ExternalDebt, error)
    Update(id string, req *UpdateExternalDebtRequest) (*domain.ExternalDebt, error)
    Delete(id string) error
    GetPayments(debtID string) ([]domain.ExternalDebtPayment, error)
    RecordPayment(debtID string, req *RecordDebtPaymentRequest, paidByID uuid.UUID) (*domain.ExternalDebtPayment, error)
}
```

#### InvoiceSignature

```go
// internal/usecase/invoice_signature_usecase.go
type InvoiceSignatureUsecase interface {
    SignInvoice(req *SignInvoiceRequest) (*SignInvoiceResponse, error)
    VerifyInvoice(code string) (*VerifyInvoiceResponse, error)
    GenerateNumber(invoiceType string) (string, error)
    GetInvoiceHistory(userID string, roleID int, filters InvoiceHistoryFilters) ([]InvoiceHistorySummary, error)
    GetInvoiceConfigs() ([]domain.InvoiceNumberConfig, error)
    UpdateInvoiceConfig(id uint, req *UpdateInvoiceConfigRequest) (*domain.InvoiceNumberConfig, error)
    ResetCounter(id uint) error
    GetStakeholders() ([]domain.StakeholderConfig, error)
    UpdateStakeholder(id uint, req *UpdateStakeholderRequest) (*domain.StakeholderConfig, error)
}
```

### 2. Backend: New Repository Interfaces

```go
// internal/repository/infaq_type_repository.go
type InfaqTypeRepository interface {
    Create(infaqType *domain.InfaqType) error
    GetAll() ([]domain.InfaqType, error)
    GetByID(id uint) (*domain.InfaqType, error)
    Update(infaqType *domain.InfaqType) error
    Delete(id uint) error
}

// internal/repository/wa_template_repository.go
type WATemplateRepository interface {
    Create(template *domain.WATemplate) error
    GetAll() ([]domain.WATemplate, error)
    GetByID(id uint) (*domain.WATemplate, error)
    Update(template *domain.WATemplate) error
    Delete(id uint) error
}

// internal/repository/external_debt_repository.go
type ExternalDebtRepository interface {
    GetAll() ([]domain.ExternalDebt, error)
    Create(debt *domain.ExternalDebt) error
    GetByID(id string) (*domain.ExternalDebt, error)
    Update(debt *domain.ExternalDebt) error
    Delete(id string) error
    GetPayments(debtID string) ([]domain.ExternalDebtPayment, error)
    CreatePayment(payment *domain.ExternalDebtPayment) error
    RecalcStatus(debtID string) error
}

// internal/repository/invoice_signature_repository.go
type InvoiceSignatureRepository interface {
    FindByTypeAndRef(invoiceType, referenceID string) ([]domain.InvoiceSignature, error)
    CreateSignatures(sigs []domain.InvoiceSignature) error
    UpdateVerificationCode(invoiceType, referenceID, code, docDate string) error
    FindByVerificationCode(code string) ([]domain.InvoiceSignature, error)
    FindByShortCode(code string) ([]domain.InvoiceSignature, error)
    GetInvoiceHistory(filters InvoiceHistoryFilters) ([]InvoiceHistorySummary, error)
    GetConfigs() ([]domain.InvoiceNumberConfig, error)
    GetConfigByType(invoiceType string) (*domain.InvoiceNumberConfig, error)
    SaveConfig(config *domain.InvoiceNumberConfig) error
    GetStakeholders() ([]domain.StakeholderConfig, error)
    SaveStakeholder(config *domain.StakeholderConfig) error
}
```

### 3. Backend: Auth Enhancement

```go
// Tambahan di auth_handler.go
func (h *AuthHandler) Logout(c *gin.Context) {
    c.SetCookie("token", "", -1, "/", "", true, true)
    c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

// Login response: set httpOnly cookie DAN tetap return token di body (backward compat)
func (h *AuthHandler) Login(c *gin.Context) {
    // ... existing logic ...
    c.SetCookie("token", token, 86400*7, "/", "", false, true) // httpOnly=true
    c.JSON(http.StatusOK, gin.H{"token": token}) // backward compat
}
```

```go
// Update AuthMiddleware untuk support cookie DAN Bearer token
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        var tokenStr string
        
        // 1. Try httpOnly cookie first
        if cookie, err := c.Cookie("token"); err == nil {
            tokenStr = cookie
        }
        
        // 2. Fallback to Authorization header (backward compat)
        if tokenStr == "" {
            authHeader := c.GetHeader("Authorization")
            if authHeader != "" {
                parts := strings.Split(authHeader, " ")
                if len(parts) == 2 && parts[0] == "Bearer" {
                    tokenStr = parts[1]
                }
            }
        }
        
        if tokenStr == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
            c.Abort()
            return
        }
        // ... validate token ...
    }
}
```

### 4. Frontend: RoleRoute Component

```tsx
// src/components/RoleRoute.tsx
interface RoleRouteProps {
    children: React.ReactNode;
    allowedRoles: number[];
    fallback?: React.ReactNode;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles, fallback }) => {
    const { user } = useAuthStore();
    
    if (!user) return <Navigate to="/login" />;
    
    if (!allowedRoles.includes(user.role_id)) {
        return fallback ? <>{fallback}</> : <Navigate to={getDefaultRoute(user.role_id)} />;
    }
    
    return <>{children}</>;
};

// Role-to-default-route mapping
const getDefaultRoute = (roleId: number): string => {
    const routes: Record<number, string> = {
        1: '/dashboard',        // Super Admin
        2: '/dashboard',        // Admin MTS
        3: '/dashboard',        // Admin MA
        4: '/dashboard/teacher/schedule', // Guru
        5: '/dashboard/homeroom',         // Wali Kelas
        6: '/dashboard/bills',            // Siswa
        7: '/dashboard/children',         // Orang Tua
        8: '/dashboard/principal/finance-summary', // Pimpinan
        9: '/dashboard/finance/cash-ledger',       // Bendahara
        10: '/dashboard',       // Tata Usaha
        11: '/dashboard/finance/daily-infaq',      // Petugas Infaq
    };
    return routes[roleId] ?? '/dashboard';
};
```

### 5. Frontend: Zustand Stores

```ts
// src/store/authStore.ts
interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: localStorage.getItem('token'),
            isAuthenticated: !!localStorage.getItem('token'),
            login: (token) => {
                localStorage.setItem('token', token);
                set({ token, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem('token');
                set({ user: null, token: null, isAuthenticated: false });
            },
            setUser: (user) => set({ user }),
        }),
        { name: 'auth-storage' }
    )
);

// src/store/uiStore.ts
interface UIState {
    activeAcademicYearId: number | null;
    sidebarOpen: boolean;
    setActiveAcademicYear: (id: number | null) => void;
    toggleSidebar: () => void;
}
```

### 6. Frontend: Custom Hooks Pattern

```ts
// src/hooks/useStudents.ts
export const useStudents = () => {
    return useQuery({
        queryKey: ['students'],
        queryFn: () => api.get('/students/').then(r => r.data),
    });
};

export const useCreateStudent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStudentRequest) => api.post('/students/', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
    });
};
```

### 7. Frontend: API Client dengan Interceptors

```ts
// src/services/api.ts
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        
        const message = error.response?.data?.error 
            ?? error.response?.data?.message 
            ?? 'Terjadi kesalahan. Silakan coba lagi.';
        
        toast.error(message);
        return Promise.reject(error);
    }
);
```

---

## Data Models

### Backend: New Domain Models (sudah ada di domain/invoice_models.go)

Model-model berikut sudah ada di codebase dan tidak perlu diubah:
- `InfaqType` — di `domain/models.go`
- `WATemplate` — di `domain/models.go`
- `ExternalDebt`, `ExternalDebtPayment` — di `domain/invoice_models.go`
- `InvoiceSignature`, `InvoiceNumberConfig`, `StakeholderConfig` — di `domain/invoice_models.go`

### Frontend: Centralized Type Definitions

```ts
// src/types/index.ts

export interface User {
    id: string;
    name: string;
    email: string;
    role_id: number;
    unit_id: number;
    photo_url?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_holder?: string;
    teacher?: TeacherProfile;
    student?: StudentProfile;
    parent?: ParentProfile;
    created_at: string;
    updated_at: string;
}

export interface Student {
    id: string;
    user_id: string;
    user: User;
    nisn: string;
    class_id: number;
    class: Class;
    parent_id?: string;
    unit_id: number;
    status: 'Active' | 'Graduated' | 'Transferred';
}

export interface Bill {
    id: string;
    student_id: string;
    student: Student;
    title: string;
    amount: number;
    due_date: string;
    status: 'Unpaid' | 'Paid' | 'Partial' | 'Overdue';
    invoice_number: string;
    bill_type: string;
    items?: BillItem[];
    payments?: Payment[];
}

export interface InfaqType {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WATemplate {
    id: number;
    name: string;
    body_template: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface ExternalDebt {
    id: string;
    creditor_name: string;
    description: string;
    amount: number;
    paid_amount: number;
    status: 'Unpaid' | 'Partial' | 'Paid';
    due_date?: string;
    notes: string;
    created_by_id: string;
    created_at: string;
}

// src/types/api.ts — request/response shapes
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { token: string; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; }
export interface ApiError { error: string; }
```

### Module Name Migration

```
Sebelum: module ppi-100-sis
Sesudah: module sdit-sims

Semua import path yang berubah:
  "ppi-100-sis/internal/..." → "sdit-sims/internal/..."
  "ppi-100-sis/pkg/..."      → "sdit-sims/pkg/..."
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role middleware blocks unauthorized access

*For any* HTTP endpoint yang dilindungi `RoleMiddleware` dan *any* request dengan role ID yang tidak termasuk dalam daftar allowed roles, sistem SHALL mengembalikan HTTP 403 Forbidden.

**Validates: Requirements 3.4**

### Property 2: Role middleware allows authorized access

*For any* HTTP endpoint yang dilindungi `RoleMiddleware` dan *any* request dengan role ID yang termasuk dalam daftar allowed roles, sistem SHALL meneruskan request ke handler (tidak mengembalikan 403).

**Validates: Requirements 3.1, 3.2**

### Property 3: ExternalDebt status calculation invariant

*For any* `ExternalDebt` dengan `amount` A dan total pembayaran P, status SHALL memenuhi: jika P == 0 maka "Unpaid", jika 0 < P < A maka "Partial", jika P >= A maka "Paid".

**Validates: Requirements 1.4**

### Property 4: API interceptor handles all 401 responses

*For any* API call yang mengembalikan HTTP 401, interceptor SHALL memanggil logout dan redirect ke `/login`, tanpa memandang endpoint mana yang dipanggil.

**Validates: Requirements 4.4**

### Property 5: API interceptor shows error for all error responses

*For any* API call yang mengembalikan HTTP status 4xx atau 5xx, interceptor SHALL menampilkan pesan error yang user-friendly kepada pengguna.

**Validates: Requirements 4.5**

### Property 6: RoleRoute redirects unauthorized roles

*For any* route yang dilindungi `RoleRoute` dengan `allowedRoles` R, dan *any* user dengan `role_id` yang tidak termasuk dalam R, komponen SHALL melakukan redirect ke default route untuk role tersebut (bukan menampilkan konten yang dilindungi).

**Validates: Requirements 5.4, 5.5**

### Property 7: Custom hook return shape consistency

*For any* custom hook di `src/hooks/`, hook SHALL selalu mengembalikan objek dengan shape `{ data, isLoading, error, refetch }` — baik dalam state loading, success, maupun error.

**Validates: Requirements 7.2**

### Property 8: Auth state consistency across store subscribers

*For any* auth action (login, logout, setUser), *all* komponen yang subscribe ke `useAuthStore` SHALL merefleksikan state yang sama setelah action selesai.

**Validates: Requirements 8.3**

### Property 9: AuthMiddleware accepts both cookie and Bearer token

*For any* valid JWT token, AuthMiddleware SHALL mengautentikasi request dengan benar baik token dikirim via httpOnly cookie maupun via Authorization Bearer header.

**Validates: Requirements 4.3, 4.6**

### Property 10: Usecase error propagation

*For any* usecase function yang menerima input tidak valid (nil pointer, empty required field, non-existent ID), function SHALL mengembalikan non-nil error yang deskriptif, bukan panic atau silent failure.

**Validates: Requirements 9.6**

---

## Error Handling

### Backend Error Handling Strategy

**Handler layer** — semua handler mengikuti pola:
```go
if err := h.usecase.DoSomething(req); err != nil {
    // Distinguish domain errors from system errors
    if errors.Is(err, domain.ErrNotFound) {
        c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
        return
    }
    if errors.Is(err, domain.ErrValidation) {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
    return
}
```

**Domain errors** — definisikan sentinel errors di `internal/domain/errors.go`:
```go
var (
    ErrNotFound   = errors.New("resource not found")
    ErrValidation = errors.New("validation error")
    ErrForbidden  = errors.New("forbidden")
    ErrConflict   = errors.New("resource already exists")
)
```

**Usecase layer** — wrap errors dengan context:
```go
if err := r.repo.GetByID(id); err != nil {
    return nil, fmt.Errorf("get external debt: %w", domain.ErrNotFound)
}
```

**Database transaction errors** — ExternalDebtUsecase.RecordPayment menggunakan transaction:
```go
tx := r.db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
    }
}()
if err := tx.Create(&payment).Error; err != nil {
    tx.Rollback()
    return nil, fmt.Errorf("create payment: %w", err)
}
tx.Commit()
```

### Frontend Error Handling Strategy

**API level** — interceptor di `api.ts` menangani semua HTTP errors secara global.

**Hook level** — React Query mengelola error state per query:
```ts
const { data, isLoading, error } = useStudents();
if (error) {
    // error sudah di-toast oleh interceptor
    // komponen hanya perlu handle UI state
}
```

**Component level** — komponen hanya perlu handle UI state (empty state, error boundary), bukan error message logic.

---

## Testing Strategy

### Backend Testing

**Framework**: `go test` (built-in) + `go.uber.org/mock` (sudah ada di go.mod)

**Struktur test files**:
```
internal/usecase/
    infaq_type_usecase_test.go
    wa_template_usecase_test.go
    external_debt_usecase_test.go
    invoice_signature_usecase_test.go
    auth_usecase_test.go
    finance_usecase_test.go
internal/delivery/http/middleware/
    auth_test.go
```

**Mock generation** menggunakan `mockgen`:
```bash
mockgen -source=internal/repository/infaq_type_repository.go \
        -destination=internal/repository/mocks/mock_infaq_type_repository.go
```

**Test pattern** untuk setiap usecase:
```go
func TestInfaqTypeUsecase_Create(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    
    mockRepo := mocks.NewMockInfaqTypeRepository(ctrl)
    uc := NewInfaqTypeUsecase(mockRepo)
    
    t.Run("happy path", func(t *testing.T) {
        mockRepo.EXPECT().Create(gomock.Any()).Return(nil)
        err := uc.Create(&domain.InfaqType{Name: "Infaq Jumat"})
        assert.NoError(t, err)
    })
    
    t.Run("repository error", func(t *testing.T) {
        mockRepo.EXPECT().Create(gomock.Any()).Return(errors.New("db error"))
        err := uc.Create(&domain.InfaqType{Name: "Test"})
        assert.Error(t, err)
    })
}
```

**Middleware tests** — test RoleMiddleware dengan berbagai role combinations:
```go
func TestRoleMiddleware(t *testing.T) {
    // Test bahwa role yang tidak diizinkan mendapat 403
    // Test bahwa role yang diizinkan diteruskan ke handler
}
```

**Property-based tests** menggunakan `testing/quick` atau `pgregory.net/rapid`:
- Property 1 & 2: RoleMiddleware dengan random role IDs
- Property 3: ExternalDebt status calculation dengan random amounts
- Property 10: Usecase error propagation dengan random invalid inputs

### Frontend Testing

**Framework**: Vitest + `@testing-library/react` + `@testing-library/user-event`

**Struktur test files**:
```
src/
    hooks/
        useStudents.test.ts
        useBills.test.ts
        useAuth.test.ts
    components/
        RoleRoute.test.tsx
        PrivateRoute.test.tsx
    store/
        authStore.test.ts
    services/
        api.test.ts
```

**Hook testing pattern** menggunakan `renderHook`:
```ts
// src/hooks/useStudents.test.ts
describe('useStudents', () => {
    it('returns loading state initially', async () => {
        const { result } = renderHook(() => useStudents(), {
            wrapper: createWrapper(),
        });
        expect(result.current.isLoading).toBe(true);
    });
    
    it('returns data on success', async () => {
        server.use(http.get('/api/students/', () => HttpResponse.json(mockStudents)));
        const { result } = renderHook(() => useStudents(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.data).toEqual(mockStudents);
    });
    
    it('returns error on failure', async () => {
        server.use(http.get('/api/students/', () => new HttpResponse(null, { status: 500 })));
        const { result } = renderHook(() => useStudents(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.error).toBeTruthy());
    });
});
```

**RoleRoute testing**:
```tsx
// src/components/RoleRoute.test.tsx
it('redirects when role not allowed', () => {
    renderWithAuth(<RoleRoute allowedRoles={[1, 2]}><div>Admin Only</div></RoleRoute>, { roleId: 6 });
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
});
```

**MSW (Mock Service Worker)** untuk intercepting API calls di tests:
```ts
// src/test/server.ts
export const server = setupServer(
    http.get('/api/students/', () => HttpResponse.json([])),
    // ... other handlers
);
```

**Run tests**:
```bash
# Backend
cd backend && go test ./...

# Frontend (single run, no watch)
cd frontend && npx vitest --run
```
