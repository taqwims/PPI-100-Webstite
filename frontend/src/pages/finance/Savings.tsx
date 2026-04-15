import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ArrowUpRight, ArrowDownRight, Users, Search, Plus, Eye, X, History, Download, ArrowRightLeft, RotateCcw, TrendingDown, ShieldCheck, BarChart3, Filter } from 'lucide-react';
import clsx from 'clsx';
import { generateSavingsReport } from '../../utils/pdfUtils';
import toast from 'react-hot-toast';
import SavingsRecap from './SavingsRecap';

interface ClassData { id: number; name: string; }
interface Student { id: string; user: { name: string; email: string }; nisn: string; class: { id: number; name: string }; class_id: number; }
interface SavingAccount { id: string; student_id: string; student: Student; balance: number; created_at: string; updated_at: string; }
interface SavingTransaction { id: string; account_id: string; type: string; amount: number; date: string; handled_by: { name: string }; notes: string; }
interface OperationalWithdrawal {
    id: string; amount: number; returned_amount: number; purpose: string;
    status: string; handled_by: { name: string }; created_at: string; updated_at: string;
}
interface PoolSummary {
    total_balance: number; total_withdrawn: number; total_returned: number;
    outstanding_debt: number; available_balance: number;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

const Savings = () => {
    const { user } = useAuth();
    const canManage = [1, 9, 10].includes(user?.role_id || 0);

    const getDefaultUnitID = () => {
        if (user?.role_id === 2 || user?.role_id === 4 || user?.role_id === 6 || user?.role_id === 13) return 2;
        if (user?.role_id === 3 || user?.role_id === 5 || user?.role_id === 7 || user?.role_id === 12) return 1;
        return 1;
    };
    const [unitID, setUnitID] = useState<number>(getDefaultUnitID());
    const [activeTab, setActiveTab] = useState<'accounts' | 'operational' | 'recap'>('accounts');

    const [accounts, setAccounts] = useState<SavingAccount[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classList, setClassList] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');

    // Pool summary
    const [poolSummary, setPoolSummary] = useState<PoolSummary | null>(null);

    // Operational history
    const [opHistory, setOpHistory] = useState<OperationalWithdrawal[]>([]);
    const [loadingOpHistory, setLoadingOpHistory] = useState(false);

    // Transaction Modal
    const [showTrxModal, setShowTrxModal] = useState(false);
    const [trxType, setTrxType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
    const [trxStudentId, setTrxStudentId] = useState('');
    const [trxAmount, setTrxAmount] = useState('');
    const [trxNotes, setTrxNotes] = useState('');
    const [trxClassFilter, setTrxClassFilter] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Operational Withdrawal Modal
    const [showWithdrawOpModal, setShowWithdrawOpModal] = useState(false);
    const [opWithdrawAmount, setOpWithdrawAmount] = useState('');
    const [opWithdrawPurpose, setOpWithdrawPurpose] = useState('');

    // Return Modal
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnWithdrawalId, setReturnWithdrawalId] = useState('');
    const [returnAmount, setReturnAmount] = useState('');
    const [returnNotes, setReturnNotes] = useState('');
    const [returnSource, setReturnSource] = useState<'CashLedger' | 'Infaq'>('CashLedger');

    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyAccount, setHistoryAccount] = useState<SavingAccount | null>(null);
    const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchAccounts = useCallback(async (classId?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (classId) params.set('class_id', classId);
            const res = await api.get(`/finance/savings${params.toString() ? `?${params.toString()}` : ''}`);
            setAccounts(res.data || []);
        }
        catch (error) { console.error("Failed to fetch accounts", error); }
        finally { setLoading(false); }
    }, []);

    const fetchStudents = useCallback(async () => {
        try { const res = await api.get(`/students/?unit_id=${unitID}`); setStudents(res.data || []); }
        catch (error) { console.error("Failed to fetch students", error); }
    }, [unitID]);

    const fetchClasses = useCallback(async () => {
        try { const res = await api.get(`/academic/classes?unit_id=${unitID}`); setClassList(res.data || []); }
        catch (error) { console.error("Failed to fetch classes", error); }
    }, [unitID]);

    const fetchPoolSummary = useCallback(async () => {
        try { const res = await api.get('/finance/savings/operational/summary'); setPoolSummary(res.data); }
        catch (error) { console.error("Failed to fetch pool summary", error); }
    }, []);

    const fetchOpHistory = useCallback(async () => {
        setLoadingOpHistory(true);
        try { const res = await api.get('/finance/savings/operational/history'); setOpHistory(res.data || []); }
        catch (error) { console.error("Failed to fetch op history", error); }
        finally { setLoadingOpHistory(false); }
    }, []);

    const isFirstRender = React.useRef(true);

    useEffect(() => {
        if (canManage) { fetchAccounts(classFilter || undefined); fetchStudents(); fetchClasses(); fetchPoolSummary(); }
    }, [canManage, fetchAccounts, fetchStudents, fetchClasses, fetchPoolSummary, unitID]);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (canManage) fetchAccounts(classFilter || undefined);
    }, [classFilter, canManage, fetchAccounts]);

    useEffect(() => {
        if (canManage) fetchOpHistory();
    }, [canManage, fetchOpHistory]);

    const unitAccounts = accounts.filter(acc => students.some(s => s.id === acc.student_id));
    const totalBalance = unitAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAccounts = unitAccounts.length;
    const studentsWithoutAccount = students.filter(s => !unitAccounts.find(a => a.student_id === s.id));

    const filtered = unitAccounts.filter(acc => {
        const matchesClass = !classFilter || acc.student?.class_id === Number(classFilter);
        if (!searchQuery) return matchesClass;
        const q = searchQuery.toLowerCase();
        return matchesClass && (acc.student?.user?.name?.toLowerCase().includes(q) || acc.student?.nisn?.toLowerCase().includes(q) || acc.student?.class?.name?.toLowerCase().includes(q));
    });

    const groupedAccounts = filtered.reduce((acc, account) => {
        const className = account.student?.class?.name || 'Tanpa Kelas';
        if (!acc[className]) {
            acc[className] = {
                accounts: [],
                totalBalance: 0
            };
        }
        acc[className].accounts.push(account);
        acc[className].totalBalance += account.balance;
        return acc;
    }, {} as Record<string, { accounts: SavingAccount[], totalBalance: number }>);

    const toggleClass = (className: string) => {
        setExpandedClasses(prev => {
            const next = new Set(prev);
            if (next.has(className)) next.delete(className);
            else next.add(className);
            return next;
        });
    };

    const expandAll = useCallback(() => setExpandedClasses(new Set(Object.keys(groupedAccounts))), [groupedAccounts]);
    const collapseAll = useCallback(() => setExpandedClasses(new Set()), []);

    useEffect(() => {
        if (searchQuery) {
            expandAll();
        }
    }, [searchQuery, expandAll]);

    const filteredStudents = trxClassFilter ? students.filter(s => s.class_id?.toString() === trxClassFilter || s.class?.id?.toString() === trxClassFilter) : students;

    // Transaction handlers
    const openDepositModal = (studentId?: string) => { setTrxType('Deposit'); setTrxStudentId(studentId || ''); setTrxAmount(''); setTrxNotes(''); setTrxClassFilter(''); setShowTrxModal(true); };
    const openWithdrawalModal = (studentId: string) => { setTrxType('Withdrawal'); setTrxStudentId(studentId); setTrxAmount(''); setTrxNotes(''); setShowTrxModal(true); };

    const handleTransactionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trxStudentId) return;
        setSubmitting(true);
        try {
            await api.post('/finance/savings/transactions', { student_id: trxStudentId, type: trxType, amount: parseFloat(trxAmount), notes: trxNotes });
            setShowTrxModal(false); fetchAccounts(); fetchPoolSummary();
            toast.success(trxType === 'Deposit' ? 'Setoran berhasil' : 'Penarikan berhasil');
        } catch (error: any) { }
        finally { setSubmitting(false); }
    };

    // Operational Withdrawal
    const handleOpWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/operational/withdraw', { 
                amount: parseFloat(opWithdrawAmount), 
                purpose: opWithdrawPurpose,
                unit_id: unitID
            });
            setShowWithdrawOpModal(false); setOpWithdrawAmount(''); setOpWithdrawPurpose('');
            fetchPoolSummary(); fetchOpHistory();
            toast.success('Dana operasional berhasil diambil');
        } catch (error: any) { }
        finally { setSubmitting(false); }
    };

    // Return
    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/operational/return', { 
                withdrawal_id: returnWithdrawalId, 
                amount: parseFloat(returnAmount), 
                notes: returnNotes,
                source: returnSource,
                unit_id: unitID
            });
            setShowReturnModal(false); setReturnWithdrawalId(''); setReturnAmount(''); setReturnNotes('');
            fetchPoolSummary(); fetchOpHistory();
            toast.success('Dana berhasil dikembalikan');
        } catch (error: any) { }
        finally { setSubmitting(false); }
    };

    // History
    const openHistory = async (account: SavingAccount) => {
        setHistoryAccount(account); setShowHistoryModal(true); setLoadingHistory(true);
        try { const res = await api.get(`/finance/savings/transactions/${account.id}`); setTransactions(res.data || []); }
        catch (error) { console.error("Failed to fetch transactions", error); }
        finally { setLoadingHistory(false); }
    };

    const handleExportPDF = async () => {
        if (!historyAccount) return;
        await generateSavingsReport(
            historyAccount.student?.user?.name || '',
            historyAccount.student?.class?.name || '',
            transactions,
            historyAccount.balance
        );
    };

    const outstandingWithdrawals = opHistory.filter(w => w.status !== 'Returned');

    if (!canManage) {
        return (<div className="flex items-center justify-center h-96"><div className="text-center"><Wallet size={48} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 text-lg">Halaman ini hanya untuk petugas tabungan.</p></div></div>);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                            <Wallet size={32} />
                        </div>
                        Kelola Tabungan
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base font-medium">Input setoran, tarik dana, dan kelola dana operasional sekolah.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {[1, 9, 10].includes(user?.role_id || 0) && (
                        <div className="p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl flex shadow-inner border border-slate-200 w-full sm:w-auto">
                            <button 
                                onClick={() => { setUnitID(1); setClassFilter(''); }} 
                                className={clsx(
                                    "px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 flex-1 sm:flex-none justify-center flex items-center", 
                                    unitID === 1 ? "bg-white text-emerald-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                )}
                            >
                                MTS
                            </button>
                            <button 
                                onClick={() => { setUnitID(2); setClassFilter(''); }} 
                                className={clsx(
                                    "px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 flex-1 sm:flex-none justify-center flex items-center", 
                                    unitID === 2 ? "bg-white text-emerald-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                )}
                            >
                                MA
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => openDepositModal()} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all hover:-translate-y-0.5 font-bold group"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Setor</span>
                        </button>
                        <button 
                            onClick={() => { setShowWithdrawOpModal(true); setOpWithdrawAmount(''); setOpWithdrawPurpose(''); }} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-amber-600 border-2 border-amber-100 px-5 py-3 rounded-2xl hover:bg-amber-50 shadow-sm transition-all hover:-translate-y-0.5 font-bold"
                        >
                            <TrendingDown size={20} />
                            <span>Ambil Operasional</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div className="relative group overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-200">
                    <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 rotate-12">
                        <Wallet size={160} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="space-y-1">
                            <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest">Total Saldo Pool</p>
                            <h2 className="text-3xl font-black mt-1 tracking-tight">
                                {formatCurrency(poolSummary?.total_balance || totalBalance)}
                            </h2>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-emerald-100/80">
                            <Users size={16} />
                            <p className="text-xs font-bold">{totalAccounts} Akun Terdaftar</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Dana Operasional</p>
                            <h2 className="text-2xl font-black text-red-600 tracking-tight group-hover:scale-105 transition-transform origin-left">
                                {formatCurrency(poolSummary?.outstanding_debt || 0)}
                            </h2>
                        </div>
                        <div className="p-3 bg-red-50 text-red-500 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">
                        Status: Belum Kembali
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo Tersedia</p>
                            <h2 className="text-2xl font-black text-emerald-600 tracking-tight group-hover:scale-105 transition-transform origin-left">
                                {formatCurrency(poolSummary?.available_balance || 0)}
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                            <ShieldCheck size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">
                        Status: Aman
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Kembali</p>
                            <h2 className="text-2xl font-black text-blue-600 tracking-tight group-hover:scale-105 transition-transform origin-left">
                                {formatCurrency(poolSummary?.total_returned || 0)}
                            </h2>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                            <RotateCcw size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">
                        Riwayat Lunas
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aktivasi Akun</p>
                            <h2 className="text-2xl font-black text-amber-600 tracking-tight group-hover:scale-105 transition-transform origin-left">
                                {studentsWithoutAccount.length}
                            </h2>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                            <Users size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">
                        Siswa Belum Menabung
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-slate-100/50 backdrop-blur rounded-[1.5rem] border border-slate-200/60 w-fit">
                <button 
                    onClick={() => setActiveTab('accounts')} 
                    className={clsx(
                        'px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all duration-300', 
                        activeTab === 'accounts' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                    )}
                >
                    <Users size={18} /> Rekening Siswa
                </button>
                <button 
                    onClick={() => setActiveTab('operational')} 
                    className={clsx(
                        'px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all duration-300', 
                        activeTab === 'operational' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                    )}
                >
                    <ArrowRightLeft size={18} /> Operasional
                </button>
                <button 
                    onClick={() => setActiveTab('recap')} 
                    className={clsx(
                        'px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all duration-300', 
                        activeTab === 'recap' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                    )}
                >
                    <BarChart3 size={18} /> Rekap
                </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {activeTab === 'accounts' && (
                    <div className="space-y-4">
                        {/* Filters Container */}
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                            <div className="relative group flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Cari nama, NISN, atau kelas..." 
                                    className="w-full pl-12 pr-4 py-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 bg-white shadow-sm transition-all font-medium text-slate-900" 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                />
                            </div>

                            <div className="flex gap-2">
                                <div className="relative">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    <select 
                                        value={classFilter} 
                                        onChange={e => setClassFilter(e.target.value)} 
                                        className="appearance-none pl-12 pr-10 py-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500/30 bg-white shadow-sm transition-all font-bold text-slate-700 cursor-pointer hover:bg-slate-50 min-w-[180px]"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {classList.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ArrowDownRight size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List / Table Wrapper */}
                        <div className="space-y-6">
                            {loading ? (
                                <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-20 flex flex-col items-center gap-4 border border-white/60 shadow-xl shadow-slate-200/50">
                                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Memuat Data...</p>
                                </div>
                            ) : Object.keys(groupedAccounts).length === 0 ? (
                                <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-20 text-center text-slate-400 border border-white/60 shadow-xl shadow-slate-200/50">
                                    <Wallet size={64} className="mx-auto opacity-20 mb-4" />
                                    <p className="text-xl font-black opacity-40 uppercase tracking-widest">Kosong</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-end gap-2 px-2">
                                        <button onClick={expandAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">Buka Semua</button>
                                        <button onClick={collapseAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors">Tutup Semua</button>
                                    </div>
                                    {Object.entries(groupedAccounts).map(([className, data]) => {
                                        const isExpanded = expandedClasses.has(className);
                                        return (
                                            <div key={className} className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300">
                                                {/* Header / Dropdown Trigger */}
                                                <button 
                                                    onClick={() => toggleClass(className)}
                                                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/40 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={clsx(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                            isExpanded ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            <Users size={24} />
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-900 transition-colors">{className}</h3>
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                                {data.accounts.length} Siswa • Total {formatCurrency(data.totalBalance)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                                        isExpanded ? "bg-emerald-50 border-emerald-100 text-emerald-600 rotate-180" : "bg-slate-50 border-slate-100 text-slate-400"
                                                    )}>
                                                        <ArrowDownRight size={20} />
                                                    </div>
                                                </button>

                                                {/* Content */}
                                                {isExpanded && (
                                                    <div className="border-t border-slate-100/50 animate-in slide-in-from-top-4 duration-300">
                                                        {/* Desktop Table */}
                                                        <div className="hidden md:block overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="bg-slate-50/50">
                                                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Siswa</th>
                                                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">NISN</th>
                                                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Saldo</th>
                                                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Tindakan</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50/50">
                                                                    {data.accounts.map(account => (
                                                                        <tr key={account.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                                                                            <td className="px-8 py-5">
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-black shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                                                        {account.student?.user?.name?.charAt(0)}
                                                                                    </div>
                                                                                    <p className="font-extrabold text-slate-900 group-hover:text-emerald-900 transition-colors text-sm">{account.student?.user?.name}</p>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-8 py-5 text-slate-500 font-mono text-xs">{account.student?.nisn}</td>
                                                                            <td className="px-8 py-5 text-right">
                                                                                <p className={clsx("text-base font-black tracking-tight", account.balance > 0 ? "text-emerald-600" : "text-slate-300")}>
                                                                                    {formatCurrency(account.balance)}
                                                                                </p>
                                                                            </td>
                                                                            <td className="px-8 py-5">
                                                                                <div className="flex items-center justify-center gap-2">
                                                                                    <button onClick={() => openDepositModal(account.student_id)} className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"><ArrowUpRight size={14} /></button>
                                                                                    <button onClick={() => openWithdrawalModal(account.student_id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><ArrowDownRight size={14} /></button>
                                                                                    <button onClick={() => openHistory(account)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><History size={14} /></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Mobile Cards */}
                                                        <div className="md:hidden divide-y divide-slate-100/50">
                                                            {data.accounts.map(account => (
                                                                <div key={account.id} className="p-6 space-y-4 hover:bg-slate-50/30 transition-colors">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="space-y-0.5">
                                                                            <p className="font-black text-slate-900 text-sm leading-tight">{account.student?.user?.name}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{account.student?.nisn}</p>
                                                                        </div>
                                                                        <p className={clsx("text-base font-black tracking-tight", account.balance > 0 ? "text-emerald-600" : "text-slate-300")}>
                                                                            {formatCurrency(account.balance)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        <button onClick={() => openDepositModal(account.student_id)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-[9px] uppercase"><ArrowUpRight size={14} /> Setor</button>
                                                                        <button onClick={() => openWithdrawalModal(account.student_id)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-red-50 text-red-600 font-bold text-[9px] uppercase"><ArrowDownRight size={14} /> Tarik</button>
                                                                        <button onClick={() => openHistory(account)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] uppercase"><History size={14} /> Histori</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Operational History */}
                {activeTab === 'operational' && (
                    <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Riwayat Operasional</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Dana pool tabungan untuk operasional sekolah</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { fetchOpHistory(); setShowReturnModal(true); setReturnWithdrawalId(''); setReturnAmount(''); setReturnNotes(''); }} 
                                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-bold text-sm"
                                >
                                    <RotateCcw size={18} /> Pengembalian Dana
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Tanggal</th>
                                        <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Tujuan</th>
                                        <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Diambil</th>
                                        <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Kembali</th>
                                        <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Sisa</th>
                                        <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loadingOpHistory ? (
                                        <tr><td colSpan={6} className="py-20 text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                                    ) : opHistory.length === 0 ? (
                                        <tr><td colSpan={6} className="py-20 text-center text-slate-400"><div className="flex flex-col items-center gap-4"><ShieldCheck size={64} className="opacity-20" /><p className="text-xl font-black opacity-40 uppercase tracking-widest">Tidak Ada Utang</p></div></td></tr>
                                    ) : opHistory.map(w => {
                                        const remaining = w.amount - w.returned_amount;
                                        return (
                                            <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6 text-slate-500 font-bold text-sm whitespace-nowrap">{formatDate(w.created_at)}</td>
                                                <td className="px-8 py-6">
                                                    <p className="font-extrabold text-slate-800">{w.purpose}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">PIC: {w.handled_by?.name}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-red-600">{formatCurrency(w.amount)}</td>
                                                <td className="px-8 py-6 text-right font-black text-blue-600">{formatCurrency(w.returned_amount)}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className={clsx("font-black tracking-tight text-lg", remaining > 0 ? "text-amber-600" : "text-slate-200")}>
                                                        {remaining > 0 ? formatCurrency(remaining) : 'LUNAS'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={clsx("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full",
                                                        w.status === 'Returned' ? 'bg-emerald-50 text-emerald-700' :
                                                        w.status === 'PartialReturn' ? 'bg-amber-50 text-amber-700' :
                                                        'bg-red-50 text-red-700'
                                                    )}>
                                                        {w.status === 'Returned' ? 'Lunas' : w.status === 'PartialReturn' ? 'Parsial' : 'Belum'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: Rekap Tabungan */}
                {activeTab === 'recap' && (
                    <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 p-6 overflow-hidden">
                        <SavingsRecap classList={classList} unitID={unitID} />
                    </div>
                )}
            </div>

            {/* Transaction Modal */}
            {showTrxModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto border border-white/20">
                        <div className={clsx(
                            "p-8 border-b border-white/10 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10",
                            trxType === 'Deposit' ? "bg-emerald-50/30" : "bg-red-50/30"
                        )}>
                            <h2 className="text-2xl font-black flex items-center text-slate-800 tracking-tight">
                                {trxType === 'Deposit' ? <><div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl mr-3"><ArrowUpRight size={24} /></div> Setor Dana</> : <><div className="p-2 bg-red-100 text-red-600 rounded-xl mr-3"><ArrowDownRight size={24} /></div> Tarik Dana</>}
                            </h2>
                            <button onClick={() => setShowTrxModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"><X size={24} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleTransactionSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jenis Transaksi</label>
                                    <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
                                        <button type="button" onClick={() => setTrxType('Deposit')} className={clsx("flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2", trxType === 'Deposit' ? "bg-white text-emerald-600 shadow-sm scale-[1.02]" : "text-slate-500")}>Setoran</button>
                                        <button type="button" onClick={() => setTrxType('Withdrawal')} className={clsx("flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2", trxType === 'Withdrawal' ? "bg-white text-red-600 shadow-sm scale-[1.02]" : "text-slate-500")}>Penarikan</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Filter Kelas</label>
                                        <select value={trxClassFilter} onChange={e => { setTrxClassFilter(e.target.value); setTrxStudentId(''); }} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-bold text-slate-700 appearance-none">
                                            <option value="">Semua Kelas</option>
                                            {classList.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Siswa</label>
                                        <select required value={trxStudentId} onChange={e => setTrxStudentId(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-bold text-slate-700 appearance-none">
                                            <option value="">-- Nama Siswa --</option>
                                            {filteredStudents.map(s => (<option key={s.id} value={s.id}>{s.user?.name} ({s.class?.name || '-'})</option>))}
                                        </select>
                                    </div>
                                </div>
                                {trxStudentId && (() => { 
                                    const acc = accounts.find(a => a.student_id === trxStudentId); 
                                    return (
                                        <div className={clsx("p-4 rounded-2xl border flex items-center justify-between", acc ? "bg-emerald-50/50 border-emerald-100" : "bg-blue-50/50 border-blue-100")}>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-60">Status Saldo:</p>
                                            <p className="font-black tracking-tight text-xl">{acc ? formatCurrency(acc.balance) : 'AKUN BARU'}</p>
                                        </div>
                                    );
                                })()}
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal (Rp)</label>
                                    <div className="relative group">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">Rp</div>
                                        <input type="number" required min="1000" className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" value={trxAmount} onChange={e => setTrxAmount(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Keterangan</label>
                                    <textarea rows={2} placeholder="Misal: Tabungan mingguan" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-medium text-slate-700" value={trxNotes} onChange={e => setTrxNotes(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowTrxModal(false)} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={submitting} className={clsx("flex-[2] px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 active:scale-95", trxType === 'Deposit' ? "bg-emerald-600 shadow-emerald-200" : "bg-red-600 shadow-red-200", submitting && "opacity-50 pointer-events-none")}>
                                    {submitting ? 'Memproses...' : trxType === 'Deposit' ? 'Proses Setoran' : 'Proses Tarikan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Operational Withdrawal Modal */}
            {showWithdrawOpModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                        <div className="p-8 border-b border-amber-100/50 flex justify-between items-center bg-amber-50/50 backdrop-blur-md">
                            <h2 className="text-2xl font-black flex items-center text-amber-800 tracking-tight">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mr-3"><TrendingDown size={24} /></div>
                                Ambil Operasional
                            </h2>
                            <button onClick={() => setShowWithdrawOpModal(false)} className="w-10 h-10 rounded-full hover:bg-amber-100 flex items-center justify-center transition-colors"><X size={24} className="text-amber-400" /></button>
                        </div>
                        <form onSubmit={handleOpWithdrawSubmit} className="p-8 space-y-6">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-amber-100">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Dana Tersedia (Pool):</p>
                                <p className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(poolSummary?.available_balance || 0)}</p>
                                <p className="text-[10px] mt-3 opacity-70 font-medium leading-relaxed italic">Catatan: Dana ini dipinjam dari pool tabungan dan harus dikembalikan.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tujuan Pengambilan <span className="text-red-500">*</span></label>
                                <input type="text" required placeholder="Cth: Pembelian inventaris kelas" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-amber-500/30 bg-slate-50/50 font-medium text-slate-700" value={opWithdrawPurpose} onChange={e => setOpWithdrawPurpose(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal (Rp) <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-amber-500 transition-colors">Rp</div>
                                    <input type="number" required min="1000" className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-amber-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" value={opWithdrawAmount} onChange={e => setOpWithdrawAmount(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowWithdrawOpModal(false)} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={submitting} className="flex-[2] px-6 py-4 rounded-2xl bg-amber-600 text-white font-black uppercase tracking-widest shadow-xl shadow-amber-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                                    {submitting ? 'Memproses...' : 'Ambil Dana'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto border border-white/20">
                        <div className="p-8 border-b border-blue-100/50 flex justify-between items-center bg-blue-50/50 backdrop-blur-md sticky top-0 z-10">
                            <h2 className="text-2xl font-black flex items-center text-blue-800 tracking-tight">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mr-3"><RotateCcw size={24} /></div>
                                Pengembalian Dana
                            </h2>
                            <button onClick={() => setShowReturnModal(false)} className="w-10 h-10 rounded-full hover:bg-blue-100 flex items-center justify-center transition-colors"><X size={24} className="text-blue-400" /></button>
                        </div>
                        <form onSubmit={handleReturnSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Item Pengambilan <span className="text-red-500">*</span></label>
                                <select required value={returnWithdrawalId} onChange={e => {
                                    setReturnWithdrawalId(e.target.value);
                                    const w = outstandingWithdrawals.find(w => w.id === e.target.value);
                                    if (w) setReturnAmount(String(w.amount - w.returned_amount));
                                }} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-bold text-slate-700 cursor-pointer appearance-none">
                                    <option value="">-- Pilih Data --</option>
                                    {outstandingWithdrawals.map(w => (
                                        <option key={w.id} value={w.id}>{formatDate(w.created_at)} — {w.purpose} (Rp {w.amount - w.returned_amount})</option>
                                    ))}
                                </select>
                                {outstandingWithdrawals.length === 0 && <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1"><ShieldCheck size={14} /> Tidak ada utang operasional aktif.</p>}
                            </div>
                            
                            {returnWithdrawalId && (() => {
                                const w = outstandingWithdrawals.find(w => w.id === returnWithdrawalId);
                                if (!w) return null;
                                return (
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] p-6 text-white shadow-lg shadow-blue-100 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Sisa Utang:</p>
                                            <p className="text-2xl font-black tracking-tight">{formatCurrency(w.amount - w.returned_amount)}</p>
                                        </div>
                                        <div className="h-px bg-white/20 w-full" />
                                        <p className="text-xs font-medium italic opacity-80 leading-relaxed">"{w.purpose}"</p>
                                    </div>
                                );
                            })()}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal Pengembalian <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-blue-500 transition-colors">Rp</div>
                                    <input type="number" required min="1000" className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" value={returnAmount} onChange={e => setReturnAmount(e.target.value)} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Tambahan</label>
                                <textarea rows={2} placeholder="Cth: Diambil dari sisa dana kegiatan" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-medium text-slate-700" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sumber Dana Pengembalian <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReturnSource('CashLedger')}
                                        className={clsx(
                                            "px-4 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                            returnSource === 'CashLedger' 
                                                ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10" 
                                                : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <Wallet size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Kas Umum</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReturnSource('Infaq')}
                                        className={clsx(
                                            "px-4 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                            returnSource === 'Infaq' 
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10" 
                                                : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <TrendingDown size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Infaq</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={submitting || !returnWithdrawalId} className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                                    {submitting ? 'Memproses...' : 'Kembalikan Dana'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transaction History Modal */}
            {showHistoryModal && historyAccount && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col border border-white/20">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-slate-50/50 backdrop-blur-md shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mr-3"><Eye size={24} /></div>
                                    Riwayat Tabungan
                                </h2>
                                <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                                    {historyAccount.student?.user?.name} • <span className="text-emerald-600">{formatCurrency(historyAccount.balance)}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {transactions.length > 0 && (
                                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-red-600 text-white rounded-2xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all hover:-translate-y-0.5"><Download size={16} /> Print</button>
                                )}
                                <button onClick={() => setShowHistoryModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"><X size={24} className="text-slate-400" /></button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-8 bg-slate-50/30">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Menarik Data...</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-20 opacity-20"><History size={80} className="mx-auto text-slate-400 mb-4" /><p className="text-xl font-black uppercase tracking-[0.2em]">Belum Ada History</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map(txn => {
                                        const isDeposit = txn.type === 'Deposit' || txn.type === 'deposit';
                                        return (
                                            <div key={txn.id} className={clsx(
                                                "flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-md", 
                                                isDeposit ? "bg-white border-emerald-100 hover:border-emerald-300" : "bg-white border-red-100 hover:border-red-300"
                                            )}>
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", isDeposit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                                        {isDeposit ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 text-sm tracking-tight">{isDeposit ? 'Setoran Masuk' : 'Penarikan Dana'}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(txn.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                            {txn.handled_by && <p className="text-[10px] text-slate-300 font-bold">• {txn.handled_by.name}</p>}
                                                        </div>
                                                        {txn.notes && <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-50 px-3 py-1 rounded-lg inline-block">{txn.notes}</p>}
                                                    </div>
                                                </div>
                                                <span className={clsx("font-black text-xl tracking-tight whitespace-nowrap", isDeposit ? "text-emerald-600" : "text-red-600")}>
                                                    {isDeposit ? '+' : '-'}{formatCurrency(txn.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Savings;
