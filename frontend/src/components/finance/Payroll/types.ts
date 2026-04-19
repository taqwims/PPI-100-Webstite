export interface UserData {
    id: string;
    name: string;
    email: string;
    role_id: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_holder?: string;
}

export interface PayrollTemplate {
    id: string;
    user_id: string;
    base_salary: number;
    functional_allowance: number;
    transport_allowance: number;
    additional_task: number;
}

export interface PayrollRecord {
    id: string;
    user_id: string;
    user: UserData;
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
    status: string;
    paid_at?: string;
    payment_method: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
}
