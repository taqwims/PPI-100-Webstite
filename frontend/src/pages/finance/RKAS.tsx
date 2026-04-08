import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Edit, Trash2, TrendingUp, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

interface AcademicYear { id: number; name: string; is_active: boolean; start_date: string; end_date: string; }
interface BudgetCategory { id: number; name: string; description: string; is_active: boolean; }
interface Budget {
    id: string;
    academic_year_id: number;
    academic_year: AcademicYear;
    category_id: number;
    category: BudgetCategory;
    budget_type: string;
    item_name: string;
    period: string;
    month: number;
    quantity: number;
    unit_price: number;
    planned_amount: number;
    realized_amount: number;
    status: string;
    approved_by?: { name: string };
    approved_at?: string;
    notes: string;
    transaction_code_id?: number;
    transaction_code?: { id: number; code: string; name: string };
    created_by: { name: string };
    created_at: string;
}
interface TransactionCode {
    id: number;
    code: string;
    name: string;
    category: string;
    transaction_type: string;
    description?: string;
}
interface BudgetSummary { category: string; planned: number; realized: number; percentage: number; }

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const RKAS: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canEdit = user?.role_id === 1 || user?.role_id === 9;

    const [yearFilter, setYearFilter] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [editItem, setEditItem] = useState<Budget | null>(null);
    const [tab, setTab] = useState<'budgets' | 'categories'>('budgets');
    const [budgetTypeTab, setBudgetTypeTab] = useState<'Pengeluaran' | 'Penerimaan'>('Pengeluaran');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [showRealizeModal, setShowRealizeModal] = useState(false);
    const [realizeForm, setRealizeForm] = useState({ id: '', amount: '', source: 'Kas Umum', transaction_code_id: '', notes: '' });
    const [form, setForm] = useState({ academic_year_id: '', budget_type: 'Pengeluaran', item_name: '', period: 'Tahunan', months: [] as number[], quantity: 1, unit_price: 0, planned_amount: '', notes: '', template_code_id: '' });
    const [catForm, setCatForm] = useState({ name: '', description: '' });

    const { data: transactionCodes = [] } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'], queryFn: async () => (await api.get('/finance/transaction-codes')).data,
    });

    const { data: years = [] } = useQuery<AcademicYear[]>({
        queryKey: ['academic-years'], queryFn: async () => (await api.get('/finance/academic-years')).data,
    });
    const { data: categories = [] } = useQuery<BudgetCategory[]>({
        queryKey: ['budget-categories'], queryFn: async () => (await api.get('/finance/budget-categories')).data,
    });
    const { data: budgets = [], isLoading } = useQuery<Budget[]>({
        queryKey: ['budgets', yearFilter],
        queryFn: async () => {
            const p = new URLSearchParams();
            if (yearFilter) p.set('academic_year_id', yearFilter);
            return (await api.get(`/finance/budgets?${p.toString()}`)).data || [];
        },
    });

    const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Derive semester months from selected academic year
    const selectedYear = years.find(y => String(y.id) === (form.academic_year_id || yearFilter));
    const getSemesterMonths = (year?: AcademicYear) => {
        if (!year?.start_date) return { semester1: [7,8,9,10,11,12], semester2: [1,2,3,4,5,6] };
        const startMonth = new Date(year.start_date).getMonth() + 1;
        const endMonth = new Date(year.end_date).getMonth() + 1;
        const sem1: number[] = [], sem2: number[] = [];
        if (startMonth >= 7) {
            for (let m = startMonth; m <= 12; m++) sem1.push(m);
            for (let m = 1; m <= Math.min(endMonth, 6); m++) sem2.push(m);
        } else {
            const all: number[] = [];
            if (startMonth <= endMonth) { for (let m = startMonth; m <= endMonth; m++) all.push(m); }
            else { for (let m = startMonth; m <= 12; m++) all.push(m); for (let m = 1; m <= endMonth; m++) all.push(m); }
            const half = Math.ceil(all.length / 2);
            sem1.push(...all.slice(0, half)); sem2.push(...all.slice(half));
        }
        return { semester1: sem1, semester2: sem2 };
    };
    const semMonths = getSemesterMonths(selectedYear || years.find(y => y.is_active));
    const allSemMonths = [...semMonths.semester1, ...semMonths.semester2].sort((a,b) => a-b);
    const { data: summary = [] } = useQuery<BudgetSummary[]>({
        queryKey: ['budget-summary', yearFilter],
        queryFn: async () => {
            if (!yearFilter) return [];
            return (await api.get(`/finance/budgets/summary?academic_year_id=${yearFilter}`)).data || [];
        },
        enabled: !!yearFilter,
    });

    const invalidateAll = () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); queryClient.invalidateQueries({ queryKey: ['budget-summary'] }); };
    const createBudget = useMutation({ mutationFn: (d: any) => api.post('/finance/budgets', d), onSuccess: () => { invalidateAll(); setShowModal(false); } });
    const updateBudget = useMutation({ mutationFn: (d: any) => api.put(`/finance/budgets/${d.id}`, d), onSuccess: () => { invalidateAll(); setShowModal(false); setEditItem(null); } });
    const deleteBudget = useMutation({ mutationFn: (id: string) => api.delete(`/finance/budgets/${id}`), onSuccess: invalidateAll });
    const realizeBudget = useMutation({ mutationFn: (d: any) => api.put(`/finance/budgets/${d.id}/realize`, { ...d, amount: Number(d.amount), transaction_code_id: Number(d.transaction_code_id) }), onSuccess: () => { invalidateAll(); setShowRealizeModal(false); setRealizeForm({ id: '', amount: '', source: 'Kas Umum', transaction_code_id: '', notes: '' }); } });
    const createCat = useMutation({ mutationFn: (d: any) => api.post('/finance/budget-categories', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget-categories'] }); setShowCatModal(false); setCatForm({ name: '', description: '' }); } });
    const deleteCat = useMutation({ mutationFn: (id: number) => api.delete(`/finance/budget-categories/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget-categories'] }) });

    const handleSubmitBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const calcAmount = form.quantity > 0 && form.unit_price > 0 ? form.quantity * form.unit_price : Number(form.planned_amount);
        const data: any = {
            ...form,
            academic_year_id: Number(form.academic_year_id),
            planned_amount: calcAmount,
            quantity: form.quantity,
            unit_price: form.unit_price,
            budget_type: form.budget_type,
        };
        if (form.template_code_id) data.template_code_id = Number(form.template_code_id);
        
        if (editItem) {
            updateBudget.mutate({ ...data, month: form.months[0] || editItem.month, id: editItem.id });
        } else {
            if (form.period === 'Bulanan' && form.months.length > 0) {
                try {
                    await Promise.all(form.months.map(m => 
                        api.post('/finance/budgets', { ...data, month: m })
                    ));
                    queryClient.invalidateQueries({ queryKey: ['budgets'] });
                    resetForm();
                    setShowModal(false);
                } catch (error) {
                    console.error(error);
                }
            } else {
                createBudget.mutate({ ...data, month: form.months[0] || 0 });
            }
        }
    };

    const handleEdit = (b: Budget) => {
        setEditItem(b);
        setForm({
            academic_year_id: String(b.academic_year_id),
            budget_type: b.budget_type || 'Pengeluaran',
            item_name: b.item_name,
            period: b.period || 'Tahunan',
            months: b.month ? [b.month] : [],
            quantity: b.quantity || 1,
            unit_price: b.unit_price || 0,
            planned_amount: String(b.planned_amount),
            notes: b.notes,
            template_code_id: String(b.transaction_code_id || '')
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setForm({ academic_year_id: yearFilter || '', budget_type: 'Pengeluaran', item_name: '', period: 'Tahunan', months: [], quantity: 1, unit_price: 0, planned_amount: '', notes: '', template_code_id: '' });
        setEditItem(null);
    };

    const totalPlanned = budgets.reduce((s, b) => s + b.planned_amount, 0);
    const totalRealized = budgets.reduce((s, b) => s + b.realized_amount, 0);
    const totalPenerimaan = budgets.filter(b => b.budget_type === 'Penerimaan').reduce((s, b) => s + b.planned_amount, 0);
    const totalPengeluaran = budgets.filter(b => b.budget_type === 'Pengeluaran').reduce((s, b) => s + b.planned_amount, 0);
    const totalPenerimaanRealized = budgets.filter(b => b.budget_type === 'Penerimaan').reduce((s, b) => s + b.realized_amount, 0);
    const totalPengeluaranRealized = budgets.filter(b => b.budget_type === 'Pengeluaran').reduce((s, b) => s + b.realized_amount, 0);

    const toggleGroup = (standarName: string) => {
        setExpandedGroups(prev => ({ ...prev, [standarName]: !prev[standarName] }));
    };

    const filteredBudgets = budgets.filter(b => (b.budget_type || 'Pengeluaran') === budgetTypeTab);
    const groupedBudgets = filteredBudgets.reduce((acc, b) => {
        const standar = b.transaction_code?.name || 'Tanpa Standar';
        if (!acc[standar]) acc[standar] = [];
        acc[standar].push(b);
        return acc;
    }, {} as Record<string, Budget[]>);
    const overallPct = totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">RAB / RKAS</h1>
                    <p className="text-slate-500 mt-1">Rencana Anggaran Kas Sekolah — Budget vs Realisasi</p>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <>
                            <button onClick={() => setShowCatModal(true)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium">+ Kategori</button>
                            <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/25 text-sm font-medium">
                                <Plus size={16} /> Tambah Anggaran
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Overall Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200 shadow-sm">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Anggaran Penerimaan</p>
                    <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(totalPenerimaan)}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">Realisasi: {formatCurrency(totalPenerimaanRealized)}</p>
                </div>
                <div className="bg-red-50/80 backdrop-blur-sm rounded-2xl p-5 border border-red-200 shadow-sm">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Anggaran Pengeluaran</p>
                    <p className="text-lg font-bold text-red-700 mt-1">{formatCurrency(totalPengeluaran)}</p>
                    <p className="text-xs text-red-500 mt-0.5">Realisasi: {formatCurrency(totalPengeluaranRealized)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Selisih (Penerimaan - Pengeluaran)</p>
                    <p className={clsx('text-lg font-bold mt-1', (totalPenerimaan - totalPengeluaran) >= 0 ? 'text-emerald-700' : 'text-red-700')}>{formatCurrency(totalPenerimaan - totalPengeluaran)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Realisasi Keseluruhan</p>
                    <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-lg font-bold text-slate-900">{overallPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div className={clsx('h-2.5 rounded-full transition-all', overallPct > 100 ? 'bg-red-500' : overallPct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(overallPct, 100)}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary by Category (Progress Bars) */}
            {summary.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Realisasi per Kategori</h3>
                    <div className="space-y-4">
                        {summary.map(s => (
                            <div key={s.category}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700">{s.category}</span>
                                    <span className="text-sm text-slate-500">{formatCurrency(s.realized)} / {formatCurrency(s.planned)} ({s.percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3">
                                    <div className={clsx('h-3 rounded-full transition-all', s.percentage > 100 ? 'bg-red-500' : s.percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters + Tabs */}
            <div className="flex flex-wrap items-center gap-3">
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Semua Tahun Ajaran</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>)}
                </select>
                {/* Penerimaan / Pengeluaran Tab */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    <button onClick={() => setBudgetTypeTab('Pengeluaran')} className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', budgetTypeTab === 'Pengeluaran' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500')}>
                        Pengeluaran
                    </button>
                    <button onClick={() => setBudgetTypeTab('Penerimaan')} className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', budgetTypeTab === 'Penerimaan' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500')}>
                        Penerimaan
                    </button>
                </div>
                {canEdit && (
                    <div className="ml-auto flex gap-1 bg-slate-100 rounded-xl p-1">
                        <button onClick={() => setTab('budgets')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', tab === 'budgets' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>Anggaran</button>
                        <button onClick={() => setTab('categories')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', tab === 'categories' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>Kategori</button>
                    </div>
                )}
            </div>

            {/* Categories Tab */}
            {tab === 'categories' && canEdit && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50/80"><tr>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Nama</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
                            <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{c.description || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => { if (confirm('Hapus kategori?')) deleteCat.mutate(c.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Budgets Table */}
            {tab === 'budgets' && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80"><tr>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Kode</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Item</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Tahun</th>
                                <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Vol/Qty</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Harga Satuan</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Anggaran</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Realisasi</th>
                                <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Progress</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">Memuat...</td></tr>
                                ) : Object.keys(groupedBudgets).length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">Belum ada data anggaran {budgetTypeTab.toLowerCase()}</td></tr>
                                ) : Object.entries(groupedBudgets).map(([standarName, items]) => (
                                    <React.Fragment key={standarName}>
                                        <tr className="bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => toggleGroup(standarName)}>
                                            <td colSpan={9} className="px-5 py-3 text-sm font-semibold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    {expandedGroups[standarName] ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                                                    Standar: {standarName} <span className="text-xs font-normal text-slate-400">({items.length} Item — Subtotal: {formatCurrency(items.reduce((s, b) => s + b.planned_amount, 0))})</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedGroups[standarName] && items.map(b => {
                                            const pct = b.planned_amount > 0 ? (b.realized_amount / b.planned_amount) * 100 : 0;
                                            return (
                                                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className="font-medium text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded text-xs">{b.transaction_code?.code || '-'}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-slate-900 text-sm">{b.item_name}</p>
                                                            {b.period === 'Bulanan' && b.month > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-medium">Bulan {b.month}</span>}
                                                            {b.period && b.period !== 'Tahunan' && b.period !== 'Bulanan' && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full font-medium">{b.period}</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-400">oleh {b.created_by?.name}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-sm text-slate-600">{b.academic_year?.name}</td>
                                                    <td className="px-5 py-3.5 text-sm text-center text-slate-700">{b.quantity > 0 ? b.quantity : '-'}</td>
                                                    <td className="px-5 py-3.5 text-sm text-right text-slate-600">{b.unit_price > 0 ? formatCurrency(b.unit_price) : '-'}</td>
                                                    <td className="px-5 py-3.5 text-sm text-right font-medium text-slate-900">{formatCurrency(b.planned_amount)}</td>
                                                    <td className="px-5 py-3.5 text-sm text-right font-medium">
                                                        <span className={pct > 100 ? 'text-red-600 flex items-center justify-end gap-1' : 'text-emerald-600'}>
                                                            {pct > 100 && <span className="flex items-center justify-center w-4 h-4 bg-red-100 rounded-full text-[10px] text-red-600 font-bold" title="Realisasi melebihi anggaran">!</span>}
                                                            {formatCurrency(b.realized_amount)}
                                                        </span>
                                                        {pct > 100 && <p className="text-[10px] text-red-500 mt-0.5">Overbudget {formatCurrency(b.realized_amount - b.planned_amount)}</p>}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="w-20 mx-auto">
                                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                                <div className={clsx('h-2 rounded-full', pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                            </div>
                                                            <p className="text-[10px] text-center text-slate-500 mt-0.5">{pct.toFixed(0)}%</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={() => handleEdit(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit size={14} /></button>
                                                            <button onClick={() => { if (confirm('Hapus anggaran ini?')) deleteBudget.mutate(b.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 size={14} /></button>
                                                            <button onClick={() => { setRealizeForm({ ...realizeForm, id: b.id }); setShowRealizeModal(true); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg text-xs font-medium" title="Input Realisasi"><TrendingUp size={14} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Budget Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-semibold">{editItem ? 'Edit Anggaran' : 'Tambah Anggaran'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitBudget} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                                <select value={form.academic_year_id} onChange={e => setForm({ ...form, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                                    <option value="">Pilih</option>
                                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Anggaran</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button type="button" onClick={() => setForm({ ...form, budget_type: 'Pengeluaran' })}
                                        className={clsx("flex-1 py-1.5 text-sm font-medium rounded-lg transition", form.budget_type === 'Pengeluaran' ? "bg-white text-red-600 shadow-sm" : "text-slate-500")}>
                                        Pengeluaran
                                    </button>
                                    <button type="button" onClick={() => setForm({ ...form, budget_type: 'Penerimaan' })}
                                        className={clsx("flex-1 py-1.5 text-sm font-medium rounded-lg transition", form.budget_type === 'Penerimaan' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>
                                        Penerimaan
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Item</label>
                                <input type="text" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Periode</label>
                                    <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value, months: [] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                                        <option value="Tahunan">Tahunan</option>
                                        <option value="Semester 1">Semester 1</option>
                                        <option value="Semester 2">Semester 2</option>
                                        <option value="Bulanan">Bulanan</option>
                                    </select>
                                </div>
                                {form.period === 'Bulanan' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Bulan <span className="text-xs text-slate-500 font-normal">(Bisa pilih lebih dari satu)</span></label>
                                        <div className="grid grid-cols-3 gap-2 mt-2 h-36 overflow-y-auto pr-2 custom-scrollbar">
                                            {allSemMonths.map(m => (
                                                <label key={m} className={clsx("flex items-center space-x-2 border rounded-lg p-2 cursor-pointer text-xs transition", form.months.includes(m) ? "bg-green-50 border-green-200 text-green-700" : "hover:bg-slate-50 border-slate-200")}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded text-green-600 focus:ring-green-500"
                                                        checked={form.months.includes(m)}
                                                        onChange={(e) => {
                                                            if (editItem) {
                                                                // Edit mode only allows 1 month
                                                                setForm(prev => ({ ...prev, months: [m] }));
                                                            } else {
                                                                // Provide multiple selection logic
                                                                if (e.target.checked) setForm(prev => ({ ...prev, months: [...prev.months, m] }));
                                                                else setForm(prev => ({ ...prev, months: prev.months.filter(x => x !== m) }));
                                                            }
                                                        }}
                                                    />
                                                    <span className="font-medium">{MONTH_NAMES[m].substring(0,3)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Quantity & Unit Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Volume / Qty</label>
                                    <input type="number" min={1} value={form.quantity} onChange={e => {
                                        const qty = Number(e.target.value);
                                        setForm({ ...form, quantity: qty, planned_amount: String(qty * form.unit_price || form.planned_amount) });
                                    }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                                    <input type="number" min={0} value={form.unit_price} onChange={e => {
                                        const price = Number(e.target.value);
                                        setForm({ ...form, unit_price: price, planned_amount: String(form.quantity * price || form.planned_amount) });
                                    }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Total Anggaran (Rp) {form.quantity > 0 && form.unit_price > 0 && <span className="text-xs text-slate-400">= {form.quantity} × {formatCurrency(form.unit_price)}</span>}
                                </label>
                                <input type="number" value={form.planned_amount} onChange={e => setForm({ ...form, planned_amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Standar (Wajib)</label>
                                <select value={form.template_code_id} onChange={e => setForm({ ...form, template_code_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required disabled={!!editItem}>
                                    <option value="">Pilih Standar</option>
                                    {transactionCodes.filter(tc => !tc.description?.startsWith('RKAS Item: ')).map(tc => <option key={tc.id} value={tc.id}>{tc.name} ({tc.category})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" rows={2} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/25">{editItem ? 'Simpan' : 'Tambah'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCatModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCatModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-semibold">Tambah Kategori</h3>
                            <button onClick={() => setShowCatModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <form onSubmit={e => { e.preventDefault(); createCat.mutate(catForm); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kategori</label>
                                <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                                <input type="text" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700">Tambah</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Realization Modal */}
            {showRealizeModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRealizeModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="text-green-600" size={20} /> Input Realisasi</h3>
                            <button onClick={() => setShowRealizeModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <form onSubmit={e => { e.preventDefault(); realizeBudget.mutate(realizeForm); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Realisasi (Rp)</label>
                                <input type="number" value={realizeForm.amount} onChange={e => setRealizeForm({ ...realizeForm, amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sumber Kas</label>
                                <select value={realizeForm.source} onChange={e => setRealizeForm({ ...realizeForm, source: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                                    <option value="Kas Umum">Kas Umum</option>
                                    <option value="Infaq">Infaq / Donasi</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Transaksi</label>
                                <select value={realizeForm.transaction_code_id} onChange={e => setRealizeForm({ ...realizeForm, transaction_code_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                                    <option value="">Pilih Kode Transaksi</option>
                                    {transactionCodes.filter(tc => tc.transaction_type === 'Expense').map(tc => <option key={tc.id} value={tc.id}>{tc.name} ({tc.category})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                                <input type="text" value={realizeForm.notes} onChange={e => setRealizeForm({ ...realizeForm, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" placeholder="Opsional" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowRealizeModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Batal</button>
                                <button type="submit" disabled={realizeBudget.isPending} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/25">Simpan Realisasi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RKAS;
