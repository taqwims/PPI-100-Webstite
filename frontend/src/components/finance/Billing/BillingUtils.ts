import { CheckCircle, Clock, AlertTriangle, PieChart } from 'lucide-react';

export interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    created_at: string;
    status: string;
    bill_type: string;
    academic_year_id?: number;
    academic_year?: {
        name: string;
    };
    is_installment?: boolean;
    invoice_number?: string;
    verification_code?: string;
    student?: {
        user: { name: string };
    };
    payment_link?: string;
    payments?: { amount: number; status: string; payment_method: string; proof_url?: string; paid_at: string; transaction_id?: string; created_at: string; }[];
}

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

export const getRemainingAmount = (bill: Bill) => {
    if (bill.status === 'Paid') return 0;
    const totalPaid = (bill.payments || []).reduce((sum, p) => p.status === 'Success' ? sum + p.amount : sum, 0);
    return bill.amount - totalPaid;
};

export const hasPendingTransfer = (bill: Bill) => {
    return bill.status !== 'Paid' && (bill.payments || []).some(p => p.payment_method === 'Transfer' && p.proof_url && p.status !== 'Success');
};

export const hasPendingMidtrans = (bill: Bill) => {
    return bill.status !== 'Paid' && (bill.payments || []).some(p => p.payment_method === 'Midtrans' && p.status === 'Pending' && p.transaction_id);
};

export const formatPaymentDate = (p: any) => {
    if (p.status === 'Success' && p.paid_at && !p.paid_at.startsWith('0001-01-01')) {
        return new Date(p.paid_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (p.created_at && !p.created_at.startsWith('0001-01-01')) {
        return new Date(p.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return '-';
};

export const getStatusInfo = (bill: Bill) => {
    if (bill.status === 'Paid') return { color: 'emerald', icon: CheckCircle, label: 'Lunas' };
    if (bill.status === 'Partial') return { color: 'amber', icon: PieChart, label: 'Sebagian/Dicicil' };
    if (hasPendingTransfer(bill)) return { color: 'blue', icon: Clock, label: 'Menunggu Verifikasi' };
    const overdue = new Date(bill.due_date) < new Date();
    if (overdue) return { color: 'red', icon: AlertTriangle, label: 'Terlambat' };
    return { color: 'amber', icon: Clock, label: 'Belum Lunas' };
};
