import React, { useState, useEffect } from 'react';
import { TrendingDown, RotateCcw, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../../../services/api';
import { OperationalWithdrawal, PoolSummary } from './types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

interface Props {
    isWithdrawOpen: boolean;
    onCloseWithdraw: () => void;
    isReturnOpen: boolean;
    onCloseReturn: () => void;
    onSuccess: () => void;
    poolSummary: PoolSummary | null;
    unitID: number;
    opHistory: OperationalWithdrawal[];
}

export const SavingsOperationalModals: React.FC<Props> = ({
    isWithdrawOpen, onCloseWithdraw, isReturnOpen, onCloseReturn,
    onSuccess, poolSummary, unitID, opHistory
}) => {
    const [submitting, setSubmitting] = useState(false);

    // Withdraw State
    const [opWithdrawAmount, setOpWithdrawAmount] = useState('');
    const [opWithdrawPurpose, setOpWithdrawPurpose] = useState('');

    // Return State
    const [returnWithdrawalId, setReturnWithdrawalId] = useState('');
    const [returnAmount, setReturnAmount] = useState('');
    const [returnNotes, setReturnNotes] = useState('');
    const [returnSource, setReturnSource] = useState<'CashLedger' | 'Infaq'>('CashLedger');

    const outstandingWithdrawals = opHistory.filter(w => w.status !== 'Returned');

    useEffect(() => {
        if (isWithdrawOpen) {
            setOpWithdrawAmount('');
            setOpWithdrawPurpose('');
        }
    }, [isWithdrawOpen]);

    useEffect(() => {
        if (isReturnOpen) {
            setReturnWithdrawalId('');
            setReturnAmount('');
            setReturnNotes('');
            setReturnSource('CashLedger');
        }
    }, [isReturnOpen]);

    const handleOpWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/operational/withdraw', { 
                amount: parseFloat(opWithdrawAmount), 
                purpose: opWithdrawPurpose,
                unit_id: unitID
            });
            toast.success('Dana operasional berhasil diambil');
            onSuccess();
            onCloseWithdraw();
        } catch (error: any) { 
            console.error(error);
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/operational/return', { 
                withdrawal_id: returnWithdrawalId, 
                amount: parseFloat(returnAmount), 
                notes: returnNotes,
                source: returnSource,
                unit_id: unitID
            });
            toast.success('Dana berhasil dikembalikan');
            onSuccess();
            onCloseReturn();
        } catch (error: any) { 
            console.error(error);
        } finally { 
            setSubmitting(false); 
        }
    };

    return (
        <>
            {/* Operational Withdrawal Modal */}
            {isWithdrawOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                        <div className="p-8 border-b border-amber-100/50 flex justify-between items-center bg-amber-50/50 backdrop-blur-md">
                            <h2 className="text-2xl font-black flex items-center text-amber-800 tracking-tight">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mr-3"><TrendingDown size={24} /></div>
                                Ambil Operasional
                            </h2>
                            <button onClick={onCloseWithdraw} className="w-10 h-10 rounded-full hover:bg-amber-100 flex items-center justify-center transition-colors"><X size={24} className="text-amber-400" /></button>
                        </div>
                        <form onSubmit={handleOpWithdrawSubmit} className="p-8 space-y-6">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-amber-100">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Dana Tersedia (Pool):</p>
                                <p className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(poolSummary?.available_balance || 0)}</p>
                                <p className="text-[10px] mt-3 opacity-70 font-medium leading-relaxed italic">Catatan: Dana ini dipinjam dari pool tabungan dan harus dikembalikan.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tujuan Pengambilan <span className="text-red-500">*</span></label>
                                <input type="text" required placeholder="Cth: Pembelian inventaris kelas" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-amber-500/30 bg-slate-50/50 font-medium text-slate-700" value={opWithdrawPurpose} onChange={e => setOpWithdrawPurpose(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal (Rp) <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-amber-500 transition-colors">Rp</div>
                                    <input type="number" required min="1000" className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-amber-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" value={opWithdrawAmount} onChange={e => setOpWithdrawAmount(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={onCloseWithdraw} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={submitting} className="flex-[2] px-6 py-4 rounded-2xl bg-amber-600 text-white font-black uppercase tracking-widest shadow-xl shadow-amber-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                                    {submitting ? 'Memproses...' : 'Ambil Dana'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {isReturnOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto border border-white/20">
                        <div className="p-8 border-b border-blue-100/50 flex justify-between items-center bg-blue-50/50 backdrop-blur-md sticky top-0 z-10">
                            <h2 className="text-2xl font-black flex items-center text-blue-800 tracking-tight">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mr-3"><RotateCcw size={24} /></div>
                                Pengembalian Dana
                            </h2>
                            <button onClick={onCloseReturn} className="w-10 h-10 rounded-full hover:bg-blue-100 flex items-center justify-center transition-colors"><X size={24} className="text-blue-400" /></button>
                        </div>
                        <form onSubmit={handleReturnSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Item Pengambilan <span className="text-red-500">*</span></label>
                                <select required value={returnWithdrawalId} onChange={e => {
                                    setReturnWithdrawalId(e.target.value);
                                    const w = outstandingWithdrawals.find(w => w.id === e.target.value);
                                    if (w) setReturnAmount(String(w.amount - w.returned_amount));
                                }} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-bold text-slate-700 cursor-pointer appearance-none">
                                    <option value="">-- Pilih Data --</option>
                                    {outstandingWithdrawals.map(w => (
                                        <option key={w.id} value={w.id}>{formatDate(w.created_at)} — {w.purpose} (Rp {w.amount - w.returned_amount})</option>
                                    ))}
                                </select>
                                {outstandingWithdrawals.length === 0 && <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1"><ShieldCheck size={14} /> Tidak ada utang operasional aktif.</p>}
                            </div>
                            
                            {returnWithdrawalId && (() => {
                                const w = outstandingWithdrawals.find(w => w.id === returnWithdrawalId);
                                if (!w) return null;
                                return (
                                    <div className="p-4 rounded-2xl border bg-blue-50/50 border-blue-100 flex items-center justify-between">
                                        <p className="text-xs font-black uppercase tracking-widest opacity-60">Sisa Utang:</p>
                                        <p className="font-black tracking-tight text-xl">{formatCurrency(w.amount - w.returned_amount)}</p>
                                    </div>
                                );
                            })()}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal Kembali (Rp) <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-blue-500 transition-colors">Rp</div>
                                    <input type="number" required min="1000" className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" value={returnAmount} onChange={e => setReturnAmount(e.target.value)} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sumber Dana Pengembalian <span className="text-red-500">*</span></label>
                                <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
                                    <button type="button" onClick={() => setReturnSource('CashLedger')} className={clsx("flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2", returnSource === 'CashLedger' ? "bg-white text-blue-600 shadow-sm scale-[1.02]" : "text-slate-500")}>Kas Tunai (BKU)</button>
                                    <button type="button" onClick={() => setReturnSource('Infaq')} className={clsx("flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2", returnSource === 'Infaq' ? "bg-white text-blue-600 shadow-sm scale-[1.02]" : "text-slate-500")}>Infaq Yayasan</button>
                                </div>
                                <p className="text-[10px] mt-2 text-slate-500 font-medium">Buku kas BKU atau Infaq akan tercatat sebagai PENGELUARAN secara otomatis.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Keterangan</label>
                                <textarea rows={2} placeholder="Misal: Pengembalian dari dana BOS termin 1" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-medium text-slate-700" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={onCloseReturn} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={submitting || outstandingWithdrawals.length === 0} className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 pt-disabled">
                                    {submitting ? 'Memproses...' : 'Proses Kembali'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
