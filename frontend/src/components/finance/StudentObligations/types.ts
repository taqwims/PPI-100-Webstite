export interface AcademicYear { 
    id: number; 
    name: string; 
    is_active: boolean; 
    start_date: string; 
    end_date: string; 
}

export interface ClassOption { 
    id: number; 
    name: string; 
}

export interface PaymentType {
    id: number; 
    code: string; 
    name: string; 
    payment_schedule: string; 
    amount: number;
    academic_year_id: number; 
    is_active: boolean;
}

export interface Obligation {
    id: string;
    student_id: string;
    student: { 
        id: string; 
        user: { name: string }; 
        class: { name: string }; 
        parent_id?: string 
    };
    payment_type_id: number;
    payment_type: { 
        id: number; 
        code: string; 
        name: string; 
        payment_schedule: string 
    };
    academic_year_id: number;
    academic_year: { name: string };
    amount: number;
    paid_amount: number;
    status: string;
    billing_month: number;
    due_date: string | null;
    installment_number: number;
    total_installments: number;
    notes: string;
    parent_name: string;
    parent_phone: string;
}

export interface GroupedStudentAmount {
    student_id: string;
    student_name: string;
    class_name: string;
    parent_name: string;
    parent_phone: string;
    total_amount: number;
    total_paid: number;
    obligations: Obligation[];
}
