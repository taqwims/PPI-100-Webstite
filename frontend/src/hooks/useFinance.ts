import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type {
    CashLedger,
    DailyInfaq,
    InfaqType,
    WATemplate,
    ExternalDebt,
    ExternalDebtPayment,
    AcademicYear,
} from '../types';
import type {
    CreateCashLedgerRequest,
    CreateDailyInfaqRequest,
    RecordDebtPaymentRequest,
} from '../types/api';

// ─── Academic Years ───

export const useAcademicYears = () => {
    return useQuery<AcademicYear[]>({
        queryKey: ['academic-years'],
        queryFn: () => api.get('/finance/academic-years').then((r) => r.data),
    });
};

// ─── Cash Ledger ───

interface CashLedgerFilters {
    start_date?: string;
    end_date?: string;
    type?: 'Income' | 'Expense';
    fund_source?: string;
}

export const useCashLedger = (filters?: CashLedgerFilters) => {
    return useQuery<CashLedger[]>({
        queryKey: ['cash-ledger', filters],
        queryFn: () => api.get('/finance/cash-ledger', { params: filters }).then((r) => r.data),
    });
};

export const useCreateCashLedger = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCashLedgerRequest) => api.post('/finance/cash-ledger', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-ledger'] });
        },
    });
};

export const useUpdateCashLedger = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateCashLedgerRequest> }) =>
            api.put(`/finance/cash-ledger/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-ledger'] });
        },
    });
};

export const useDeleteCashLedger = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/finance/cash-ledger/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-ledger'] });
        },
    });
};

// ─── Daily Infaq ───

export const useDailyInfaq = (filters?: { start_date?: string; end_date?: string }) => {
    return useQuery<DailyInfaq[]>({
        queryKey: ['daily-infaq', filters],
        queryFn: () => api.get('/finance/daily-infaq', { params: filters }).then((r) => r.data),
    });
};

export const useCreateDailyInfaq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateDailyInfaqRequest) => api.post('/finance/daily-infaq', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-infaq'] });
        },
    });
};

export const useUpdateDailyInfaq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateDailyInfaqRequest> }) =>
            api.put(`/finance/daily-infaq/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-infaq'] });
        },
    });
};

export const useDeleteDailyInfaq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/finance/daily-infaq/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-infaq'] });
        },
    });
};

// ─── Infaq Types ───

export const useInfaqTypes = () => {
    return useQuery<InfaqType[]>({
        queryKey: ['infaq-types'],
        queryFn: () => api.get('/finance/infaq-types').then((r) => r.data),
    });
};

export const useCreateInfaqType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<InfaqType>) => api.post('/finance/infaq-types', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['infaq-types'] });
        },
    });
};

export const useUpdateInfaqType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<InfaqType> }) =>
            api.put(`/finance/infaq-types/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['infaq-types'] });
        },
    });
};

export const useDeleteInfaqType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.delete(`/finance/infaq-types/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['infaq-types'] });
        },
    });
};

// ─── WA Templates ───

export const useWATemplates = () => {
    return useQuery<WATemplate[]>({
        queryKey: ['wa-templates'],
        queryFn: () => api.get('/finance/wa-templates').then((r) => r.data),
    });
};

export const useCreateWATemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<WATemplate>) => api.post('/finance/wa-templates', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
        },
    });
};

export const useUpdateWATemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<WATemplate> }) =>
            api.put(`/finance/wa-templates/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
        },
    });
};

export const useDeleteWATemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.delete(`/finance/wa-templates/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
        },
    });
};

// ─── External Debts ───

export const useExternalDebts = () => {
    return useQuery<ExternalDebt[]>({
        queryKey: ['external-debts'],
        queryFn: () => api.get('/finance/debts').then((r) => r.data),
    });
};

export const useExternalDebtPayments = (debtId: string) => {
    return useQuery<ExternalDebtPayment[]>({
        queryKey: ['external-debt-payments', debtId],
        queryFn: () => api.get(`/finance/debts/${debtId}/payments`).then((r) => r.data),
        enabled: !!debtId,
    });
};

export const useCreateExternalDebt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<ExternalDebt>) => api.post('/finance/debts', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-debts'] });
        },
    });
};

export const useUpdateExternalDebt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ExternalDebt> }) =>
            api.put(`/finance/debts/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-debts'] });
        },
    });
};

export const useDeleteExternalDebt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/finance/debts/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-debts'] });
        },
    });
};

export const useRecordDebtPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ debtId, data }: { debtId: string; data: RecordDebtPaymentRequest }) =>
            api.post(`/finance/debts/${debtId}/pay`, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['external-debts'] });
            queryClient.invalidateQueries({
                queryKey: ['external-debt-payments', variables.debtId],
            });
        },
    });
};
