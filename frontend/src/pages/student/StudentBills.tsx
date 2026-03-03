import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, CheckCircle, Clock, AlertTriangle, Upload, CreditCard, Wallet, X, Landmark, Copy, Send } from 'lucide-react';
import clsx from 'clsx';

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    bill_type: string;
    payment_link?: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const StudentBills: React.FC = () => {
    const { user } = useAuth();

    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer'>('Transfer');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const { data: bills, isLoading, refetch } = useQuery({
        queryKey: ['student-bills', user?.id],
        queryFn: async () => {
            const res = await api.get('/finance/bills');
            return res.data;
        },
        enabled: !!user,
    });

    const unpaidBills = bills?.filter((b: Bill) => b.status !== 'Paid') || [];
    const paidBills = bills?.filter((b: Bill) => b.status === 'Paid') || [];
    const totalUnpaid = unpaidBills.reduce((acc: number, b: Bill) => acc + b.amount, 0);

    const openPayModal = (bill: Bill) => {
        setSelectedBill(bill);
        setPaymentMethod('Transfer');
        setProofFile(null);
        setSuccessMsg('');
        setShowPayModal(true);
    };

    const handleSubmitPayment = async () => {
        if (!selectedBill) return;

        setSubmitting(true);
        try {
            if (paymentMethod === 'Transfer' && proofFile) {
                // Upload proof and record payment
                const formData = new FormData();
                formData.append('file', proofFile);
                formData.append('bill_id', selectedBill.id);
                formData.append('amount', selectedBill.amount.toString());
                formData.append('method', 'Transfer');

                await api.post('/finance/payment-proof', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // Record cash payment
                await api.post('/finance/payments', {
                    bill_id: selectedBill.id,
                    amount: selectedBill.amount,
                    method: 'Cash',
                });
            }

            setSuccessMsg('Pembayaran berhasil dikirim! Bendahara akan memverifikasi.');
            refetch();

            setTimeout(() => {
                setShowPayModal(false);
                setSuccessMsg('');
            }, 2500);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal mengirim pembayaran');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusInfo = (bill: Bill) => {
        if (bill.status === 'Paid') return { color: 'emerald', icon: CheckCircle, label: 'Lunas' };
        const overdue = new Date(bill.due_date) < new Date();
        if (overdue) return { color: 'red', icon: AlertTriangle, label: 'Terlambat' };
        return { color: 'amber', icon: Clock, label: 'Belum Lunas' };
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tagihan Saya</h1>
                <p className="text-slate-500 mt-1">Lihat dan bayar tagihan sekolah Anda.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Total Belum Dibayar</p>
                    <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalUnpaid)}</h2>
                    <p className="text-xs text-slate-400 mt-1">{unpaidBills.length} tagihan</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Tagihan Lunas</p>
                    <h2 className="text-2xl font-bold text-emerald-600 mt-1">{paidBills.length}</h2>
                    <p className="text-xs text-slate-400 mt-1">tagihan selesai</p>
                </div>
            </div>

            {/* Bills List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Daftar Tagihan</h2>
                </div>
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
                    </div>
                ) : bills?.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-700">Belum Ada Tagihan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {bills?.map((bill: Bill) => {
                            const status = getStatusInfo(bill);
                            const StatusIcon = status.icon;
                            return (
                                <div key={bill.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-slate-800">{bill.title}</h3>
                                            <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                {bill.bill_type || 'SPP'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                                            <span className="font-semibold text-slate-800">{formatCurrency(bill.amount)}</span>
                                            <span>Jatuh tempo: {new Date(bill.due_date).toLocaleDateString('id-ID')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={clsx(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium gap-1",
                                            status.color === 'emerald' && "bg-emerald-100 text-emerald-800",
                                            status.color === 'amber' && "bg-amber-100 text-amber-800",
                                            status.color === 'red' && "bg-red-100 text-red-800",
                                        )}>
                                            <StatusIcon size={12} /> {status.label}
                                        </span>
                                        {bill.status !== 'Paid' && (
                                            <button
                                                onClick={() => openPayModal(bill)}
                                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5"
                                            >
                                                <DollarSign size={14} /> Bayar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPayModal && selectedBill && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <h2 className="text-lg font-bold flex items-center text-slate-800">
                                <DollarSign className="text-indigo-600 mr-2" size={22} /> Bayar Tagihan
                            </h2>
                            <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={20} />
                            </button>
                        </div>

                        {successMsg ? (
                            <div className="p-8 text-center">
                                <CheckCircle size={56} className="mx-auto text-emerald-500 mb-4" />
                                <p className="text-lg font-semibold text-slate-800">{successMsg}</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-5">
                                {/* Bill Info */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-sm text-slate-500">{selectedBill.title}</p>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(selectedBill.amount)}</p>
                                    <p className="text-xs text-slate-400 mt-1">Jatuh tempo: {new Date(selectedBill.due_date).toLocaleDateString('id-ID')}</p>
                                </div>

                                {/* Payment Method Toggle */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('Cash')}
                                            className={clsx(
                                                "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                paymentMethod === 'Cash' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                                            )}
                                        >
                                            <Wallet size={14} /> Cash
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('Transfer')}
                                            className={clsx(
                                                "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                paymentMethod === 'Transfer' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                                            )}
                                        >
                                            <CreditCard size={14} /> Transfer
                                        </button>
                                    </div>
                                </div>

                                {paymentMethod === 'Transfer' && (
                                    <>
                                        {/* Bank Details */}
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-2">
                                            <p className="text-xs text-blue-600 font-medium">Transfer ke rekening berikut:</p>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                                        <Landmark size={20} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">BSI</p>
                                                        <p className="text-xs text-slate-500">a.n. Yayasan PPI 100</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono text-slate-800">7123456789</p>
                                                    <button
                                                        className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1 justify-end mt-1"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText('7123456789');
                                                            alert('Nomor rekening disalin!');
                                                        }}
                                                    >
                                                        <Copy size={12} /> Salin
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upload Proof */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Bukti Transfer</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                                    className="hidden"
                                                    id="proof-upload"
                                                />
                                                <label
                                                    htmlFor="proof-upload"
                                                    className={clsx(
                                                        "w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed rounded-xl cursor-pointer transition",
                                                        proofFile ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-blue-50"
                                                    )}
                                                >
                                                    <Upload size={20} />
                                                    {proofFile ? proofFile.name : 'Klik untuk upload bukti transfer'}
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {paymentMethod === 'Cash' && (
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                        <p className="text-sm text-emerald-800">
                                            💰 Silakan bayar langsung ke bendahara sekolah. Klik "Kirim" untuk mencatat pembayaran Anda.
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmitPayment}
                                    disabled={submitting || (paymentMethod === 'Transfer' && !proofFile)}
                                    className={clsx(
                                        "w-full py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2",
                                        submitting || (paymentMethod === 'Transfer' && !proofFile)
                                            ? "bg-slate-300 cursor-not-allowed"
                                            : "bg-indigo-600 hover:bg-indigo-700"
                                    )}
                                >
                                    <Send size={16} />
                                    {submitting ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentBills;
