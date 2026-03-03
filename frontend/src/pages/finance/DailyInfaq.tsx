import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Search, Calendar, Heart, ArrowUpRight, ArrowDownRight, AlertCircle, Pencil, Trash2, Filter, X, FileText, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import { exportToCSV } from '../../utils/exportUtils';
import { generateCashLedgerReport } from '../../utils/pdfUtils';

interface StaffUser {
    id: string;
    name: string;
    role_id: number;
}

interface ClassData {
    id: number;
    name: string;
}

interface DailyInfaqEntry {
    id: string;
    date: string;
    source: string;
    type: 'Income' | 'Expense';
    amount: number;
    class_name?: string;
    handled_by: { name: string };
    responsible_id?: string;
    responsible?: { id: string; name: string };
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

    const getDefaultUnitID = () => {
        if (user?.role_id === 2 || user?.role_id === 4 || user?.role_id === 6 || user?.role_id === 13) return 2; // MA
        if (user?.role_id === 3 || user?.role_id === 5 || user?.role_id === 7 || user?.role_id === 12) return 1; // MTS
        return 1; // Default
    };
    const [unitID, setUnitID] = useState<number>(getDefaultUnitID());

    const [entries, setEntries] = useState<DailyInfaqEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [classList, setClassList] = useState<ClassData[]>([]);

    // Form State
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<DailyInfaqEntry | null>(null);
    const [formData, setFormData] = useState({
        source: '',
        type: 'Income' as 'Income' | 'Expense',
        amount: '',
        class_name: '',
        notes: '',
        responsible_id: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Export modal
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

    // Filter state
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    useEffect(() => {
        fetchInfaq();
        fetchStaff();
        fetchClasses();
    }, [unitID]);

    const fetchInfaq = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/daily-infaq');
            setEntries(res.data || []);
        } catch (error) {
            console.error("Failed to fetch infaq", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/users');
            const allUsers = res.data || [];
            setStaffList(allUsers.filter((u: StaffUser) => ![6, 7].includes(u.role_id)));
        } catch (error) {
            console.error("Failed to fetch staff", error);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            setClassList(res.data || []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openCreateModal = (type: 'Income' | 'Expense' = 'Income') => {
        setEditingEntry(null);
        setFormData({ source: '', type, amount: '', class_name: '', notes: '', responsible_id: '' });
        setShowModal(true);
    };

    const openEditModal = (entry: DailyInfaqEntry) => {
        setEditingEntry(entry);
        setFormData({
            source: entry.source,
            type: entry.type,
            amount: String(entry.amount),
            class_name: entry.class_name || '',
            notes: entry.notes || '',
            responsible_id: entry.responsible_id || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = {
                source: formData.source,
                type: formData.type,
                amount: parseFloat(formData.amount),
                notes: formData.notes
            };

            if (formData.class_name) payload.class_name = formData.class_name;
            if (formData.type === 'Expense' && formData.responsible_id) {
                payload.responsible_id = formData.responsible_id;
            }

            if (editingEntry) {
                await api.put(`/finance/daily-infaq/${editingEntry.id}`, payload);
            } else {
                await api.post('/finance/daily-infaq', payload);
            }
            setShowModal(false);
            setEditingEntry(null);
            setFormData({ source: '', type: 'Income', amount: '', class_name: '', notes: '', responsible_id: '' });
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

    const handleExport = () => {
        let filtered = entries;
        if (exportStartDate && exportEndDate) {
            filtered = entries.filter(e => {
                const d = new Date(e.date).toISOString().split('T')[0];
                return d >= exportStartDate && d <= exportEndDate;
            });
        } else if (exportStartDate) {
            filtered = entries.filter(e => new Date(e.date).toISOString().split('T')[0] >= exportStartDate);
        } else if (exportEndDate) {
            filtered = entries.filter(e => new Date(e.date).toISOString().split('T')[0] <= exportEndDate);
        }

        if (filtered.length === 0) {
            alert('Tidak ada data pada periode yang dipilih.');
            return;
        }

        if (exportFormat === 'pdf') {
            // Convert to CashLedger-like format for the report
            const data = filtered.map(e => ({
                id: e.id,
                date: e.date,
                source: e.source,
                item_name: e.type === 'Income' ? `Infaq${e.class_name ? ` - ${e.class_name}` : ''}` : `Pengeluaran Infaq`,
                type: e.type,
                amount: e.amount,
                category: 'Infaq',
                notes: e.notes
            }));
            generateCashLedgerReport(data, exportStartDate || 'Awal', exportEndDate || 'Akhir');
        } else {
            exportToCSV(filtered, `Infaq_Harian_${exportStartDate || 'all'}_${exportEndDate || 'all'}`);
        }
        setShowExportModal(false);
    };

    // Filter and search logic
    const filteredEntries = entries.filter(e => {
        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchSearch = (
                e.source?.toLowerCase().includes(q) ||
                e.notes?.toLowerCase().includes(q) ||
                e.class_name?.toLowerCase().includes(q) ||
                e.handled_by?.name?.toLowerCase().includes(q) ||
                e.responsible?.name?.toLowerCase().includes(q)
            );
            if (!matchSearch) return false;
        }
        // Time filter
        if (filterStartDate) {
            const d = new Date(e.date).toISOString().split('T')[0];
            if (d < filterStartDate) return false;
        }
        if (filterEndDate) {
            const d = new Date(e.date).toISOString().split('T')[0];
            if (d > filterEndDate) return false;
        }
        return true;
    });

    const totalIncome = entries.filter((t) => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = entries.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manajemen Infaq Harian</h1>
                        <p className="text-slate-500 mt-1">Kelola pemasukan dan pengeluaran infaq dari siswa dan umum.</p>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        {[1, 9, 10].includes(user?.role_id || 0) && (
                            <div className="p-1 bg-slate-100 rounded-lg hidden sm:flex shadow-sm border border-slate-200">
                                <button
                                    onClick={() => setUnitID(1)}
                                    className={clsx(
                                        "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                        unitID === 1 ? "bg-white text-emerald-700 shadow flex items-center" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    MTS
                                </button>
                                <button
                                    onClick={() => setUnitID(2)}
                                    className={clsx(
                                        "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                        unitID === 2 ? "bg-white text-emerald-700 shadow flex items-center" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    MA
                                </button>
                            </div>
                        )}
                        {canManage && (
                            <>
                                <button
                                    onClick={() => openCreateModal('Expense')}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 shadow-sm transition"
                                >
                                    <ArrowDownRight size={18} />
                                    <span className="hidden sm:inline">Pengeluaran</span>
                                </button>
                                <button
                                    onClick={() => openCreateModal('Income')}
                                    className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-sm transition"
                                >
                                    <Plus size={18} />
                                    <span className="hidden sm:inline">Tambah Infaq</span>
                                </button>
                            </>
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
                                {entries.filter(e => e.type === 'Income').length} Transaksi Masuk
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Pengeluaran</p>
                                <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense)}</h2>
                            </div>
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                <ArrowDownRight size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">{entries.filter(e => e.type === 'Expense').length} Transaksi Keluar</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Saldo Infaq</p>
                                <h2 className={clsx("text-2xl font-bold mt-1", netBalance >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(netBalance)}</h2>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Heart size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Selisih pemasukan dan pengeluaran</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari sumber, keterangan, kelas..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilterPanel(!showFilterPanel)}
                                className={clsx(
                                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition",
                                    showFilterPanel ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                                )}
                            >
                                <Filter size={16} />
                                <span>Filter Periode</span>
                            </button>
                        </div>
                    </div>

                    {showFilterPanel && (
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-500">Dari:</label>
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={e => setFilterStartDate(e.target.value)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-500">Sampai:</label>
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={e => setFilterEndDate(e.target.value)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            {(filterStartDate || filterEndDate) && (
                                <button
                                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                    className="text-xs text-red-500 hover:text-red-700 transition"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Tanggal</th>
                                    <th className="p-4 font-medium">Tipe</th>
                                    <th className="p-4 font-medium">Sumber / Donatur</th>
                                    <th className="p-4 font-medium">Kelas</th>
                                    <th className="p-4 font-medium">Keterangan</th>
                                    <th className="p-4 font-medium">Petugas</th>
                                    <th className="p-4 font-medium">Penanggung Jawab</th>
                                    <th className="p-4 font-medium text-right">Nominal</th>
                                    {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canManage ? 9 : 8} className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 9 : 8} className="p-12 text-center text-slate-500">
                                            <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-700">{searchQuery ? 'Tidak ditemukan hasil' : 'Belum Ada Data Infaq'}</p>
                                            <p className="text-sm">Data transaksi infaq harian akan muncul di sini.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Calendar size={14} className="mr-2 text-slate-400" />
                                                    {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={clsx(
                                                    "px-2 py-0.5 text-xs font-semibold rounded-full",
                                                    entry.type === 'Income' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {entry.type === 'Income' ? 'Masuk' : 'Keluar'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">{entry.source}</td>
                                            <td className="p-4 text-sm">
                                                {entry.class_name ? (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">{entry.class_name}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-500 text-sm max-w-xs truncate" title={entry.notes}>{entry.notes || '-'}</td>
                                            <td className="p-4 text-slate-600 text-sm">{entry.handled_by?.name || '-'}</td>
                                            <td className="p-4 text-sm">
                                                {entry.type === 'Expense' && entry.responsible ? (
                                                    <span className="flex items-center gap-1.5 text-slate-700">
                                                        <UserCheck size={14} className="text-blue-500" />
                                                        {entry.responsible.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className={clsx("p-4 text-right font-semibold whitespace-nowrap", entry.type === 'Income' ? "text-emerald-600" : "text-red-600")}>
                                                {entry.type === 'Income' ? '+' : '-'} {formatCurrency(entry.amount)}
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
                                    {formData.type === 'Income' ? (
                                        <><Heart className="text-emerald-500 mr-2" size={24} /> {editingEntry ? 'Edit Infaq' : 'Input Infaq Masuk'}</>
                                    ) : (
                                        <><ArrowDownRight className="text-red-500 mr-2" size={24} /> {editingEntry ? 'Edit Pengeluaran' : 'Input Pengeluaran Infaq'}</>
                                    )}
                                </h2>
                                <button onClick={() => { setShowModal(false); setEditingEntry(null); }} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Type Toggle */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Transaksi</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'Income', responsible_id: '' })}
                                            className={clsx(
                                                "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                formData.type === 'Income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                                            )}
                                        >
                                            Pemasukan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'Expense' })}
                                            className={clsx(
                                                "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                formData.type === 'Expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500"
                                            )}
                                        >
                                            Pengeluaran
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {formData.type === 'Income' ? 'Sumber / Nama Donatur' : 'Keperluan Pengeluaran'}
                                    </label>
                                    <input
                                        type="text"
                                        name="source"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                        placeholder={formData.type === 'Income' ? "Contoh: Siswa Kelas 1A / Hamba Allah" : "Contoh: Bantuan untuk yayasan"}
                                        value={formData.source}
                                        onChange={handleInput}
                                    />
                                </div>

                                {/* Kelas - optional, shown for Income */}
                                {formData.type === 'Income' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kelas (Opsional)</label>
                                        <select
                                            name="class_name"
                                            value={formData.class_name}
                                            onChange={handleInput}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                        >
                                            <option value="">-- Semua / Umum --</option>
                                            {classList.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Penanggung Jawab - for Expense */}
                                {formData.type === 'Expense' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            <span className="flex items-center gap-1.5">
                                                <UserCheck size={14} className="text-blue-500" />
                                                Penanggung Jawab (Staff)
                                            </span>
                                        </label>
                                        <select
                                            name="responsible_id"
                                            value={formData.responsible_id}
                                            onChange={handleInput}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                        >
                                            <option value="">-- Pilih Penanggung Jawab --</option>
                                            {staffList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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
                                            formData.type === 'Income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
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

                {/* Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-lg font-bold flex items-center text-slate-800">
                                    <Download className="text-emerald-600 mr-2" size={22} /> Export Laporan Infaq
                                </h2>
                                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Periode Waktu</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Dari</label>
                                            <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Sampai</label>
                                            <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Kosongkan untuk export semua data.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Format Export</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button type="button" onClick={() => setExportFormat('pdf')}
                                            className={clsx("flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                exportFormat === 'pdf' ? "bg-white text-red-600 shadow-sm" : "text-slate-500")}>
                                            <FileText size={16} /> PDF
                                        </button>
                                        <button type="button" onClick={() => setExportFormat('csv')}
                                            className={clsx("flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                exportFormat === 'csv' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>
                                            <Download size={16} /> Excel (CSV)
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                                    <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                    <button onClick={handleExport} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition text-sm flex items-center gap-1.5">
                                        <Download size={16} /> Export Sekarang
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyInfaq;
