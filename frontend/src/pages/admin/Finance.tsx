import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, DollarSign, CheckCircle, Edit, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Student {
    id: string;
    user: {
        name: string;
    };
}

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
}

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    bill_type: string;
    academic_year_id?: number;
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
    bill_type: string;
    academic_year_id: string;
}

const Finance: React.FC = () => {
    const { user } = useAuth();
    const [unitID, setUnitID] = useState(user?.unit_id || 1);
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);

    // Filters
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');

    const [formData, setFormData] = useState<BillFormData>({
        student_id: '',
        title: '',
        amount: '',
        due_date: '',
        bill_type: 'SPP',
        academic_year_id: '',
    });

    const { data: bills, isLoading } = useQuery({
        queryKey: ['bills', unitID],
        queryFn: async () => {
            const res = await api.get(`/finance/bills?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Fetch Academic Years
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years'],
        queryFn: async () => {
            const res = await api.get('/finance/academic-years');
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
            academic_year_id: data.academic_year_id ? parseInt(data.academic_year_id) : null
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
            academic_year_id: data.academic_year_id ? parseInt(data.academic_year_id) : null
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
            bill_type: 'SPP',
            academic_year_id: '',
        });
    };

    const handleEdit = (bill: Bill) => {
        setEditingBill(bill);
        setFormData({
            student_id: bill.student_id.toString(),
            title: bill.title,
            amount: bill.amount.toString(),
            due_date: bill.due_date.split('T')[0], // Format date for input
            bill_type: bill.bill_type || 'SPP',
            academic_year_id: bill.academic_year_id ? bill.academic_year_id.toString() : '',
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

    // Filter Logic
    const filteredBills = bills?.filter((bill: Bill) => {
        const matchYear = filterYear ? bill.academic_year_id?.toString() === filterYear : true;
        const matchType = filterType ? bill.bill_type === filterType || (!bill.bill_type && filterType === 'SPP') : true;
        return matchYear && matchType;
    });

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Keuangan & Invoices</h1>
                    <p className="text-slate-500">Manajemen tagihan dan rekam pembayaran siswa</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filters */}
                    <div className="flex items-center space-x-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <Filter size={16} className="text-slate-400 ml-2" />
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-1 pr-6"
                        >
                            <option value="">Semua Tahun</option>
                            {academicYears?.map((year: AcademicYear) => (
                                <option key={year.id} value={year.id}>{year.name}</option>
                            ))}
                        </select>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-1 pr-6"
                        >
                            <option value="">Semua Tagihan</option>
                            <option value="SPP">SPP</option>
                            <option value="Uang Pangkal">Uang Pangkal</option>
                            <option value="Uang Kegiatan">Uang Kegiatan</option>
                            <option value="Tunggakan Alumni">Tunggakan Alumni</option>
                        </select>
                    </div>

                    {(user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3) && (
                        <select
                            value={unitID}
                            onChange={(e) => setUnitID(Number(e.target.value))}
                            className="bg-white border border-slate-200 text-slate-700 text-sm shadow-sm rounded-xl px-4 py-2 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                            disabled={user?.role_id !== 1}
                        >
                            <option value={1}>MTS</option>
                            <option value={2}>MA</option>
                        </select>
                    )}

                    <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                        <Plus size={16} />
                        <span>Buat Tagihan</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-500">Loading data keuangan...</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Siswa</th>
                                    <th className="p-4 font-medium">Jenis Tagihan</th>
                                    <th className="p-4 font-medium text-right">Jumlah (Rp)</th>
                                    <th className="p-4 font-medium text-center">Jatuh Tempo</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 font-medium text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBills?.map((bill: Bill) => (
                                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800">{bill.student.user.name}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 font-medium">{bill.title}</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase">
                                                        {bill.bill_type || 'SPP'}
                                                    </span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-semibold text-slate-800">{bill.amount.toLocaleString('id-ID')}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-slate-500 text-sm">{new Date(bill.due_date).toLocaleDateString('id-ID')}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {bill.status === 'Paid' ? 'Lunas' : 'Belum Lunas'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {bill.status !== 'Paid' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handlePayment(bill)}
                                                            className="flex items-center text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition"
                                                        >
                                                            <DollarSign size={14} className="mr-1" /> Bayar
                                                        </button>
                                                        <button onClick={() => handleEdit(bill)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition hover:bg-indigo-50 rounded-lg">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(bill.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition hover:bg-red-50 rounded-lg">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-emerald-500 flex items-center justify-end gap-1 text-sm font-medium mr-2">
                                                        <CheckCircle size={16} /> Selesai
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBills?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-500">
                                            Tidak ada tagihan yang sesuai dengan filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create/Edit Bill Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingBill ? "Edit Tagihan" : "Buat Tagihan Baru"}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Tagihan</label>
                                    <select
                                        value={formData.bill_type}
                                        onChange={(e) => setFormData({ ...formData, bill_type: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                        required
                                    >
                                        <option value="SPP">SPP Bulanan</option>
                                        <option value="Uang Pangkal">Uang Pangkal</option>
                                        <option value="Uang Kegiatan">Uang Kegiatan</option>
                                        <option value="Tunggakan Alumni">Tunggakan (Alumni)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                                    <select
                                        value={formData.academic_year_id}
                                        onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">-- Pilih Jika Perlu --</option>
                                        {academicYears?.map((year: AcademicYear) => (
                                            <option key={year.id} value={year.id}>{year.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Siswa</label>
                                <select
                                    value={formData.student_id}
                                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    required
                                >
                                    <option value="">Pilih Siswa</option>
                                    {students?.map((s: Student) => (
                                        <option key={s.id} value={s.id}>{s.user.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Judul Tagihan</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Contoh: SPP Juli"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Batas Pembayaran (Jatuh Tempo)</label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition">
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition">
                                    Simpan Tagihan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
