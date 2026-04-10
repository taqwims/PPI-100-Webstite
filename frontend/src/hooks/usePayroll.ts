import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Payroll, PayrollTemplate } from '../types';
import type { CreatePayrollRequest } from '../types/api';

interface PayrollFilters {
    period_month?: number;
    period_year?: number;
    user_id?: string;
}

export const usePayrolls = (filters?: PayrollFilters) => {
    return useQuery<Payroll[]>({
        queryKey: ['payrolls', filters],
        queryFn: () => api.get('/finance/payroll', { params: filters }).then((r) => r.data),
    });
};

export const usePayrollTemplates = () => {
    return useQuery<PayrollTemplate[]>({
        queryKey: ['payroll-templates'],
        queryFn: () => api.get('/finance/payroll/templates').then((r) => r.data),
    });
};

export const usePayrollTemplateByUser = (userId: string) => {
    return useQuery<PayrollTemplate>({
        queryKey: ['payroll-templates', userId],
        queryFn: () => api.get(`/finance/payroll/templates/${userId}`).then((r) => r.data),
        enabled: !!userId,
    });
};

export const useCreatePayroll = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePayrollRequest) => api.post('/finance/payroll', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrolls'] });
        },
    });
};

export const useUpdatePayroll = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreatePayrollRequest> }) =>
            api.put(`/finance/payroll/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrolls'] });
        },
    });
};

export const useDeletePayroll = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/finance/payroll/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrolls'] });
        },
    });
};

export const usePayPayroll = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post(`/finance/payroll/${id}/pay`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrolls'] });
        },
    });
};

export const useUpsertPayrollTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<PayrollTemplate>) =>
            api.post('/finance/payroll/templates', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-templates'] });
        },
    });
};
