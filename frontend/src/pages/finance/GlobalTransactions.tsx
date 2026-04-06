import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import clsx from 'clsx';

interface GlobalTransaction {
    date: string;
    source: string;
    description: string;
    type: string;
    amount: number;
    category: string;
    code: string;
    code_name: string;
    module: string;
}

interface TransactionCode {
    id: number;
    code: string;
    name: string;
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const GlobalTransactions: React.FC = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [category, setCategory] = useState('');
    const [codeId, setCodeId] = useState('');

    const { data: transactions = [], isLoading } = useQuery<GlobalTransaction[]>({
        queryKey: ['global-transactions', startDate, endDate, category, codeId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            if (category) params.set('category', category);
            if (codeId) params.set('code_id', codeId);
            return (await api.get(`/finance/global-transactions?${params.toString()}`)).data || [];
        },
    });

    const { data: codes = [] } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'],
        queryFn: async () => (await api.get('/finance/transaction-codes')).data,
    });

    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

    const moduleColors: Record<string, string> = {
        Bill: 'bg-blue-50 text-blue-700',
        CashLedger: 'bg-amber-50 text-amber-700',
        DailyInfaq: 'bg-purple-50 text-purple-700',
        Payroll: 'bg-rose-50 text-rose-700',
    };

    const moduleLabels: Record<string, string> = {
        Bill: 'SPP/Tagihan',
        CashLedger: 'Kas Umum',
        DailyInfaq: 'Infaq',
        Payroll: 'Gaji',
    };

    const categories = ['SPP', 'Gaji', 'Infaq', 'Operasional', 'Hutang', 'Kegiatan'];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transaksi Global</h1>
                <p className="text-slate-500 mt-1">Seluruh transaksi keuangan dari semua modul dalam satu tampilan</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Transaksi</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.length}</p>
                </div>
                <div className="bg-emerald-50/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200 shadow-sm">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-1"><ArrowDownLeft size={14} /> Pendapatan</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-red-50/80 backdrop-blur-sm rounded-2xl p-5 border border-red-200 shadow-sm">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wider flex items-center gap-1"><ArrowUpRight size={14} /> Pengeluaran</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalExpense)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <Filter size={18} />
                    <span className="font-medium text-sm">Filter</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Mulai</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Akhir</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="">Semua</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Kode Transaksi</label>
                        <select value={codeId} onChange={e => setCodeId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="">Semua</option>
                            {codes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Modul</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sumber</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deskripsi</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode</th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada data transaksi</td></tr>
                            ) : transactions.map((t, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', moduleColors[t.module] || 'bg-slate-100 text-slate-600')}>
                                            {moduleLabels[t.module] || t.module}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[200px] truncate">{t.source}</td>
                                    <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[200px] truncate">{t.description}</td>
                                    <td className="px-5 py-3.5">
                                        {t.code ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-50 text-green-700 font-mono text-xs font-semibold">{t.code}</span>
                                        ) : <span className="text-xs text-slate-400">-</span>}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-slate-600">{t.category}</td>
                                    <td className={clsx('px-5 py-3.5 text-sm font-semibold text-right whitespace-nowrap', t.type === 'Income' ? 'text-emerald-600' : 'text-red-600')}>
                                        {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GlobalTransactions;
