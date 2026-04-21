import React from 'react';
import { Heart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import type { DailyInfaqEntry } from '../../../hooks/useDailyInfaq';

interface DailyInfaqStatsProps {
    entries: DailyInfaqEntry[];
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const DailyInfaqStats: React.FC<DailyInfaqStatsProps> = ({ entries, totalIncome, totalExpense, netBalance }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Heart size={80} />
                </div>
                <div className="relative z-10">
                    <p className="text-emerald-100 font-medium tracking-wide text-sm mb-1 uppercase">Total Infaq Terkumpul</p>
                    <h2 className="text-3xl font-bold">{formatCurrency(totalIncome)}</h2>
                    <p className="text-sm text-emerald-100 mt-4 flex items-center">
                        <ArrowUpRight size={16} className="mr-1" />
                        {entries.filter(e => e.type === 'Income').length} Transaksi Masuk
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Pengeluaran</p>
                        <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense)}</h2>
                    </div>
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <ArrowDownRight size={20} />
                    </div>
                </div>
                <p className="text-xs text-slate-400">{entries.filter(e => e.type === 'Expense').length} Transaksi Keluar</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Saldo Infaq</p>
                        <h2 className={clsx("text-2xl font-bold mt-1", netBalance >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(netBalance)}</h2>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Heart size={20} />
                    </div>
                </div>
                <p className="text-xs text-slate-400">Selisih pemasukan dan pengeluaran</p>
            </div>
        </div>
    );
};

export default DailyInfaqStats;
