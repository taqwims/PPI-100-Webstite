import React from 'react';
import { DollarSign, X, CheckCircle, Smartphone, CreditCard, Upload, Send } from 'lucide-react';
import clsx from 'clsx';
import { Bill, formatCurrency, getRemainingAmount, formatPaymentDate } from './BillingUtils';
import BankAccountInfo from './BankAccountInfo';

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
    successMsg: string;
    handleMidtransPayment: () => void;
    handleSubmitPayment: () => void;
}

const BillingPaymentModal: React.FC<BillingPaymentModalProps> = ({
    showPayModal, setShowPayModal, selectedBill,
    paymentMethod, setPaymentMethod, paymentAmount, setPaymentAmount,
    proofFile, setProofFile, submitting, loadingSnap, successMsg,
    handleMidtransPayment, handleSubmitPayment
}) => {
    if (!showPayModal || !selectedBill) return null;

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

                            {/* Riwayat Pembayaran */}
                            {selectedBill.payments && selectedBill.payments.length > 0 && (
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Riwayat Pembayaran</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        {selectedBill.payments.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                                                <div>
                                                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                        p.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                    )}>{p.status}</span>
                                                    <span className="text-xs text-slate-500 ml-2">{formatPaymentDate(p)}</span>
                                                </div>
                                                <span className="font-semibold text-slate-700">{formatCurrency(p.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                            <p className="text-xs text-slate-500">QRIS, E-Wallet, Bank Transfer, Kartu Kredit</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-indigo-600 mt-2">
                                        💡 Klik tombol bayar di bawah untuk membuka halaman pembayaran. Status akan diperbarui otomatis.
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingPaymentModal;
