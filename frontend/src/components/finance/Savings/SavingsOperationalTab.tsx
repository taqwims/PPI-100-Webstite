import React from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { OperationalWithdrawal } from './types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

interface Props {
    loading: boolean;
    opHistory: OperationalWithdrawal[];
    fetchOpHistory: () => void;
    openReturnModal: () => void;
}

export const SavingsOperationalTab: React.FC<Props> = ({
    loading, opHistory, fetchOpHistory, openReturnModal
}) => {
    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Riwayat Operasional</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Dana pool tabungan untuk operasional sekolah</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { fetchOpHistory(); openReturnModal(); }} 
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-bold text-sm"
                    >
                        <RotateCcw size={18} /> Pengembalian Dana
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Tanggal</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Tujuan</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Diambil</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Kembali</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Sisa</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={6} className="py-20 text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                        ) : opHistory.length === 0 ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400"><div className="flex flex-col items-center gap-4"><ShieldCheck size={64} className="opacity-20" /><p className="text-xl font-black opacity-40 uppercase tracking-widest">Tidak Ada Utang</p></div></td></tr>
                        ) : opHistory.map(w => {
                            const remaining = w.amount - w.returned_amount;
                            return (
                                <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6 text-slate-500 font-bold text-sm whitespace-nowrap">{formatDate(w.created_at)}</td>
                                    <td className="px-8 py-6">
                                        <p className="font-extrabold text-slate-800">{w.purpose}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">PIC: {w.handled_by?.name}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-red-600">{formatCurrency(w.amount)}</td>
                                    <td className="px-8 py-6 text-right font-black text-blue-600">{formatCurrency(w.returned_amount)}</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={clsx("font-black tracking-tight text-lg", remaining > 0 ? "text-amber-600" : "text-slate-200")}>
                                            {remaining > 0 ? formatCurrency(remaining) : 'LUNAS'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={clsx("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full",
                                            w.status === 'Returned' ? 'bg-emerald-50 text-emerald-700' :
                                            w.status === 'PartialReturn' ? 'bg-amber-50 text-amber-700' :
                                            'bg-red-50 text-red-700'
                                        )}>
                                            {w.status === 'Returned' ? 'Lunas' : w.status === 'PartialReturn' ? 'Parsial' : 'Belum'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
