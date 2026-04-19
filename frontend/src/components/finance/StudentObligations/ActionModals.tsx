import React from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { Obligation } from './types';

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

interface ActionModalsProps {
    payingOb: Obligation | null;
    setPayingOb: (ob: Obligation | null) => void;
    payAmount: string;
    setPayAmount: (amount: string) => void;
    editingOb: Obligation | null;
    setEditingOb: (ob: Obligation | null) => void;
    editAmount: string;
    setEditAmount: (amount: string) => void;
    onSuccess: () => void;
}

export const ActionModals: React.FC<ActionModalsProps> = ({
    payingOb, setPayingOb, payAmount, setPayAmount,
    editingOb, setEditingOb, editAmount, setEditAmount,
    onSuccess
}) => {
    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingOb) return;
        try {
            await api.post(`/finance/student-obligations/${payingOb.id}/pay`, {
                amount: parseFloat(payAmount)
            });
            toast.success('Pembayaran berhasil dicatat');
            setPayingOb(null);
            setPayAmount('');
            onSuccess();
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOb) return;
        try {
            await api.put(`/finance/student-obligations/${editingOb.id}`, {
                amount: parseFloat(editAmount)
            });
            toast.success('Berhasil diperbarui');
            setEditingOb(null);
            onSuccess();
        } catch (err: any) {
            console.error(err);
        }
    };

    return (
        <>
            {/* Pay Modal */}
            {payingOb && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Catat Pembayaran</h2>
                            <button onClick={() => setPayingOb(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handlePay} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <p className="text-sm text-slate-700 font-medium">{payingOb.student?.user?.name}</p>
                                <p className="text-xs text-slate-500">{payingOb.payment_type?.name} — Sisa: {formatCurrency(payingOb.amount - payingOb.paid_amount)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Bayar (Rp)</label>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium" required min="1" />
                            </div>
                            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setPayingOb(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">Batal</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition text-sm">Bayar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {editingOb && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditingOb(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Ubah Tanggungan</h2>
                            <button onClick={() => setEditingOb(null)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEdit} className="p-5">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Asli (Rp)</label>
                                <input
                                    type="number"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Mengubah nominal asli tagihan. Belum terbayar: {formatCurrency(Math.max(0, parseFloat(editAmount || '0') - editingOb.paid_amount))}</p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setEditingOb(null)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
