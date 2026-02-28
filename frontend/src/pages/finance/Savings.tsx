import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ArrowUpRight, ArrowDownRight, Users, Search, Plus, Eye, X, History, Banknote } from 'lucide-react';
import clsx from 'clsx';

interface Student {
    id: string;
    user: { name: string; email: string };
    nisn: string;
    class: { name: string };
}

interface SavingAccount {
    id: string;
    student_id: string;
    student: Student;
    balance: number;
    created_at: string;
    updated_at: string;
}

interface SavingTransaction {
    id: string;
    account_id: string;
    type: string;
    amount: number;
    date: string;
    handled_by: { name: string };
    notes: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const Savings = () => {
    const { user } = useAuth();
    const canManage = [1, 9, 10].includes(user?.role_id || 0);

    const [accounts, setAccounts] = useState<SavingAccount[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Transaction Modal
    const [showTrxModal, setShowTrxModal] = useState(false);
    const [trxType, setTrxType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
    const [trxStudentId, setTrxStudentId] = useState('');
    const [trxAmount, setTrxAmount] = useState('');
    const [trxNotes, setTrxNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyAccount, setHistoryAccount] = useState<SavingAccount | null>(null);
    const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/savings');
            setAccounts(res.data || []);
        } catch (error) {
            console.error("Failed to fetch accounts", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await api.get('/students/');
            setStudents(res.data || []);
        } catch (error) {
            console.error("Failed to fetch students", error);
        }
    }, []);

    useEffect(() => {
        if (canManage) {
            fetchAccounts();
            fetchStudents();
        }
    }, [canManage, fetchAccounts, fetchStudents]);

    // Overview stats
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAccounts = accounts.length;
    const studentsWithoutAccount = students.filter(
        s => !accounts.find(a => a.student_id === s.id)
    );

    // Filter accounts by search
    const filtered = accounts.filter(acc => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            acc.student?.user?.name?.toLowerCase().includes(q) ||
            acc.student?.nisn?.toLowerCase().includes(q) ||
            acc.student?.class?.name?.toLowerCase().includes(q)
        );
    });

    // Transaction handlers
    const openDepositModal = (studentId?: string) => {
        setTrxType('Deposit');
        setTrxStudentId(studentId || '');
        setTrxAmount('');
        setTrxNotes('');
        setShowTrxModal(true);
    };

    const openWithdrawalModal = (studentId: string) => {
        setTrxType('Withdrawal');
        setTrxStudentId(studentId);
        setTrxAmount('');
        setTrxNotes('');
        setShowTrxModal(true);
    };

    const handleTransactionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trxStudentId) return;
        setSubmitting(true);
        try {
            await api.post('/finance/savings/transactions', {
                student_id: trxStudentId,
                type: trxType,
                amount: parseFloat(trxAmount),
                notes: trxNotes
            });
            setShowTrxModal(false);
            fetchAccounts();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal memproses transaksi");
        } finally {
            setSubmitting(false);
        }
    };

    // History
    const openHistory = async (account: SavingAccount) => {
        setHistoryAccount(account);
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const res = await api.get(`/finance/savings/transactions/${account.id}`);
            setTransactions(res.data || []);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (!canManage) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Wallet size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 text-lg">Halaman ini hanya untuk petugas tabungan.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kelola Tabungan Siswa</h1>
                    <p className="text-slate-500 mt-1">Input setoran, tarik dana, dan pantau saldo tabungan seluruh siswa.</p>
                </div>
                <button
                    onClick={() => openDepositModal()}
                    className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm transition"
                >
                    <Plus size={18} />
                    <span>Setor Tabungan</span>
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-sm mb-1 uppercase tracking-wide">Total Saldo Seluruh Siswa</p>
                        <h2 className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</h2>
                        <p className="text-emerald-200 text-sm mt-3">{totalAccounts} akun tabungan terdaftar</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Akun Tabungan</p>
                        <h2 className="text-3xl font-bold text-slate-800 mt-1">{totalAccounts}</h2>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Siswa Belum Punya Akun</p>
                        <h2 className="text-3xl font-bold text-amber-600 mt-1">{studentsWithoutAccount.length}</h2>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                        <Banknote size={24} />
                    </div>
                </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">Daftar Rekening Tabungan Siswa</h2>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari nama, NISN, atau kelas..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="p-4 font-medium">Nama Siswa</th>
                                <th className="p-4 font-medium">NISN</th>
                                <th className="p-4 font-medium">Kelas</th>
                                <th className="p-4 font-medium text-right">Saldo</th>
                                <th className="p-4 font-medium text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-lg font-medium text-slate-700">Belum ada data tabungan</p>
                                        <p className="text-sm mt-1">Klik "Setor Tabungan" untuk membuat akun tabungan siswa pertama.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(account => (
                                    <tr key={account.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4">
                                            <p className="font-semibold text-slate-800">{account.student?.user?.name}</p>
                                            <p className="text-xs text-slate-500">{account.student?.user?.email}</p>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm font-mono">{account.student?.nisn}</td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                                                {account.student?.class?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={clsx(
                                                "text-lg font-bold",
                                                account.balance > 0 ? "text-emerald-600" : "text-slate-400"
                                            )}>
                                                {formatCurrency(account.balance)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center space-x-1">
                                                <button
                                                    onClick={() => openDepositModal(account.student_id)}
                                                    className="px-2.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition flex items-center space-x-1"
                                                    title="Setor"
                                                >
                                                    <ArrowUpRight size={14} />
                                                    <span>Setor</span>
                                                </button>
                                                <button
                                                    onClick={() => openWithdrawalModal(account.student_id)}
                                                    className="px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition flex items-center space-x-1"
                                                    title="Tarik"
                                                >
                                                    <ArrowDownRight size={14} />
                                                    <span>Tarik</span>
                                                </button>
                                                <button
                                                    onClick={() => openHistory(account)}
                                                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center space-x-1"
                                                    title="Riwayat"
                                                >
                                                    <History size={14} />
                                                    <span>Riwayat</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Modal */}
            {showTrxModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold flex items-center text-slate-800">
                                {trxType === 'Deposit' ? (
                                    <><ArrowUpRight className="text-emerald-500 mr-2" size={24} /> Setor Tabungan</>
                                ) : (
                                    <><ArrowDownRight className="text-red-500 mr-2" size={24} /> Tarik Tabungan</>
                                )}
                            </h2>
                            <button onClick={() => setShowTrxModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleTransactionSubmit} className="p-6 space-y-5">
                            {/* Type Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Transaksi</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setTrxType('Deposit')}
                                        className={clsx(
                                            "flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center space-x-1",
                                            trxType === 'Deposit' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <ArrowUpRight size={14} />
                                        <span>Setor (Deposit)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTrxType('Withdrawal')}
                                        className={clsx(
                                            "flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center space-x-1",
                                            trxType === 'Withdrawal' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <ArrowDownRight size={14} />
                                        <span>Tarik (Withdraw)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Student Select */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                                <select
                                    required
                                    value={trxStudentId}
                                    onChange={e => setTrxStudentId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">-- Pilih Siswa --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nisn} — {s.user?.name} ({s.class?.name || '-'})
                                        </option>
                                    ))}
                                </select>
                                {trxStudentId && (() => {
                                    const acc = accounts.find(a => a.student_id === trxStudentId);
                                    return acc ? (
                                        <p className="text-xs text-slate-500 mt-1.5">Saldo saat ini: <span className="font-semibold text-emerald-600">{formatCurrency(acc.balance)}</span></p>
                                    ) : (
                                        <p className="text-xs text-amber-600 mt-1.5">Siswa belum punya akun — akan otomatis dibuat saat setor pertama.</p>
                                    );
                                })()}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="1000"
                                    placeholder="50000"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 font-medium text-sm"
                                    value={trxAmount}
                                    onChange={e => setTrxAmount(e.target.value)}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Setoran bulanan"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 text-sm"
                                    value={trxNotes}
                                    onChange={e => setTrxNotes(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowTrxModal(false)}
                                    className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={clsx(
                                        "px-6 py-2.5 rounded-xl text-white font-medium transition flex items-center space-x-2 min-w-[140px] justify-center",
                                        trxType === 'Deposit' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
                                        submitting && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {submitting ? 'Memproses...' : (trxType === 'Deposit' ? 'Setor Dana' : 'Tarik Dana')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transaction History Modal */}
            {showHistoryModal && historyAccount && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                    <Eye className="text-blue-600 mr-2" size={24} /> Riwayat Transaksi
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {historyAccount.student?.user?.name} — Saldo: <span className="font-semibold text-emerald-600">{formatCurrency(historyAccount.balance)}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            {loadingHistory ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <History size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="font-medium">Belum ada riwayat transaksi</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map(txn => {
                                        const isDeposit = txn.type === 'Deposit' || txn.type === 'deposit';
                                        return (
                                            <div key={txn.id} className={clsx(
                                                "flex items-center justify-between p-4 rounded-xl border",
                                                isDeposit ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                                            )}>
                                                <div className="flex items-center space-x-4">
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                                        isDeposit ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                                    )}>
                                                        {isDeposit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{isDeposit ? 'Setoran' : 'Penarikan'}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(txn.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            {txn.handled_by && ` · ${txn.handled_by.name}`}
                                                        </p>
                                                        {txn.notes && <p className="text-xs text-slate-400 mt-0.5">{txn.notes}</p>}
                                                    </div>
                                                </div>
                                                <span className={clsx(
                                                    "font-bold text-sm whitespace-nowrap",
                                                    isDeposit ? "text-emerald-600" : "text-red-600"
                                                )}>
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
