import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, DollarSign, CheckCircle, Calendar, CreditCard, Edit, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useAuth } from '../../context/AuthContext';

interface Student {
    id: string;
    user: {
        name: string;
    };
}

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    student_id: number;
    student: {
        user: {
            name: string;
        };
    };
}

interface BillFormData {
    student_id: string;
    title: string;
    amount: string;
    due_date: string;
}

const Finance: React.FC = () => {
    const { user } = useAuth();
    const [unitID, setUnitID] = useState(user?.unit_id || 1);
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [formData, setFormData] = useState<BillFormData>({
        student_id: '',
        title: '',
        amount: '',
        due_date: '',
    });

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
        mutationFn: (data: BillFormData) => api.post('/finance/bills', {
            ...data,
            amount: Number(data.amount),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            handleCloseModal();
        },
    });

    const updateBillMutation = useMutation({
        mutationFn: (data: any) => api.put(`/finance/bills/${editingBill?.id}`, {
            ...data,
            amount: Number(data.amount),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            handleCloseModal();
        },
    });

    const deleteBillMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/finance/bills/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
    });

    const recordPaymentMutation = useMutation({
        mutationFn: (data: { bill_id: string, amount: number, method: string }) => api.post('/finance/payments', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
    });

    const handleCloseModal = () => {
        setShowForm(false);
        setEditingBill(null);
        setFormData({
            student_id: '',
            title: '',
            amount: '',
            due_date: '',
        });
    };

    const handleEdit = (bill: Bill) => {
        setEditingBill(bill);
        setFormData({
            student_id: bill.student_id.toString(),
            title: bill.title,
            amount: bill.amount.toString(),
            due_date: bill.due_date.split('T')[0], // Format date for input
        });
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus tagihan ini?')) {
            deleteBillMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBill) {
            updateBillMutation.mutate(formData);
        } else {
            createBillMutation.mutate(formData);
        }
    };

    const handlePayment = (bill: Bill) => {
        if (confirm(`Catat pembayaran untuk ${bill.title}?`)) {
            recordPaymentMutation.mutate({
                bill_id: bill.id,
                amount: bill.amount,
                method: 'Cash', // Default to Cash for manual entry
            });
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Keuangan</h1>
                    <p className="text-slate-300-400">Manajemen tagihan dan pembayaran siswa</p>
                </div>
                <div className="flex space-x-3">
                    {(user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3) && (
                        <select
                            value={unitID}
                            onChange={(e) => setUnitID(Number(e.target.value))}
                            className="bg-white/10 border border-white/20 text-slate-900 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={user?.role_id !== 1}
                        >
                            <option value={1} className="bg-gray-900">MTS</option>
                            <option value={2} className="bg-gray-900">MA</option>
                        </select>
                    )}
                    <ButtonGlass onClick={() => setShowForm(true)} className="flex items-center gap-2">
                        <Plus size={18} /> Buat Tagihan
                    </ButtonGlass>
                </div>
            </div>

            <CardGlass>
                <div className="p-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-300-400">Loading data...</div>
                    ) : (
                        <TableGlass>
                            <TableHeaderGlass>
                                <TableRowGlass>
                                    <TableHeadGlass>Siswa</TableHeadGlass>
                                    <TableHeadGlass>Tagihan</TableHeadGlass>
                                    <TableHeadGlass>Jumlah</TableHeadGlass>
                                    <TableHeadGlass>Jatuh Tempo</TableHeadGlass>
                                    <TableHeadGlass>Status</TableHeadGlass>
                                    <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                                </TableRowGlass>
                            </TableHeaderGlass>
                            <TableBodyGlass>
                                {bills?.map((bill: Bill) => (
                                    <TableRowGlass key={bill.id}>
                                        <TableCellGlass>
                                            <span className="font-medium text-slate-900">{bill.student.user.name}</span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className="text-slate-300-300">{bill.title}</span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className="font-mono text-slate-300-300">Rp {bill.amount.toLocaleString()}</span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className="text-slate-300-400">{new Date(bill.due_date).toLocaleDateString()}</span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bill.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {bill.status}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {bill.status !== 'Paid' ? (
                                                    <>
                                                        <ButtonGlass
                                                            variant="primary"
                                                            onClick={() => handlePayment(bill)}
                                                            className="py-1 px-3 text-xs flex items-center gap-1"
                                                        >
                                                            <DollarSign size={14} /> Bayar
                                                        </ButtonGlass>
                                                        <button onClick={() => handleEdit(bill)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(bill.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-green-400 flex items-center gap-1 text-sm">
                                                        <CheckCircle size={16} /> Lunas
                                                    </span>
                                                )}
                                            </div>
                                        </TableCellGlass>
                                    </TableRowGlass>
                                ))}
                                {bills?.length === 0 && (
                                    <TableRowGlass>
                                        <TableCellGlass colSpan={6} className="text-center py-8">Tidak ada data tagihan</TableCellGlass>
                                    </TableRowGlass>
                                )}
                            </TableBodyGlass>
                        </TableGlass>
                    )}
                </div>
            </CardGlass>

            <ModalGlass
                isOpen={showForm}
                onClose={handleCloseModal}
                title={editingBill ? "Edit Tagihan" : "Buat Tagihan Baru"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-900/80 mb-1 ml-1">Siswa</label>
                        <select
                            value={formData.student_id}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            className="w-full glass-input"
                            required
                        >
                            <option value="" className="bg-gray-900">Pilih Siswa</option>
                            {students?.map((s: Student) => (
                                <option key={s.id} value={s.id} className="bg-gray-900">{s.user.name}</option>
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
                        <ButtonGlass type="button" variant="ghost" onClick={handleCloseModal}>
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
