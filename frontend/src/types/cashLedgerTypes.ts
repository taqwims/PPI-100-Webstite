export interface StaffUser {
    id: string;
    name: string;
    role_id: number;
}

export interface CashLedgerEntry {
    id: string;
    date: string;
    source: string;
    item_name: string;
    type: 'Income' | 'Expense';
    amount: number;
    category: string;
    fund_source: string;
    auto_generated: boolean;
    notes: string;
    responsible_id?: string;
    responsible?: { id: string; name: string };
    transaction_code_id?: number;
    transaction_code?: TransactionCode;
}

export interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: string;
    category: string;
    description?: string;
    is_active: boolean;
    parent_code_id?: number | null;
    parent_code?: TransactionCode | null;
    children?: TransactionCode[];
}
