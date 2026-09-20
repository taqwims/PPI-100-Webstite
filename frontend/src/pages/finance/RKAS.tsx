import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, TrendingUp, Download, RefreshCw, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { generateRKASReportPDF } from '../../utils/pdfUtils';
import { RKASTable } from '../../components/finance/RKAS/RKASTable';
import { RKASCategoriesTab } from '../../components/finance/RKAS/RKASCategoriesTab';
import { RKASBudgetModal } from '../../components/finance/RKAS/RKASBudgetModal';
import { RKASRealizeModal } from '../../components/finance/RKAS/RKASRealizeModal';
import { RKASCategoryModal } from '../../components/finance/RKAS/RKASCategoryModal';
import FinancialFlowGuideModal from '../../components/finance/FinancialFlowGuideModal';
import { Budget, AcademicYear, TransactionCode, BudgetCategory, BudgetComponent, BudgetSummary } from '../../components/finance/RKAS/types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

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
    const [showRealizeModal, setShowRealizeModal] = useState(false);
    const [realizeBudgetId, setRealizeBudgetId] = useState<string | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);

    const { data: transactionCodes = [] } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'], queryFn: async () => (await api.get('/finance/transaction-codes')).data,
    });

    const { data: years = [] } = useQuery<AcademicYear[]>({
        queryKey: ['academic-years'], queryFn: async () => (await api.get('/finance/academic-years')).data,
    });
    const { data: categories = [] } = useQuery<BudgetCategory[]>({
        queryKey: ['budget-categories'], queryFn: async () => (await api.get('/finance/budget-categories')).data,
    });
    const { data: components = [] } = useQuery<BudgetComponent[]>({
        queryKey: ['budget-components'], queryFn: async () => (await api.get('/finance/budget-components')).data || [],
    });
    const { data: budgets = [], isLoading } = useQuery<Budget[]>({
        queryKey: ['budgets', yearFilter],
        queryFn: async () => {
            const p = new URLSearchParams();
            if (yearFilter) p.set('academic_year_id', yearFilter);
            return (await api.get(`/finance/budgets?${p.toString()}`)).data || [];
        },
    });

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
    const realizeBudget = useMutation({ mutationFn: (d: any) => api.put(`/finance/budgets/${d.id}/realize`, { ...d, amount: Number(d.amount), transaction_code_id: Number(d.transaction_code_id) }), onSuccess: () => { invalidateAll(); setShowRealizeModal(false); } });
    const createCat = useMutation({ mutationFn: (d: any) => api.post('/finance/budget-categories', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget-categories'] }); setShowCatModal(false); toast.success('Kategori berhasil dibuat'); } });
    const deleteCat = useMutation({ mutationFn: (id: number) => api.delete(`/finance/budget-categories/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget-categories'] }); queryClient.invalidateQueries({ queryKey: ['budget-components'] }); toast.success('Kategori berhasil dihapus'); } });
    const createComp = useMutation({ mutationFn: (d: any) => api.post('/finance/budget-components', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget-components'] }); toast.success('Komponen berhasil dibuat'); } });
    const deleteComp = useMutation({ mutationFn: (id: number) => api.delete(`/finance/budget-components/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget-components'] }); toast.success('Komponen berhasil dihapus'); } });

    const reconcileMutation = useMutation({
        mutationFn: (yearId?: string) => api.post(`/finance/budgets/reconcile${yearId ? `?academic_year_id=${yearId}` : ''}`, {}),
        onSuccess: () => {
            invalidateAll();
            toast.success('Realisasi RKAS berhasil disinkronkan dengan Buku Kas Umum & Transaksi Siswa!');
        },
        onError: () => {
            toast.error('Gagal menyinkronkan realisasi RKAS');
        }
    });

    const handleSaveBudget = async (data: any, isMultiple: boolean, months: number[]) => {
        if (editItem) {
            updateBudget.mutate({ ...data, month: months[0] || editItem.month, id: editItem.id });
        } else {
            if (isMultiple && months.length > 0) {
                try {
                    await api.post('/finance/budgets', { ...data, months: months });
                    queryClient.invalidateQueries({ queryKey: ['budgets'] });
                    setEditItem(null);
                    setShowModal(false);
                } catch (error) { console.error(error); }
            } else {
                createBudget.mutate({ ...data, month: months[0] || 0 });
            }
        }
    };

    const handleEdit = (b: Budget) => {
        setEditItem(b);
        setShowModal(true);
    };

    const totalPlanned = budgets.reduce((s, b) => s + b.planned_amount, 0);
    const totalRealized = budgets.reduce((s, b) => s + b.realized_amount, 0);
    const totalPenerimaan = budgets.filter(b => b.budget_type === 'Penerimaan').reduce((s, b) => s + b.planned_amount, 0);
    const totalPengeluaran = budgets.filter(b => b.budget_type === 'Pengeluaran').reduce((s, b) => s + b.planned_amount, 0);
    const totalPenerimaanRealized = budgets.filter(b => b.budget_type === 'Penerimaan').reduce((s, b) => s + b.realized_amount, 0);
    const totalPengeluaranRealized = budgets.filter(b => b.budget_type === 'Pengeluaran').reduce((s, b) => s + b.realized_amount, 0);

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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">RAB / RKAS Sekolah</h1>
                    <p className="text-slate-500 mt-1 text-sm">Rencana Kegiatan dan Anggaran Kas Sekolah — Budget vs Realisasi Riil</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <button
                        onClick={() => setShowGuideModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm text-sm font-semibold transition"
                        title="Pelajari Panduan Alur Transaksi, Kode Pos, dan Integrasi RKAS"
                    >
                        <BookOpen size={15} className="text-blue-600" />
                        <span>Panduan Alur</span>
                    </button>
                    {tab === 'budgets' && budgets.length > 0 && (
                        <button onClick={() => {
                            const yr = years.find(y => String(y.id) === yearFilter);
                            generateRKASReportPDF(budgets, yr?.name || 'Semua', budgetTypeTab);
                        }} className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 shadow-sm text-sm font-medium transition">
                            <Download size={15} /> Export PDF
                        </button>
                    )}
                    {canEdit && (
                        <>
                            <button
                                onClick={() => reconcileMutation.mutate(yearFilter)}
                                disabled={reconcileMutation.isPending}
                                className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm text-sm font-semibold transition"
                                title="Sinkronkan angka realisasi otomatis dari Buku Kas Umum dan Pembayaran Siswa"
                            >
                                <RefreshCw size={15} className={clsx(reconcileMutation.isPending && "animate-spin text-blue-600")} />
                                <span>{reconcileMutation.isPending ? 'Menyinkronkan...' : 'Sinkronkan Realisasi'}</span>
                            </button>
                            <button onClick={() => setShowCatModal(true)} className="px-3.5 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition">+ Kategori</button>
                            <button onClick={() => { setEditItem(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 text-sm font-bold transition">
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

            {/* Categories & Components Tab */}
            {tab === 'categories' && canEdit && (
                <RKASCategoriesTab
                    categories={categories || []}
                    components={components || []}
                    onDeleteCategory={(id: number) => deleteCat.mutate(id)}
                    onDeleteComponent={(id: number) => deleteComp.mutate(id)}
                    onCreateCategory={(d) => createCat.mutate(d)}
                    onCreateComponent={(d) => createComp.mutate(d)}
                />
            )}
            
            {/* Budgets Table */}
            {tab === 'budgets' && (
                <RKASTable
                    isLoading={isLoading}
                    budgetTypeTab={budgetTypeTab as any}
                    groupedBudgets={groupedBudgets}
                    canEdit={canEdit}
                    onEdit={handleEdit}
                    onDelete={(id: string) => deleteBudget.mutate(id)}
                    onRealize={(id: string) => { setRealizeBudgetId(id); setShowRealizeModal(true); }}
                />
            )}
            
            {/* Modals from components */}
            <RKASBudgetModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditItem(null); }}
                editingItem={editItem}
                years={years || []}
                transactionCodes={transactionCodes || []}
                yearFilter={yearFilter}
                onSubmit={handleSaveBudget}
            />
            <RKASCategoryModal
                isOpen={showCatModal}
                onClose={() => setShowCatModal(false)}
                onSubmit={async (data) => { createCat.mutate(data); }}
            />
            <RKASRealizeModal
                isOpen={showRealizeModal}
                onClose={() => setShowRealizeModal(false)}
                budgetId={realizeBudgetId}
                transactionCodes={transactionCodes || []}
                onSubmit={async (data) => { realizeBudget.mutate(data); }}
            />
            <FinancialFlowGuideModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
            />
        </div>
    );
};

export default RKAS;
