import React from 'react';
import { BookOpen, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  currentSaldo: number;
  totalIncome: number;
  totalExpense: number;
  formatCurrency: (amount: number) => string;
  activeType?: 'all' | 'Income' | 'Expense';
  onSelectType?: (type: 'all' | 'Income' | 'Expense') => void;
}

const CashLedgerStats: React.FC<Props> = ({
  currentSaldo,
  totalIncome,
  totalExpense,
  formatCurrency,
  activeType = 'all',
  onSelectType
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {/* Saldo Aktif Card */}
      <div
        onClick={() => onSelectType && onSelectType('all')}
        className={clsx(
          "bg-white rounded-2xl p-5 sm:p-6 border shadow-xs flex flex-col justify-between relative overflow-hidden transition-all",
          onSelectType ? "cursor-pointer hover:shadow-md" : "",
          activeType === 'all'
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/5"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-slate-500 text-xs sm:text-sm font-semibold">Saldo Kas Aktif</p>
              {activeType === 'all' && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Aktif
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{formatCurrency(currentSaldo)}</h2>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <BookOpen size={22} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Total keseluruhan uang di Kas</span>
          {onSelectType && <span className="text-blue-600 font-bold hover:underline">Lihat Semua →</span>}
        </div>
      </div>

      {/* Total Pemasukan Card */}
      <div
        onClick={() => onSelectType && onSelectType('Income')}
        className={clsx(
          "bg-white rounded-2xl p-5 sm:p-6 border shadow-xs flex flex-col justify-between transition-all",
          onSelectType ? "cursor-pointer hover:shadow-md" : "",
          activeType === 'Income'
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-emerald-500/5"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-slate-500 text-xs sm:text-sm font-semibold">Total Pemasukan</p>
              {activeType === 'Income' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Terfilter
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{formatCurrency(totalIncome)}</h2>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <ArrowUpRight size={22} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Akumulasi uang masuk (Income)</span>
          {onSelectType && <span className="text-emerald-700 font-bold hover:underline">Filter Pemasukan →</span>}
        </div>
      </div>

      {/* Total Pengeluaran Card */}
      <div
        onClick={() => onSelectType && onSelectType('Expense')}
        className={clsx(
          "bg-white rounded-2xl p-5 sm:p-6 border shadow-xs flex flex-col justify-between transition-all",
          onSelectType ? "cursor-pointer hover:shadow-md" : "",
          activeType === 'Expense'
            ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/20 shadow-red-500/5"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-slate-500 text-xs sm:text-sm font-semibold">Total Pengeluaran</p>
              {activeType === 'Expense' && (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Terfilter
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1">{formatCurrency(totalExpense)}</h2>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
            <ArrowDownRight size={22} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Akumulasi uang keluar (Expense)</span>
          {onSelectType && <span className="text-red-700 font-bold hover:underline">Filter Pengeluaran →</span>}
        </div>
      </div>
    </div>
  );
};

export default CashLedgerStats;
