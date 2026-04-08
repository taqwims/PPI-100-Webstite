import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, CheckCircle, AlertTriangle, Landmark, FileText, ChevronDown, PenSquare, Trash2, ArrowRightLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

interface ExternalDebt {
    id: string;
    creditor_name: string;
    description: string;
    amount: number;
    paid_amount: number;
    status: string;
    due_date?: string;
    notes: string;
    created_at: string;
    created_by: { name: string };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const ExternalDebts: React.FC = () => {
    const { user } = useAuth();
    const canManage = user?.role_id === 1 || user?.role_id === 9; // Admin/Finance

    const [debts, setDebts] = useState<ExternalDebt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modals
    const [showFormModal, setShowFormModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<ExternalDebt | null>(null);

    // Form data (Create/Edit Debt)
    const [formData, setFormData] = useState({
        creditor_name: '',
        description: '',
        amount: '',
        due_date: '',
        notes: ''
    });
    
    // Payment Form
    const [paymentData, setPaymentData] = useState({
        amount: '',
        fund_source: 'Kas Umum',
        notes: ''
    });

    const [submitting, setSubmitting] = useState(false);

    // Payments View
    const [viewPaymentsDebtId, setViewPaymentsDebtId] = useState<string | null>(null);
    const { data: paymentsMapping = {} } = useQuery({
        queryKey: ['debt-payments', viewPaymentsDebtId],
        queryFn: async () => {
            if (!viewPaymentsDebtId) return {};
            const res = await api.get(`/finance/debts/${viewPaymentsDebtId}/payments`);
            return { [viewPaymentsDebtId]: res.data };
        },
        enabled: !!viewPaymentsDebtId
    });

    const handleDownloadReceipt = async (payment: any) => {
        try {
            const { generateExternalDebtPaymentReceipt } = await import('../../utils/pdfUtils');
            await generateExternalDebtPaymentReceipt(payment);
            toast.success('Bukti pembayaran berhasil diunduh');
        } catch (error) {
            console.error('Failed to generate receipt:', error);
            toast.error('Gagal membuat bukti pembayaran');
        }
    };

    const fetchDebts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/debts');
            setDebts(res.data || []);
        } catch (error) {
            console.error("Failed to fetch debts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    const handleOpenForm = (debt?: ExternalDebt) => {
        if (debt) {
            setSelectedDebt(debt);
            setFormData({
                creditor_name: debt.creditor_name,
                description: debt.description,
                amount: String(debt.amount),
                due_date: debt.due_date ? debt.due_date.split('T')[0] : '',
                notes: debt.notes || ''
            });
        } else {
            setSelectedDebt(null);
            setFormData({
                creditor_name: '',
                description: '',
                amount: '',
                due_date: '',
                notes: ''
            });
        }
        setShowFormModal(true);
    };

    const handleSaveDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.creditor_name || !formData.amount) {
            toast.error("Silakan isi nama kreditur dan nominal");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined
            };

            if (selectedDebt) {
                await api.put(`/finance/debts/${selectedDebt.id}`, payload);
                toast.success('Hutang berhasil diperbarui');
            } else {
                await api.post('/finance/debts', payload);
                toast.success('Catatan hutang baru berhasil disimpan');
            }
            setShowFormModal(false);
            fetchDebts();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan catatan hutang');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDebt = async (id: string) => {
        if (!window.confirm("Yakin ingin menghapus catatan hutang ini? (Hanya dapat dihapus bila belum ada pembayaran)")) return;
        try {
            await api.delete(`/finance/debts/${id}`);
            toast.success("Hutang berhasil dihapus");
            fetchDebts();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menghapus hutang');
        }
    };

    const handleOpenPayment = (debt: ExternalDebt) => {
        setSelectedDebt(debt);
        setPaymentData({
            amount: String(debt.amount - debt.paid_amount),
            fund_source: 'Kas Umum',
            notes: ''
        });
        setShowPaymentModal(true);
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDebt) return;
        const amt = parseFloat(paymentData.amount);
        if (!amt || amt <= 0) {
            toast.error("Nominal pembayaran tidak valid");
            return;
        }
        if (amt > (selectedDebt.amount - selectedDebt.paid_amount)) {
            toast.error("Nominal pembayaran melebihi sisa hutang");
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/finance/debts/${selectedDebt.id}/payments`, {
                amount: amt,
                fund_source: paymentData.fund_source,
                notes: paymentData.notes
            });
            toast.success("Pembayaran hutang berhasil dicatat di Kas");
            setShowPaymentModal(false);
            fetchDebts();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal memproses pembayaran');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDebts = debts.filter(d => {
        if (statusFilter !== 'All' && d.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return d.creditor_name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
        }
        return true;
    });

    const totalHutang = debts.reduce((sum, d) => sum + d.amount, 0);
    const totalTerbayar = debts.reduce((sum, d) => sum + d.paid_amount, 0);
    const sisaHutang = totalHutang - totalTerbayar;

    const getStatusColor = (status: string) => {
        if (status === 'Paid') return 'bg-emerald-100 text-emerald-800';
        if (status === 'Partial') return 'bg-amber-100 text-amber-800';
        return 'bg-rose-100 text-rose-800';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catatan Hutang Sekolah</h1>
                    <p className="text-slate-500 mt-1">Manajemen hutang operasional dan cicilan ke vendor/pihak ke-3</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => handleOpenForm()}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition"
                    >
                        <Plus size={18} />
                        <span>Catat Hutang Baru</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Beban Hutang Aktif (Sisa)</p>
                            <h2 className="text-3xl font-bold text-rose-600 mt-1">{formatCurrency(sisaHutang)}</h2>
                        </div>
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Terbayar</p>
                            <h2 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalTerbayar)}</h2>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Hutang Tercatat</p>
                            <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalHutang)}</h2>
                        </div>
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            <Landmark size={20} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari kreditur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden text-sm">
                        {['All', 'Unpaid', 'Partial', 'Paid'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={clsx(
                                    "px-4 py-2 font-medium transition",
                                    statusFilter === status ? "bg-slate-100 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                {status === 'All' ? 'Semua' : status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="p-4 font-medium">Kreditur / Vendor</th>
                                <th className="p-4 font-medium">Keterangan</th>
                                <th className="p-4 font-medium text-right">Nominal</th>
                                <th className="p-4 font-medium text-right">Sisa Hutang</th>
                                <th className="p-4 font-medium">Jatuh Tempo</th>
                                <th className="p-4 font-medium text-center">Status</th>
                                <th className="p-4 font-medium text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredDebts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500">
                                        <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-lg font-medium text-slate-700">Tidak ada catatan hutang</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDebts.map(debt => {
                                    const isExpanded = viewPaymentsDebtId === debt.id;
                                    const sisa = debt.amount - debt.paid_amount;
                                    return (
                                        <React.Fragment key={debt.id}>
                                            <tr className="hover:bg-slate-50/50 transition">
                                                <td className="p-4">
                                                    <p className="font-semibold text-slate-800">{debt.creditor_name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(debt.created_at)}</p>
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{debt.description}</td>
                                                <td className="p-4 text-sm text-right text-slate-800 font-medium">{formatCurrency(debt.amount)}</td>
                                                <td className="p-4 text-sm text-right text-rose-600 font-bold">{formatCurrency(sisa)}</td>
                                                <td className="p-4 text-sm text-slate-600">{formatDate(debt.due_date || '')}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusColor(debt.status)}`}>
                                                        {debt.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {canManage && sisa > 0 && (
                                                            <button 
                                                                onClick={() => handleOpenPayment(debt)}
                                                                className="p-1.5 bg-blue-50 text-blue-600 rounded flex items-center gap-1 hover:bg-blue-100 transition whitespace-nowrap text-xs font-medium"
                                                            >
                                                                <ArrowRightLeft size={14} /> Bayar
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => setViewPaymentsDebtId(isExpanded ? null : debt.id)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                                                            title="Lihat Riwayat"
                                                        >
                                                            <ChevronDown size={18} className={clsx("transition-transform", isExpanded && "rotate-180")} />
                                                        </button>
                                                        {canManage && (
                                                            <>
                                                            <button onClick={() => handleOpenForm(debt)} className="p-1.5 text-slate-400 hover:text-blue-600 transition">
                                                                <PenSquare size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteDebt(debt.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition" disabled={debt.paid_amount > 0}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={7} className="p-0">
                                                        <div className="p-4 pl-12">
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Riwayat Cicilan & Pembayaran</h5>
                                                            {!paymentsMapping[debt.id] ? (
                                                                <p className="text-xs text-slate-500">Memuat riwayat...</p>
                                                            ) : paymentsMapping[debt.id].length === 0 ? (
                                                                <p className="text-xs text-slate-500">Belum ada pembayaran</p>
                                                            ) : (
                                                                <div className="space-y-2 max-w-2xl">
                                                                    {paymentsMapping[debt.id].map((p: any) => (
                                                                        <div key={p.id} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-slate-200">
                                                                            <div>
                                                                                <span className="font-semibold text-slate-700">{formatCurrency(p.amount)}</span>
                                                                                <span className="text-xs text-slate-500 ml-3">Melalui {p.fund_source}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="text-xs text-slate-400">{formatDate(p.created_at)} • Oleh {p.paid_by?.name}</span>
                                                                                <button
                                                                                    onClick={() => handleDownloadReceipt({ ...p, debt })}
                                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                                                                    title="Unduh Kuitansi"
                                                                                >
                                                                                    <FileText size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form Catatan Hutang */}
            {showFormModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                            <h2 className="text-lg font-bold text-slate-800">{selectedDebt ? 'Edit Catatan Hutang' : 'Catat Hutang Baru'}</h2>
                            <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveDebt} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pihak Ketiga / Vendor</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.creditor_name}
                                    onChange={(e) => setFormData({...formData, creditor_name: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Contoh: Toko Buku Sejahtera"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Hutang</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Beli ATK tahun ajaran baru"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Hutang (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jatuh Tempo (Opsional)</label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                ></textarea>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Batal</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50">
                                    {submitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Payment */}
            {showPaymentModal && selectedDebt && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                            <h2 className="text-lg font-bold text-emerald-800">Pembayaran Hutang</h2>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSavePayment} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                                <p className="text-xs text-slate-500 mb-1">Membayar ke:</p>
                                <p className="font-bold text-slate-800">{selectedDebt.creditor_name}</p>
                                <div className="mt-2 flex justify-between items-center">
                                    <p className="text-xs text-slate-500">Sisa Hutang</p>
                                    <p className="font-bold text-rose-600">{formatCurrency(selectedDebt.amount - selectedDebt.paid_amount)}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sumber Dana</label>
                                <select
                                    value={paymentData.fund_source}
                                    onChange={(e) => setPaymentData({...paymentData, fund_source: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-slate-800"
                                >
                                    <option value="Kas Umum">Kas Umum</option>
                                    <option value="Infaq">Infaq Harian</option>
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                    *Pembayaran ini otomatis memotong saldo <strong>{paymentData.fund_source}</strong> dan akan dicatat di Buku Kas Umum sebagai Expense otomatis.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal yang dibayarkan</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">Rp</span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={selectedDebt.amount - selectedDebt.paid_amount}
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Transfer/Bayar</label>
                                <textarea
                                    value={paymentData.notes}
                                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                                    placeholder="Contoh: Dibayar lunas via transfer BSI"
                                ></textarea>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Batal</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50">
                                    {submitting ? 'Memproses...' : <><CheckCircle size={16} /> Konfirmasi Pembayaran</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExternalDebts;
