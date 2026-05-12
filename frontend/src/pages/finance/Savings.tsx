import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import { Wallet, Users, ArrowRightLeft, BarChart3, TrendingDown, ShieldCheck, RotateCcw, Plus, X, Download, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { generateSavingsReport } from '../../utils/pdfUtils';
import { generatePiutangInvoice } from '../../utils/piutangInvoice';

import SavingsRecap from './SavingsRecap';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

import { SavingsAccountTab } from '../../components/finance/Savings/SavingsAccountTab';
import { SavingsOperationalTab } from '../../components/finance/Savings/SavingsOperationalTab';
import { SavingsReceivableTab } from '../../components/finance/Savings/SavingsReceivableTab';
import { SavingsTransactionModal } from '../../components/finance/Savings/SavingsTransactionModal';
import { SavingsOperationalModals } from '../../components/finance/Savings/SavingsOperationalModals';
import { SavingsReceivableModals } from '../../components/finance/Savings/SavingsReceivableModals';
import { SavingAccount, ClassData, Student, PoolSummary, OperationalWithdrawal, ReceivableWithdrawal, SavingTransaction } from '../../components/finance/Savings/types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

const Savings = () => {
    const { user } = useAuth();
    const { units: activeUnits } = useUnits();
    const canManage = [1, 9, 10, 11].includes(user?.role_id || 0);

    const getDefaultUnitID = () => {
        if (user?.unit_id) return user.unit_id;
        return activeUnits[0]?.id || 1;
    };
    
    const [unitID, setUnitID] = useState<number>(getDefaultUnitID());
    const [activeTab, setActiveTab] = useState<'accounts' | 'operational' | 'receivable' | 'recap'>('accounts');

    const [accounts, setAccounts] = useState<SavingAccount[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classList, setClassList] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [classFilter, setClassFilter] = useState('');

    const [poolSummary, setPoolSummary] = useState<PoolSummary | null>(null);

    const [opHistory, setOpHistory] = useState<OperationalWithdrawal[]>([]);
    const [loadingOpHistory, setLoadingOpHistory] = useState(false);

    // Transaction Modal wrapper state
    const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
    const [trxModalType, setTrxModalType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
    const [trxModalStudentId, setTrxModalStudentId] = useState<string | undefined>(undefined);

    // Operational Modals
    const [isWithdrawOpOpen, setIsWithdrawOpOpen] = useState(false);
    const [isReturnOpOpen, setIsReturnOpOpen] = useState(false);

    // Receivable Modals
    const [isWithdrawRecOpen, setIsWithdrawRecOpen] = useState(false);
    const [isReturnRecOpen, setIsReturnRecOpen] = useState(false);
    const [recHistory, setRecHistory] = useState<ReceivableWithdrawal[]>([]);
    const [loadingRecHistory, setLoadingRecHistory] = useState(false);

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyAccount, setHistoryAccount] = useState<SavingAccount | null>(null);
    const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Edit Transaction
    const [editingTrx, setEditingTrx] = useState<SavingTransaction | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Confirm Delete Dialog
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [trxToDelete, setTrxToDelete] = useState<SavingTransaction | null>(null);

    const fetchAccounts = useCallback(async (classId?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (classId) params.set('class_id', classId);
            const res = await api.get(`/finance/savings${params.toString() ? `?${params.toString()}` : ''}`);
            setAccounts(res.data || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, []);

    const fetchStudents = useCallback(async () => {
        try { const res = await api.get(`/students/?unit_id=${unitID}`); setStudents(res.data || []); }
        catch (error) { console.error(error); }
    }, [unitID]);

    const fetchClasses = useCallback(async () => {
        try { const res = await api.get(`/academic/classes?unit_id=${unitID}`); setClassList(res.data || []); }
        catch (error) { console.error(error); }
    }, [unitID]);

    const fetchPoolSummary = useCallback(async () => {
        try { const res = await api.get('/finance/savings/operational/summary'); setPoolSummary(res.data); }
        catch (error) { console.error(error); }
    }, []);

    const fetchOpHistory = useCallback(async () => {
        setLoadingOpHistory(true);
        try { const res = await api.get('/finance/savings/operational/history'); setOpHistory(res.data || []); }
        catch (error) { console.error(error); } finally { setLoadingOpHistory(false); }
    }, []);

    const fetchRecHistory = useCallback(async () => {
        setLoadingRecHistory(true);
        try { const res = await api.get('/finance/savings/receivable/history'); setRecHistory(res.data || []); }
        catch (error) { console.error(error); } finally { setLoadingRecHistory(false); }
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
        if (canManage && activeTab === 'operational') fetchOpHistory();
        if (canManage && activeTab === 'receivable') fetchRecHistory();
    }, [canManage, fetchOpHistory, fetchRecHistory, activeTab]);

    const openDepositModal = (studentId?: string) => {
        setTrxModalType('Deposit');
        setTrxModalStudentId(studentId);
        setIsTrxModalOpen(true);
    };

    const openWithdrawalModal = (studentId: string) => {
        setTrxModalType('Withdrawal');
        setTrxModalStudentId(studentId);
        setIsTrxModalOpen(true);
    };

    const openHistory = async (account: SavingAccount) => {
        setHistoryAccount(account); setShowHistoryModal(true); setLoadingHistory(true);
        try { const res = await api.get(`/finance/savings/transactions/${account.id}`); setTransactions(res.data || []); }
        catch (error) { console.error(error); } finally { setLoadingHistory(false); }
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

    const handleUpdateTrx = async () => {
        if (!editingTrx) return;
        setSavingEdit(true);
        try {
            await api.put(`/finance/savings/transactions/${editingTrx.id}`, {
                amount: Number(editAmount),
                notes: editNotes
            });
            // Refresh history
            if (historyAccount) {
                const res = await api.get(`/finance/savings/transactions/${historyAccount.id}`);
                setTransactions(res.data || []);
                // Refresh pool summary and accounts
                fetchPoolSummary();
                fetchAccounts(classFilter || undefined);
            }
            setEditingTrx(null);
        } catch (error) { console.error(error); toast.error('Gagal mengupdate transaksi'); }
        finally { setSavingEdit(false); }
    };

    const handleDeleteTrx = async () => {
        const trx = trxToDelete || editingTrx;
        if (!trx) return;
        
        setSavingEdit(true);
        try {
            await api.delete(`/finance/savings/transactions/${trx.id}`);
            // Refresh history
            if (historyAccount) {
                const res = await api.get(`/finance/savings/transactions/${historyAccount.id}`);
                setTransactions(res.data || []);
                // Refresh pool summary and accounts
                fetchPoolSummary();
                fetchAccounts(classFilter || undefined);
            }
            setEditingTrx(null);
            setIsConfirmOpen(false);
            setTrxToDelete(null);
            toast.success('Transaksi berhasil dihapus');
        } catch (error) { console.error(error); toast.error('Gagal menghapus transaksi'); }
        finally { setSavingEdit(false); }
    };

    if (!canManage) {
        return (<div className="flex items-center justify-center h-96"><div className="text-center"><Wallet size={48} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 text-lg">Halaman ini hanya untuk petugas tabungan.</p></div></div>);
    }

    const unitAccounts = accounts.filter(acc => students.some(s => s.id === acc.student_id));
    const totalBalance = unitAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAccounts = unitAccounts.length;
    const studentsWithoutAccount = students.filter(s => !unitAccounts.find(a => a.student_id === s.id));

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
                    {[1, 9, 10, 11].includes(user?.role_id || 0) && (
                        <div className="p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl flex shadow-inner border border-slate-200 w-full sm:w-auto">
                            {activeUnits.map(u => (
                                <button key={u.id} onClick={() => { setUnitID(u.id); setClassFilter(''); }} className={clsx("px-5 py-2 text-sm font-bold rounded-xl transition-all flex-1 justify-center flex", unitID === u.id ? "bg-white text-emerald-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>{u.name}</button>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
                        <button onClick={() => openDepositModal()} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all font-bold group whitespace-nowrap">
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            <span>Setor</span>
                        </button>
                        <button onClick={() => setIsWithdrawOpOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-white text-amber-600 border-2 border-amber-100 px-5 py-3 rounded-2xl hover:bg-amber-50 shadow-sm transition-all font-bold whitespace-nowrap">
                            <TrendingDown size={20} />
                            <span>Ambil Operasional</span>
                        </button>
                        <button onClick={() => setIsWithdrawRecOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-white text-rose-600 border-2 border-rose-100 px-5 py-3 rounded-2xl hover:bg-rose-50 shadow-sm transition-all font-bold whitespace-nowrap">
                            <TrendingDown size={20} />
                            <span>Ambil Piutang</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div className="relative group overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100 transition-all duration-500 hover:scale-[1.02]">
                    <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 rotate-12"><Wallet size={160} /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="space-y-1">
                            <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest">Total Saldo Pool</p>
                            <h2 className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(poolSummary?.total_balance || totalBalance)}</h2>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-emerald-100/80"><Users size={16} /><p className="text-xs font-bold">{totalAccounts} Akun Terdaftar</p></div>
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Dana Operasional</p>
                            <h2 className="text-2xl font-black text-red-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(poolSummary?.outstanding_debt || 0)}</h2>
                        </div>
                        <div className="p-3 bg-red-50 text-red-500 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors duration-300"><TrendingDown size={20} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">Status: Belum Kembali</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo Tersedia</p>
                            <h2 className="text-2xl font-black text-emerald-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(poolSummary?.available_balance || 0)}</h2>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300"><ShieldCheck size={20} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">Status: Aman</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Kembali Op</p>
                            <h2 className="text-2xl font-black text-blue-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(poolSummary?.total_returned || 0)}</h2>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300"><RotateCcw size={20} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">Riwayat Lunas Op</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Piutang</p>
                            <h2 className="text-2xl font-black text-rose-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(poolSummary?.outstanding_receivable || 0)}</h2>
                        </div>
                        <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300"><TrendingDown size={20} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">Luar Operasional</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-[2rem] p-6 border border-slate-200/60 shadow-sm transition-all flex flex-col justify-between group md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aktivasi Akun</p>
                            <h2 className="text-2xl font-black text-amber-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{studentsWithoutAccount.length}</h2>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300"><Users size={20} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">Siswa Belum Menabung</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-slate-100/50 backdrop-blur rounded-[1.5rem] border border-slate-200/60 w-full overflow-x-auto hide-scrollbar">
                <button onClick={() => setActiveTab('accounts')} className={clsx('px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all', activeTab === 'accounts' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40')}>
                    <Users size={18} /> Rekening Siswa
                </button>
                <button onClick={() => setActiveTab('operational')} className={clsx('px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all', activeTab === 'operational' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40')}>
                    <ArrowRightLeft size={18} /> Operasional
                </button>
                <button onClick={() => setActiveTab('receivable')} className={clsx('px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all', activeTab === 'receivable' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40')}>
                    <TrendingDown size={18} /> Piutang
                </button>
                <button onClick={() => setActiveTab('recap')} className={clsx('px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all', activeTab === 'recap' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40')}>
                    <BarChart3 size={18} /> Rekap
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'accounts' && (
                    <SavingsAccountTab 
                        loading={loading}
                        accounts={accounts}
                        students={students}
                        classList={classList}
                        classFilter={classFilter}
                        setClassFilter={setClassFilter}
                        openDepositModal={openDepositModal}
                        openWithdrawalModal={openWithdrawalModal}
                        openHistory={openHistory}
                    />
                )}
                {activeTab === 'operational' && (
                    <SavingsOperationalTab 
                        loading={loadingOpHistory}
                        opHistory={opHistory}
                        fetchOpHistory={fetchOpHistory}
                        openReturnModal={() => setIsReturnOpOpen(true)}
                    />
                )}
                {activeTab === 'receivable' && (
                    <SavingsReceivableTab 
                        loading={loadingRecHistory}
                        recHistory={recHistory}
                        fetchRecHistory={fetchRecHistory}
                        openReturnModal={() => setIsReturnRecOpen(true)}
                        onPrintInvoice={(item) => generatePiutangInvoice(item, 'download')}
                    />
                )}
                {activeTab === 'recap' && (
                    <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 p-6 overflow-hidden">
                        <SavingsRecap classList={classList}  />
                    </div>
                )}
            </div>

            <SavingsTransactionModal 
                isOpen={isTrxModalOpen}
                onClose={() => setIsTrxModalOpen(false)}
                onSuccess={() => { fetchAccounts(classFilter || undefined); fetchPoolSummary(); }}
                initialType={trxModalType}
                initialStudentId={trxModalStudentId}
                classes={classList}
                students={students}
                accounts={accounts}
            />

            <SavingsOperationalModals 
                isWithdrawOpen={isWithdrawOpOpen}
                onCloseWithdraw={() => setIsWithdrawOpOpen(false)}
                isReturnOpen={isReturnOpOpen}
                onCloseReturn={() => setIsReturnOpOpen(false)}
                onSuccess={() => { fetchPoolSummary(); fetchOpHistory(); }}
                poolSummary={poolSummary}
                unitID={unitID}
                opHistory={opHistory}
            />

            <SavingsReceivableModals 
                isWithdrawOpen={isWithdrawRecOpen}
                onCloseWithdraw={() => setIsWithdrawRecOpen(false)}
                isReturnOpen={isReturnRecOpen}
                onCloseReturn={() => setIsReturnRecOpen(false)}
                onSuccess={() => { fetchPoolSummary(); fetchRecHistory(); }}
                poolSummary={poolSummary}
                unitID={unitID}
                recHistory={recHistory}
            />

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-start md:items-center p-2 md:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl my-auto">
                        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-2 shrink-0">
                            <div className="min-w-0">
                                <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">Detail Transaksi Tabungan</h2>
                                <p className="text-xs md:text-sm text-slate-500 mt-0.5 truncate">{historyAccount?.student?.user?.name} — {historyAccount?.student?.class?.name}</p>
                            </div>
                            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                                <button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-xs md:text-sm font-medium">
                                    <Download size={16} /> Cetak Buku
                                </button>
                                <button onClick={() => setShowHistoryModal(false)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors shrink-0"><X size={18} className="text-slate-400" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-3 md:p-6 bg-slate-50/50">
                            {/* Desktop Table */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[600px]">
                                        <thead><tr className="bg-slate-50"><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tanggal</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Jenis</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/3">Keterangan</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Nominal</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Input Oleh</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {loadingHistory ? (<tr><td colSpan={6} className="py-8 text-center text-slate-400">Memuat...</td></tr>) : transactions.length === 0 ? (<tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada transaksi</td></tr>) : transactions.map(trx => (
                                                <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-slate-600">{formatDate(trx.date)}</td>
                                                    <td className="px-4 py-4"><span className={clsx("px-2.5 py-1 text-xs font-bold rounded-lg border", trx.type === 'Deposit' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{trx.type === 'Deposit' ? 'Setoran' : 'Ditarik'}</span></td>
                                                    <td className="px-4 py-4 text-sm text-slate-600 break-words">{trx.notes || '-'}</td>
                                                    <td className={clsx("px-4 py-4 text-sm font-bold text-right whitespace-nowrap border-r border-slate-100", trx.type === 'Deposit' ? "text-green-600" : "text-red-600")}>{trx.type === 'Deposit' ? '+' : '-'}{formatCurrency(trx.amount)}</td>
                                                    <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{trx.handled_by?.name?.charAt(0)}</div>{trx.handled_by?.name}</div></td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingTrx(trx);
                                                                setEditAmount(trx.amount.toString());
                                                                setEditNotes(trx.notes || '');
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {transactions.length > 0 && (
                                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                                <tr><td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-700">Saldo Akhir:</td><td colSpan={3} className="px-4 py-4 text-left font-bold text-emerald-600 text-lg">{formatCurrency(historyAccount?.balance || 0)}</td></tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {loadingHistory ? (
                                    <div className="py-8 text-center text-slate-400">Memuat...</div>
                                ) : transactions.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400">Belum ada transaksi</div>
                                ) : (
                                    <>
                                        {transactions.map(trx => (
                                            <div key={trx.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <span className={clsx("px-2.5 py-1 text-xs font-bold rounded-lg border inline-block", trx.type === 'Deposit' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                                                            {trx.type === 'Deposit' ? 'Setoran' : 'Ditarik'}
                                                        </span>
                                                        <p className="text-xs text-slate-400">{formatDate(trx.date)}</p>
                                                    </div>
                                                    <p className={clsx("text-base font-bold", trx.type === 'Deposit' ? "text-green-600" : "text-red-600")}>
                                                        {trx.type === 'Deposit' ? '+' : '-'}{formatCurrency(trx.amount)}
                                                    </p>
                                                </div>
                                                {trx.notes && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">{trx.notes}</p>}
                                                <div className="flex justify-between items-center gap-2 text-xs text-slate-400 pt-1 border-t border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">{trx.handled_by?.name?.charAt(0)}</div>
                                                        {trx.handled_by?.name}
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingTrx(trx);
                                                            setEditAmount(trx.amount.toString());
                                                            setEditNotes(trx.notes || '');
                                                        }}
                                                        className="flex items-center gap-1 text-emerald-600 font-bold"
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
                                            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Saldo Akhir</p>
                                            <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(historyAccount?.balance || 0)}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            {editingTrx && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Koreksi Transaksi</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{editingTrx.type === 'Deposit' ? 'Setoran' : 'Penarikan'}</p>
                            </div>
                            <button onClick={() => setEditingTrx(null)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal (Rp)</label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">Rp</div>
                                    <input 
                                        type="text" 
                                        className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" 
                                        value={editAmount ? new Intl.NumberFormat('id-ID').format(Number(editAmount)) : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setEditAmount(val);
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Keterangan</label>
                                <textarea 
                                    className="w-full p-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-bold text-slate-700 min-h-[100px]"
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    placeholder="Alasan koreksi..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => {
                                        setTrxToDelete(editingTrx);
                                        setIsConfirmOpen(true);
                                    }}
                                    disabled={savingEdit}
                                    className="flex-1 py-5 bg-white text-rose-600 border-2 border-rose-100 rounded-[1.5rem] font-black text-lg hover:bg-rose-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Trash2 size={20} />
                                    <span>Hapus</span>
                                </button>
                                <button 
                                    onClick={handleUpdateTrx}
                                    disabled={savingEdit || !editAmount}
                                    className="flex-[2] py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {savingEdit ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog 
                isOpen={isConfirmOpen}
                onClose={() => { setIsConfirmOpen(false); setTrxToDelete(null); }}
                onConfirm={handleDeleteTrx}
                title="Hapus Transaksi?"
                message="Apakah Anda yakin ingin menghapus transaksi ini? Saldo siswa akan dikembalikan secara otomatis. Tindakan ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="danger"
                isLoading={savingEdit}
            />
        </div>
    );
};

export default Savings;
