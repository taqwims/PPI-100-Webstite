import React, { useState, useEffect } from 'react';
import { TrendingDown, RotateCcw, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { ReceivableWithdrawal, PoolSummary } from './types';

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
    recHistory: ReceivableWithdrawal[];
}

export const SavingsReceivableModals: React.FC<Props> = ({
    isWithdrawOpen, onCloseWithdraw, isReturnOpen, onCloseReturn,
    onSuccess, poolSummary, unitID, recHistory
}) => {
    const [submitting, setSubmitting] = useState(false);

    // Withdraw State
    const [recWithdrawAmount, setRecWithdrawAmount] = useState('');
    const [recWithdrawPurpose, setRecWithdrawPurpose] = useState('');
    const [recWithdrawDescription, setRecWithdrawDescription] = useState('');
    const [borrowerName, setBorrowerName] = useState('');
    const [borrowerID, setBorrowerID] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [returnMethod, setReturnMethod] = useState<'Cicilan' | 'Sekali Bayar'>('Cicilan');

    // Return State
    const [returnWithdrawalId, setReturnWithdrawalId] = useState('');
    const [returnAmount, setReturnAmount] = useState('');
    const [returnNotes, setReturnNotes] = useState('');

    const outstandingWithdrawals = recHistory.filter(w => w.status !== 'Returned');

    useEffect(() => {
        if (isWithdrawOpen) {
            setRecWithdrawAmount('');
            setRecWithdrawPurpose('');
            setRecWithdrawDescription('');
            setBorrowerName('');
            setBorrowerID('');
            setDueDate('');
            setReturnMethod('Cicilan');
        }
    }, [isWithdrawOpen]);

    useEffect(() => {
        if (isReturnOpen) {
            setReturnWithdrawalId('');
            setReturnAmount('');
            setReturnNotes('');
        }
    }, [isReturnOpen]);

    const handleRecWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/finance/savings/receivable/withdraw', {
                amount: parseFloat(recWithdrawAmount),
                purpose: recWithdrawPurpose,
                description: recWithdrawDescription,
                borrower_name: borrowerName,
                borrower_id: borrowerID,
                due_date: dueDate,
                return_method: returnMethod,
                unit_id: unitID
            });
            toast.success('Piutang berhasil dicatat');
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
            await api.post('/finance/savings/receivable/return', {
                withdrawal_id: returnWithdrawalId,
                amount: parseFloat(returnAmount),
                notes: returnNotes,
                unit_id: unitID
            });
            toast.success('Piutang berhasil dikembalikan');
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
            {/* Receivable Withdrawal Modal */}
            {isWithdrawOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/20">
                        <div className="p-8 border-b border-rose-100/50 flex justify-between items-center bg-rose-50/50 backdrop-blur-md">
                            <h2 className="text-2xl font-black flex items-center text-rose-800 tracking-tight">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl mr-3"><TrendingDown size={24} /></div>
                                Catat Piutang
                            </h2>
                            <button onClick={onCloseWithdraw} className="w-10 h-10 rounded-full hover:bg-rose-100 flex items-center justify-center transition-colors"><X size={24} className="text-rose-400" /></button>
                        </div>
                        <form onSubmit={handleRecWithdrawSubmit} className="p-8 space-y-6">
                            <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-rose-100">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Dana Tersedia (Pool):</p>
                                <p className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(poolSummary?.available_balance || 0)}</p>
                                <p className="text-[10px] mt-3 opacity-70 font-medium leading-relaxed italic">Catatan: Dana ini dipinjam dari pool tabungan dan harus dikembalikan. Tidak masuk BKU.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nama Peminjam <span className="text-red-500">*</span></label>
                                    <input type="text" required placeholder="Nama lengkap..." className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-medium text-slate-700" value={borrowerName} onChange={e => setBorrowerName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ID Peminjam (NUP/KTP) <span className="text-red-500">*</span></label>
                                    <input type="text" required placeholder="Nomor identitas..." className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-medium text-slate-700" value={borrowerID} onChange={e => setBorrowerID(e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tujuan Pinjaman <span className="text-red-500">*</span></label>
                                    <input type="text" required placeholder="Cth: Pinjaman guru" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-medium text-slate-700" value={recWithdrawPurpose} onChange={e => setRecWithdrawPurpose(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jatuh Tempo <span className="text-red-500">*</span></label>
                                    <input type="date" required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-medium text-slate-700" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Keterangan Tambahan</label>
                                    <textarea rows={2} placeholder="Opsional..." className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-medium text-slate-700" value={recWithdrawDescription} onChange={e => setRecWithdrawDescription(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pengembalian <span className="text-red-500">*</span></label>
                                    <select required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-medium text-slate-700 cursor-pointer" value={returnMethod} onChange={e => setReturnMethod(e.target.value as 'Cicilan' | 'Sekali Bayar')}>
                                        <option value="Cicilan">Cicilan</option>
                                        <option value="Sekali Bayar">Sekali Bayar</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal (Rp) <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-rose-500 transition-colors">Rp</div>
                                    <input type="number" required min="1000" className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-rose-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" value={recWithdrawAmount} onChange={e => setRecWithdrawAmount(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={onCloseWithdraw} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                                <button type="submit" disabled={submitting} className="flex-[2] px-6 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest shadow-xl shadow-rose-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                                    {submitting ? 'Memproses...' : 'Catat Piutang'}
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
                                Pengembalian Piutang
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
                                {outstandingWithdrawals.length === 0 && <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1"><ShieldCheck size={14} /> Tidak ada piutang aktif.</p>}
                            </div>

                            {returnWithdrawalId && (() => {
                                const w = outstandingWithdrawals.find(w => w.id === returnWithdrawalId);
                                if (!w) return null;
                                return (
                                    <div className="p-4 rounded-2xl border bg-blue-50/50 border-blue-100 flex items-center justify-between">
                                        <p className="text-xs font-black uppercase tracking-widest opacity-60">Sisa Piutang:</p>
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
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Keterangan</label>
                                <textarea rows={2} placeholder="Keterangan opsional..." className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500/30 bg-slate-50/50 font-medium text-slate-700" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
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
