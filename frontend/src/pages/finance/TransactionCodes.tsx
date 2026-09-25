import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Plus, Edit, Trash2, Tag, X, ChevronDown, ChevronRight,
    CreditCard, ArrowDownRight, Layers,
    AlertCircle, Search, Filter, ChevronsUpDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
}

interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: string; // 'Income' | 'Expense'
    category: string;
    description: string;
    is_active: boolean;
    parent_code_id: number | null;
    parent_code?: TransactionCode | null;
    children?: TransactionCode[];
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

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const TransactionCodes: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canEdit = user?.role_id === 1 || user?.role_id === 9;

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL'); // 'ALL' | 'Income' | 'Expense'
    const [filterYearId, setFilterYearId] = useState<string>('');
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    // Modals state
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [editCodeItem, setEditCodeItem] = useState<TransactionCode | null>(null);
    const [codeForm, setCodeForm] = useState({
        code: '',
        name: '',
        type: 'Income',
        category: '',
        description: '',
        parent_code_id: '',
        is_active: true
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editPaymentItem, setEditPaymentItem] = useState<PaymentType | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        code: '',
        name: '',
        payment_schedule: 'Bulanan',
        amount: '',
        academic_year_id: '',
        transaction_code_id: '',
        is_active: true
    });

    // Category modal
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [addingCategory, setAddingCategory] = useState(false);

    // Queries
    const { data: codes = [], isLoading: loadingCodes } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'],
        queryFn: async () => (await api.get('/finance/transaction-codes')).data || [],
    });

    const { data: academicYears = [] } = useQuery<AcademicYear[]>({
        queryKey: ['academic-years'],
        queryFn: async () => (await api.get('/finance/academic-years')).data || [],
    });

    // Auto set active academic year
    useEffect(() => {
        if (academicYears.length > 0 && !filterYearId) {
            const activeYear = academicYears.find(y => y.is_active);
            if (activeYear) {
                setFilterYearId(String(activeYear.id));
            }
        }
    }, [academicYears, filterYearId]);

    const { data: paymentTypes = [], isLoading: loadingPayments } = useQuery<PaymentType[]>({
        queryKey: ['payment-types', filterYearId],
        queryFn: async () => {
            const url = filterYearId ? `/finance/payment-types?academic_year_id=${filterYearId}` : '/finance/payment-types';
            const res = await api.get(url);
            return res.data || [];
        },
    });

    const { data: budgetCategories = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['budget-categories'],
        queryFn: async () => (await api.get('/finance/budget-categories')).data || [],
    });

    const categoryOptions = useMemo(() => {
        const set = new Set<string>();
        budgetCategories.forEach(c => { if (c.name) set.add(c.name.trim()); });
        codes.forEach(c => { if (c.category) set.add(c.category.trim()); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [budgetCategories, codes]);

    // Expand all by default when codes load
    useEffect(() => {
        if (codes.length > 0 && Object.keys(expandedNodes).length === 0) {
            const initialExpanded: Record<string, boolean> = {};
            codes.forEach(c => {
                initialExpanded[`code_${c.id}`] = true;
            });
            setExpandedNodes(initialExpanded);
        }
    }, [codes]);

    // Toggle expand/collapse
    const toggleNode = (key: string) => {
        setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const expandAll = () => {
        const all: Record<string, boolean> = {};
        codes.forEach(c => {
            all[`code_${c.id}`] = true;
        });
        setExpandedNodes(all);
    };

    const collapseAll = () => {
        setExpandedNodes({});
    };

    // Category Creation
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setAddingCategory(true);
        try {
            await api.post('/finance/budget-categories', {
                name: newCategoryName.trim(),
                description: 'Ditambahkan dari Kode Transaksi'
            });
            await queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
            setCodeForm(prev => ({ ...prev, category: newCategoryName.trim() }));
            setNewCategoryName('');
            setShowAddCategory(false);
            toast.success('Kategori baru berhasil ditambahkan');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal menambahkan kategori');
        } finally {
            setAddingCategory(false);
        }
    };

    // Transaction Code Mutations
    const createCodeMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/transaction-codes', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-codes'] });
            handleCloseCodeModal();
            toast.success('Kode transaksi berhasil ditambahkan');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menambahkan kode transaksi')
    });

    const updateCodeMutation = useMutation({
        mutationFn: (data: any) => api.put(`/finance/transaction-codes/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-codes'] });
            handleCloseCodeModal();
            toast.success('Kode transaksi berhasil diperbarui');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal memperbarui kode transaksi')
    });

    const deleteCodeMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/transaction-codes/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-codes'] });
            toast.success('Kode transaksi berhasil dihapus');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menghapus kode transaksi')
    });

    // Payment Type Mutations
    const createPaymentMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/payment-types', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-types'] });
            handleClosePaymentModal();
            toast.success('Jenis pembayaran berhasil ditambahkan');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menambahkan jenis pembayaran')
    });

    const updatePaymentMutation = useMutation({
        mutationFn: (data: any) => api.put(`/finance/payment-types/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-types'] });
            handleClosePaymentModal();
            toast.success('Jenis pembayaran diperbarui');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal memperbarui jenis pembayaran')
    });

    const deletePaymentMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/payment-types/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-types'] });
            toast.success('Jenis pembayaran berhasil dihapus');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menghapus jenis pembayaran')
    });

    // Code Modal handlers
    const handleOpenAddMasterCode = () => {
        setEditCodeItem(null);
        setCodeForm({
            code: '',
            name: '',
            type: 'Income',
            category: categoryOptions[0] || 'Operasional',
            description: '',
            parent_code_id: '',
            is_active: true
        });
        setShowCodeModal(true);
    };

    const handleOpenAddSubCode = (parent: TransactionCode) => {
        setEditCodeItem(null);
        setCodeForm({
            code: `${parent.code}.`,
            name: '',
            type: parent.type,
            category: parent.category || '',
            description: '',
            parent_code_id: String(parent.id),
            is_active: true
        });
        setShowCodeModal(true);
    };

    const handleOpenEditCode = (item: TransactionCode) => {
        setEditCodeItem(item);
        setCodeForm({
            code: item.code,
            name: item.name,
            type: item.type,
            category: item.category,
            description: item.description,
            parent_code_id: item.parent_code_id ? String(item.parent_code_id) : '',
            is_active: item.is_active,
        });
        setShowCodeModal(true);
    };

    const handleCloseCodeModal = () => {
        setShowCodeModal(false);
        setEditCodeItem(null);
    };

    const handleSubmitCode = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            ...codeForm,
            parent_code_id: codeForm.parent_code_id ? Number(codeForm.parent_code_id) : null
        };
        if (editCodeItem) {
            updateCodeMutation.mutate({ ...payload, id: editCodeItem.id });
        } else {
            createCodeMutation.mutate(payload);
        }
    };

    // Payment Modal handlers
    const handleOpenAddPayment = (defaultTransactionCodeId?: number) => {
        setEditPaymentItem(null);
        setPaymentForm({
            code: '',
            name: '',
            payment_schedule: 'Bulanan',
            amount: '',
            academic_year_id: filterYearId || (academicYears[0] ? String(academicYears[0].id) : ''),
            transaction_code_id: defaultTransactionCodeId ? String(defaultTransactionCodeId) : '',
            is_active: true
        });
        setShowPaymentModal(true);
    };

    const handleOpenEditPayment = (item: PaymentType) => {
        setEditPaymentItem(item);
        setPaymentForm({
            code: item.code,
            name: item.name,
            payment_schedule: item.payment_schedule,
            amount: String(item.amount),
            academic_year_id: String(item.academic_year_id),
            transaction_code_id: item.transaction_code_id ? String(item.transaction_code_id) : '',
            is_active: item.is_active
        });
        setShowPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setEditPaymentItem(null);
    };

    const handleSubmitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentForm.transaction_code_id) {
            toast.error('Kode transaksi wajib dipilih');
            return;
        }

        const payload: any = {
            code: paymentForm.code,
            name: paymentForm.name,
            payment_schedule: paymentForm.payment_schedule,
            amount: parseFloat(paymentForm.amount),
            academic_year_id: Number(paymentForm.academic_year_id),
            transaction_code_id: Number(paymentForm.transaction_code_id),
            is_active: paymentForm.is_active,
        };

        if (editPaymentItem) {
            updatePaymentMutation.mutate({ ...payload, id: editPaymentItem.id });
        } else {
            createPaymentMutation.mutate(payload);
        }
    };

    // Grouping & Tree Calculation
    const masterCodes = useMemo(() => {
        return codes.filter(c => !c.parent_code_id && !c.description?.startsWith('RKAS Item: '));
    }, [codes]);

    const standaloneGeneratedCodes = useMemo(() => {
        return codes.filter(c => !c.parent_code_id && c.description?.startsWith('RKAS Item: '));
    }, [codes]);

    const getChildrenCodes = (parentId: number) => {
        return codes.filter(c => c.parent_code_id === parentId);
    };

    const getPaymentTypesForCode = (codeId: number) => {
        return paymentTypes.filter(pt => pt.transaction_code_id === codeId);
    };

    // Unmapped payment types (no transaction code or invalid)
    const unmappedPaymentTypes = useMemo(() => {
        const codeIds = new Set(codes.map(c => c.id));
        return paymentTypes.filter(pt => !pt.transaction_code_id || !codeIds.has(pt.transaction_code_id));
    }, [paymentTypes, codes]);

    // Filtered lists
    const matchesSearch = (text: string) => {
        if (!searchQuery.trim()) return true;
        return (text || '').toLowerCase().includes(searchQuery.toLowerCase());
    };

    // Metrics
    const totalMaster = masterCodes.length;
    const totalSub = codes.filter(c => !!c.parent_code_id).length;
    const totalPayments = paymentTypes.length;

    const scheduleBadgeColor: Record<string, string> = {
        'Bulanan': 'bg-blue-50 text-blue-700 border-blue-200/60',
        'Tahunan': 'bg-purple-50 text-purple-700 border-purple-200/60',
        'Semesteran': 'bg-teal-50 text-teal-700 border-teal-200/60',
        'Bertahap': 'bg-amber-50 text-amber-700 border-amber-200/60'
    };

    const isLoading = loadingCodes || loadingPayments;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                                <Layers size={13} /> Hierarki Kode Pos & Tarif Pembayaran
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Kode Transaksi & Jenis Pembayaran</h1>
                        <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
                            Struktur induk dan sub-kode transaksi pos RKAS serta rincian jenis pembayaran siswa dalam satu tabel bertingkat (parent-child).
                        </p>
                    </div>

                    {canEdit && (
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <button
                                onClick={handleOpenAddMasterCode}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition"
                            >
                                <Plus size={16} /> Tambah Kode Induk
                            </button>
                            <button
                                onClick={() => handleOpenAddPayment()}
                                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-white/20 transition backdrop-blur-sm"
                            >
                                <Plus size={16} /> Tambah Jenis Bayar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Tag size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Kode Induk</div>
                        <div className="text-xl font-bold text-slate-900">{totalMaster}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <ArrowDownRight size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Sub Kode (Anak)</div>
                        <div className="text-xl font-bold text-slate-900">{totalSub}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Jenis Pembayaran</div>
                        <div className="text-xl font-bold text-slate-900">{totalPayments}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <Layers size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Tahun Ajaran</div>
                        <div className="text-sm font-bold text-slate-900 truncate">
                            {academicYears.find(y => String(y.id) === filterYearId)?.name || 'Semua'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Unmapped Payments Alert */}
            {unmappedPaymentTypes.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-amber-600 shrink-0" size={22} />
                        <div>
                            <p className="text-sm font-bold">Terdapat {unmappedPaymentTypes.length} Jenis Pembayaran Belum Terhubung ke Kode Transaksi</p>
                            <p className="text-xs text-amber-700">Jenis pembayaran ini tidak akan otomatis mengalir ke realisasi RKAS & Buku Kas Umum.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenEditPayment(unmappedPaymentTypes[0])}
                        className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition"
                    >
                        Hubungkan Sekarang
                    </button>
                </div>
            )}

            {/* Filter & Toolbar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari kode / nama..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>

                    {/* Filter Type */}
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setFilterType('ALL')}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition",
                                filterType === 'ALL' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Semua
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('Income')}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition",
                                filterType === 'Income' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Pendapatan
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('Expense')}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition",
                                filterType === 'Expense' ? "bg-red-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Pengeluaran
                        </button>
                    </div>

                    {/* Filter Academic Year */}
                    <div className="flex items-center gap-1 text-xs">
                        <Filter size={14} className="text-slate-400 ml-1" />
                        <select
                            value={filterYearId}
                            onChange={e => setFilterYearId(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                        >
                            <option value="">Semua Tahun Ajaran</option>
                            {academicYears.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.is_active ? '(Aktif)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Expand / Collapse All */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        type="button"
                        onClick={expandAll}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
                    >
                        <ChevronsUpDown size={14} /> Buka Semua
                    </button>
                    <button
                        type="button"
                        onClick={collapseAll}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                        Tutup Semua
                    </button>
                </div>
            </div>

            {/* Hierarchical Parent-Child Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4 min-w-[320px]">Kode & Nama Pos / Jenis Pembayaran</th>
                                <th className="px-4 py-4 min-w-[140px]">Tipe / Jadwal</th>
                                <th className="px-4 py-4 min-w-[160px]">Kategori / Tahun Ajaran</th>
                                <th className="px-4 py-4 text-right min-w-[150px]">Tarif / Nominal</th>
                                <th className="px-4 py-4 text-center min-w-[90px]">Status</th>
                                {canEdit && <th className="px-6 py-4 text-right min-w-[160px]">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs">Memuat struktur data keuangan...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : masterCodes.length === 0 && standaloneGeneratedCodes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                                        Belum ada data kode transaksi. Klik <strong>Tambah Kode Induk</strong> untuk memulai.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {masterCodes
                                        .filter(mc => filterType === 'ALL' || mc.type === filterType)
                                        .map(master => {
                                            const subCodes = getChildrenCodes(master.id);
                                            const directPayments = getPaymentTypesForCode(master.id);
                                            const isExpanded = !!expandedNodes[`code_${master.id}`];
                                            const hasChildren = subCodes.length > 0 || directPayments.length > 0;

                                            // Check search match
                                            const masterMatches = matchesSearch(master.code) || matchesSearch(master.name) || matchesSearch(master.category);
                                            const subMatches = subCodes.some(s => matchesSearch(s.code) || matchesSearch(s.name) || matchesSearch(s.category));
                                            const paymentMatches = directPayments.some(p => matchesSearch(p.code) || matchesSearch(p.name));
                                            const anyChildPaymentMatches = subCodes.some(s => getPaymentTypesForCode(s.id).some(p => matchesSearch(p.code) || matchesSearch(p.name)));

                                            if (!masterMatches && !subMatches && !paymentMatches && !anyChildPaymentMatches) {
                                                return null;
                                            }

                                            return (
                                                <React.Fragment key={`master_${master.id}`}>
                                                    {/* MASTER CODE ROW */}
                                                    <tr className="bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-t-2 border-slate-100">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2.5">
                                                                {hasChildren ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleNode(`code_${master.id}`)}
                                                                        className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg transition"
                                                                    >
                                                                        {isExpanded ? <ChevronDown size={17} className="text-emerald-700" /> : <ChevronRight size={17} />}
                                                                    </button>
                                                                ) : (
                                                                    <div className="w-6" />
                                                                )}

                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-bold text-xs shadow-sm">
                                                                    <Tag size={13} className="text-emerald-700" />
                                                                    {master.code}
                                                                </span>

                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                                        {master.name}
                                                                        <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                                                            Induk
                                                                        </span>
                                                                    </div>
                                                                    {master.description && (
                                                                        <div className="text-[11px] text-slate-400 truncate max-w-md">{master.description}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1',
                                                                master.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                                                            )}>
                                                                {master.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                                                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                                                                {master.category || 'Umum'}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4 text-right text-xs text-slate-400 font-mono">
                                                            —
                                                        </td>

                                                        <td className="px-4 py-4 text-center">
                                                            <span className={clsx(
                                                                'px-2 py-0.5 rounded-full text-[11px] font-bold',
                                                                master.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                            )}>
                                                                {master.is_active ? 'Aktif' : 'Nonaktif'}
                                                            </span>
                                                        </td>

                                                        {canEdit && (
                                                            <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => handleOpenAddSubCode(master)}
                                                                    title="Tambah Sub-Kode (Anak)"
                                                                    className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                                                                >
                                                                    + Sub Kode
                                                                </button>
                                                                {master.type === 'Income' && (
                                                                    <button
                                                                        onClick={() => handleOpenAddPayment(master.id)}
                                                                        title="Tambah Jenis Bayar Siswa Langsung di Induk Ini"
                                                                        className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                                                                    >
                                                                        + Tarif Bayar
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenEditCode(master)}
                                                                    title="Edit Kode Induk"
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                >
                                                                    <Edit size={15} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm(`Hapus kode induk ${master.code} - ${master.name}? Semua sub-kode di bawahnya mungkin terpengaruh.`)) {
                                                                            deleteCodeMutation.mutate(master.id);
                                                                        }
                                                                    }}
                                                                    title="Hapus Kode Induk"
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>

                                                    {/* CHILDREN OF MASTER (SUB-CODES & DIRECT PAYMENT TYPES) */}
                                                    {isExpanded && (
                                                        <>
                                                            {/* Direct Payments under Master */}
                                                            {directPayments.map(pt => (
                                                                <tr key={`pt_direct_${pt.id}`} className="bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors">
                                                                    <td className="px-6 py-3 pl-14">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-300 font-mono">└─</span>
                                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-100/80 text-indigo-900 border border-indigo-200 font-mono font-bold text-xs">
                                                                                <CreditCard size={12} className="text-indigo-600" />
                                                                                {pt.code}
                                                                            </span>
                                                                            <span className="font-semibold text-slate-800 text-xs">
                                                                                {pt.name}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={clsx(
                                                                            "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                                                                            scheduleBadgeColor[pt.payment_schedule] || 'bg-slate-100 text-slate-700'
                                                                        )}>
                                                                            {pt.payment_schedule}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                                                                        {pt.academic_year?.name || 'Semua Tahun'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-xs font-mono">
                                                                        {formatCurrency(pt.amount)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={clsx(
                                                                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                                            pt.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                                        )}>
                                                                            {pt.is_active ? 'Aktif' : 'Nonaktif'}
                                                                        </span>
                                                                    </td>
                                                                    {canEdit && (
                                                                        <td className="px-6 py-3 text-right space-x-1">
                                                                            <button
                                                                                onClick={() => handleOpenEditPayment(pt)}
                                                                                title="Edit Jenis Pembayaran"
                                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                            >
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (confirm(`Hapus jenis pembayaran ${pt.name}?`)) {
                                                                                        deletePaymentMutation.mutate(pt.id);
                                                                                    }
                                                                                }}
                                                                                title="Hapus Jenis Pembayaran"
                                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}

                                                            {/* Sub-Codes under Master */}
                                                            {subCodes.map(sub => {
                                                                const subPayments = getPaymentTypesForCode(sub.id);
                                                                const isSubExpanded = !!expandedNodes[`code_${sub.id}`];
                                                                const hasSubChildren = subPayments.length > 0;

                                                                return (
                                                                    <React.Fragment key={`sub_${sub.id}`}>
                                                                        <tr className="bg-slate-50/30 hover:bg-slate-100/50 transition-colors">
                                                                            <td className="px-6 py-3.5 pl-10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-slate-300 font-mono">├─</span>
                                                                                    {hasSubChildren ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => toggleNode(`code_${sub.id}`)}
                                                                                            className="p-0.5 hover:bg-slate-200 text-slate-500 rounded transition"
                                                                                        >
                                                                                            {isSubExpanded ? <ChevronDown size={15} className="text-indigo-600" /> : <ChevronRight size={15} />}
                                                                                        </button>
                                                                                    ) : (
                                                                                        <div className="w-4" />
                                                                                    )}

                                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-mono font-bold text-xs">
                                                                                        <ArrowDownRight size={12} className="text-slate-500" />
                                                                                        {sub.code}
                                                                                    </span>

                                                                                    <div>
                                                                                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                                                                            {sub.name}
                                                                                            {subPayments.length > 0 && (
                                                                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                                                                                                    {subPayments.length} tarif bayar
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {sub.description && (
                                                                                            <div className="text-[10px] text-slate-400 truncate max-w-sm">{sub.description}</div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </td>

                                                                            <td className="px-4 py-3.5">
                                                                                <span className={clsx(
                                                                                    'px-2 py-0.5 rounded-full text-[11px] font-bold',
                                                                                    sub.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                                                )}>
                                                                                    {sub.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'}
                                                                                </span>
                                                                            </td>

                                                                            <td className="px-4 py-3.5 text-xs text-slate-500">
                                                                                {sub.category}
                                                                            </td>

                                                                            <td className="px-4 py-3.5 text-right text-xs text-slate-400 font-mono">
                                                                                —
                                                                            </td>

                                                                            <td className="px-4 py-3.5 text-center">
                                                                                <span className={clsx(
                                                                                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                                                    sub.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                                                )}>
                                                                                    {sub.is_active ? 'Aktif' : 'Nonaktif'}
                                                                                </span>
                                                                            </td>

                                                                            {canEdit && (
                                                                                <td className="px-6 py-3.5 text-right space-x-1 whitespace-nowrap">
                                                                                    {sub.type === 'Income' && (
                                                                                        <button
                                                                                            onClick={() => handleOpenAddPayment(sub.id)}
                                                                                            title="Tambah Tarif / Jenis Pembayaran Siswa pada Sub-Kode ini"
                                                                                            className="px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                                                                                        >
                                                                                            + Tarif Bayar
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={() => handleOpenEditCode(sub)}
                                                                                        title="Edit Sub Kode"
                                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                                    >
                                                                                        <Edit size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (confirm(`Hapus sub kode ${sub.code} - ${sub.name}?`)) {
                                                                                                deleteCodeMutation.mutate(sub.id);
                                                                                            }
                                                                                        }}
                                                                                        title="Hapus Sub Kode"
                                                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                        </tr>

                                                                        {/* Payment types under this sub-code */}
                                                                        {isSubExpanded && subPayments.map(pt => (
                                                                            <tr key={`pt_sub_${pt.id}`} className="bg-indigo-50/20 hover:bg-indigo-50/50 transition-colors">
                                                                                <td className="px-6 py-2.5 pl-20">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-slate-300 font-mono">└──</span>
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-200 font-mono font-bold text-xs">
                                                                                            <CreditCard size={12} className="text-indigo-600" />
                                                                                            {pt.code}
                                                                                        </span>
                                                                                        <span className="font-semibold text-slate-800 text-xs">
                                                                                            {pt.name}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-2.5">
                                                                                    <span className={clsx(
                                                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                                                        scheduleBadgeColor[pt.payment_schedule] || 'bg-slate-100 text-slate-700'
                                                                                    )}>
                                                                                        {pt.payment_schedule}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                                                                                    {pt.academic_year?.name || 'Semua Tahun'}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-right font-bold text-slate-900 text-xs font-mono">
                                                                                    {formatCurrency(pt.amount)}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-center">
                                                                                    <span className={clsx(
                                                                                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                                                        pt.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                                                    )}>
                                                                                        {pt.is_active ? 'Aktif' : 'Nonaktif'}
                                                                                    </span>
                                                                                </td>
                                                                                {canEdit && (
                                                                                    <td className="px-6 py-2.5 text-right space-x-1">
                                                                                        <button
                                                                                            onClick={() => handleOpenEditPayment(pt)}
                                                                                            title="Edit Jenis Pembayaran"
                                                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                                        >
                                                                                            <Edit size={13} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                if (confirm(`Hapus jenis pembayaran ${pt.name}?`)) {
                                                                                                    deletePaymentMutation.mutate(pt.id);
                                                                                                }
                                                                                            }}
                                                                                            title="Hapus Jenis Pembayaran"
                                                                                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                                        >
                                                                                            <Trash2 size={13} />
                                                                                        </button>
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        ))}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}

                                    {/* Standalone RKAS Generated Codes */}
                                    {standaloneGeneratedCodes.length > 0 && (
                                        <>
                                            <tr className="bg-slate-100/80">
                                                <td colSpan={6} className="px-6 py-2.5 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                                                    Kode Otomatis dari RKAS (Standalone)
                                                </td>
                                            </tr>
                                            {standaloneGeneratedCodes.map(sc => (
                                                <tr key={`standalone_${sc.id}`} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3 pl-8">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold text-xs">
                                                                <Tag size={12} /> {sc.code}
                                                            </span>
                                                            <span className="font-semibold text-slate-800 text-xs">{sc.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold', sc.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                                                            {sc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">{sc.category}</td>
                                                    <td className="px-4 py-3 text-right text-xs text-slate-400 font-mono">—</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', sc.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500')}>
                                                            {sc.is_active ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </td>
                                                    {canEdit && (
                                                        <td className="px-6 py-3 text-right space-x-1">
                                                            <button onClick={() => handleOpenEditCode(sc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={14} /></button>
                                                            <button onClick={() => { if (confirm(`Hapus kode ${sc.code}?`)) deleteCodeMutation.mutate(sc.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* Unmapped Payment Types Section */}
                                    {unmappedPaymentTypes.length > 0 && (
                                        <>
                                            <tr className="bg-amber-100/60">
                                                <td colSpan={6} className="px-6 py-2.5 text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                                    <AlertCircle size={14} /> Jenis Pembayaran Belum Terhubung ke Kode Transaksi ({unmappedPaymentTypes.length})
                                                </td>
                                            </tr>
                                            {unmappedPaymentTypes.map(pt => (
                                                <tr key={`unmapped_${pt.id}`} className="bg-amber-50/40 hover:bg-amber-100/50 transition-colors">
                                                    <td className="px-6 py-3 pl-8">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-900 border border-red-200 font-mono font-bold text-xs">
                                                                <CreditCard size={12} className="text-red-600" />
                                                                {pt.code}
                                                            </span>
                                                            <span className="font-semibold text-slate-800 text-xs">{pt.name}</span>
                                                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                                                Belum Terhubung RKAS
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold border", scheduleBadgeColor[pt.payment_schedule] || 'bg-slate-100 text-slate-700')}>
                                                            {pt.payment_schedule}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">{pt.academic_year?.name || 'Semua Tahun'}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-xs font-mono">{formatCurrency(pt.amount)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', pt.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500')}>
                                                            {pt.is_active ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </td>
                                                    {canEdit && (
                                                        <td className="px-6 py-3 text-right space-x-1">
                                                            <button onClick={() => handleOpenEditPayment(pt)} className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 rounded-lg transition">Hubungkan</button>
                                                            <button onClick={() => { if (confirm(`Hapus jenis pembayaran ${pt.name}?`)) deletePaymentMutation.mutate(pt.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: KODE TRANSAKSI (INDUK / SUB) */}
            {showCodeModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {editCodeItem ? 'Edit Kode Transaksi' : codeForm.parent_code_id ? 'Tambah Sub-Kode (Anak Transaksi)' : 'Tambah Kode Transaksi Induk'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Master data pos akun RKAS & BKU</p>
                            </div>
                            <button onClick={handleCloseCodeModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitCode} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Kode Transaksi *</label>
                                    <input
                                        type="text"
                                        value={codeForm.code}
                                        onChange={e => setCodeForm({ ...codeForm, code: e.target.value })}
                                        placeholder="Contoh: 4.1 atau 4.1.1"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipe Transaksi *</label>
                                    <select
                                        value={codeForm.type}
                                        onChange={e => setCodeForm({ ...codeForm, type: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="Income">Pendapatan / Uang Masuk</option>
                                        <option value="Expense">Pengeluaran / Belanja</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nama Pos Transaksi *</label>
                                <input
                                    type="text"
                                    value={codeForm.name}
                                    onChange={e => setCodeForm({ ...codeForm, name: e.target.value })}
                                    placeholder="Contoh: Pendapatan SPP Siswa, Belanja ATK..."
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            {/* Kode Induk Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Induk Kode Transaksi
                                    <span className="text-[11px] font-normal text-slate-400 ml-1">(Kosongkan jika ini Kode Induk/Master)</span>
                                </label>
                                <select
                                    value={codeForm.parent_code_id}
                                    onChange={e => setCodeForm({ ...codeForm, parent_code_id: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">— Ini adalah Kode Induk (Master) —</option>
                                    {masterCodes
                                        .filter(mc => mc.id !== editCodeItem?.id)
                                        .map(mc => (
                                            <option key={mc.id} value={mc.id}>
                                                {mc.code} — {mc.name} ({mc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Kategori Pos */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Kategori Pos *</label>
                                    {!showAddCategory && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCategory(true)}
                                            className="text-xs text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1"
                                        >
                                            <Plus size={13} /> Tambah Kategori
                                        </button>
                                    )}
                                </div>

                                {showAddCategory ? (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                                        <label className="text-xs text-emerald-900 font-bold">Kategori Baru</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={e => setNewCategoryName(e.target.value)}
                                                placeholder="Contoh: Operasional, Sarpras..."
                                                className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                disabled={addingCategory || !newCategoryName.trim()}
                                                onClick={handleCreateCategory}
                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {addingCategory ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                                                className="px-2.5 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs hover:bg-slate-50"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        value={codeForm.category}
                                        onChange={e => {
                                            if (e.target.value === '__NEW__') setShowAddCategory(true);
                                            else setCodeForm({ ...codeForm, category: e.target.value });
                                        }}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                                        required
                                    >
                                        <option value="">-- Pilih Kategori --</option>
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__NEW__" className="text-emerald-700 font-bold">+ Tambah Kategori Baru...</option>
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Deskripsi / Keterangan</label>
                                <textarea
                                    value={codeForm.description}
                                    onChange={e => setCodeForm({ ...codeForm, description: e.target.value })}
                                    placeholder="Catatan pos transaksi untuk laporan..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="code_is_active"
                                    checked={codeForm.is_active}
                                    onChange={e => setCodeForm({ ...codeForm, is_active: e.target.checked })}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                />
                                <label htmlFor="code_is_active" className="text-xs font-bold text-slate-700">Status Pos Aktif</label>
                            </div>

                            <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                                <button type="button" onClick={handleCloseCodeModal} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition">
                                    Batal
                                </button>
                                <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition">
                                    {editCodeItem ? 'Simpan Perubahan' : 'Tambah Pos Transaksi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: JENIS PEMBAYARAN SISWA (TARIF) */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {editPaymentItem ? 'Edit Jenis Pembayaran' : 'Tambah Jenis Pembayaran (Tarif Siswa)'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Penetapan tarif tagihan yang terhubung ke pos kode transaksi</p>
                            </div>
                            <button onClick={handleClosePaymentModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Kode Bayar *</label>
                                    <input
                                        type="text"
                                        value={paymentForm.code}
                                        onChange={e => setPaymentForm({ ...paymentForm, code: e.target.value })}
                                        placeholder="Contoh: SPP-01, DSP-01"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Jadwal Bayar *</label>
                                    <select
                                        value={paymentForm.payment_schedule}
                                        onChange={e => setPaymentForm({ ...paymentForm, payment_schedule: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="Bulanan">Bulanan (Setiap Bulan)</option>
                                        <option value="Semesteran">Semesteran</option>
                                        <option value="Tahunan">Tahunan (Sekali Setahun)</option>
                                        <option value="Bertahap">Bertahap (Bisa Dicicil)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nama Jenis Pembayaran *</label>
                                <input
                                    type="text"
                                    value={paymentForm.name}
                                    onChange={e => setPaymentForm({ ...paymentForm, name: e.target.value })}
                                    placeholder="Contoh: SPP Reguler Bulanan, Uang Gedung/DSP..."
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* Hubungkan ke Pos Kode Transaksi (RKAS / BKU) */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Pos Kode Transaksi (RKAS) <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                        Wajib untuk Integrasi BKU
                                    </span>
                                </div>
                                <select
                                    value={paymentForm.transaction_code_id}
                                    onChange={e => setPaymentForm({ ...paymentForm, transaction_code_id: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">-- Pilih Pos Kode Transaksi --</option>
                                    {masterCodes.map(mc => {
                                        const subList = getChildrenCodes(mc.id);
                                        return (
                                            <React.Fragment key={mc.id}>
                                                <option value={mc.id} className="font-bold">
                                                    {mc.code} — {mc.name} ({mc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'} - Induk)
                                                </option>
                                                {subList.map(sub => (
                                                    <option key={sub.id} value={sub.id}>
                                                        &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.code} — {sub.name}
                                                    </option>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </select>
                                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                                    Setiap pembayaran siswa pada tarif ini otomatis membukukan kas dan mencatat realisasi pada mata anggaran tersebut.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nominal Tarif (Rp) *</label>
                                    <input
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        placeholder="150000"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tahun Ajaran *</label>
                                    <select
                                        value={paymentForm.academic_year_id}
                                        onChange={e => setPaymentForm({ ...paymentForm, academic_year_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">-- Pilih Tahun Ajaran --</option>
                                        {academicYears.map(y => (
                                            <option key={y.id} value={y.id}>
                                                {y.name} {y.is_active ? '(Aktif)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="payment_is_active"
                                    checked={paymentForm.is_active}
                                    onChange={e => setPaymentForm({ ...paymentForm, is_active: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <label htmlFor="payment_is_active" className="text-xs font-bold text-slate-700">Status Jenis Pembayaran Aktif</label>
                            </div>

                            <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                                <button type="button" onClick={handleClosePaymentModal} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition">
                                    Batal
                                </button>
                                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-600/30 transition">
                                    {editPaymentItem ? 'Simpan Perubahan' : 'Simpan Jenis Pembayaran'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionCodes;
