import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle, X, Eye, Image as ImageIcon, Search, ShieldCheck, User, Calendar, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingPayment {
    id: string;
    student_id: number;
    bill_id: string;
    amount: number;
    payment_method: string;
    status: string;
    transaction_id?: string;
    proof_url?: string;
    paid_at?: string;
    created_at: string;
    student?: {
        user: { name: string };
        class?: { name: string };
    };
    bill?: {
        title: string;
    };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const PaymentVerification: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showProofModal, setShowProofModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);

    const { data: pendingPayments, isLoading } = useQuery<PendingPayment[]>({
        queryKey: ['pending-payments'],
        queryFn: async () => {
            const res = await api.get('/finance/payments/pending');
            return res.data;
        }
    });

    const approveMutation = useMutation({
        mutationFn: (paymentId: string) => api.post(`/finance/payments/${paymentId}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            toast.success('Pembayaran berhasil diverifikasi');
            setShowProofModal(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal memverifikasi pembayaran');
        }
    });

    // Grouping by Transaction ID / Invoice Number
    const groupedPayments = (pendingPayments || []).reduce((acc: any, payment) => {
        const key = payment.transaction_id || payment.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(payment);
        return acc;
    }, {});

    const filteredKeys = Object.keys(groupedPayments).filter(key => {
        const payments = groupedPayments[key];
        const studentName = payments[0].student?.user?.name?.toLowerCase() || '';
        return studentName.includes(searchQuery.toLowerCase()) || key.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-6 p-6 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Verifikasi Pembayaran</h1>
                    <p className="text-slate-500">Konfirmasi bukti transfer dan pembayaran tertunda</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama siswa atau ID Transaksi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition shadow-sm text-sm font-medium"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
                    <p className="text-slate-500 font-medium">Memuat data pembayaran...</p>
                </div>
            ) : filteredKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <ShieldCheck size={40} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-semibold text-lg">Semua Beres!</p>
                    <p className="text-slate-500">Tidak ada pembayaran pending yang perlu diverifikasi.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredKeys.map(key => {
                        const payments = groupedPayments[key];
                        const first = payments[0];
                        const totalAmount = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                        const isMulti = payments.length > 1;

                        return (
                            <div key={key} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                                <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <User size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 text-lg leading-none">{first.student?.user?.name}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                    {first.student?.class?.name || 'No Class'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                <Calendar size={12} /> {new Date(first.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {payments.map((p: any) => (
                                                    <span key={p.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 font-bold">
                                                        {p.bill?.title}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isMulti ? 'Total Pembayaran Kolektif' : 'Nominal Pembayaran'}</p>
                                            <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{formatCurrency(totalAmount)}</p>
                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">Ref: {key}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-2">
                                            {first.proof_url && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedPayment(first);
                                                        setShowProofModal(true);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition border border-blue-100"
                                                >
                                                    <ImageIcon size={16} /> Bukti
                                                </button>
                                            )}
                                            <button
                                                onClick={() => approveMutation.mutate(first.id)}
                                                disabled={approveMutation.isPending}
                                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                                            >
                                                <CheckCircle size={16} />
                                                {approveMutation.isPending ? 'Proses...' : 'Approve'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Proof Modal */}
            {showProofModal && selectedPayment && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <ShieldCheck className="text-indigo-600" size={24} />
                                    Verifikasi Bukti Transfer
                                </h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Konfirmasi kesesuaian nominal pada bukti transfer</p>
                            </div>
                            <button onClick={() => setShowProofModal(false)} className="bg-white p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:rotate-90 transition-all duration-300 shadow-sm border border-slate-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Informasi Siswa</p>
                                        <p className="font-bold text-slate-800 text-lg">{selectedPayment.student?.user?.name}</p>
                                        <p className="text-xs font-semibold text-indigo-600 mt-0.5">{selectedPayment.student?.class?.name || 'No Class'}</p>
                                    </div>

                                    <div className="bg-indigo-600 p-6 rounded-[28px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                            <CreditCard size={80} />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Harus Diverifikasi</p>
                                        <p className="text-3xl font-black font-mono tracking-tighter">
                                            {formatCurrency(groupedPayments[selectedPayment.transaction_id || selectedPayment.id].reduce((s:any, p:any) => s + p.amount, 0))}
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-white/20">
                                            <p className="text-[10px] font-bold opacity-60">ID Transaksi / Invoice</p>
                                            <p className="text-xs font-mono font-bold tracking-tight">{selectedPayment.transaction_id || selectedPayment.id}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => approveMutation.mutate(selectedPayment.id)}
                                            disabled={approveMutation.isPending}
                                            className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transform active:scale-95"
                                        >
                                            <CheckCircle size={18} />
                                            Verifikasi & Terbitkan Kuitansi
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Gambar Bukti Transfer</p>
                                    <div className="bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden shadow-inner aspect-[3/4] group relative">
                                        <img
                                            src={selectedPayment.proof_url}
                                            alt="Proof of payment"
                                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none" />
                                    </div>
                                    <a
                                        href={selectedPayment.proof_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                    >
                                        <Eye size={12} /> Buka Gambar di Jendela Baru
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentVerification;
