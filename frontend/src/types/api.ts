// ─── Auth ───

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    role_id: number;
    unit_id: number;
}

// ─── Generic ───

export interface ApiError {
    error: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
}

export interface MessageResponse {
    message: string;
}

// ─── Bill ───

export interface CreateBillRequest {
    student_id: string;
    title: string;
    amount: number;
    due_date: string;
    bill_type: string;
    academic_year_id?: number;
    transaction_code_id?: number;
    is_installment?: boolean;
}

export interface RecordPaymentRequest {
    bill_id: string;
    amount: number;
    payment_method: 'Transfer' | 'Cash' | 'Midtrans';
}

// ─── Student ───

export interface CreateStudentRequest {
    name: string;
    email: string;
    password: string;
    nisn: string;
    class_id: number;
    unit_id: number;
    parent_id?: string;
}

export interface UpdateStudentRequest {
    name?: string;
    email?: string;
    nisn?: string;
    class_id?: number;
    status?: 'Active' | 'Graduated' | 'Transferred';
}

// ─── Payroll ───

export interface CreatePayrollRequest {
    user_id: string;
    period_month: number;
    period_year: number;
    base_salary: number;
    functional_allowance?: number;
    transport_allowance?: number;
    additional_task?: number;
    lateness_penalty?: number;
    infaq_deduction?: number;
    cash_advance?: number;
    notes?: string;
    payment_method?: string;
}

// ─── External Debt ───

export interface CreateExternalDebtRequest {
    creditor_name: string;
    description: string;
    amount: number;
    due_date?: string;
    notes?: string;
}

export interface RecordDebtPaymentRequest {
    amount: number;
    fund_source: 'Kas Umum' | 'Infaq';
    notes?: string;
}

// ─── Cash Ledger ───

export interface CreateCashLedgerRequest {
    date: string;
    source: string;
    item_name: string;
    type: 'Income' | 'Expense';
    amount: number;
    category: string;
    fund_source?: string;
    notes?: string;
    transaction_code_id?: number;
}

// ─── Daily Infaq ───

export interface CreateDailyInfaqRequest {
    date: string;
    source: string;
    type: 'Income' | 'Expense';
    amount: number;
    class_name?: string;
    infaq_type_id?: number;
    fund_source?: string;
    notes?: string;
}

// ─── Student Obligation ───

export interface CreateStudentObligationRequest {
    student_id: string;
    payment_type_id: number;
    academic_year_id: number;
    amount: number;
    billing_month?: number;
    due_date?: string;
    notes?: string;
}

export interface BulkAssignObligationRequest {
    class_id: number;
    payment_type_id: number;
    academic_year_id: number;
}

// ─── Activity ───

export interface CreateActivityRequest {
    academic_year_id: number;
    name: string;
    description?: string;
    target_amount: number;
    start_date: string;
    end_date: string;
}

// ─── Budget ───

export interface CreateBudgetRequest {
    academic_year_id: number;
    category_id: number;
    budget_type: 'Penerimaan' | 'Pengeluaran';
    item_name: string;
    period: string;
    month?: number;
    quantity?: number;
    unit_price?: number;
    planned_amount: number;
    transaction_code_id?: number;
    notes?: string;
}

// ─── Invoice ───

export interface SignInvoiceRequest {
    invoice_type: string;
    reference_id: string;
    amount: number;
    date_str: string;
}

export interface SignInvoiceResponse {
    signatures: Array<{
        role: string;
        name: string;
        signature: string;
        short_code: string;
    }>;
    verification_code: string;
    invoice_number: string;
}

// ─── Midtrans ───

export interface CreateSnapTransactionRequest {
    bill_id: string;
}

export interface CreateSnapTransactionResponse {
    token: string;
    redirect_url: string;
}
