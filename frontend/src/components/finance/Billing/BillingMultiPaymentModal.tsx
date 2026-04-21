import React from 'react';
import { CreditCard, X, Smartphone, ListChecks } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from './BillingUtils';
import BankAccountInfo from './BankAccountInfo';

interface BillingMultiPaymentModalProps {
    showMultiPayModal: boolean;
    setShowMultiPayModal: (val: boolean) => void;
    selectedBillIds: string[];
    selectedTotal: number;
    multiPayMethod: 'Transfer' | 'Midtrans';
    setMultiPayMethod: (val: 'Transfer' | 'Midtrans') => void;
    isSubmittingMulti: boolean;
    handleMultiPayment: (total: number) => void;
}

const BillingMultiPaymentModal: React.FC<BillingMultiPaymentModalProps> = ({
    showMultiPayModal, setShowMultiPayModal, selectedBillIds, selectedTotal,
    multiPayMethod, setMultiPayMethod, isSubmittingMulti, handleMultiPayment
}) => {
    if (!showMultiPayModal || selectedBillIds.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                    <h2 className="text-lg font-bold flex items-center text-slate-800">
                        <ListChecks className="text-indigo-600 mr-2" size={22} /> Bayar Multi Tagihan
                    </h2>
                    <button onClick={() => setShowMultiPayModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1">
                    <div className="p-6 space-y-5">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-sm text-slate-500">Total Tagihan Dipilih ({selectedBillIds.length})</p>
                            <h2 className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(selectedTotal)}</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setMultiPayMethod('Midtrans')}
                                    className={clsx(
                                        "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                        multiPayMethod === 'Midtrans' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    <Smartphone size={14} /> Online
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMultiPayMethod('Transfer')}
                                    className={clsx(
                                        "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                        multiPayMethod === 'Transfer' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    <CreditCard size={14} /> Transfer
                                </button>
                            </div>
                        </div>

                        {multiPayMethod === 'Midtrans' && (
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <p className="font-semibold text-slate-800 mb-1">Pembayaran Multitagihan</p>
                                <p className="text-xs text-slate-500">Anda akan diarahkan ke Midtrans untuk membayar seluruh tagihan sekaligus.</p>
                            </div>
                        )}

                        {multiPayMethod === 'Transfer' && (
                            <>
                                <BankAccountInfo />
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-xs text-blue-700">Untuk multi-pembayaran via transfer, setelah mengklik konfirmasi Anda perlu mengirim bukti ke admin.</p>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => handleMultiPayment(selectedTotal)}
                            disabled={isSubmittingMulti || selectedTotal <= 0}
                            className={clsx(
                                "w-full py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2",
                                (isSubmittingMulti || selectedTotal <= 0)
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                            )}
                        >
                            <CreditCard size={16} />
                            {isSubmittingMulti ? 'Memproses...' : 'Bayar Sekarang'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingMultiPaymentModal;
