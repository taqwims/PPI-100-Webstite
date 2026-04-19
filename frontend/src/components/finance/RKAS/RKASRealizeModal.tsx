import React, { useState, useEffect } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { TransactionCode } from './types';

interface RKASRealizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetId: string | null;
    transactionCodes: TransactionCode[];
    onSubmit: (data: any) => Promise<void>;
}

export const RKASRealizeModal: React.FC<RKASRealizeModalProps> = ({
    isOpen, onClose, budgetId, transactionCodes, onSubmit
}) => {
    const [realizeForm, setRealizeForm] = useState({ id: '', amount: '', source: 'Kas Umum', transaction_code_id: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && budgetId) {
            setRealizeForm({ id: budgetId, amount: '', source: 'Kas Umum', transaction_code_id: '', notes: '' });
        }
    }, [isOpen, budgetId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit(realizeForm);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="text-green-600" size={20} /> Input Realisasi
                    </h3>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Realisasi (Rp)</label>
                        <input type="number" value={realizeForm.amount} onChange={e => setRealizeForm({ ...realizeForm, amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sumber Kas</label>
                        <select value={realizeForm.source} onChange={e => setRealizeForm({ ...realizeForm, source: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                            <option value="Kas Umum">Kas Umum</option>
                            <option value="Infaq">Infaq / Donasi</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kode Transaksi</label>
                        <select value={realizeForm.transaction_code_id} onChange={e => setRealizeForm({ ...realizeForm, transaction_code_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                            <option value="">Pilih Kode Transaksi</option>
                            {transactionCodes.filter(tc => tc.transaction_type === 'Expense').map(tc => <option key={tc.id} value={tc.id}>{tc.name} ({tc.category})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                        <input type="text" value={realizeForm.notes} onChange={e => setRealizeForm({ ...realizeForm, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" placeholder="Opsional" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Batal</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/25">Simpan Realisasi</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
