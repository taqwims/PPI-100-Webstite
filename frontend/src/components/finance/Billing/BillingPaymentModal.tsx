import React from 'react';
import { DollarSign, X, CheckCircle, Smartphone, CreditCard, Upload, Send, RefreshCw, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { Bill, formatCurrency, getRemainingAmount, formatPaymentDate } from './BillingUtils';
import BankAccountInfo from './BankAccountInfo';
import { MidtransDetail } from '../../../hooks/useBillingPayment';
import { useFeatureStore } from '../../../store/featureStore';

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
    handleMidtransPayment: (bill?: Bill) => void;
    handleSubmitPayment: () => void;
}

const BillingPaymentModal: React.FC<BillingPaymentModalProps> = ({
    showPayModal, setShowPayModal, selectedBill,
    paymentMethod, setPaymentMethod, paymentAmount, setPaymentAmount,
    proofFile, setProofFile, submitting, loadingSnap, successMsg,
    handleMidtransPayment, handleSubmitPayment
}) => {
    const activeGateway = useFeatureStore(s => s.school.active_payment_gateway) || 'midtrans';

    if (!selectedBill) return null;
    if (!showPayModal) return null;

    // -------------------------------------------------------------
    // VIEW 1: SUCCESS SCREEN
    // -------------------------------------------------------------
    if (successMsg && showPayModal) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-5 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                        <CheckCircle size={56} className="animate-bounce" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-extrabold text-slate-900">Pembayaran Berhasil!</h3>
                        <p className="text-sm text-slate-600 mt-2">{successMsg}</p>
                    </div>
                    <button
                        onClick={() => setShowPayModal(false)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-600/20 transition"
                    >
                        Tutup Halaman
                    </button>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // VIEW 3: FORM VIEW (Pilih Jumlah & Metode Pembayaran Baru)
    // -------------------------------------------------------------
    const remaining = getRemainingAmount(selectedBill);
    const isInstallment = Boolean(
        selectedBill.is_installment ||
        selectedBill.bill_type === 'Bertahap' ||
        selectedBill.bill_type?.toLowerCase().includes('bertahap') ||
        selectedBill.title?.toLowerCase().includes('bertahap') ||
        selectedBill.obligation?.payment_type?.payment_schedule === 'Bertahap' ||
        selectedBill.obligation?.payment_type?.payment_schedule?.toLowerCase().includes('bertahap') ||
        (selectedBill as any).payment_type?.payment_schedule === 'Bertahap' ||
        (selectedBill.obligation && selectedBill.obligation.total_installments > 0) ||
        selectedBill.status === 'Partial'
    );

    const isOverAmount = paymentAmount > remaining;
    const isZeroOrNegative = paymentAmount <= 0;
    const calculatedRemainingAfter = Math.max(0, remaining - (paymentAmount || 0));

    // Preset shortcuts for installment
    const presetAmounts = [50000, 100000, 200000, 500000].filter(p => p < remaining);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/70 shrink-0">
                    <h2 className="text-lg font-bold flex items-center text-slate-800">
                        <DollarSign className="text-indigo-600 mr-2" size={22} /> Bayar Tagihan
                    </h2>
                    <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {/* Bill Info Card */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">{selectedBill.title}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                                        {selectedBill.bill_type || 'SPP'}
                                    </span>
                                    {isInstallment && (
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded uppercase">
                                            Bisa Dicicil
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-slate-500">Sisa Tanggungan:</p>
                                <p className="text-xl font-extrabold text-slate-900">{formatCurrency(remaining)}</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">Jatuh tempo: {new Date(selectedBill.due_date).toLocaleDateString('id-ID')}</p>
                    </div>

                    {/* Payment History */}
                    {selectedBill.payments && selectedBill.payments.length > 0 && (
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Riwayat Pembayaran</p>
                            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                                {selectedBill.payments.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                                        <div>
                                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                p.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : p.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                            )}>{p.status}</span>
                                            <span className="text-[11px] text-slate-500 ml-2">{formatPaymentDate(p)}</span>
                                        </div>
                                        <span className="font-bold text-slate-700">{formatCurrency(p.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Amount Input & Real-Time Calculation */}
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Nominal Pembayaran
                            </label>
                            {isInstallment && (
                                <span className="text-[11px] font-medium text-blue-600">
                                    Bisa bayar bertahap (cicil)
                                </span>
                            )}
                        </div>

                        {isInstallment ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        value={paymentAmount || ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                                            setPaymentAmount(val);
                                        }}
                                        min={1}
                                        max={remaining}
                                        placeholder="Masukkan nominal yang ingin dibayar..."
                                        className={clsx(
                                            "w-full pl-11 pr-4 py-3 rounded-2xl border text-lg font-extrabold focus:ring-2 transition",
                                            isOverAmount
                                                ? "border-red-500 bg-red-50/30 text-red-900 focus:ring-red-500"
                                                : "border-slate-200 text-slate-900 focus:ring-indigo-500"
                                        )}
                                    />
                                </div>

                                {/* Preset Shortcut Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentAmount(remaining)}
                                        className={clsx(
                                            "px-2.5 py-1 rounded-xl text-xs font-bold transition",
                                            paymentAmount === remaining
                                                ? "bg-indigo-600 text-white shadow-xs"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        )}
                                    >
                                        Bayar Lunas ({formatCurrency(remaining)})
                                    </button>
                                    {presetAmounts.map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPaymentAmount(p)}
                                            className={clsx(
                                                "px-2.5 py-1 rounded-xl text-xs font-bold transition",
                                                paymentAmount === p
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            )}
                                        >
                                            {formatCurrency(p)}
                                        </button>
                                    ))}
                                </div>

                                {/* Over-amount Warning Alert */}
                                {isOverAmount && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold animate-in fade-in">
                                        ⚠️ Nominal pembayaran tidak boleh melebihi sisa tanggungan! Maksimal {formatCurrency(remaining)}.
                                    </div>
                                )}

                                {/* Real-time Remaining Calculation Breakdown */}
                                {!isOverAmount && paymentAmount > 0 && (
                                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1.5 text-xs text-slate-700">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Sisa Tanggungan Saat Ini:</span>
                                            <span className="font-semibold text-slate-800">{formatCurrency(remaining)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Nominal Akan Dibayar:</span>
                                            <span className="font-bold text-indigo-700">- {formatCurrency(paymentAmount)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-indigo-100/80 font-bold">
                                            <span className="text-slate-800">Sisa Tanggungan Setelah Ini:</span>
                                            <span className={clsx(
                                                calculatedRemainingAfter === 0 ? "text-emerald-600" : "text-amber-600"
                                            )}>
                                                {calculatedRemainingAfter === 0 ? 'LUNAS (Rp 0)' : formatCurrency(calculatedRemainingAfter)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 rounded-2xl border border-slate-200 text-slate-900 font-extrabold text-lg">
                                    <span>{formatCurrency(remaining)}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 italic">
                                    * Tagihan ini bukan pembayaran bertahap sehingga dibayar sesuai nominal penuh.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Metode Pembayaran</label>
                        <div className="grid grid-cols-1 gap-3">
                            {activeGateway !== 'none' && (
                                <label className={clsx(
                                    "flex items-center p-3.5 rounded-2xl border-2 cursor-pointer transition-all",
                                    paymentMethod === 'Midtrans' ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                                )}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="Midtrans"
                                        checked={paymentMethod === 'Midtrans'}
                                        onChange={() => setPaymentMethod('Midtrans')}
                                        className="sr-only"
                                    />
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 font-bold shrink-0">
                                        <Smartphone size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-slate-800">
                                            Online ({activeGateway === 'mayar' ? 'Mayar.id' : activeGateway === 'xendit' ? 'Xendit' : 'Midtrans'})
                                        </p>
                                        <p className="text-xs text-slate-500">QRIS, Virtual Account (BCA, BNI, BRI, Mandiri), E-Wallet</p>
                                    </div>
                                </label>
                            )}

                            <label className={clsx(
                                "flex items-center p-3.5 rounded-2xl border-2 cursor-pointer transition-all",
                                paymentMethod === 'Transfer' ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                            )}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="Transfer"
                                    checked={paymentMethod === 'Transfer'}
                                    onChange={() => setPaymentMethod('Transfer')}
                                    className="sr-only"
                                />
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold shrink-0">
                                    <CreditCard size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800">Transfer Bank Manual</p>
                                    <p className="text-xs text-slate-500">Upload bukti transfer bank ke rekening sekolah</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Bank Transfer Details */}
                    {paymentMethod === 'Transfer' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <BankAccountInfo />

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Upload Bukti Transfer</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-indigo-500 transition">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="proof-file-input"
                                    />
                                    <label htmlFor="proof-file-input" className="cursor-pointer flex flex-col items-center">
                                        <Upload className="text-slate-400 mb-2" size={24} />
                                        <span className="text-xs font-semibold text-indigo-600">
                                            {proofFile ? proofFile.name : 'Klik untuk mengunggah bukti'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-1">Format: JPG, PNG (Maks 5MB)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit Buttons */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                    <button
                        onClick={() => setShowPayModal(false)}
                        className="w-1/3 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
                    >
                        Batal
                    </button>
                    {paymentMethod === 'Midtrans' ? (
                        <button
                            onClick={() => handleMidtransPayment()}
                            disabled={loadingSnap || isOverAmount || isZeroOrNegative}
                            className="w-2/3 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingSnap ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" /> Memuat...
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={14} /> Lanjut Pembayaran Online ({activeGateway === 'mayar' ? 'Mayar.id' : activeGateway === 'xendit' ? 'Xendit' : 'Midtrans'})
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitPayment}
                            disabled={submitting || !proofFile || isOverAmount || isZeroOrNegative}
                            className="w-2/3 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" /> Mengirim...
                                </>
                            ) : (
                                <>
                                    <Send size={14} /> Kirim Bukti Pembayaran
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingPaymentModal;
