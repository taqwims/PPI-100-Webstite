import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Bill } from '../types';
import type { CreateBillRequest, RecordPaymentRequest } from '../types/api';

interface BillFilters {
    student_id?: string;
    status?: string;
    academic_year_id?: number;
}

export const useBills = (filters?: BillFilters) => {
    return useQuery<Bill[]>({
        queryKey: ['bills', filters],
        queryFn: () => api.get('/finance/bills', { params: filters }).then((r) => r.data),
    });
};

export const useBill = (id: string) => {
    return useQuery<Bill>({
        queryKey: ['bills', id],
        queryFn: () => api.get(`/finance/bills/${id}`).then((r) => r.data),
        enabled: !!id,
    });
};

export const useCreateBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateBillRequest) => api.post('/finance/bills', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
        },
    });
};

export const useUpdateBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateBillRequest> }) =>
            api.put(`/finance/bills/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
        },
    });
};

export const useDeleteBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/finance/bills/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
        },
    });
};

export const useRecordPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: RecordPaymentRequest) => api.post('/finance/payments', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
        },
    });
};
