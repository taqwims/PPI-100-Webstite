import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    CheckCircle2, AlertTriangle, ArrowRight, Tag, CreditCard,
    PieChart, Sparkles, Search, Users, Briefcase, HeartHandshake, Link2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
}

interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: string;
    category: string;
    description?: string;
    is_active: boolean;
    parent_code_id?: number | null;
    parent_code?: TransactionCode | null;
}

interface PaymentType {
    id: number;
    code: string;
    name: string;
    payment_schedule: string;
    amount: number;
    academic_year_id: number;
    academic_year?: AcademicYear;
    transaction_code_id: number | null;
    transaction_code?: TransactionCode;
    is_active: boolean;
}

interface BudgetItem {
    id: number;
    code: string;
    name: string;
    category: string;
    budget_type?: string;
    amount: number;
    planned_amount?: number;
    realized_amount: number;
    transaction_code_id?: number | null;
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const FinancialMappingMatrix: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
    const [matrixTab, setMatrixTab] = useState<'student' | 'operational' | 'non_student'>('student');
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Queries
    const { data: years = [] } = useQuery<AcademicYear[]>({
        queryKey: ['academic-years'],
        queryFn: async () => (await api.get('/finance/academic-years')).data || [],
    });

    // Set default active year
    useEffect(() => {
        if (years.length > 0 && !selectedYearId) {
            const active = years.find(y => y.is_active);
            if (active) setSelectedYearId(String(active.id));
            else setSelectedYearId(String(years[0].id));
        }
    }, [years]);

    const { data: paymentTypes = [], isLoading: isLoadingPaymentTypes } = useQuery<PaymentType[]>({
        queryKey: ['payment-types', selectedYearId],
        queryFn: async () => {
            const url = selectedYearId ? `/finance/payment-types?academic_year_id=${selectedYearId}` : '/finance/payment-types';
            return (await api.get(url)).data || [];
        },
        enabled: true,
    });

    const { data: transactionCodes = [], isLoading: isLoadingCodes } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'],
        queryFn: async () => (await api.get('/finance/transaction-codes')).data || [],
    });

    const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
        queryKey: ['budget-items', selectedYearId],
        queryFn: async () => {
            const url = selectedYearId ? `/finance/budgets?academic_year_id=${selectedYearId}` : '/finance/budgets';
            return (await api.get(url)).data || [];
        },
    });

    // Mutation to quickly map transaction_code_id for a PaymentType
    const mapTransactionCodeMutation = useMutation({
        mutationFn: async ({ paymentTypeId, transactionCodeId }: { paymentTypeId: number; transactionCodeId: number | null }) => {
            const pt = paymentTypes.find(p => p.id === paymentTypeId);
            if (!pt) return;
            const payload = {
                code: pt.code,
                name: pt.name,
                payment_schedule: pt.payment_schedule,
                amount: pt.amount,
                academic_year_id: pt.academic_year_id,
                is_active: pt.is_active,
                transaction_code_id: transactionCodeId,
            };
            return api.put(`/finance/payment-types/${paymentTypeId}`, payload);
        },
        onMutate: ({ paymentTypeId }) => setUpdatingId(paymentTypeId),
        onSettled: () => setUpdatingId(null),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-types'] });
            toast.success('Pemetaan Kode Transaksi berhasil diperbarui');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal memperbarui pemetaan');
        }
    });

    // Categorized Codes
    const incomeCodes = transactionCodes.filter(c => c.type === 'Income' || c.type === 'Penerimaan' || !c.type);
    const masterIncomeCodes = incomeCodes.filter(c => !c.parent_code_id);

    const expenseCodes = transactionCodes.filter(c => c.type === 'Expense' || c.type === 'Pengeluaran');

    // Non-student income codes (e.g. Infaq, BOS, Donasi, dll)
    const nonStudentIncomeCodes = incomeCodes.filter(c => {
        const cat = (c.category || '').toLowerCase();
        const name = c.name.toLowerCase();
        return !cat.includes('spp') && !name.includes('spp') && !name.includes('seragam') && !name.includes('pangkal');
    });

    // Smart Bi-directional Budget Finder
    const findMatchingBudget = (tcId: number | null, budgetType?: 'Penerimaan' | 'Pengeluaran') => {
        if (!tcId) return null;
        const tc = transactionCodes.find(c => c.id === tcId);
        if (!tc) return null;

        // 1. Direct match by transaction_code_id or code
        let match = budgetItems.find(b => 
            (b.transaction_code_id === tc.id || b.code === tc.code) &&
            (!budgetType || b.budget_type === budgetType || !b.budget_type)
        );
        if (match) return { budget: match, matchType: 'direct' as const, tc };

        // 2. If tc is a child code, match by parent code
        if (tc.parent_code_id) {
            const parentTc = transactionCodes.find(c => c.id === tc.parent_code_id);
            match = budgetItems.find(b => 
                (b.transaction_code_id === tc.parent_code_id || (parentTc && b.code === parentTc.code)) &&
                (!budgetType || b.budget_type === budgetType || !b.budget_type)
            );
            if (match) return { budget: match, matchType: 'parent' as const, parentCode: parentTc?.code, tc };
        }

        // 3. If tc is a master code, match if any child has a budget
        const childCodes = transactionCodes.filter(c => c.parent_code_id === tc.id);
        const childIds = childCodes.map(c => c.id);
        match = budgetItems.find(b => 
            b.transaction_code_id && childIds.includes(b.transaction_code_id) &&
            (!budgetType || b.budget_type === budgetType || !b.budget_type)
        );
        if (match) {
            const matchedChild = childCodes.find(c => c.id === match?.transaction_code_id);
            return { budget: match, matchType: 'child' as const, childCode: matchedChild?.code, tc };
        }

        return null;
    };

    // Calculation statistics for current tab
    const totalStudentTypes = paymentTypes.length;
    const mappedStudentTypes = paymentTypes.filter(p => p.transaction_code_id !== null).length;
    const unmappedStudentTypes = totalStudentTypes - mappedStudentTypes;
    const studentCompletion = totalStudentTypes > 0 ? Math.round((mappedStudentTypes / totalStudentTypes) * 100) : 100;

    const totalExpenseCodes = expenseCodes.length;
    const mappedExpenseCodes = expenseCodes.filter(c => findMatchingBudget(c.id, 'Pengeluaran') !== null).length;
    const expenseCompletion = totalExpenseCodes > 0 ? Math.round((mappedExpenseCodes / totalExpenseCodes) * 100) : 100;

    const totalNonStudent = nonStudentIncomeCodes.length;
    const mappedNonStudent = nonStudentIncomeCodes.filter(c => findMatchingBudget(c.id, 'Penerimaan') !== null).length;
    const nonStudentCompletion = totalNonStudent > 0 ? Math.round((mappedNonStudent / totalNonStudent) * 100) : 100;

    // Filtered data for student tab
    const filteredPaymentTypes = paymentTypes.filter(pt => {
        const matchesSearch = pt.name.toLowerCase().includes(searchQuery.toLowerCase()) || pt.code.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (filterStatus === 'mapped') return pt.transaction_code_id !== null;
        if (filterStatus === 'unmapped') return pt.transaction_code_id === null;
        return true;
    });

    // Filtered data for expense tab
    const filteredExpenseCodes = expenseCodes.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        const isMapped = findMatchingBudget(c.id, 'Pengeluaran') !== null;
        if (filterStatus === 'mapped') return isMapped;
        if (filterStatus === 'unmapped') return !isMapped;
        return true;
    });

    // Filtered data for non-student tab
    const filteredNonStudentCodes = nonStudentIncomeCodes.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        const isMapped = findMatchingBudget(c.id, 'Penerimaan') !== null;
        if (filterStatus === 'mapped') return isMapped;
        if (filterStatus === 'unmapped') return !isMapped;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header & Stats Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                                <Sparkles size={13} /> Matriks Alur Pemetaan Keuangan Terpadu
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hubungan Pos Keuangan & Anggaran RKAS</h2>
                        <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
                            Pantau dan hubungkan seluruh pos penerimaan siswa, penerimaan umum, serta belanja operasional ke Kode Transaksi dan Anggaran RKAS secara otomatis.
                        </p>
                    </div>

                    {/* Completion Ring & Stats */}
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0">
                        <div className="text-center">
                            <div className="text-2xl font-black text-emerald-300">
                                {matrixTab === 'student' ? `${studentCompletion}%` : matrixTab === 'operational' ? `${expenseCompletion}%` : `${nonStudentCompletion}%`}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-emerald-100/70 font-semibold">Terkoneksi</div>
                        </div>

                        <div className="h-10 w-px bg-white/20" />

                        <div className="space-y-1 text-xs">
                            {matrixTab === 'student' && (
                                <>
                                    <div className="flex items-center gap-2 text-emerald-200">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                        <span>Tarif Terhubung: <strong>{mappedStudentTypes}</strong>/{totalStudentTypes}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-amber-200">
                                        <AlertTriangle size={14} className="text-amber-400" />
                                        <span>Belum Terhubung: <strong>{unmappedStudentTypes}</strong></span>
                                    </div>
                                </>
                            )}
                            {matrixTab === 'operational' && (
                                <>
                                    <div className="flex items-center gap-2 text-emerald-200">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                        <span>Pos Masuk RKAS: <strong>{mappedExpenseCodes}</strong>/{totalExpenseCodes}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-amber-200">
                                        <AlertTriangle size={14} className="text-amber-400" />
                                        <span>Belum Dianggarkan: <strong>{totalExpenseCodes - mappedExpenseCodes}</strong></span>
                                    </div>
                                </>
                            )}
                            {matrixTab === 'non_student' && (
                                <>
                                    <div className="flex items-center gap-2 text-emerald-200">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                        <span>Infaq/Umum Masuk RKAS: <strong>{mappedNonStudent}</strong>/{totalNonStudent}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-amber-200">
                                        <AlertTriangle size={14} className="text-amber-400" />
                                        <span>Belum Dianggarkan: <strong>{totalNonStudent - mappedNonStudent}</strong></span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1 border border-slate-200 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => { setMatrixTab('student'); setFilterStatus('all'); }}
                    className={clsx(
                        "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap",
                        matrixTab === 'student'
                            ? "bg-white text-emerald-800 shadow-sm border border-slate-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <Users size={16} className={matrixTab === 'student' ? "text-emerald-600" : "text-slate-400"} />
                    1. Tarif & Tagihan Siswa ({totalStudentTypes})
                </button>

                <button
                    type="button"
                    onClick={() => { setMatrixTab('operational'); setFilterStatus('all'); }}
                    className={clsx(
                        "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap",
                        matrixTab === 'operational'
                            ? "bg-white text-rose-800 shadow-sm border border-slate-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <Briefcase size={16} className={matrixTab === 'operational' ? "text-rose-600" : "text-slate-400"} />
                    2. Pos Belanja & Operasional ({totalExpenseCodes})
                </button>

                <button
                    type="button"
                    onClick={() => { setMatrixTab('non_student'); setFilterStatus('all'); }}
                    className={clsx(
                        "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap",
                        matrixTab === 'non_student'
                            ? "bg-white text-teal-800 shadow-sm border border-slate-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <HeartHandshake size={16} className={matrixTab === 'non_student' ? "text-teal-600" : "text-slate-400"} />
                    3. Penerimaan Non-Siswa & Infaq ({totalNonStudent})
                </button>
            </div>

            {/* Health Warning Banner for Student Tab */}
            {matrixTab === 'student' && unmappedStudentTypes > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1 text-xs sm:text-sm">
                        <h4 className="font-bold text-amber-900">Perhatian: {unmappedStudentTypes} Tarif Siswa Belum Terhubung!</h4>
                        <p className="text-amber-700 mt-0.5">
                            Pembayaran siswa pada jenis yang belum terhubung ke Kode Transaksi <strong>tidak akan otomatis tercatat ke dalam realisasi RKAS</strong>. Pilih Kode Transaksi pada dropdown di bawah untuk menghubungkannya.
                        </p>
                    </div>
                </div>
            )}

            {/* Toolbar Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Academic Year Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Tahun Ajaran:</span>
                        <select
                            value={selectedYearId}
                            onChange={e => setSelectedYearId(e.target.value)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.is_active ? '(Aktif)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter Buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setFilterStatus('all')}
                            className={clsx("px-3 py-1 text-xs font-bold rounded-lg transition", filterStatus === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                        >
                            Semua
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('mapped')}
                            className={clsx("px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1", filterStatus === 'mapped' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                        >
                            <CheckCircle2 size={13} /> Terhubung
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('unmapped')}
                            className={clsx("px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1", filterStatus === 'unmapped' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                        >
                            <AlertTriangle size={13} /> Belum
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari nama pos..."
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {matrixTab === 'student' && (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[11px]">
                                    <th className="py-4 px-6">Jenis Pembayaran (Tarif Siswa)</th>
                                    <th className="py-4 px-4 text-center">Hubungan Alur</th>
                                    <th className="py-4 px-6">Kode Transaksi Pos Keuangan</th>
                                    <th className="py-4 px-6">Pos Anggaran RKAS Terkait</th>
                                    <th className="py-4 px-6 text-center">Status Pemetaan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {isLoadingPaymentTypes || isLoadingCodes ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600 mx-auto" />
                                            <p className="mt-2 font-medium">Memuat matriks alur tagihan siswa...</p>
                                        </td>
                                    </tr>
                                ) : filteredPaymentTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            Tidak ada data jenis pembayaran yang cocok dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPaymentTypes.map(pt => {
                                        const linkedCode = transactionCodes.find(c => c.id === pt.transaction_code_id);
                                        const isMapped = pt.transaction_code_id !== null;
                                        const matchInfo = findMatchingBudget(pt.transaction_code_id, 'Penerimaan');

                                        return (
                                            <tr key={pt.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Column 1: Payment Type Info */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold shrink-0">
                                                            <CreditCard size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="font-extrabold text-slate-900 text-sm">{pt.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{pt.code}</span>
                                                                <span>•</span>
                                                                <span>{pt.payment_schedule}</span>
                                                                <span>•</span>
                                                                <strong className="text-emerald-700 font-semibold">{formatCurrency(pt.amount)}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Column 2: Connector Arrow */}
                                                <td className="py-4 px-4 text-center">
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-full flex items-center justify-center mx-auto border transition",
                                                        isMapped ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                                                    )}>
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </td>

                                                {/* Column 3: Hierarchical Transaction Code Dropdown */}
                                                <td className="py-4 px-6">
                                                    <div className="space-y-1">
                                                        <select
                                                            value={pt.transaction_code_id || ''}
                                                            disabled={updatingId === pt.id}
                                                            onChange={e => {
                                                                const val = e.target.value ? Number(e.target.value) : null;
                                                                mapTransactionCodeMutation.mutate({ paymentTypeId: pt.id, transactionCodeId: val });
                                                            }}
                                                            className={clsx(
                                                                "w-full px-3 py-2 text-xs font-semibold rounded-xl border transition focus:ring-2 focus:ring-emerald-500",
                                                                isMapped 
                                                                    ? "bg-white border-slate-300 text-slate-800" 
                                                                    : "bg-amber-50/70 border-amber-300 text-amber-900 font-bold"
                                                            )}
                                                        >
                                                            <option value="">-- Pilih Kode Transaksi --</option>
                                                            {masterIncomeCodes.map(master => (
                                                                <optgroup key={master.id} label={`${master.code} — ${master.name}`}>
                                                                    <option value={master.id}>
                                                                        {master.code} — {master.name} (Induk)
                                                                    </option>
                                                                    {incomeCodes
                                                                        .filter(child => child.parent_code_id === master.id)
                                                                        .map(child => (
                                                                            <option key={child.id} value={child.id}>
                                                                                &nbsp;&nbsp;↳ {child.code} — {child.name} (Turunan)
                                                                            </option>
                                                                        ))}
                                                                </optgroup>
                                                            ))}
                                                        </select>
                                                        
                                                        {linkedCode && (
                                                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                                                <Tag size={11} className="text-emerald-600" />
                                                                {linkedCode.parent_code_id ? (
                                                                    <span className="text-blue-600 font-medium">↳ Kode Turunan</span>
                                                                ) : (
                                                                    <span className="text-slate-600 font-medium">Kode Induk</span>
                                                                )}
                                                                <span>•</span>
                                                                <span>Kategori: {linkedCode.category || 'Penerimaan'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Column 4: Linked RKAS Budget with Bi-directional detection */}
                                                <td className="py-4 px-6">
                                                    {matchInfo ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                                                <PieChart size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">
                                                                    {matchInfo.budget.name}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    {matchInfo.matchType === 'parent' && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                                                            <Link2 size={10} /> Terkoneksi via Induk [{matchInfo.parentCode}]
                                                                        </span>
                                                                    )}
                                                                    {matchInfo.matchType === 'child' && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                                                            <Link2 size={10} /> Terkoneksi via Rincian [{matchInfo.childCode}]
                                                                        </span>
                                                                    )}
                                                                    {matchInfo.matchType === 'direct' && (
                                                                        <span className="text-[10px] text-slate-400">
                                                                            Koneksi Langsung RKAS
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : isMapped ? (
                                                        <div className="space-y-0.5">
                                                            <span className="text-amber-700 text-xs font-semibold">Belum Ada Target di RKAS</span>
                                                            <p className="text-[10px] text-slate-400">Buat pos di Tab RKAS menggunakan kode ini.</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">Pilih kode transaksi dahulu</span>
                                                    )}
                                                </td>

                                                {/* Column 5: Status Badge */}
                                                <td className="py-4 px-6 text-center">
                                                    {isMapped ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <CheckCircle2 size={13} className="text-emerald-600" /> Terhubung
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                            <AlertTriangle size={13} className="text-amber-600" /> Belum Terhubung
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}

                    {matrixTab === 'operational' && (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[11px]">
                                    <th className="py-4 px-6">Pos Belanja & Pengeluaran Operasional</th>
                                    <th className="py-4 px-4 text-center">Hubungan Alur</th>
                                    <th className="py-4 px-6">Kategori Akuntansi / BKU</th>
                                    <th className="py-4 px-6">Pos Anggaran RKAS Terkait</th>
                                    <th className="py-4 px-6 text-center">Status Anggaran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {isLoadingCodes ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-rose-600 mx-auto" />
                                            <p className="mt-2 font-medium">Memuat data pos operasional...</p>
                                        </td>
                                    </tr>
                                ) : filteredExpenseCodes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            Tidak ada data pos pengeluaran yang cocok dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenseCodes.map(tc => {
                                        const matchInfo = findMatchingBudget(tc.id, 'Pengeluaran');
                                        const isMapped = matchInfo !== null;
                                        const isChild = tc.parent_code_id !== null;

                                        return (
                                            <tr key={tc.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Column 1: Expense Code Info */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx(
                                                            "p-2.5 rounded-xl border font-bold shrink-0",
                                                            isChild ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-rose-50 text-rose-700 border-rose-100"
                                                        )}>
                                                            <Briefcase size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold">
                                                                    {tc.code}
                                                                </span>
                                                                <span className="font-extrabold text-slate-900 text-sm">{tc.name}</span>
                                                                {isChild ? (
                                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold">
                                                                        ↳ Turunan
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                                                        Induk
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {tc.description && (
                                                                <p className="text-[11px] text-slate-400 mt-0.5">{tc.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Column 2: Connector Arrow */}
                                                <td className="py-4 px-4 text-center">
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-full flex items-center justify-center mx-auto border transition",
                                                        isMapped ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                                                    )}>
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </td>

                                                {/* Column 3: Category */}
                                                <td className="py-4 px-6">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                                                        {tc.category || 'Operasional'}
                                                    </span>
                                                </td>

                                                {/* Column 4: Linked RKAS Budget */}
                                                <td className="py-4 px-6">
                                                    {matchInfo ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                                                <PieChart size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">
                                                                    {matchInfo.budget.name}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    {matchInfo.matchType === 'parent' && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                                                            <Link2 size={10} /> Terkoneksi via Induk [{matchInfo.parentCode}]
                                                                        </span>
                                                                    )}
                                                                    {matchInfo.matchType === 'child' && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                                                            <Link2 size={10} /> Terkoneksi via Rincian [{matchInfo.childCode}]
                                                                        </span>
                                                                    )}
                                                                    {matchInfo.matchType === 'direct' && (
                                                                        <span className="text-[10px] text-slate-400">
                                                                            Target: {formatCurrency(matchInfo.budget.planned_amount || matchInfo.budget.amount || 0)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">
                                                            Belum dialokasikan di RKAS (Bisa dibuat di Tab RKAS)
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Column 5: Status Badge */}
                                                <td className="py-4 px-6 text-center">
                                                    {isMapped ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <CheckCircle2 size={13} className="text-emerald-600" /> Masuk RKAS
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Belum Dianggarkan
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}

                    {matrixTab === 'non_student' && (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[11px]">
                                    <th className="py-4 px-6">Pos Penerimaan Umum & Infaq</th>
                                    <th className="py-4 px-4 text-center">Hubungan Alur</th>
                                    <th className="py-4 px-6">Kategori Penerimaan</th>
                                    <th className="py-4 px-6">Pos Anggaran RKAS Terkait</th>
                                    <th className="py-4 px-6 text-center">Status Anggaran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {isLoadingCodes ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-600 mx-auto" />
                                            <p className="mt-2 font-medium">Memuat data penerimaan non-siswa...</p>
                                        </td>
                                    </tr>
                                ) : filteredNonStudentCodes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            Tidak ada data pos penerimaan yang cocok dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredNonStudentCodes.map(tc => {
                                        const matchInfo = findMatchingBudget(tc.id, 'Penerimaan');
                                        const isMapped = matchInfo !== null;
                                        const isChild = tc.parent_code_id !== null;

                                        return (
                                            <tr key={tc.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Column 1: Income Code Info */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 font-bold shrink-0">
                                                            <HeartHandshake size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold">
                                                                    {tc.code}
                                                                </span>
                                                                <span className="font-extrabold text-slate-900 text-sm">{tc.name}</span>
                                                                {isChild ? (
                                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold">
                                                                        ↳ Turunan
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                                                        Induk
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {tc.description && (
                                                                <p className="text-[11px] text-slate-400 mt-0.5">{tc.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Column 2: Connector Arrow */}
                                                <td className="py-4 px-4 text-center">
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-full flex items-center justify-center mx-auto border transition",
                                                        isMapped ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                                                    )}>
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </td>

                                                {/* Column 3: Category */}
                                                <td className="py-4 px-6">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                                                        {tc.category || 'Penerimaan Umum'}
                                                    </span>
                                                </td>

                                                {/* Column 4: Linked RKAS Budget */}
                                                <td className="py-4 px-6">
                                                    {matchInfo ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                                                <PieChart size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">
                                                                    {matchInfo.budget.name}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    {matchInfo.matchType === 'parent' && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                                                            <Link2 size={10} /> Terkoneksi via Induk [{matchInfo.parentCode}]
                                                                        </span>
                                                                    )}
                                                                    {matchInfo.matchType === 'child' && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                                                            <Link2 size={10} /> Terkoneksi via Rincian [{matchInfo.childCode}]
                                                                        </span>
                                                                    )}
                                                                    {matchInfo.matchType === 'direct' && (
                                                                        <span className="text-[10px] text-slate-400">
                                                                            Target: {formatCurrency(matchInfo.budget.planned_amount || matchInfo.budget.amount || 0)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">
                                                            Belum dialokasikan di RKAS (Bisa dibuat di Tab RKAS)
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Column 5: Status Badge */}
                                                <td className="py-4 px-6 text-center">
                                                    {isMapped ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <CheckCircle2 size={13} className="text-emerald-600" /> Masuk RKAS
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Belum Dianggarkan
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialMappingMatrix;
