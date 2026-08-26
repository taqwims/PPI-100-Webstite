import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle2, AlertTriangle, ArrowRight, Tag, CreditCard, PieChart, Sparkles, Search } from 'lucide-react';
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
    is_active: boolean;
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
    amount: number;
    realized_amount: number;
    transaction_code_id?: number | null;
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const FinancialMappingMatrix: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
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

    // Income transaction codes only for mapping
    const incomeCodes = transactionCodes.filter(c => c.type === 'Income' || c.type === 'Penerimaan' || !c.type);

    // Calculation statistics
    const totalTypes = paymentTypes.length;
    const mappedTypes = paymentTypes.filter(p => p.transaction_code_id !== null).length;
    const unmappedTypes = totalTypes - mappedTypes;
    const completionPercentage = totalTypes > 0 ? Math.round((mappedTypes / totalTypes) * 100) : 100;

    // Filtered data
    const filteredPaymentTypes = paymentTypes.filter(pt => {
        const matchesSearch = pt.name.toLowerCase().includes(searchQuery.toLowerCase()) || pt.code.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (filterStatus === 'mapped') return pt.transaction_code_id !== null;
        if (filterStatus === 'unmapped') return pt.transaction_code_id === null;
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
                                <Sparkles size={13} /> Matriks Alur Pemetaan Keuangan
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hubungan Jenis Pembayaran & RKAS</h2>
                        <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
                            Pastikan setiap jenis pembayaran siswa terhubung ke Kode Transaksi Pos Keuangan agar otomatis terealisasi ke dalam anggaran RKAS secara akurat.
                        </p>
                    </div>

                    {/* Completion Ring & Stats */}
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0">
                        <div className="text-center">
                            <div className="text-2xl font-black text-emerald-300">{completionPercentage}%</div>
                            <div className="text-[10px] uppercase tracking-wider text-emerald-100/70 font-semibold">Terkoneksi</div>
                        </div>

                        <div className="h-10 w-px bg-white/20" />

                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-emerald-200">
                                <CheckCircle2 size={14} className="text-emerald-400" />
                                <span>Terhubung: <strong>{mappedTypes}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-amber-200">
                                <AlertTriangle size={14} className="text-amber-400" />
                                <span>Belum Terhubung: <strong>{unmappedTypes}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Warning Banner */}
            {unmappedTypes > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1 text-xs sm:text-sm">
                        <h4 className="font-bold text-amber-900">Perhatian: {unmappedTypes} Jenis Pembayaran Belum Terhubung!</h4>
                        <p className="text-amber-700 mt-0.5">
                            Pembayaran siswa pada jenis yang belum terhubung ke Kode Transaksi **tidak akan otomatis tercatat ke dalam realisasi RKAS**. Pilih Kode Transaksi pada tabel di bawah ini untuk menghubungkannya.
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
                            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.is_active ? '(Aktif)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition",
                                filterStatus === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Semua ({totalTypes})
                        </button>
                        <button
                            onClick={() => setFilterStatus('mapped')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1",
                                filterStatus === 'mapped' ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50"
                            )}
                        >
                            <CheckCircle2 size={13} /> Terhubung ({mappedTypes})
                        </button>
                        <button
                            onClick={() => setFilterStatus('unmapped')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1",
                                filterStatus === 'unmapped' ? "bg-amber-600 text-white shadow-sm" : "text-amber-700 hover:bg-amber-50"
                            )}
                        >
                            <AlertTriangle size={13} /> Belum ({unmappedTypes})
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
                        placeholder="Cari jenis pembayaran..."
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
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
                                        <p className="mt-2 font-medium">Memuat matriks alur keuangan...</p>
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
                                    
                                    // Find matching budget item if code exists
                                    const matchingBudget = linkedCode ? budgetItems.find(b => b.code === linkedCode.code || b.transaction_code_id === linkedCode.id) : null;

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

                                            {/* Column 3: Transaction Code Dropdown Selector */}
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
                                                        {incomeCodes.map(code => (
                                                            <option key={code.id} value={code.id}>
                                                                [{code.code}] {code.name} ({code.category || 'Penerimaan'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    
                                                    {linkedCode && (
                                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                                            <Tag size={11} className="text-emerald-600" /> Pos: {linkedCode.category || 'Penerimaan'}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Column 4: Linked RKAS Budget */}
                                            <td className="py-4 px-6">
                                                {isMapped ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                            <PieChart size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">
                                                                {matchingBudget ? matchingBudget.name : (linkedCode?.name || 'Otomatis Terealisasi ke Pos RKAS')}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                Penerimaan Anggaran RKAS
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-amber-600 text-xs italic font-medium">Belum dialokasikan ke RKAS</span>
                                                )}
                                            </td>

                                            {/* Column 5: Status Badge */}
                                            <td className="py-4 px-6 text-center">
                                                {isMapped ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle2 size={13} className="text-emerald-600" /> Terkoneksi
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
                </div>
            </div>
        </div>
    );
};

export default FinancialMappingMatrix;
