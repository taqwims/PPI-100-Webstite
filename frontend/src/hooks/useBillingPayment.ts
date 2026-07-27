import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Bill, getRemainingAmount } from '../components/finance/Billing/BillingUtils';

export interface MidtransDetail {
    order_id: string;
    status: string;
    transaction_status?: string;
    payment_type?: string;
    gross_amount?: string;
    va_numbers?: { bank: string; va_number: string }[];
    permata_va_number?: string;
    bill_key?: string;
    biller_code?: string;
    qr_code_url?: string;
    expiry_time?: string;
}

export const useBillingPayment = (refetch: () => void, bills: Bill[] | undefined) => {
    // Single payment state
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'Transfer' | 'Midtrans'>('Midtrans');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingSnap, setLoadingSnap] = useState(false);
    const [cancelingPayment, setCancelingPayment] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [activeMidtransDetail, setActiveMidtransDetail] = useState<MidtransDetail | null>(null);

    // Multi-payment state
    const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
    const [showMultiPayModal, setShowMultiPayModal] = useState(false);
    const [multiPayMethod, setMultiPayMethod] = useState<'Transfer' | 'Midtrans'>('Midtrans');
    const [isSubmittingMulti, setIsSubmittingMulti] = useState(false);

    const openPayModal = (bill: Bill) => {
        setSelectedBill(bill);
        setPaymentMethod('Midtrans');
        setProofFile(null);
        setSuccessMsg('');
        setLoadingSnap(false);
        setActiveMidtransDetail(null);
        setPaymentAmount(getRemainingAmount(bill));
        setShowPayModal(true);

        // Check if there is an active pending midtrans payment for this bill
        const pendingPayment = bill.payments?.find(
            p => p.payment_method === 'Midtrans' && p.status === 'Pending' && p.transaction_id
        );
        if (pendingPayment && pendingPayment.transaction_id) {
            checkPendingDetails(pendingPayment.transaction_id);
        }
    };

    const checkPendingDetails = async (orderId: string) => {
        try {
            const res = await api.post('/finance/midtrans/check-status', { order_id: orderId });
            if (res.data) {
                setActiveMidtransDetail({
                    ...res.data,
                    order_id: orderId
                });
            }
        } catch (e) {
            console.error('Failed to fetch pending Midtrans details:', e);
        }
    };

    // Auto-check pending midtrans payments on load if there are bills with pending Status
    useEffect(() => {
        if (!bills) return;
        let shouldRefetch = false;

        const checkPending = async () => {
            const promises: Promise<any>[] = [];
            bills.forEach((b: Bill) => {
                if (b.payments) {
                    b.payments.forEach(p => {
                        if (p.payment_method === 'Midtrans' && p.status === 'Pending' && p.transaction_id) {
                            promises.push(
                                api.post('/finance/midtrans/check-status', { order_id: p.transaction_id })
                                    .then(res => {
                                        if (res.data.status === 'Success' || res.data.status === 'Failed') {
                                            shouldRefetch = true;
                                        }
                                    })
                                    .catch(e => console.error(e))
                            );
                        }
                    });
                }
            });
            if (promises.length > 0) {
                await Promise.all(promises);
                if (shouldRefetch) refetch();
            }
        };

        checkPending();
    }, [bills, refetch]);

    const cancelPendingPayment = async (orderId: string) => {
        setCancelingPayment(true);
        // Immediately clear pending state locally for instant UI update
        setActiveMidtransDetail(null);
        if (selectedBill && selectedBill.payments) {
            setSelectedBill({
                ...selectedBill,
                payments: selectedBill.payments.filter(p => p.transaction_id !== orderId)
            });
        }

        try {
            await api.post('/finance/midtrans/cancel-transaction', { order_id: orderId });
            toast.success('Pembayaran telah dibatalkan. Silakan pilih metode pembayaran.');
            refetch();
        } catch (err: any) {
            console.error('Cancel transaction error:', err);
            // Refetch to sync state even if Midtrans error occurs (e.g. already expired/cancelled)
            refetch();
        } finally {
            setCancelingPayment(false);
        }
    };

    const reopenSnapPopup = async (bill?: Bill) => {
        const targetBill = bill || selectedBill;
        if (!targetBill) return;
        const amt = paymentAmount > 0 ? paymentAmount : getRemainingAmount(targetBill);
        if (amt <= 0) return;
        setLoadingSnap(true);
        try {
            const res = await api.post('/finance/midtrans/create-transaction', {
                bill_id: targetBill.id,
                amount: amt,
            });
            const snapToken = res.data.snap_token;
            const orderID = res.data.order_id;

            const verifyAndRefresh = (delay = 2000) => {
                setTimeout(() => {
                    api.post('/finance/midtrans/check-status', { order_id: orderID })
                        .then((res) => {
                            if (res.data) {
                                setActiveMidtransDetail({
                                    ...res.data,
                                    order_id: orderID
                                });
                            }
                            refetch();
                        })
                        .catch((e) => {
                            console.error('Failed to verify Midtrans status:', e);
                            refetch();
                        });
                }, delay);
            };

            // @ts-ignore
            if (window.snap) {
                // @ts-ignore
                window.snap.pay(snapToken, {
                    onSuccess: () => {
                        verifyAndRefresh(1000);
                        setSuccessMsg('Pembayaran berhasil! Terima kasih.');
                        setTimeout(() => {
                            setShowPayModal(false);
                            setSuccessMsg('');
                        }, 3500);
                    },
                    onPending: () => {
                        verifyAndRefresh(1000);
                        setSuccessMsg('Pembayaran sedang diproses.');
                        setTimeout(() => {
                            refetch();
                        }, 1500);
                    },
                    onError: () => {
                        toast.error('Pembayaran gagal. Silakan coba lagi.');
                        setLoadingSnap(false);
                    },
                    onClose: () => {
                        verifyAndRefresh(1000);
                        setLoadingSnap(false);
                    },
                });
            } else {
                toast.error('Modul pembayaran Midtrans belum siap, silakan muat ulang halaman.');
                setLoadingSnap(false);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal membuka halaman pembayaran Midtrans');
            setLoadingSnap(false);
        }
    };

    const handleMidtransPayment = reopenSnapPopup;

    const handleSubmitPayment = async () => {
        if (!selectedBill) return;

        if (paymentAmount <= 0 || paymentAmount > getRemainingAmount(selectedBill)) {
            toast.error('Jumlah pembayaran tidak valid.');
            return;
        }

        setSubmitting(true);
        try {
            if (paymentMethod === 'Transfer' && proofFile) {
                const formData = new FormData();
                formData.append('file', proofFile);
                formData.append('bill_id', selectedBill.id);
                formData.append('amount', paymentAmount.toString());
                formData.append('method', 'Transfer');

                await api.post('/finance/payment-proof', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/finance/payments', {
                    bill_id: selectedBill.id,
                    amount: paymentAmount,
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
            toast.error(error.response?.data?.error || 'Gagal mengirim pembayaran');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMultiPayment = async (selectedTotal: number) => {
        if (selectedBillIds.length < 2) return;
        setIsSubmittingMulti(true);
        try {
            const res = await api.post('/finance/bills/multi-payment', {
                bill_ids: selectedBillIds,
                amount: selectedTotal,
                payment_method: multiPayMethod
            });

            if (multiPayMethod === 'Midtrans') {
                const snapToken = res.data.snap_token;
                const invoiceNumber = res.data.invoice_number;

                const verifyAndRefresh = (delay = 2000) => {
                    setTimeout(() => {
                        api.post('/finance/midtrans/check-status', { order_id: invoiceNumber })
                            .then(() => refetch())
                            .catch((e) => {
                                console.error('Failed to verify Midtrans multi-payment status:', e);
                                refetch();
                            });
                    }, delay);
                };

                // @ts-ignore
                window.snap.pay(snapToken, {
                    onSuccess: () => {
                        verifyAndRefresh(1000);
                        toast.success('Pembayaran sukses!');
                        setSelectedBillIds([]);
                        setShowMultiPayModal(false);
                    },
                    onPending: () => {
                        verifyAndRefresh(1000);
                        toast.success('Pembayaran sedang diproses.');
                        setSelectedBillIds([]);
                        setShowMultiPayModal(false);
                    },
                    onError: () => {
                        toast.error('Pembayaran gagal');
                        setIsSubmittingMulti(false);
                    },
                    onClose: () => {
                        verifyAndRefresh(1000);
                        setIsSubmittingMulti(false);
                    }
                });
            } else {
                toast.success(`Berhasil mengirim permintaan pembayaran ${selectedBillIds.length} tagihan.`);
                setSelectedBillIds([]);
                setShowMultiPayModal(false);
                refetch();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal memproses pembayaran');
            setIsSubmittingMulti(false);
        } finally {
            if (multiPayMethod !== 'Midtrans') {
                setIsSubmittingMulti(false);
            }
        }
    };

    const toggleBillSelection = (billId: string) => {
        setSelectedBillIds(prev =>
            prev.includes(billId)
                ? prev.filter(id => id !== billId)
                : [...prev, billId]
        );
    };

    return {
        // Single Modal
        showPayModal, setShowPayModal, openPayModal, selectedBill, 
        paymentMethod, setPaymentMethod, paymentAmount, setPaymentAmount, 
        proofFile, setProofFile, submitting, loadingSnap, cancelingPayment, successMsg,
        activeMidtransDetail, cancelPendingPayment, reopenSnapPopup,
        handleMidtransPayment, handleSubmitPayment,

        // Multi Modal
        selectedBillIds, setSelectedBillIds, toggleBillSelection,
        showMultiPayModal, setShowMultiPayModal, multiPayMethod, setMultiPayMethod,
        isSubmittingMulti, handleMultiPayment
    };
};
