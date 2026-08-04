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
    if (!showPayModal) return null;

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
                        <p className="text-sm font-semibold text-slate-700">{selectedBill.title}</p>
                        <div className="flex justify-between items-end mt-2">
                            <p className="text-xs font-medium text-slate-500">Sisa Tagihan:</p>
                            <p className="text-2xl font-extrabold text-slate-900">{formatCurrency(getRemainingAmount(selectedBill))}</p>
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

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Jumlah Pembayaran</label>
                        {selectedBill.is_installment ? (
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                    max={getRemainingAmount(selectedBill)}
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-lg font-extrabold text-slate-900"
                                />
                                <p className="text-xs text-blue-600 mt-1">Tagihan ini dapat dibayar sebagian (cicil).</p>
                            </div>
                        ) : (
                            <div className="px-4 py-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-900 font-extrabold text-lg">
                                {formatCurrency(paymentAmount)}
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
                                            Online ({activeGateway === 'xendit' ? 'Xendit' : 'Midtrans'})
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
                            disabled={loadingSnap}
                            className="w-2/3 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                        >
                            {loadingSnap ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" /> Memuat...
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={14} /> Lanjut Pembayaran Online ({activeGateway === 'xendit' ? 'Xendit' : 'Midtrans'})
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitPayment}
                            disabled={submitting || !proofFile}
                            className="w-2/3 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
