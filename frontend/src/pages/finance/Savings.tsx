import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Wallet, Users, ArrowRightLeft, BarChart3, TrendingDown, ShieldCheck, RotateCcw, Plus, X, Download } from 'lucide-react';
import clsx from 'clsx';
import { generateSavingsReport } from '../../utils/pdfUtils';

import SavingsRecap from './SavingsRecap';

import { SavingsAccountTab } from '../../components/finance/Savings/SavingsAccountTab';
import { SavingsOperationalTab } from '../../components/finance/Savings/SavingsOperationalTab';
import { SavingsTransactionModal } from '../../components/finance/Savings/SavingsTransactionModal';
import { SavingsOperationalModals } from '../../components/finance/Savings/SavingsOperationalModals';
import { SavingAccount, ClassData, Student, PoolSummary, OperationalWithdrawal, SavingTransaction } from '../../components/finance/Savings/types';

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
    }, [canManage, fetchOpHistory, activeTab]);

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
                    {[1, 9, 10].includes(user?.role_id || 0) && (
                        <div className="p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl flex shadow-inner border border-slate-200 w-full sm:w-auto">
                            <button onClick={() => { setUnitID(1); setClassFilter(''); }} className={clsx("px-5 py-2 text-sm font-bold rounded-xl transition-all flex-1 justify-center flex", unitID === 1 ? "bg-white text-emerald-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>MTS</button>
                            <button onClick={() => { setUnitID(2); setClassFilter(''); }} className={clsx("px-5 py-2 text-sm font-bold rounded-xl transition-all flex-1 justify-center flex", unitID === 2 ? "bg-white text-emerald-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>MA</button>
                        </div>
                    )}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => openDepositModal()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all font-bold group">
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            <span>Setor</span>
                        </button>
                        <button onClick={() => setIsWithdrawOpOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-amber-600 border-2 border-amber-100 px-5 py-3 rounded-2xl hover:bg-amber-50 shadow-sm transition-all font-bold">
                            <TrendingDown size={20} />
                            <span>Ambil Operasional</span>
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
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Kembali</p>
                            <h2 className="text-2xl font-black text-blue-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(poolSummary?.total_returned || 0)}</h2>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300"><RotateCcw size={20} /></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-4 bg-slate-100/50 px-3 py-1.5 rounded-full inline-block self-start">Riwayat Lunas</p>
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
            <div className="flex p-1.5 bg-slate-100/50 backdrop-blur rounded-[1.5rem] border border-slate-200/60 w-fit">
                <button onClick={() => setActiveTab('accounts')} className={clsx('px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all', activeTab === 'accounts' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40')}>
                    <Users size={18} /> Rekening Siswa
                </button>
                <button onClick={() => setActiveTab('operational')} className={clsx('px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all', activeTab === 'operational' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40')}>
                    <ArrowRightLeft size={18} /> Operasional
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

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Detail Transaksi Tabungan</h2>
                                <p className="text-sm text-slate-500 mt-1">{historyAccount?.student?.user?.name} — {historyAccount?.student?.class?.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                                    <Download size={18} /> Cetak Buku
                                </button>
                                <button onClick={() => setShowHistoryModal(false)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-400" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left max-w-full">
                                    <thead><tr className="bg-slate-50"><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tanggal</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Jenis</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/3">Keterangan</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Nominal</th><th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Input Oleh</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingHistory ? (<tr><td colSpan={5} className="py-8 text-center text-slate-400">Memuat...</td></tr>) : transactions.length === 0 ? (<tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada transaksi</td></tr>) : transactions.map(trx => (
                                            <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-4 text-sm whitespace-nowrap text-slate-600">{formatDate(trx.date)}</td>
                                                <td className="px-4 py-4"><span className={clsx("px-2.5 py-1 text-xs font-bold rounded-lg border", trx.type === 'Deposit' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{trx.type === 'Deposit' ? 'Setoran' : 'Ditarik'}</span></td>
                                                <td className="px-4 py-4 text-sm text-slate-600 break-words">{trx.notes || '-'}</td>
                                                <td className={clsx("px-4 py-4 text-sm font-bold text-right whitespace-nowrap border-r border-slate-100", trx.type === 'Deposit' ? "text-green-600" : "text-red-600")}>{trx.type === 'Deposit' ? '+' : '-'}{formatCurrency(trx.amount)}</td>
                                                <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{trx.handled_by?.name?.charAt(0)}</div>{trx.handled_by?.name}</div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {transactions.length > 0 && (
                                        <tfoot className="bg-slate-50 border-t border-slate-200">
                                            <tr><td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-700">Saldo Akhir:</td><td colSpan={2} className="px-4 py-4 text-left font-bold text-emerald-600 text-lg">{formatCurrency(historyAccount?.balance || 0)}</td></tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Savings;
