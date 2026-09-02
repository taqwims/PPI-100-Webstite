import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { PaymentType, ClassOption, AcademicYear } from './types';
import { useFeatureStore } from '../../../store/featureStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    paymentTypes: PaymentType[];
    classes: ClassOption[];
    academicYears: AcademicYear[];
    filterYearId: string;
    filterClassId: string;
}

export const BulkDeleteModal: React.FC<Props> = ({
    isOpen, onClose, onSuccess, paymentTypes, classes, academicYears, filterYearId, filterClassId
}) => {
    const isForceDeleteAllowed = useFeatureStore(s => s.school.allow_delete_paid_obligations === 'true');
    const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState(filterClassId);
    const [selectedYearId, setSelectedYearId] = useState(filterYearId);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPaymentTypeId || !selectedYearId) {
            toast.error('Pilih jenis pembayaran dan tahun ajaran');
            return;
        }

        const typeName = paymentTypes.find(t => String(t.id) === selectedPaymentTypeId)?.name || '';
        const className = classes.find(c => String(c.id) === selectedClassId)?.name || 'Semua Kelas';
        
        const confirmMsg = isForceDeleteAllowed
            ? `Hapus SEMUA tanggungan "${typeName}" untuk "${className}"? \n\n⚠️ PERINGATAN KOREKSI: Mode Koreksi AKTIF. Tanggungan yang SUDAH DIBAYAR beserta riwayat transaksi pembayaran, catatan kas BKU, dan realisasi RKAS juga AKAN IKUT DIHAPUS.`
            : `Hapus SEMUA tanggungan "${typeName}" untuk "${className}"? \n\nHanya tanggungan yang BELUM ADA PEMBAYARAN yang akan dihapus.`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            await api.delete('/finance/student-obligations/bulk', {
                params: {
                    payment_type_id: selectedPaymentTypeId,
                    academic_year_id: selectedYearId,
                    class_id: selectedClassId
                }
            });
            toast.success('Berhasil menghapus tanggungan massal');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Gagal menghapus tanggungan massal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
                    <div className="flex items-center gap-2">
                        <Trash2 className="text-red-600" size={20} />
                        <h2 className="text-lg font-bold text-red-900">Hapus Tanggungan Massal</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleDelete} className="p-6 space-y-4">
                    {isForceDeleteAllowed ? (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex gap-3">
                            <AlertTriangle className="text-red-600 shrink-0" size={20} />
                            <p className="text-xs text-red-800 leading-relaxed">
                                <strong>Mode Koreksi Transaksi Aktif:</strong> Penghapusan ini akan menghapus SEMUA tanggungan, <strong>termasuk yang sudah dibayar</strong>. Tagihan, riwayat transaksi pembayaran, catatan BKU, dan realisasi RKAS terkait akan otomatis dibatalkan/dihapus.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                            <p className="text-xs text-amber-800">
                                Fitur ini akan menghapus data tanggungan untuk banyak siswa sekaligus. 
                                <strong> Hanya tanggungan yang BELUM ADA PEMBAYARAN yang akan dihapus.</strong> Data siswa di User Management tidak akan terhapus.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                        <select 
                            value={selectedYearId} 
                            onChange={e => setSelectedYearId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                            required
                        >
                            <option value="">Pilih Tahun</option>
                            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kelas (Opsional)</label>
                        <select 
                            value={selectedClassId} 
                            onChange={e => setSelectedClassId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                        >
                            <option value="">Semua Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Pembayaran</label>
                        <select 
                            value={selectedPaymentTypeId} 
                            onChange={e => setSelectedPaymentTypeId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                            required
                        >
                            <option value="">Pilih Jenis Pembayaran</option>
                            {paymentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">Batal</button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition text-sm flex items-center gap-2"
                        >
                            {loading ? 'Menghapus...' : <><Trash2 size={16} /> Hapus Sekarang</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
