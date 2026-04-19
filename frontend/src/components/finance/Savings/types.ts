export interface ClassData { id: number; name: string; }

export interface Student { 
    id: string; 
    user: { name: string; email: string }; 
    nisn: string; 
    class: { id: number; name: string }; 
    class_id: number; 
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
    type: string; 
    amount: number; 
    date: string; 
    handled_by: { name: string }; 
    notes: string; 
}

export interface OperationalWithdrawal {
    id: string; 
    amount: number; 
    returned_amount: number; 
    purpose: string;
    status: string; 
    handled_by: { name: string }; 
    created_at: string; 
    updated_at: string;
}

export interface PoolSummary {
    total_balance: number; 
    total_withdrawn: number; 
    total_returned: number;
    outstanding_debt: number; 
    available_balance: number;
}
