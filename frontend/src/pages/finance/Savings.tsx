import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ArrowUpRight, ArrowDownRight, Users, Search, Plus, Eye, X, History, Download, ArrowRightLeft, RotateCcw, TrendingDown, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { generateSavingsReport } from '../../utils/pdfUtils';
import toast from 'react-hot-toast';

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
    const [activeTab, setActiveTab] = useState<'accounts' | 'operational'>('accounts');

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

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyAccount, setHistoryAccount] = useState<SavingAccount | null>(null);
    const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try { const res = await api.get('/finance/savings'); setAccounts(res.data || []); }
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

    useEffect(() => {
        if (canManage) { fetchAccounts(); fetchStudents(); fetchClasses(); fetchPoolSummary(); }
    }, [canManage, fetchAccounts, fetchStudents, fetchClasses, fetchPoolSummary, unitID]);

    useEffect(() => {
        if (activeTab === 'operational' && canManage) fetchOpHistory();
    }, [activeTab, canManage, fetchOpHistory]);

    const unitAccounts = accounts.filter(acc => students.some(s => s.id === acc.student_id));
    const totalBalance = unitAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAccounts = unitAccounts.length;
    const studentsWithoutAccount = students.filter(s => !unitAccounts.find(a => a.student_id === s.id));

    const filtered = unitAccounts.filter(acc => {
        if (classFilter && acc.student?.class?.id?.toString() !== classFilter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return acc.student?.user?.name?.toLowerCase().includes(q) || acc.student?.nisn?.toLowerCase().includes(q) || acc.student?.class?.name?.toLowerCase().includes(q);
    });

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
        } catch (error: any) { toast.error(error.response?.data?.error || "Gagal memproses transaksi"); }
        finally { setSubmitting(false); }
    };

    // Operational Withdrawal
    const handleOpWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/operational/withdraw', { amount: parseFloat(opWithdrawAmount), purpose: opWithdrawPurpose });
            setShowWithdrawOpModal(false); setOpWithdrawAmount(''); setOpWithdrawPurpose('');
            fetchPoolSummary(); fetchOpHistory();
            toast.success('Dana operasional berhasil diambil');
        } catch (error: any) { toast.error(error.response?.data?.error || "Dana tidak mencukupi"); }
        finally { setSubmitting(false); }
    };

    // Return
    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/operational/return', { withdrawal_id: returnWithdrawalId, amount: parseFloat(returnAmount), notes: returnNotes });
            setShowReturnModal(false); setReturnWithdrawalId(''); setReturnAmount(''); setReturnNotes('');
            fetchPoolSummary(); fetchOpHistory();
            toast.success('Dana berhasil dikembalikan');
        } catch (error: any) { toast.error(error.response?.data?.error || "Gagal mengembalikan dana"); }
        finally { setSubmitting(false); }
    };

    // History
    const openHistory = async (account: SavingAccount) => {
        setHistoryAccount(account); setShowHistoryModal(true); setLoadingHistory(true);
        try { const res = await api.get(`/finance/savings/transactions/${account.id}`); setTransactions(res.data || []); }
        catch (error) { console.error("Failed to fetch transactions", error); }
        finally { setLoadingHistory(false); }
    };

    const handleExportPDF = () => { if (!historyAccount) return; generateSavingsReport(historyAccount, transactions); };

    const outstandingWithdrawals = opHistory.filter(w => w.status !== 'Returned');

    if (!canManage) {
        return (<div className="flex items-center justify-center h-96"><div className="text-center"><Wallet size={48} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 text-lg">Halaman ini hanya untuk petugas tabungan.</p></div></div>);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Kelola Tabungan Siswa</h1>
                    <p className="text-slate-500 mt-1 text-sm">Input setoran, tarik dana, dan kelola dana operasional sekolah.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {[1, 9, 10].includes(user?.role_id || 0) && (
                        <div className="p-1 bg-slate-100 rounded-lg flex shadow-sm border border-slate-200">
                            <button onClick={() => { setUnitID(1); setClassFilter(''); }} className={clsx("px-3 py-1.5 text-sm font-medium rounded-md transition-all", unitID === 1 ? "bg-white text-emerald-700 shadow" : "text-slate-500 hover:text-slate-700")}>MTS</button>
                            <button onClick={() => { setUnitID(2); setClassFilter(''); }} className={clsx("px-3 py-1.5 text-sm font-medium rounded-md transition-all", unitID === 2 ? "bg-white text-emerald-700 shadow" : "text-slate-500 hover:text-slate-700")}>MA</button>
                        </div>
                    )}
                    <button onClick={() => { setShowWithdrawOpModal(true); setOpWithdrawAmount(''); setOpWithdrawPurpose(''); }} className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-2 rounded-xl hover:bg-amber-700 shadow-sm transition text-sm font-medium">
                        <TrendingDown size={16} /> Ambil Dana Operasional
                    </button>
                    <button onClick={() => { setShowReturnModal(true); setReturnWithdrawalId(''); setReturnAmount(''); setReturnNotes(''); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition text-sm font-medium">
                        <RotateCcw size={16} /> Pengembalian Dana
                    </button>
                    <button onClick={() => openDepositModal()} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl hover:bg-emerald-700 shadow-sm transition text-sm font-medium">
                        <Plus size={16} /> Setor Tabungan
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Wallet size={80} /></div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-xs uppercase tracking-wide">Total Saldo Pool</p>
                        <h2 className="text-2xl font-bold mt-1">{formatCurrency(poolSummary?.total_balance || totalBalance)}</h2>
                        <p className="text-emerald-200 text-xs mt-2">{totalAccounts} akun terdaftar</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
                    <p className="text-red-500 text-xs font-semibold uppercase tracking-wider">Dana Diambil</p>
                    <h2 className="text-xl font-bold text-red-600 mt-1">{formatCurrency(poolSummary?.outstanding_debt || 0)}</h2>
                    <p className="text-xs text-slate-400 mt-1">Utang operasional</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
                    <p className="text-emerald-500 text-xs font-semibold uppercase tracking-wider">Dana Sisa</p>
                    <h2 className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(poolSummary?.available_balance || 0)}</h2>
                    <p className="text-xs text-slate-400 mt-1">Sisa setelah diambil</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Dikembalikan</p>
                    <h2 className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(poolSummary?.total_returned || 0)}</h2>
                    <p className="text-xs text-slate-400 mt-1">Dana yang sudah kembali</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Belum Punya Akun</p>
                    <h2 className="text-xl font-bold text-amber-600 mt-1">{studentsWithoutAccount.length}</h2>
                    <p className="text-xs text-slate-400 mt-1">Siswa belum menabung</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                <button onClick={() => setActiveTab('accounts')} className={clsx('px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors', activeTab === 'accounts' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                    <Users size={16} /> Rekening Siswa
                </button>
                <button onClick={() => setActiveTab('operational')} className={clsx('px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors', activeTab === 'operational' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                    <ArrowRightLeft size={16} /> Riwayat Operasional
                </button>
            </div>

            {/* Tab: Accounts */}
            {activeTab === 'accounts' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50">
                        <h2 className="text-base font-bold text-slate-800">Daftar Rekening Tabungan</h2>
                        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-initial sm:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="Cari nama, NISN..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                <option value="">Semua Kelas</option>
                                {classList.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                                    <th className="p-4 font-medium">Nama Siswa</th>
                                    <th className="p-4 font-medium hidden sm:table-cell">NISN</th>
                                    <th className="p-4 font-medium">Kelas</th>
                                    <th className="p-4 font-medium text-right">Saldo</th>
                                    <th className="p-4 font-medium text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-slate-500"><Wallet size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-base font-medium text-slate-700">Belum ada data tabungan</p></td></tr>
                                ) : filtered.map(account => (
                                    <tr key={account.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4">
                                            <p className="font-semibold text-slate-800">{account.student?.user?.name}</p>
                                            <p className="text-xs text-slate-500 sm:hidden">{account.student?.nisn}</p>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono hidden sm:table-cell">{account.student?.nisn}</td>
                                        <td className="p-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">{account.student?.class?.name || '-'}</span></td>
                                        <td className="p-4 text-right"><span className={clsx("text-base font-bold", account.balance > 0 ? "text-emerald-600" : "text-slate-400")}>{formatCurrency(account.balance)}</span></td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                                <button onClick={() => openDepositModal(account.student_id)} className="px-2 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1" title="Setor"><ArrowUpRight size={14} /><span className="hidden sm:inline">Setor</span></button>
                                                <button onClick={() => openWithdrawalModal(account.student_id)} className="px-2 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition flex items-center gap-1" title="Tarik"><ArrowDownRight size={14} /><span className="hidden sm:inline">Tarik</span></button>
                                                <button onClick={() => openHistory(account)} className="px-2 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-1" title="Riwayat"><History size={14} /><span className="hidden sm:inline">Riwayat</span></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Operational History */}
            {activeTab === 'operational' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-base font-bold text-slate-800">Riwayat Pengambilan & Pengembalian Dana Operasional</h2>
                        <p className="text-xs text-slate-500 mt-1">Dana yang diambil dari pool tabungan untuk keperluan operasional sekolah.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                                    <th className="p-4 font-medium">Tanggal</th>
                                    <th className="p-4 font-medium">Tujuan</th>
                                    <th className="p-4 font-medium text-right">Diambil</th>
                                    <th className="p-4 font-medium text-right">Dikembalikan</th>
                                    <th className="p-4 font-medium text-right">Sisa Utang</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 font-medium">PIC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingOpHistory ? (
                                    <tr><td colSpan={7} className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></td></tr>
                                ) : opHistory.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-400"><ShieldCheck size={40} className="mx-auto text-slate-300 mb-3" /><p className="font-medium text-slate-600">Belum ada pengambilan dana operasional</p></td></tr>
                                ) : opHistory.map(w => {
                                    const remaining = w.amount - w.returned_amount;
                                    return (
                                        <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 text-slate-600 whitespace-nowrap">{formatDate(w.created_at)}</td>
                                            <td className="p-4 font-medium text-slate-900">{w.purpose}</td>
                                            <td className="p-4 text-right font-semibold text-red-600">{formatCurrency(w.amount)}</td>
                                            <td className="p-4 text-right font-medium text-blue-600">{formatCurrency(w.returned_amount)}</td>
                                            <td className="p-4 text-right font-bold text-amber-600">{remaining > 0 ? formatCurrency(remaining) : '-'}</td>
                                            <td className="p-4 text-center">
                                                <span className={clsx("px-2 py-0.5 text-xs font-semibold rounded-full",
                                                    w.status === 'Returned' ? 'bg-green-100 text-green-700' :
                                                    w.status === 'PartialReturn' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                )}>
                                                    {w.status === 'Returned' ? 'Lunas' : w.status === 'PartialReturn' ? 'Sebagian' : 'Belum'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-500">{w.handled_by?.name}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {showTrxModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                            <h2 className="text-lg font-bold flex items-center text-slate-800">
                                {trxType === 'Deposit' ? <><ArrowUpRight className="text-emerald-500 mr-2" size={22} /> Setor Tabungan</> : <><ArrowDownRight className="text-red-500 mr-2" size={22} /> Tarik Tabungan</>}
                            </h2>
                            <button onClick={() => setShowTrxModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleTransactionSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Transaksi</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button type="button" onClick={() => setTrxType('Deposit')} className={clsx("flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1", trxType === 'Deposit' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}><ArrowUpRight size={14} />Setor</button>
                                    <button type="button" onClick={() => setTrxType('Withdrawal')} className={clsx("flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1", trxType === 'Withdrawal' ? "bg-white text-red-600 shadow-sm" : "text-slate-500")}><ArrowDownRight size={14} />Tarik</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                                <select value={trxClassFilter} onChange={e => { setTrxClassFilter(e.target.value); setTrxStudentId(''); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                                    <option value="">Semua Kelas</option>
                                    {classList.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                                <select required value={trxStudentId} onChange={e => setTrxStudentId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                                    <option value="">-- Pilih Siswa --</option>
                                    {filteredStudents.map(s => (<option key={s.id} value={s.id}>{s.nisn} — {s.user?.name} ({s.class?.name || '-'})</option>))}
                                </select>
                                {trxStudentId && (() => { const acc = accounts.find(a => a.student_id === trxStudentId); return acc ? <p className="text-xs text-slate-500 mt-1">Saldo: <span className="font-semibold text-emerald-600">{formatCurrency(acc.balance)}</span></p> : <p className="text-xs text-amber-600 mt-1">Akun akan otomatis dibuat saat setor pertama.</p>; })()}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                <input type="number" required min="1000" placeholder="50000" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-medium text-sm" value={trxAmount} onChange={e => setTrxAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (Opsional)</label>
                                <input type="text" placeholder="Setoran bulanan" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" value={trxNotes} onChange={e => setTrxNotes(e.target.value)} />
                            </div>
                            <div className="pt-3 flex gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowTrxModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium">Batal</button>
                                <button type="submit" disabled={submitting} className={clsx("flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition", trxType === 'Deposit' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700", submitting && "opacity-50")}>{submitting ? 'Memproses...' : trxType === 'Deposit' ? 'Setor Dana' : 'Tarik Dana'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Operational Withdrawal Modal */}
            {showWithdrawOpModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-amber-100 flex justify-between items-center bg-amber-50">
                            <h2 className="text-lg font-bold flex items-center text-amber-800"><TrendingDown className="mr-2" size={22} /> Ambil Dana Operasional</h2>
                            <button onClick={() => setShowWithdrawOpModal(false)} className="text-amber-400 hover:text-amber-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleOpWithdrawSubmit} className="p-5 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <p className="text-xs text-amber-700 font-medium">Dana tersedia dari pool tabungan:</p>
                                <p className="text-lg font-bold text-amber-800 mt-0.5">{formatCurrency(poolSummary?.available_balance || 0)}</p>
                                <p className="text-xs text-amber-600 mt-1">Dana ini diambil dari pool tabungan tanpa mengurangi saldo per-siswa. Dicatat sebagai utang operasional yang harus dikembalikan.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tujuan Pengambilan <span className="text-red-500">*</span></label>
                                <input type="text" required placeholder="Cth: Biaya operasional sekolah bulan April" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" value={opWithdrawPurpose} onChange={e => setOpWithdrawPurpose(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp) <span className="text-red-500">*</span></label>
                                <input type="number" required min="1000" placeholder="500000" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-lg" value={opWithdrawAmount} onChange={e => setOpWithdrawAmount(e.target.value)} />
                            </div>
                            <div className="pt-3 flex gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowWithdrawOpModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium">Batal</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition">{submitting ? 'Memproses...' : 'Ambil Dana'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-blue-100 flex justify-between items-center bg-blue-50 sticky top-0">
                            <h2 className="text-lg font-bold flex items-center text-blue-800"><RotateCcw className="mr-2" size={22} /> Pengembalian Dana</h2>
                            <button onClick={() => setShowReturnModal(false)} className="text-blue-400 hover:text-blue-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleReturnSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Pengambilan yang Dikembalikan <span className="text-red-500">*</span></label>
                                <select required value={returnWithdrawalId} onChange={e => {
                                    setReturnWithdrawalId(e.target.value);
                                    const w = outstandingWithdrawals.find(w => w.id === e.target.value);
                                    if (w) setReturnAmount(String(w.amount - w.returned_amount));
                                }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                                    <option value="">-- Pilih Pengambilan --</option>
                                    {outstandingWithdrawals.map(w => (
                                        <option key={w.id} value={w.id}>{formatDate(w.created_at)} — {w.purpose} (Sisa: {formatCurrency(w.amount - w.returned_amount)})</option>
                                    ))}
                                </select>
                                {outstandingWithdrawals.length === 0 && <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><ShieldCheck size={14} /> Tidak ada utang operasional yang belum dikembalikan.</p>}
                            </div>
                            {returnWithdrawalId && (() => {
                                const w = outstandingWithdrawals.find(w => w.id === returnWithdrawalId);
                                if (!w) return null;
                                return (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
                                        <p className="text-xs text-blue-700"><strong>Tujuan:</strong> {w.purpose}</p>
                                        <p className="text-xs text-blue-700"><strong>Total diambil:</strong> {formatCurrency(w.amount)}</p>
                                        <p className="text-xs text-blue-700"><strong>Sudah dikembalikan:</strong> {formatCurrency(w.returned_amount)}</p>
                                        <p className="text-xs text-blue-800 font-semibold"><strong>Sisa utang:</strong> {formatCurrency(w.amount - w.returned_amount)}</p>
                                    </div>
                                );
                            })()}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Dikembalikan (Rp) <span className="text-red-500">*</span></label>
                                <input type="number" required min="1000" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-lg" value={returnAmount} onChange={e => setReturnAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (Opsional)</label>
                                <input type="text" placeholder="Cth: Pengembalian dari anggaran" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
                            </div>
                            <div className="pt-3 flex gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium">Batal</button>
                                <button type="submit" disabled={submitting || !returnWithdrawalId} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition">{submitting ? 'Memproses...' : 'Kembalikan Dana'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transaction History Modal */}
            {showHistoryModal && historyAccount && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center"><Eye className="text-blue-600 mr-2" size={22} /> Riwayat Transaksi</h2>
                                <p className="text-sm text-slate-500 mt-0.5">{historyAccount.student?.user?.name} — Saldo: <span className="font-semibold text-emerald-600">{formatCurrency(historyAccount.balance)}</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                                {transactions.length > 0 && (
                                    <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"><Download size={14} /> PDF</button>
                                )}
                                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-5">
                            {loadingHistory ? (
                                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><History size={40} className="mx-auto text-slate-300 mb-3" /><p className="font-medium">Belum ada riwayat transaksi</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {transactions.map(txn => {
                                        const isDeposit = txn.type === 'Deposit' || txn.type === 'deposit';
                                        return (
                                            <div key={txn.id} className={clsx("flex items-center justify-between p-3 rounded-xl border", isDeposit ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100")}>
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center shrink-0", isDeposit ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>{isDeposit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{isDeposit ? 'Setoran' : 'Penarikan'}</p>
                                                        <p className="text-xs text-slate-500">{new Date(txn.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}{txn.handled_by && ` · ${txn.handled_by.name}`}</p>
                                                        {txn.notes && <p className="text-xs text-slate-400 mt-0.5">{txn.notes}</p>}
                                                    </div>
                                                </div>
                                                <span className={clsx("font-bold text-sm whitespace-nowrap", isDeposit ? "text-emerald-600" : "text-red-600")}>{isDeposit ? '+' : '-'}{formatCurrency(txn.amount)}</span>
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
