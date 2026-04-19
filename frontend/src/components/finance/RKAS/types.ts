export interface AcademicYear { 
    id: number; 
    name: string; 
    is_active: boolean; 
    start_date: string; 
    end_date: string; 
}
export interface BudgetCategory { 
    id: number; 
    name: string; 
    description: string; 
    is_active: boolean; 
}
export interface Budget {
    id: string;
    academic_year_id: number;
    academic_year: AcademicYear;
    category_id: number;
    category: BudgetCategory;
    budget_type: string;
    item_name: string;
    period: string;
    month: number;
    quantity: number;
    unit_price: number;
    planned_amount: number;
    realized_amount: number;
    status: string;
    approved_by?: { name: string };
    approved_at?: string;
    notes: string;
    transaction_code_id?: number;
    transaction_code?: { id: number; code: string; name: string };
    created_by: { name: string };
    created_at: string;
}
export interface TransactionCode {
    id: number;
    code: string;
    name: string;
    category: string;
    transaction_type: string;
    description?: string;
}
export interface BudgetSummary { 
    category: string; 
    planned: number; 
    realized: number; 
    percentage: number; 
}
