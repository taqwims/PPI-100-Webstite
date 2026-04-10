// ─── Core / Auth ───

export interface Role {
    id: number;
    name: string;
}

export interface Unit {
    id: number;
    name: string;
}

export interface TeacherProfile {
    id: string;
    nip: string;
    unit_id: number;
}

export interface StudentProfile {
    id: string;
    nisn: string;
    class_id: number;
    unit_id: number;
    status: 'Active' | 'Graduated' | 'Transferred';
}

export interface ParentProfile {
    id: string;
    phone: string;
}

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

// ─── Akademik ───

export interface Class {
    id: number;
    name: string;
    unit_id: number;
    homeroom_teacher_id?: string;
    homeroom_teacher?: Teacher;
    created_at: string;
    updated_at: string;
}

export interface Subject {
    id: number;
    name: string;
    unit_id: number;
    created_at: string;
    updated_at: string;
}

export interface Teacher {
    id: string;
    user_id: string;
    user: User;
    nip: string;
    unit_id: number;
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
    created_at: string;
    updated_at: string;
}

export interface Parent {
    id: string;
    user_id: string;
    phone: string;
    created_at: string;
    updated_at: string;
}

export interface Schedule {
    id: number;
    class_id: number;
    class: Class;
    subject_id: number;
    subject: Subject;
    teacher_id: string;
    teacher: Teacher;
    day: string;
    start_time: string;
    end_time: string;
}

export interface Attendance {
    id: string;
    student_id: string;
    student: Student;
    schedule_id: number;
    schedule: Schedule;
    timestamp: string;
    method: 'Manual' | 'QR';
    status: 'Present' | 'Absent' | 'Late' | 'Permission' | 'Sick';
}

export interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
}

// ─── Keuangan ───

export interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: 'Income' | 'Expense';
    category: string;
    description: string;
    parent_code_id?: number;
    parent_code?: TransactionCode;
    children?: TransactionCode[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface BillItem {
    id: string;
    bill_id: string;
    item_name: string;
    amount: number;
    created_at: string;
}

export interface Payment {
    id: string;
    bill_id: string;
    amount: number;
    payment_method: 'Transfer' | 'Cash' | 'Midtrans';
    status: 'Pending' | 'Success' | 'Failed';
    transaction_id?: string;
    proof_url?: string;
    paid_at: string;
    created_at: string;
    updated_at: string;
}

export interface Bill {
    id: string;
    student_id: string;
    student: Student;
    title: string;
    academic_year_id?: number;
    academic_year?: AcademicYear;
    bill_type: string;
    amount: number;
    due_date: string;
    status: 'Unpaid' | 'Paid' | 'Partial' | 'Overdue';
    payment_link?: string;
    invoice_number: string;
    is_installment: boolean;
    transaction_code_id?: number;
    transaction_code?: TransactionCode;
    items?: BillItem[];
    payments?: Payment[];
    created_at: string;
    updated_at: string;
}

export interface BillTemplate {
    id: number;
    unit_id: number;
    template_name: string;
    title: string;
    amount: number;
    bill_type: string;
    is_installment: boolean;
    created_at: string;
    updated_at: string;
}

export interface PaymentType {
    id: number;
    code: string;
    name: string;
    class_id?: number;
    class?: Class;
    payment_schedule: 'Bulanan' | 'Tahunan' | 'Semesteran' | 'Bertahap';
    amount: number;
    academic_year_id: number;
    academic_year: AcademicYear;
    transaction_code_id?: number;
    transaction_code?: TransactionCode;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StudentObligation {
    id: string;
    student_id: string;
    student: Student;
    payment_type_id: number;
    payment_type: PaymentType;
    academic_year_id: number;
    academic_year: AcademicYear;
    amount: number;
    paid_amount: number;
    status: 'Unpaid' | 'Partial' | 'Paid';
    billing_month: number;
    due_date?: string;
    installment_number: number;
    total_installments: number;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface CashLedger {
    id: string;
    date: string;
    source: string;
    item_name: string;
    type: 'Income' | 'Expense';
    amount: number;
    category: string;
    fund_source: string;
    notes: string;
    created_by: string;
    responsible_id?: string;
    responsible?: User;
    transaction_code_id?: number;
    transaction_code?: TransactionCode;
    auto_generated: boolean;
    created_at: string;
    updated_at: string;
}

export interface InfaqType {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DailyInfaq {
    id: string;
    date: string;
    source: string;
    type: 'Income' | 'Expense';
    amount: number;
    class_name?: string;
    handled_by_id: string;
    handled_by: User;
    responsible_id?: string;
    responsible?: User;
    transaction_code_id?: number;
    transaction_code?: TransactionCode;
    infaq_type_id?: number;
    infaq_type?: InfaqType;
    proof_url?: string;
    fund_source: string;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface SavingAccount {
    id: string;
    student_id: string;
    student: Student;
    balance: number;
    created_at: string;
    updated_at: string;
}

export interface SavingTransaction {
    id: string;
    account_id: string;
    account: SavingAccount;
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    date: string;
    handled_by_id: string;
    handled_by: User;
    notes: string;
    created_at: string;
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
    created_by: User;
    created_at: string;
    updated_at: string;
}

export interface ExternalDebtPayment {
    id: string;
    debt_id: string;
    amount: number;
    fund_source: string;
    notes: string;
    paid_by_id: string;
    paid_by: User;
    created_at: string;
}

export interface WATemplate {
    id: number;
    name: string;
    body_template: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

// ─── Penggajian ───

export interface Payroll {
    id: string;
    user_id: string;
    user: User;
    employee_name: string;
    employee_nik: string;
    position: string;
    period_month: number;
    period_year: number;
    base_salary: number;
    functional_allowance: number;
    transport_allowance: number;
    additional_task: number;
    total_income: number;
    lateness_penalty: number;
    infaq_deduction: number;
    cash_advance: number;
    total_deduction: number;
    net_salary: number;
    notes: string;
    status: 'Draft' | 'Paid';
    paid_at?: string;
    payment_method: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
    created_at: string;
    updated_at: string;
}

export interface PayrollTemplate {
    id: string;
    user_id: string;
    user: User;
    base_salary: number;
    functional_allowance: number;
    transport_allowance: number;
    additional_task: number;
    created_at: string;
    updated_at: string;
}

// ─── RKAS / Budget ───

export interface BudgetCategory {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Budget {
    id: string;
    academic_year_id: number;
    academic_year: AcademicYear;
    category_id: number;
    category: BudgetCategory;
    budget_type: 'Penerimaan' | 'Pengeluaran';
    item_name: string;
    period: string;
    month: number;
    quantity: number;
    unit_price: number;
    planned_amount: number;
    realized_amount: number;
    status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
    approved_by_id?: string;
    approved_by?: User;
    approved_at?: string;
    transaction_code_id?: number;
    transaction_code?: TransactionCode;
    notes: string;
    created_by_id: string;
    created_by: User;
    created_at: string;
    updated_at: string;
}

// ─── Kegiatan ───

export interface Activity {
    id: string;
    academic_year_id: number;
    academic_year: AcademicYear;
    name: string;
    description: string;
    target_amount: number;
    start_date: string;
    end_date: string;
    status: 'Active' | 'Completed';
    created_by_id: string;
    created_by: User;
    created_at: string;
    updated_at: string;
}

export interface ActivityObligation {
    id: string;
    activity_id: string;
    activity: Activity;
    student_id: string;
    student: Student;
    amount: number;
    paid_amount: number;
    status: 'Unpaid' | 'Partial' | 'Paid';
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface ActivityTransaction {
    id: string;
    activity_id: string;
    transaction_type: 'Income' | 'Expense';
    amount: number;
    date: string;
    description: string;
    receipt_image?: string;
    created_by_id: string;
    created_by: User;
    created_at: string;
    updated_at: string;
}

// ─── BK ───

export interface Violation {
    id: number;
    name: string;
    points: number;
    description: string;
}

export interface BKCall {
    id: string;
    student_id: string;
    student: Student;
    teacher_id: string;
    teacher: Teacher;
    reason: string;
    date: string;
    status: 'Pending' | 'Resolved';
    created_at: string;
    updated_at: string;
}

// ─── E-learning ───

export interface Material {
    id: number;
    title: string;
    description: string;
    file_url: string;
    class_id: number;
    subject_id: number;
    subject: Subject;
    teacher_id: string;
    created_at: string;
}

export interface Task {
    id: number;
    title: string;
    description: string;
    deadline: string;
    class_id: number;
    subject_id: number;
    subject: Subject;
    teacher_id: string;
    created_at: string;
}

export interface TaskSubmission {
    id: string;
    task_id: number;
    task: Task;
    student_id: string;
    file_url: string;
    grade: number;
    created_at: string;
}

// ─── Notifikasi ───

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    reference_id?: string;
    is_read: boolean;
    created_at: string;
}

// ─── Invoice ───

export interface InvoiceSignature {
    id: string;
    invoice_type: string;
    reference_id: string;
    stakeholder_role: string;
    stakeholder_name: string;
    signature_hash: string;
    short_code: string;
    verification_code: string;
    invoice_number: string;
    amount: number;
    document_date: string;
    signed_at: string;
    created_at: string;
}

export interface InvoiceNumberConfig {
    id: number;
    invoice_type: string;
    prefix: string;
    separator: string;
    include_date: boolean;
    include_unit: boolean;
    counter_length: number;
    current_counter: number;
    counter_reset_period: string;
    last_reset_date?: string;
    display_label: string;
    auto_notify_wa: boolean;
    wa_template_id?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StakeholderConfig {
    id: number;
    role: string;
    display_label: string;
    name: string;
    nip?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ─── PPDB & Public ───

export interface PPDBRegistration {
    id: string;
    name: string;
    nisn?: string;
    origin_school?: string;
    parent_name?: string;
    phone?: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    unit_id: number;
    created_at: string;
    updated_at: string;
}

export interface PublicTeacher {
    id: number;
    name: string;
    position?: string;
    photo_url?: string;
    bio?: string;
    created_at: string;
}

export interface Alumni {
    id: number;
    name: string;
    graduation_year?: number;
    profession?: string;
    testimony?: string;
    photo_url?: string;
    created_at: string;
}

export interface Download {
    id: number;
    title: string;
    category?: string;
    file_url: string;
    created_at: string;
}
