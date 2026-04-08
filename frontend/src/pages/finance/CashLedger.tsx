import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Search, BookOpen, ArrowUpRight, ArrowDownRight, Briefcase, FileText, AlertCircle, Pencil, Trash2, Printer, Calendar, X, UserCheck, Tag } from 'lucide-react';
import clsx from 'clsx';
import { exportToCSV } from '../../utils/exportUtils';
import { generateCashLedgerReceipt, generateCashLedgerReport } from '../../utils/pdfUtils';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface StaffUser {
    id: string;
    name: string;
    role_id: number;
}

interface CashLedgerEntry {
    id: string;
    date: string;
    source: string;
    item_name: string;
    type: 'Income' | 'Expense';
    amount: number;
    category: string;
    fund_source: string;
    auto_generated: boolean;
    notes: string;
    responsible_id?: string;
    responsible?: { id: string; name: string };
    transaction_code_id?: number;
}

interface TransactionCode { id: number; code: string; name: string; type: string; category: string; is_active: boolean; parent_code_id?: number | null; }

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const CashLedger = () => {
    const { user } = useAuth();
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CashLedgerEntry | null>(null);
    const [formData, setFormData] = useState({
        source: '',
        item_name: '',
        type: 'Expense',
        amount: '',
        category: 'Operasional',
        fund_source: 'Kas Umum',
        notes: '',
        responsible_id: '',
        transaction_code_id: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [transactionCodes, setTransactionCodes] = useState<TransactionCode[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Filters & Pagination
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [itemsPerPage, setItemsPerPage] = useState<number>(20);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedSemester, setSelectedSemester] = useState<string>('all');

    // Export modal state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

    useEffect(() => {
        fetchLedger();
        fetchStaff();
        fetchTransactionCodes();
    }, []);

    const fetchTransactionCodes = async () => {
        try {
            const res = await api.get('/finance/transaction-codes');
            setTransactionCodes(res.data || []);
        } catch (error) { console.error('Failed to fetch codes', error); }
    };

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

    const fetchStaff = async () => {
        try {
            const res = await api.get('/users');
            const allUsers = res.data || [];
            // Filter to only staff roles (not students/parents): roles 1-11 excluding 6(siswa), 7(ortu)
            setStaffList(allUsers.filter((u: StaffUser) => ![6, 7].includes(u.role_id)));
        } catch (error) {
            console.error("Failed to fetch staff", error);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTransactionCodeChange = (codeId: string) => {
        const tc = transactionCodes.find(c => c.id === Number(codeId));
        setFormData({
            ...formData,
            transaction_code_id: codeId,
            category: tc ? tc.category : formData.category,
            type: tc ? (tc.type as 'Income' | 'Expense') : formData.type,
        });
    };

    const openCreateModal = () => {
        setEditingEntry(null);
        setFormData({ source: '', item_name: '', type: 'Expense', amount: '', category: '', fund_source: 'Kas Umum', notes: '', responsible_id: '', transaction_code_id: '' });
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
            fund_source: entry.fund_source || 'Kas Umum',
            notes: entry.notes || '',
            responsible_id: entry.responsible_id || '',
            transaction_code_id: entry.transaction_code_id ? String(entry.transaction_code_id) : ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = {
                source: formData.source,
                item_name: formData.item_name,
                type: formData.type,
                amount: parseFloat(formData.amount),
                category: formData.category,
                fund_source: formData.fund_source,
                notes: formData.notes
            };

            if (formData.type === 'Expense' && formData.responsible_id) {
                payload.responsible_id = formData.responsible_id;
            }
            if (formData.transaction_code_id) {
                payload.transaction_code_id = Number(formData.transaction_code_id);
            }

            if (editingEntry) {
                await api.put(`/finance/cash-ledger/${editingEntry.id}`, payload);
            } else {
                await api.post('/finance/cash-ledger', payload);
            }
            setShowModal(false);
            setEditingEntry(null);
            setFormData({ source: '', item_name: '', type: 'Expense', amount: '', category: '', fund_source: 'Kas Umum', notes: '', responsible_id: '', transaction_code_id: '' });
            fetchLedger();
            toast.success(editingEntry ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil disimpan');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan data kas');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/finance/cash-ledger/${id}`);
            fetchLedger();
            toast.success('Data berhasil dihapus');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menghapus data kas');
        }
    };

    const handlePrintReceipt = (entry: CashLedgerEntry) => {
        generateCashLedgerReceipt(entry);
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
            toast.error('Tidak ada data pada periode yang dipilih.');
            return;
        }

        if (exportFormat === 'pdf') {
            generateCashLedgerReport(filtered, exportStartDate || 'Awal', exportEndDate || 'Akhir');
        } else {
            exportToCSV(filtered, `Cash_Ledger_${exportStartDate || 'all'}_${exportEndDate || 'all'}`);
        }
        setShowExportModal(false);
    };

    // Application of Filters
    let processedEntries = entries.filter(e => {
        let match = true;
        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!(
                e.item_name?.toLowerCase().includes(q) ||
                e.source?.toLowerCase().includes(q) ||
                e.notes?.toLowerCase().includes(q) ||
                e.category?.toLowerCase().includes(q) ||
                e.responsible?.name?.toLowerCase().includes(q)
            )) match = false;
        }
        // Date filters
        if (filterStartDate) {
            if (e.date.split('T')[0] < filterStartDate) match = false;
        }
        if (filterEndDate) {
            if (e.date.split('T')[0] > filterEndDate) match = false;
        }
        // Semester Filter
        if (selectedSemester !== 'all') {
            const month = new Date(e.date).getMonth() + 1;
            const isSem1 = month >= 7 && month <= 12; // Jul-Dec
            if (selectedSemester === '1' && !isSem1) match = false;
            if (selectedSemester === '2' && isSem1) match = false;
        }

        return match;
    });

    // Sorting
    processedEntries.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
    });

    // Pagination
    const totalPages = Math.ceil(processedEntries.length / itemsPerPage);
    const paginatedEntries = processedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Download size={18} />
                            <span>Export Data</span>
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
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative w-full sm:w-64 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari transaksi..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); }} title="Tanggal Mulai" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                                <span className="text-slate-400">-</span>
                                <input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); }} title="Tanggal Akhir" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white cursor-pointer w-full sm:w-auto">
                                <option value="all">Semua Semester</option>
                                <option value="1">Ganjil</option>
                                <option value="2">Genap</option>
                            </select>
                            <select value={sortOrder} onChange={e => { setSortOrder(e.target.value as 'asc'|'desc'); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white cursor-pointer w-full sm:w-auto">
                                <option value="desc">Terbaru</option>
                                <option value="asc">Terlama</option>
                            </select>
                            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white cursor-pointer w-full sm:w-auto">
                                <option value="20">20 Baris</option>
                                <option value="40">40 Baris</option>
                                <option value="80">80 Baris</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Tanggal</th>
                                    <th className="p-4 font-medium">Nama Item / Keperluan</th>
                                    <th className="p-4 font-medium">Sumber/Tujuan</th>
                                    <th className="p-4 font-medium">Kategori</th>
                                    <th className="p-4 font-medium">Penanggung Jawab</th>
                                    <th className="p-4 font-medium text-right">Pemasukan</th>
                                    <th className="p-4 font-medium text-right">Pengeluaran</th>
                                    {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canManage ? 8 : 7} className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 8 : 7} className="p-12 text-center text-slate-500">
                                            <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-700">
                                                {searchQuery || filterStartDate || filterEndDate ? 'Tidak ditemukan hasil pencarian' : 'Buku Kas Kosong'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                                {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-slate-800">{entry.item_name}</p>
                                                    {entry.auto_generated && (
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-semibold uppercase tracking-wide">Auto</span>
                                                    )}
                                                </div>
                                                {entry.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={entry.notes}>{entry.notes}</p>}
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">{entry.source}</td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                                    {entry.category}
                                                </span>
                                            </td>
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
                                            <td className="p-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                                                {entry.type === 'Income' ? formatCurrency(entry.amount) : '-'}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                                                {entry.type === 'Expense' ? formatCurrency(entry.amount) : '-'}
                                            </td>
                                            {canManage && (
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <button
                                                            onClick={() => handlePrintReceipt(entry)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Cetak Struk"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(entry)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(entry.id)}
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
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <p className="text-sm text-slate-500">Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, processedEntries.length)} dari {processedEntries.length} entri</p>
                            <div className="flex gap-1 justify-end">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 text-sm hover:bg-slate-50"
                                >
                                    Sebelumnya
                                </button>
                                <span className="px-4 py-1.5 text-sm font-medium text-slate-700">Hal {currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 text-sm hover:bg-slate-50"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
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
                                                onClick={() => setFormData({ ...formData, type: 'Income', responsible_id: '' })}
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            <span className="flex items-center gap-1.5"><Tag size={14} className="text-green-500" /> Kode Transaksi</span>
                                        </label>
                                        <select
                                            name="transaction_code_id"
                                            value={formData.transaction_code_id}
                                            onChange={e => handleTransactionCodeChange(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="">-- Pilih Kode Transaksi --</option>
                                            {transactionCodes.filter(tc => tc.is_active && !tc.parent_code_id).map(master => (
                                                <optgroup key={master.id} label={`${master.code} — ${master.name}`}>
                                                    <option value={master.id}>{master.code} — {master.name}</option>
                                                    {transactionCodes.filter(c => c.parent_code_id === master.id && c.is_active).map(child => (
                                                        <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.code} — {child.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        {formData.transaction_code_id && (
                                            <p className="text-xs text-slate-500 mt-1">Kategori: <span className="font-medium text-slate-700">{formData.category}</span> | Tipe: <span className="font-medium text-slate-700">{formData.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'}</span></p>
                                        )}
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

                                {/* Sumber Dana */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <span className="flex items-center gap-1.5">💰 Sumber Dana</span>
                                    </label>
                                    <select
                                        name="fund_source"
                                        value={formData.fund_source}
                                        onChange={handleInput}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="Kas Umum">Kas Umum</option>
                                        <option value="Infaq">Infaq</option>
                                        <option value="Tabungan Siswa">Tabungan Siswa</option>
                                    </select>
                                    <p className="text-xs text-slate-400 mt-1">Alokasi dana yang digunakan untuk transaksi ini</p>
                                </div>

                                {/* Penanggung Jawab - hanya untuk Pengeluaran */}
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
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="">-- Pilih Penanggung Jawab --</option>
                                            {staffList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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

                                {/* Kode Transaksi */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <span className="flex items-center gap-1.5">
                                            <Tag size={14} className="text-green-500" />
                                            Kode Transaksi
                                        </span>
                                    </label>
                                    <select
                                        name="transaction_code_id"
                                        value={formData.transaction_code_id}
                                        onChange={handleInput}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">-- Pilih Kode Transaksi --</option>
                                        {transactionCodes.filter(tc => tc.is_active).map(tc => (
                                            <option key={tc.id} value={tc.id}>[{tc.code}] {tc.name} ({tc.type})</option>
                                        ))}
                                    </select>
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

                {/* Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-lg font-bold flex items-center text-slate-800">
                                    <Download className="text-blue-600 mr-2" size={22} /> Export Data Kas
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
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="date"
                                                    value={exportStartDate}
                                                    onChange={(e) => setExportStartDate(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Sampai</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="date"
                                                    value={exportEndDate}
                                                    onChange={(e) => setExportEndDate(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Kosongkan untuk export semua data.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Format Export</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setExportFormat('pdf')}
                                            className={clsx(
                                                "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                exportFormat === 'pdf' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <FileText size={16} />
                                            PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExportFormat('csv')}
                                            className={clsx(
                                                "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                exportFormat === 'csv' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Download size={16} />
                                            Excel (CSV)
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => setShowExportModal(false)}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition text-sm flex items-center gap-1.5"
                                    >
                                        <Download size={16} />
                                        Export Sekarang
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }}
                title="Hapus Transaksi"
                message="Yakin ingin menghapus entri ini? Tindakan ini tidak bisa dibatalkan."
            />
        </div>
    );
};

export default CashLedger;
