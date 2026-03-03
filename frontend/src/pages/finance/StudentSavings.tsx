import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Wallet, ArrowUpRight, ArrowDownRight, History, Download, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { generateSavingsReport } from '../../utils/pdfUtils';

interface SavingAccount {
    id: string;
    student_id: string;
    balance: number;
    student: { user: { name: string } };
}

interface SavingTransaction {
    id: string;
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

const StudentSavings: React.FC = () => {
    const [account, setAccount] = useState<SavingAccount | null>(null);
    const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSavings = async () => {
            setLoading(true);
            try {
                const res = await api.get('/finance/savings/my');
                if (res.data) {
                    setAccount(res.data.account || res.data);
                    setTransactions(res.data.transactions || []);
                }
            } catch (error) {
                console.error("Failed to fetch savings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSavings();
    }, []);

    const handleExportPDF = () => {
        if (!account) return;
        generateSavingsReport(account, transactions);
    };

    const totalDeposit = transactions.filter(t => t.type === 'Deposit' || t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalWithdrawal = transactions.filter(t => t.type === 'Withdrawal' || t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Wallet size={56} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-700">Belum Punya Tabungan</h2>
                    <p className="text-slate-500 mt-2">Akun tabunganmu belum terdaftar. Hubungi bendahara sekolah untuk membuat akun.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 p-6 opacity-10">
                    <Wallet size={140} />
                </div>
                <div className="relative z-10">
                    <p className="text-emerald-100 font-medium tracking-wide mb-1">Saldo Tabunganmu</p>
                    <h1 className="text-5xl font-bold mb-4">{formatCurrency(account.balance)}</h1>
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                            <p className="text-emerald-200 text-xs uppercase tracking-wide">Total Setoran</p>
                            <p className="font-semibold text-lg">{formatCurrency(totalDeposit)}</p>
                        </div>
                        <div>
                            <p className="text-emerald-200 text-xs uppercase tracking-wide">Total Penarikan</p>
                            <p className="font-semibold text-lg">{formatCurrency(totalWithdrawal)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History size={20} /> Riwayat Transaksi
                    </h2>
                    {transactions.length > 0 && (
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                        >
                            <Download size={14} /> Export PDF
                        </button>
                    )}
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <History size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-medium">Belum ada riwayat transaksi</p>
                        <p className="text-sm mt-1">Setoran pertamamu akan muncul di sini.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {transactions.map(txn => {
                            const isDeposit = txn.type === 'Deposit' || txn.type === 'deposit';
                            return (
                                <div key={txn.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            isDeposit ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                        )}>
                                            {isDeposit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{isDeposit ? 'Setoran' : 'Penarikan'}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Calendar size={12} />
                                                {new Date(txn.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                {txn.handled_by && ` · Petugas: ${txn.handled_by.name}`}
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
    );
};

export default StudentSavings;
