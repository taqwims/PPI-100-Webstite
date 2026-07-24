import React, { useState, useEffect } from 'react';
import { DollarSign, X, CheckCircle, Smartphone, CreditCard, Upload, Send, Copy, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Bill, formatCurrency, getRemainingAmount, formatPaymentDate } from './BillingUtils';
import BankAccountInfo from './BankAccountInfo';
import { MidtransDetail } from '../../../hooks/useBillingPayment';

interface BillingPaymentModalProps {
    showPayModal: boolean;
    setShowPayModal: (val: boolean) => void;
    selectedBill: Bill | null;
    paymentMethod: 'Transfer' | 'Midtrans';
    setPaymentMethod: (val: 'Transfer' | 'Midtrans') => void;
    paymentAmount: number;
    setPaymentAmount: (val: number) => void;
    proofFile: File | null;
    setProofFile: (file: File | null) => void;
    submitting: boolean;
    loadingSnap: boolean;
    cancelingPayment?: boolean;
    successMsg: string;
    activeMidtransDetail?: MidtransDetail | null;
    cancelPendingPayment?: (orderId: string) => void;
    handleMidtransPayment: () => void;
    handleSubmitPayment: () => void;
}

const BillingPaymentModal: React.FC<BillingPaymentModalProps> = ({
    showPayModal, setShowPayModal, selectedBill,
    paymentMethod, setPaymentMethod, paymentAmount, setPaymentAmount,
    proofFile, setProofFile, submitting, loadingSnap, cancelingPayment, successMsg,
    activeMidtransDetail, cancelPendingPayment,
    handleMidtransPayment, handleSubmitPayment
}) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    // Expiry timer calculation
    useEffect(() => {
        if (!activeMidtransDetail?.expiry_time) return;

        const updateTimer = () => {
            const expiryDate = new Date(activeMidtransDetail.expiry_time!).getTime();
            const now = new Date().getTime();
            const diff = expiryDate - now;

            if (diff <= 0) {
                setTimeLeft('Waktu pembayaran habis (Expired)');
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeMidtransDetail?.expiry_time]);

    if (!showPayModal || !selectedBill) return null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} berhasil disalin!`);
    };

    // Determine pending payment from selectedBill
    const pendingPayment = selectedBill.payments?.find(
        p => p.payment_method === 'Midtrans' && p.status === 'Pending'
    );

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                    <h2 className="text-lg font-bold flex items-center text-slate-800">
                        <DollarSign className="text-indigo-600 mr-2" size={22} /> Bayar Tagihan
                    </h2>
                    <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
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
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs font-medium text-slate-500">Sisa Tagihan:</p>
                                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(getRemainingAmount(selectedBill))}</p>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Jatuh tempo: {new Date(selectedBill.due_date).toLocaleDateString('id-ID')}</p>
                            </div>

                            {/* Section Active Pending Payment */}
                            {pendingPayment && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                                            <AlertCircle size={18} className="text-amber-600" />
                                            <span>Menunggu Pembayaran</span>
                                        </div>
                                        {timeLeft && (
                                            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                                                <Clock size={12} />
                                                <span>{timeLeft}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Midtrans VA or Detail display */}
                                    {activeMidtransDetail && (
                                        <div className="bg-white p-3.5 rounded-xl border border-amber-100 space-y-2 text-xs">
                                            <p className="text-slate-500">Tipe Pembayaran: <span className="font-semibold text-slate-800 capitalize">{activeMidtransDetail.payment_type?.replace(/_/g, ' ') || 'Midtrans'}</span></p>

                                            {/* Bank VA list */}
                                            {activeMidtransDetail.va_numbers && activeMidtransDetail.va_numbers.map((va: { bank: string; va_number: string }, idx: number) => (
                                                <div key={idx} className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between border border-slate-200">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">{va.bank} Virtual Account</span>
                                                        <span className="text-base font-bold tracking-wider text-indigo-900">{va.va_number}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(va.va_number, 'Nomor VA')}
                                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md font-medium flex items-center gap-1 transition"
                                                    >
                                                        <Copy size={12} /> Salin
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Permata VA */}
                                            {activeMidtransDetail.permata_va_number && (
                                                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between border border-slate-200">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Permata Virtual Account</span>
                                                        <span className="text-base font-bold tracking-wider text-indigo-900">{activeMidtransDetail.permata_va_number}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(activeMidtransDetail.permata_va_number!, 'Nomor VA')}
                                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md font-medium flex items-center gap-1 transition"
                                                    >
                                                        <Copy size={12} /> Salin
                                                    </button>
                                                </div>
                                            )}

                                            {/* Mandiri Bill */}
                                            {activeMidtransDetail.bill_key && activeMidtransDetail.biller_code && (
                                                <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 border border-slate-200">
                                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Mandiri Bill Payment</span>
                                                    <div className="flex justify-between items-center">
                                                        <span>Kode Perusahaan: <b>{activeMidtransDetail.biller_code}</b></span>
                                                        <button onClick={() => copyToClipboard(activeMidtransDetail.biller_code!, 'Biller Code')} className="p-1 text-indigo-600"><Copy size={12} /></button>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Kode Bayar: <b className="text-indigo-900">{activeMidtransDetail.bill_key}</b></span>
                                                        <button onClick={() => copyToClipboard(activeMidtransDetail.bill_key!, 'Kode Bayar')} className="p-1 text-indigo-600"><Copy size={12} /></button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* QRIS / E-Wallet QR Code display */}
                                            {(activeMidtransDetail.payment_type === 'qris' || activeMidtransDetail.payment_type === 'gopay' || activeMidtransDetail.qr_code_url) && (
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center space-y-2">
                                                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Scan QRIS Untuk Membayar</p>
                                                    {activeMidtransDetail.qr_code_url ? (
                                                        <div className="bg-white p-2 inline-block rounded-xl shadow-sm border border-slate-200">
                                                            <img
                                                                src={activeMidtransDetail.qr_code_url}
                                                                alt="QRIS Code"
                                                                className="w-48 h-48 mx-auto object-contain"
                                                                onError={(e) => {
                                                                    // Fallback display if QR image URL fails
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                    ) : null}
                                                    <p className="text-[10px] text-slate-500">
                                                        Bisa di-scan menggunakan BCA Mobile, GoPay, OVO, Dana, ShopeePay, LinkAja, atau m-Banking pendukung QRIS lainnya.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action to change payment method */}
                                    {cancelPendingPayment && (
                                        <button
                                            onClick={() => cancelPendingPayment(pendingPayment.transaction_id!)}
                                            disabled={cancelingPayment}
                                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <RefreshCw size={14} className={clsx(cancelingPayment && "animate-spin")} />
                                            {cancelingPayment ? 'Membatalkan Transaksi...' : 'Salah Pilih / Ganti Metode Pembayaran'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Riwayat Pembayaran */}
                            {selectedBill.payments && selectedBill.payments.length > 0 && (
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Riwayat Pembayaran</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        {selectedBill.payments.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                                                <div>
                                                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                        p.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : p.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                    )}>{p.status}</span>
                                                    <span className="text-xs text-slate-500 ml-2">{formatPaymentDate(p)}</span>
                                                </div>
                                                <span className="font-semibold text-slate-700">{formatCurrency(p.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!pendingPayment && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Pembayaran</label>
                                        {selectedBill.is_installment ? (
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                                    max={getRemainingAmount(selectedBill)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                                                />
                                                <p className="text-xs text-blue-600 mt-1">Tagihan ini dapat dibayar sebagian (cicil).</p>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-800 font-bold text-lg">
                                                {formatCurrency(paymentAmount)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Method Toggle */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('Midtrans')}
                                                className={clsx(
                                                    "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                    paymentMethod === 'Midtrans' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                                                )}
                                            >
                                                <Smartphone size={14} /> Online
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

                                    {paymentMethod === 'Midtrans' && (
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                                    <Smartphone size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">Pembayaran Online</p>
                                                    <p className="text-xs text-slate-500">QRIS, E-Wallet, Bank Transfer (VA), Kartu Kredit</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-indigo-600 mt-2">
                                                💡 Klik tombol bayar di bawah untuk membuka halaman pilihan pembayaran.
                                            </p>
                                        </div>
                                    )}

                                    {paymentMethod === 'Transfer' && (
                                        <>
                                            <BankAccountInfo />
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Bukti Transfer</label>
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            if (f) {
                                                                if (f.size > 3 * 1024 * 1024) {
                                                                    toast.error("Maksimal ukuran file 3MB");
                                                                    e.target.value = '';
                                                                    return;
                                                                }
                                                                setProofFile(f);
                                                            } else {
                                                                setProofFile(null);
                                                            }
                                                        }}
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

                                    {paymentMethod === 'Midtrans' ? (
                                        <button
                                            onClick={handleMidtransPayment}
                                            disabled={loadingSnap || paymentAmount <= 0}
                                            className={clsx(
                                                "w-full py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2",
                                                (loadingSnap || paymentAmount <= 0)
                                                    ? "bg-slate-300 cursor-not-allowed"
                                                    : "bg-indigo-600 hover:bg-indigo-700"
                                            )}
                                        >
                                            <Smartphone size={16} />
                                            {loadingSnap ? 'Memproses...' : 'Bayar via Midtrans'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSubmitPayment}
                                            disabled={submitting || paymentAmount <= 0 || (paymentMethod === 'Transfer' && !proofFile)}
                                            className={clsx(
                                                "w-full py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2",
                                                (submitting || paymentAmount <= 0 || (paymentMethod === 'Transfer' && !proofFile))
                                                    ? "bg-slate-300 cursor-not-allowed"
                                                    : "bg-indigo-600 hover:bg-indigo-700"
                                            )}
                                        >
                                            <Send size={16} />
                                            {submitting ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingPaymentModal;
