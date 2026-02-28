import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Search, BookOpen, ArrowUpRight, ArrowDownRight, Briefcase, FileText, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { exportToCSV } from '../../utils/exportUtils';

interface CashLedgerEntry {
    id: string;
    date: string;
    source: string;
    item_name: string;
    type: 'Income' | 'Expense';
    amount: number;
    category: string;
    notes: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const CashLedger = () => {
    const { user } = useAuth();
    // 1: SuperAdmin, 8: Pimpinan (View Only), 9: Bendahara
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CashLedgerEntry | null>(null);
    const [formData, setFormData] = useState({
        source: '',
        item_name: '',
        type: 'Expense',
        amount: '',
        category: 'Operasional',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/cash-ledger');
            setEntries(res.data);
        } catch (error) {
            console.error("Failed to fetch ledger", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openCreateModal = () => {
        setEditingEntry(null);
        setFormData({ source: '', item_name: '', type: 'Expense', amount: '', category: 'Operasional', notes: '' });
        setShowModal(true);
    };

    const openEditModal = (entry: CashLedgerEntry) => {
        setEditingEntry(entry);
        setFormData({
            source: entry.source,
            item_name: entry.item_name,
            type: entry.type,
            amount: String(entry.amount),
            category: entry.category,
            notes: entry.notes || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                source: formData.source,
                item_name: formData.item_name,
                type: formData.type,
                amount: parseFloat(formData.amount),
                category: formData.category,
                notes: formData.notes
            };

            if (editingEntry) {
                await api.put(`/finance/cash-ledger/${editingEntry.id}`, payload);
            } else {
                await api.post('/finance/cash-ledger', payload);
            }
            setShowModal(false);
            setEditingEntry(null);
            setFormData({ source: '', item_name: '', type: 'Expense', amount: '', category: 'Operasional', notes: '' });
            fetchLedger();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menyimpan data kas");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus entri ini?')) return;
        try {
            await api.delete(`/finance/cash-ledger/${id}`);
            fetchLedger();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menghapus data kas");
        }
    };

    const totalIncome = entries.filter(e => e.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = entries.filter(e => e.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    const currentSaldo = entries.reduce((acc, curr) => curr.type === 'Income' ? acc + curr.amount : acc - curr.amount, 0);
    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Buku Kas Umum</h1>
                        <p className="text-slate-500 mt-1">Pencatatan sirkulasi seluruh dana operasional sekolah.</p>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => exportToCSV(entries, 'Cash_Ledger')}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Download size={18} />
                            <span>Export Excel</span>
                        </button>
                        {canManage && (
                            <button
                                onClick={openCreateModal}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition"
                            >
                                <Plus size={18} />
                                <span>Input Transaksi Kas</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Saldo Kas Aktif</p>
                                <h2 className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(currentSaldo)}</h2>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <BookOpen size={24} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Total keseluruhan uang yang ada di Kas</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Pemasukan</p>
                                <h2 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalIncome)}</h2>
                            </div>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <ArrowUpRight size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Akumulasi uang masuk (Income)</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Pengeluaran</p>
                                <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense)}</h2>
                            </div>
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                <ArrowDownRight size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Akumulasi uang keluar (Expense)</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari item, sumber, atau keterangan transaksi..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Tanggal</th>
                                    <th className="p-4 font-medium">Nama Item / Keperluan</th>
                                    <th className="p-4 font-medium">Sumber/Tujuan</th>
                                    <th className="p-4 font-medium">Kategori</th>
                                    <th className="p-4 font-medium text-right">Pemasukan</th>
                                    <th className="p-4 font-medium text-right">Pengeluaran</th>
                                    {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canManage ? 7 : 6} className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 7 : 6} className="p-12 text-center text-slate-500">
                                            <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-700">Buku Kas Kosong</p>
                                            <p className="text-sm">Belum ada pencatatan operasional sekolah.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                                {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-slate-800">{entry.item_name}</p>
                                                {entry.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={entry.notes}>{entry.notes}</p>}
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">{entry.source}</td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                                    {entry.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                                                {entry.type === 'Income' ? formatCurrency(entry.amount) : '-'}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                                                {entry.type === 'Expense' ? formatCurrency(entry.amount) : '-'}
                                            </td>
                                            {canManage && (
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button
                                                            onClick={() => openEditModal(entry)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(entry.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Transaksi Kas */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold flex items-center text-slate-800">
                                    <Briefcase className="text-blue-600 mr-2" size={24} /> {editingEntry ? 'Edit Transaksi Kas' : 'Input Transaksi Kas'}
                                </h2>
                                <button onClick={() => { setShowModal(false); setEditingEntry(null); }} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Anggaran</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'Income' })}
                                                className={clsx(
                                                    "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                    formData.type === 'Income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                Pemasukan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'Expense' })}
                                                className={clsx(
                                                    "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                    formData.type === 'Expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                Pengeluaran
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                                        <select
                                            name="category"
                                            required
                                            value={formData.category}
                                            onChange={handleInput}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="Operasional">Operasional (ATK, Listrik, dll)</option>
                                            <option value="Hutang">Hutang Pihak ke 3</option>
                                            <option value="Kegiatan Sekolah">Uang Kegiatan Sekolah</option>
                                            <option value="Perbaikan Sarpras">Perbaikan Sarpras</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Item / Keperluan</label>
                                        <input
                                            type="text"
                                            name="item_name"
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
                                            placeholder="Contoh: Pembayaran Listrik"
                                            value={formData.item_name}
                                            onChange={handleInput}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                        <input
                                            type="number"
                                            name="amount"
                                            required
                                            min="1000"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium text-sm"
                                            placeholder="150000"
                                            value={formData.amount}
                                            onChange={handleInput}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sumber / Tujuan</label>
                                    <input
                                        type="text"
                                        name="source"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
                                        placeholder="Pihak penerima atau pemberi dana..."
                                        value={formData.source}
                                        onChange={handleInput}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <textarea
                                            name="notes"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
                                            rows={2}
                                            placeholder="Nomor referensi kwitansi dsb..."
                                            value={formData.notes}
                                            onChange={handleInput}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); setEditingEntry(null); }}
                                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={clsx(
                                            "px-6 py-2.5 rounded-xl text-white font-medium transition flex justify-center items-center min-w-[120px]",
                                            "bg-blue-600 hover:bg-blue-700",
                                            submitting && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {submitting ? 'Memproses...' : (editingEntry ? 'Simpan Perubahan' : 'Simpan Transaksi')}
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

export default CashLedger;
