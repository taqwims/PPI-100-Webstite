import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Filter, Search, Calendar, Heart, ArrowUpRight, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { exportToCSV } from '../../utils/exportUtils';

interface DailyInfaqEntry {
    id: string;
    date: string;
    source: string;
    type: 'Income' | 'Expense';
    amount: number;
    handled_by: { name: string };
    notes: string;
    created_at: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const DailyInfaq = () => {
    const { user } = useAuth();
    // 1: SuperAdmin, 8: Pimpinan (View Only), 9: Bendahara, 11: Teller Infaq
    const canManage = [1, 9, 11].includes(user?.role_id || 0);

    const [entries, setEntries] = useState<DailyInfaqEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<DailyInfaqEntry | null>(null);
    const [formData, setFormData] = useState({
        source: '',
        amount: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInfaq();
    }, []);

    const fetchInfaq = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/daily-infaq');
            setEntries(res.data);
        } catch (error) {
            console.error("Failed to fetch infaq", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openCreateModal = () => {
        setEditingEntry(null);
        setFormData({ source: '', amount: '', notes: '' });
        setShowModal(true);
    };

    const openEditModal = (entry: DailyInfaqEntry) => {
        setEditingEntry(entry);
        setFormData({
            source: entry.source,
            amount: String(entry.amount),
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
                type: 'Income',
                amount: parseFloat(formData.amount),
                notes: formData.notes
            };

            if (editingEntry) {
                await api.put(`/finance/daily-infaq/${editingEntry.id}`, payload);
            } else {
                await api.post('/finance/daily-infaq', payload);
            }
            setShowModal(false);
            setEditingEntry(null);
            setFormData({ source: '', amount: '', notes: '' });
            fetchInfaq();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menyimpan data infaq");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus data infaq ini?')) return;
        try {
            await api.delete(`/finance/daily-infaq/${id}`);
            fetchInfaq();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menghapus data infaq");
        }
    };

    const totalIncome = entries.filter((t: any) => t.type === 'Income').reduce((sum: number, t: any) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manajemen Infaq Harian</h1>
                        <p className="text-slate-500 mt-1">Kelola dan pantau pemasukan infaq dari siswa dan umum.</p>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => exportToCSV(entries, 'Daily_Infaq')}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Download size={18} />
                            <span>Export</span>
                        </button>
                        {canManage && (
                            <button
                                onClick={openCreateModal}
                                className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-sm transition"
                            >
                                <Plus size={18} />
                                <span>Tambah Infaq</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Heart size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-emerald-100 font-medium tracking-wide text-sm mb-1 uppercase">Total Infaq Terkumpul</p>
                            <h2 className="text-3xl font-bold">{formatCurrency(totalIncome)}</h2>
                            <p className="text-sm text-emerald-100 mt-4 flex items-center">
                                <ArrowUpRight size={16} className="mr-1" />
                                {entries.length} Transaksi Tercatat
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari sumber atau keterangan..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            />
                        </div>
                        <button className="flex items-center space-x-2 text-slate-600 hover:text-emerald-600 transition px-3 py-2 rounded-lg hover:bg-emerald-50 text-sm font-medium">
                            <Filter size={16} />
                            <span>Filter Periode</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Tanggal</th>
                                    <th className="p-4 font-medium">Sumber / Donatur</th>
                                    <th className="p-4 font-medium">Keterangan</th>
                                    <th className="p-4 font-medium">Penerima (Petugas)</th>
                                    <th className="p-4 font-medium text-right">Nominal</th>
                                    {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canManage ? 6 : 5} className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 6 : 5} className="p-12 text-center text-slate-500">
                                            <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-700">Belum Ada Data Infaq</p>
                                            <p className="text-sm">Data transaksi infaq harian akan muncul di sini.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Calendar size={14} className="mr-2 text-slate-400" />
                                                    {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">{entry.source}</td>
                                            <td className="p-4 text-slate-500 text-sm max-w-xs truncate" title={entry.notes}>{entry.notes || '-'}</td>
                                            <td className="p-4 text-slate-600 text-sm">{entry.handled_by?.name || '-'}</td>
                                            <td className="p-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                                                + {formatCurrency(entry.amount)}
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

                {/* Modal Form */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold flex items-center text-slate-800">
                                    <Heart className="text-emerald-500 mr-2" size={24} /> {editingEntry ? 'Edit Data Infaq' : 'Input Data Infaq'}
                                </h2>
                                <button onClick={() => { setShowModal(false); setEditingEntry(null); }} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sumber / Nama Donatur</label>
                                    <input
                                        type="text"
                                        name="source"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                        placeholder="Contoh: Siswa Kelas 1A / Hamba Allah"
                                        value={formData.source}
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
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 font-medium"
                                        placeholder="50000"
                                        value={formData.amount}
                                        onChange={handleInput}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan (Opsional)</label>
                                    <textarea
                                        name="notes"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                        rows={3}
                                        placeholder="Catatan tambahan (misal: Kotak Amal Jumat)..."
                                        value={formData.notes}
                                        onChange={handleInput}
                                    ></textarea>
                                </div>

                                <div className="pt-4 flex justify-end space-x-3">
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
                                            "bg-emerald-600 hover:bg-emerald-700",
                                            submitting && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {submitting ? 'Menyimpan...' : (editingEntry ? 'Simpan Perubahan' : 'Simpan')}
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

export default DailyInfaq;
