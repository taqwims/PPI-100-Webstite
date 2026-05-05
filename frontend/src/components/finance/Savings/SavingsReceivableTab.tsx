import React, { useState } from 'react';
import { RotateCcw, ShieldCheck, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { ReceivableWithdrawal } from './types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

interface Props {
    loading: boolean;
    recHistory: ReceivableWithdrawal[];
    fetchRecHistory: () => void;
    openReturnModal: () => void;
    onPrintInvoice: (item: ReceivableWithdrawal) => void;
}

export const SavingsReceivableTab: React.FC<Props> = ({
    loading, recHistory, fetchRecHistory, openReturnModal, onPrintInvoice
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (borrowerId: string) => {
        setExpandedGroups(prev => ({ ...prev, [borrowerId]: !prev[borrowerId] }));
    };

    const groupedHistory = recHistory.reduce((acc, curr) => {
        const id = curr.borrower_id || 'Unknown';
        if (!acc[id]) {
            acc[id] = {
                borrower_name: curr.borrower_name || 'Tanpa Nama',
                borrower_id: curr.borrower_id || '-',
                total_amount: 0,
                total_returned: 0,
                withdrawals: []
            };
        }
        acc[id].total_amount += curr.amount;
        acc[id].total_returned += curr.returned_amount;
        acc[id].withdrawals.push(curr);
        return acc;
    }, {} as Record<string, { borrower_name: string, borrower_id: string, total_amount: number, total_returned: number, withdrawals: ReceivableWithdrawal[] }>);

    const groupList = Object.values(groupedHistory);

    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Riwayat Piutang</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Dana pool tabungan untuk di luar operasional sekolah</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { fetchRecHistory(); openReturnModal(); }} 
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-bold text-sm"
                    >
                        <RotateCcw size={18} /> Pengembalian Dana
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-6 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Peminjam</th>
                            <th className="px-6 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total Pinjaman</th>
                            <th className="px-6 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total Kembali</th>
                            <th className="px-6 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Sisa Piutang</th>
                            <th className="px-6 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                        ) : groupList.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400"><div className="flex flex-col items-center gap-4"><ShieldCheck size={64} className="opacity-20" /><p className="text-xl font-black opacity-40 uppercase tracking-widest">Tidak Ada Piutang</p></div></td></tr>
                        ) : groupList.map(group => {
                            const groupRemaining = group.total_amount - group.total_returned;
                            const isExpanded = expandedGroups[group.borrower_id];

                            return (
                                <React.Fragment key={group.borrower_id}>
                                    <tr 
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => toggleGroup(group.borrower_id)}
                                    >
                                        <td className="px-6 py-6">
                                            <p className="font-extrabold text-slate-800 text-base">{group.borrower_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">NUP/KTP: {group.borrower_id}</p>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <p className="font-bold text-slate-600">{formatCurrency(group.total_amount)}</p>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <p className="font-bold text-slate-500">{formatCurrency(group.total_returned)}</p>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <p className={clsx("font-black tracking-tight", groupRemaining > 0 ? "text-amber-600 text-lg" : "text-emerald-600 text-base")}>
                                                {groupRemaining > 0 ? formatCurrency(groupRemaining) : 'LUNAS'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <button className="p-2 text-slate-400 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>
                                        </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={5} className="p-0 bg-slate-50/50">
                                                <div className="px-8 py-6 border-b border-slate-100">
                                                    <table className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tanggal</th>
                                                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rincian</th>
                                                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Nominal</th>
                                                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Jatuh Tempo</th>
                                                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                                                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {group.withdrawals.map(w => {
                                                                const remaining = w.amount - w.returned_amount;
                                                                const isMenunggak = remaining > 0 && new Date() > new Date(w.due_date);

                                                                return (
                                                                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="px-4 py-4 text-slate-500 font-bold text-xs whitespace-nowrap">{formatDate(w.created_at)}</td>
                                                                        <td className="px-4 py-4">
                                                                            <p className="font-extrabold text-slate-700 text-sm">{w.purpose}</p>
                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Metode: {w.return_method}</p>
                                                                            {w.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{w.description}</p>}
                                                                        </td>
                                                                        <td className="px-4 py-4 text-right">
                                                                            <p className="font-black text-red-600 text-sm">P: {formatCurrency(w.amount)}</p>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">K: {formatCurrency(w.returned_amount)}</p>
                                                                            <p className={clsx("font-black tracking-tight mt-1 text-xs", remaining > 0 ? "text-amber-600" : "text-emerald-600")}>
                                                                                S: {remaining > 0 ? formatCurrency(remaining) : 'LUNAS'}
                                                                            </p>
                                                                        </td>
                                                                        <td className="px-4 py-4 text-center whitespace-nowrap">
                                                                            <p className="font-bold text-slate-600 text-xs">{w.due_date ? formatDate(w.due_date) : '-'}</p>
                                                                        </td>
                                                                        <td className="px-4 py-4 text-center">
                                                                            <span className={clsx("px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full",
                                                                                w.status === 'Returned' ? 'bg-emerald-50 text-emerald-700' :
                                                                                isMenunggak ? 'bg-red-50 text-red-700' :
                                                                                'bg-amber-50 text-amber-700'
                                                                            )}>
                                                                                {w.status === 'Returned' ? 'Lunas' : isMenunggak ? 'Menunggak' : 'Aktif'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-4 text-center">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); onPrintInvoice(w); }}
                                                                                className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                                                                                title="Cetak Invoice"
                                                                            >
                                                                                <Printer size={16} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
