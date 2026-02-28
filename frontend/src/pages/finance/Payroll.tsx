import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Printer, Search, Building2, Banknote, Calendar, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { exportToCSV } from '../../utils/exportUtils';

interface UserData {
    id: string;
    name: string;
    email: string;
    role_id: number;
}

interface PayrollRecord {
    id: string;
    month_year: string;
    user_id: string;
    user: { name: string; email: string };
    basic_salary: number;
    allowances: number;
    deductions: number;
    total: number;
    status: string;
    payment_date: string;
    processed_by: { name: string };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const Payroll = () => {
    const { user } = useAuth();
    // 1: SuperAdmin, 9: Bendahara
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
    const [formData, setFormData] = useState({
        user_id: '',
        month_year: '',
        basic_salary: '',
        allowances: '',
        deductions: '',
        status: 'Paid'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPayrolls();
        if (canManage) {
            fetchUsers();
        }
    }, [canManage]);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/payroll');
            setPayrolls(res.data);
        } catch (error) {
            console.error("Failed to fetch payrolls", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users/');
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openCreateModal = () => {
        setEditingPayroll(null);
        setFormData({ user_id: '', month_year: '', basic_salary: '', allowances: '', deductions: '', status: 'Paid' });
        setShowModal(true);
    };

    const openEditModal = (payroll: PayrollRecord) => {
        setEditingPayroll(payroll);
        setFormData({
            user_id: payroll.user_id || '',
            month_year: payroll.month_year,
            basic_salary: String(payroll.basic_salary),
            allowances: String(payroll.allowances),
            deductions: String(payroll.deductions),
            status: payroll.status
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                user_id: formData.user_id,
                month_year: formData.month_year,
                basic_salary: parseFloat(formData.basic_salary) || 0,
                allowances: parseFloat(formData.allowances) || 0,
                deductions: parseFloat(formData.deductions) || 0,
                status: formData.status
            };

            if (editingPayroll) {
                await api.put(`/finance/payroll/${editingPayroll.id}`, payload);
            } else {
                await api.post('/finance/payroll', payload);
            }
            setShowModal(false);
            setEditingPayroll(null);
            setFormData({ user_id: '', month_year: '', basic_salary: '', allowances: '', deductions: '', status: 'Paid' });
            fetchPayrolls();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal membuat slip gaji");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus slip gaji ini?')) return;
        try {
            await api.delete(`/finance/payroll/${id}`);
            fetchPayrolls();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menghapus slip gaji");
        }
    };

    // Calculate total if managing
    const totalPayrollPaid = payrolls.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {canManage ? 'Penggajian Pegawai' : 'Slip Gaji Saya'}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {canManage ? 'Kelola dan distribusikan gaji seluruh dewan asatidz dan staf.' : 'Lihat riwayat dan detail pembayaran gaji Anda.'}
                        </p>
                    </div>

                    <div className="flex space-x-3">
                        {canManage && (
                            <>
                                <button
                                    onClick={() => exportToCSV(payrolls, 'Data_Gaji_Pegawai')}
                                    className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 shadow-sm transition"
                                >
                                    <Download size={18} />
                                    <span>Export Excel</span>
                                </button>
                                <button
                                    onClick={openCreateModal}
                                    className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 shadow-sm transition"
                                >
                                    <Plus size={18} />
                                    <span>Buat Slip Gaji</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {canManage && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Gaji Dibayarkan</p>
                                <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalPayrollPaid)}</h2>
                            </div>
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                <Banknote size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Slip Terbit Bulan Ini</p>
                                <h2 className="text-2xl font-bold text-slate-800 mt-1">
                                    {payrolls.filter(p => p.month_year === new Date().toLocaleDateString('id-ID', { month: '2-digit', year: 'numeric' }).replace('/', '-')).length}
                                </h2>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                <Building2 size={24} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={canManage ? "Cari nama pegawai..." : "Cari periode bulan..."}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-900 text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Periode</th>
                                    {canManage && <th className="p-4 font-medium">Nama Pegawai</th>}
                                    <th className="p-4 font-medium text-right">Gaji Pokok</th>
                                    <th className="p-4 font-medium text-right">Tunjangan</th>
                                    <th className="p-4 font-medium text-right">Potongan</th>
                                    <th className="p-4 font-medium text-right">Total Terima</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 font-medium text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canManage ? 8 : 7} className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : payrolls.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 8 : 7} className="p-12 text-center text-slate-500">
                                            <Banknote size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-700">Belum Ada Data Gaji</p>
                                        </td>
                                    </tr>
                                ) : (
                                    payrolls.map((payroll) => (
                                        <tr key={payroll.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center text-slate-700 font-medium whitespace-nowrap">
                                                    <Calendar size={16} className="mr-2 text-slate-400" />
                                                    {payroll.month_year}
                                                </div>
                                            </td>
                                            {canManage && (
                                                <td className="p-4">
                                                    <p className="font-semibold text-slate-800">{payroll.user?.name}</p>
                                                    <p className="text-xs text-slate-500">{payroll.user?.email}</p>
                                                </td>
                                            )}
                                            <td className="p-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(payroll.basic_salary)}</td>
                                            <td className="p-4 text-right text-emerald-600 whitespace-nowrap">+{formatCurrency(payroll.allowances)}</td>
                                            <td className="p-4 text-right text-red-600 whitespace-nowrap">-{formatCurrency(payroll.deductions)}</td>
                                            <td className="p-4 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(payroll.total)}</td>
                                            <td className="p-4 text-center">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                                                    payroll.status === 'Paid' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                )}>
                                                    {payroll.status === 'Paid' ? <CheckCircle size={12} className="mr-1" /> : null}
                                                    {payroll.status === 'Paid' ? 'Lunas' : 'Tertunda'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button className="text-slate-400 hover:text-blue-600 transition p-1.5" title="Cetak Slip">
                                                        <Printer size={16} />
                                                    </button>
                                                    {canManage && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(payroll)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                title="Edit"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(payroll.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Create/Edit Payroll */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold flex items-center text-slate-800">
                                    <Building2 className="text-slate-900 mr-2" size={24} /> {editingPayroll ? 'Edit Slip Gaji' : 'Buat Slip Gaji'}
                                </h2>
                                <button onClick={() => { setShowModal(false); setEditingPayroll(null); }} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Pegawai (User)</label>
                                        <select
                                            name="user_id"
                                            required
                                            value={formData.user_id}
                                            onChange={handleInput}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 text-sm"
                                        >
                                            <option value="">-- Pilih --</option>
                                            {users.filter(u => ![6, 7].includes(u.role_id)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} (Role: {u.role_id})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Periode Bulan (MM-YYYY)</label>
                                        <input
                                            type="text"
                                            name="month_year"
                                            required
                                            placeholder="01-2024"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 text-sm"
                                            value={formData.month_year}
                                            onChange={handleInput}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-b border-slate-100 py-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Gaji Pokok</label>
                                        <input
                                            type="number"
                                            name="basic_salary"
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 text-sm"
                                            placeholder="0"
                                            value={formData.basic_salary}
                                            onChange={handleInput}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tunjangan</label>
                                        <input
                                            type="number"
                                            name="allowances"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 text-sm"
                                            placeholder="0"
                                            value={formData.allowances}
                                            onChange={handleInput}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Potongan</label>
                                        <input
                                            type="number"
                                            name="deductions"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 text-sm"
                                            placeholder="0"
                                            value={formData.deductions}
                                            onChange={handleInput}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Pembayaran</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-xs">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                            className={clsx(
                                                "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                formData.status === 'Paid' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            Lunas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: 'Pending' })}
                                            className={clsx(
                                                "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                formData.status === 'Pending' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            Tertunda
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); setEditingPayroll(null); }}
                                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={clsx(
                                            "px-6 py-2.5 rounded-xl text-white font-medium transition flex justify-center items-center min-w-[120px]",
                                            "bg-slate-900 hover:bg-black",
                                            submitting && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {submitting ? 'Menyimpan...' : (editingPayroll ? 'Simpan Perubahan' : 'Simpan Slip')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payroll;
