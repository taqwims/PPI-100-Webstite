import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Wallet, ArrowUpRight, ArrowDownRight, History, Download, Calendar, Users } from 'lucide-react';
import clsx from 'clsx';
import { generateSavingsReport } from '../../utils/pdfUtils';

interface SavingAccount {
    id: string;
    student_id: string;
    balance: number;
    student: { user: { name: string }; class?: { name: string } };
}

interface SavingTransaction {
    id: string;
    type: string;
    amount: number;
    date: string;
    handled_by: { name: string };
    notes: string;
}

interface ChildSavings {
    account: SavingAccount;
    transactions: SavingTransaction[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const ParentSavings: React.FC = () => {
    const [childrenSavings, setChildrenSavings] = useState<ChildSavings[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChild, setSelectedChild] = useState(0);

    useEffect(() => {
        const fetchSavings = async () => {
            setLoading(true);
            try {
                const res = await api.get('/finance/savings/my-children');
                if (Array.isArray(res.data)) {
                    setChildrenSavings(res.data);
                } else if (res.data?.account) {
                    // If API returns single child
                    setChildrenSavings([{ account: res.data.account, transactions: res.data.transactions || [] }]);
                }
            } catch (error) {
                console.error("Failed to fetch children savings", error);
                // Fallback: try the student endpoint
                try {
                    const res = await api.get('/finance/savings/my');
                    if (res.data) {
                        setChildrenSavings([{
                            account: res.data.account || res.data,
                            transactions: res.data.transactions || []
                        }]);
                    }
                } catch (err) {
                    console.error("Fallback also failed", err);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSavings();
    }, []);

    const handleExportPDF = (child: ChildSavings) => {
        generateSavingsReport(child.account, child.transactions);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (childrenSavings.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Wallet size={56} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-700">Data Tabungan Belum Tersedia</h2>
                    <p className="text-slate-500 mt-2">Tabungan anak Anda belum terdaftar. Hubungi bendahara sekolah.</p>
                </div>
            </div>
        );
    }

    const current = childrenSavings[selectedChild];
    const totalBalance = childrenSavings.reduce((s, c) => s + c.account.balance, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tabungan Anak</h1>
                <p className="text-slate-500 mt-1">Pantau saldo dan riwayat tabungan anak Anda.</p>
            </div>

            {/* Child Tabs */}
            {childrenSavings.length > 1 && (
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl w-fit">
                    {childrenSavings.map((child, idx) => (
                        <button
                            key={child.account.id}
                            onClick={() => setSelectedChild(idx)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition",
                                selectedChild === idx ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {child.account.student?.user?.name || `Anak ${idx + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 p-6 opacity-10">
                    <Wallet size={140} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={16} className="text-blue-200" />
                        <p className="text-blue-200 font-medium text-sm">{current.account.student?.user?.name}</p>
                    </div>
                    <p className="text-blue-200 text-xs mb-2">{current.account.student?.class?.name || ''}</p>
                    <h1 className="text-4xl font-bold mb-4">{formatCurrency(current.account.balance)}</h1>
                    {childrenSavings.length > 1 && (
                        <p className="text-blue-200 text-sm">Total semua anak: <span className="font-bold text-white">{formatCurrency(totalBalance)}</span></p>
                    )}
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History size={20} /> Riwayat Transaksi
                    </h2>
                    {current.transactions.length > 0 && (
                        <button
                            onClick={() => handleExportPDF(current)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                        >
                            <Download size={14} /> Export PDF
                        </button>
                    )}
                </div>

                {current.transactions.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <History size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-medium">Belum ada riwayat transaksi</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {current.transactions.map(txn => {
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

export default ParentSavings;
