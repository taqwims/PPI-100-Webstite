import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, DollarSign, CheckCircle, Calendar, CreditCard, User } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

interface Bill {
    ID: string;
    Title: string;
    Amount: number;
    DueDate: string;
    Status: string;
    Student: {
        User: {
            Name: string;
        };
    };
}

const Finance: React.FC = () => {
    const [unitID, setUnitID] = useState(1);
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    const { data: bills, isLoading } = useQuery({
        queryKey: ['bills', unitID],
        queryFn: async () => {
            const res = await api.get(`/finance/bills?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Fetch Students for creating bill
    const { data: students } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
            return res.data;
        },
        enabled: showForm,
    });

    const createBillMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/bills', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            setShowForm(false);
            setFormData({
                student_id: '',
                title: '',
                amount: '',
                due_date: '',
            });
        },
    });

    const recordPaymentMutation = useMutation({
        mutationFn: (data: { bill_id: string, amount: number, method: string }) => api.post('/finance/payments', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
    });

    const [formData, setFormData] = useState({
        student_id: '',
        title: '',
        amount: '',
        due_date: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createBillMutation.mutate({
            ...formData,
            amount: Number(formData.amount),
        });
    };

    const handlePayment = (bill: Bill) => {
        if (confirm(`Catat pembayaran untuk ${bill.Title}?`)) {
            recordPaymentMutation.mutate({
                bill_id: bill.ID,
                amount: bill.Amount,
                method: 'Cash', // Default to Cash for manual entry
            });
        }
    };

    const tableHeaders = ['Siswa', 'Tagihan', 'Jumlah', 'Jatuh Tempo', 'Status', 'Aksi'];
    const tableData = bills?.map((bill: Bill) => ({
        id: bill.ID,
        student: bill.Student.User.Name,
        title: bill.Title,
        amount: `Rp ${bill.Amount.toLocaleString()}`,
        dueDate: new Date(bill.DueDate).toLocaleDateString(),
        status: (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bill.Status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                {bill.Status}
            </span>
        ),
        actions: (
            <div className="flex justify-end gap-2">
                {bill.Status !== 'Paid' ? (
                    <ButtonGlass
                        variant="primary"
                        onClick={() => handlePayment(bill)}
                        className="py-1 px-3 text-xs"
                        icon={DollarSign}
                    >
                        Bayar
                    </ButtonGlass>
                ) : (
                    <span className="text-green-400 flex items-center gap-1 text-sm">
                        <CheckCircle size={16} /> Lunas
                    </span>
                )}
            </div>
        )
    })) || [];

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Keuangan</h1>
                    <p className="text-gray-400">Manajemen tagihan dan pembayaran siswa</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={unitID}
                        onChange={(e) => setUnitID(Number(e.target.value))}
                        className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value={1} className="text-gray-900">MTS</option>
                        <option value={2} className="text-gray-900">MA</option>
                    </select>
                    <ButtonGlass onClick={() => setShowForm(true)} icon={Plus}>
                        Buat Tagihan
                    </ButtonGlass>
                </div>
            </div>

            <CardGlass>
                <div className="p-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-400">Loading data...</div>
                    ) : (
                        <TableGlass headers={tableHeaders} data={tableData} />
                    )}
                </div>
            </CardGlass>

            <ModalGlass
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title="Buat Tagihan Baru"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1 ml-1">Siswa</label>
                        <select
                            value={formData.student_id}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            className="w-full glass-input"
                            required
                        >
                            <option value="" className="text-gray-900">Pilih Siswa</option>
                            {students?.map((s: any) => (
                                <option key={s.ID} value={s.ID} className="text-gray-900">{s.User.Name}</option>
                            ))}
                        </select>
                    </div>

                    <InputGlass
                        label="Judul Tagihan"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Contoh: SPP Januari"
                        icon={CreditCard}
                        required
                    />

                    <InputGlass
                        label="Jumlah (Rp)"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0"
                        icon={DollarSign}
                        required
                    />

                    <InputGlass
                        label="Jatuh Tempo"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        icon={Calendar}
                        required
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <ButtonGlass type="button" variant="ghost" onClick={() => setShowForm(false)}>
                            Batal
                        </ButtonGlass>
                        <ButtonGlass type="submit">
                            Simpan
                        </ButtonGlass>
                    </div>
                </form>
            </ModalGlass>
        </div>
    );
};

export default Finance;
