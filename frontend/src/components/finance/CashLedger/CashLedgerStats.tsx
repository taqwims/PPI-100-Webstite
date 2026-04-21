import React from 'react';
import { BookOpen, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  currentSaldo: number;
  totalIncome: number;
  totalExpense: number;
  formatCurrency: (amount: number) => string;
}

const CashLedgerStats: React.FC<Props> = ({ currentSaldo, totalIncome, totalExpense, formatCurrency }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium">Saldo Kas Aktif</p>
                    <h2 className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(currentSaldo)}</h2>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <BookOpen size={24} />
                </div>
            </div>
            <p className="text-xs text-slate-400">Total keseluruhan uang yang ada di Kas</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium">Total Pemasukan</p>
                    <h2 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalIncome)}</h2>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <ArrowUpRight size={20} />
                </div>
            </div>
            <p className="text-xs text-slate-400">Akumulasi uang masuk (Income)</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium">Total Pengeluaran</p>
                    <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense)}</h2>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <ArrowDownRight size={20} />
                </div>
            </div>
            <p className="text-xs text-slate-400">Akumulasi uang keluar (Expense)</p>
        </div>
    </div>
  );
};

export default CashLedgerStats;
