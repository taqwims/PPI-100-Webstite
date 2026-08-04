import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Bill, getRemainingAmount } from '../components/finance/Billing/BillingUtils';
import { useFeatureStore } from '../store/featureStore';

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
    invoice_url?: string;
}

export interface PendingTransactionInfo {
    order_id: string;
    amount: number;
    title: string;
    count: number;
    bill_ids: string[];
    payment_method: string;
}

export const useBillingPayment = (refetch: () => void, bills: Bill[] | undefined) => {
    const fetchFeatures = useFeatureStore(s => s.fetchFeatures);
    const loaded = useFeatureStore(s => s.loaded);
    const activeGateway = useFeatureStore(s => s.school.active_payment_gateway) || 'midtrans';

    // Keep track of order IDs that have already triggered a success/failed notification to prevent infinite loops
    const processedOrdersRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!loaded) {
            fetchFeatures();
        }
    }, [loaded, fetchFeatures]);

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

    // Aggregate active pending online transactions from bills list (ignore Paid bills!)
    const activePendingTransactions = useMemo(() => {
        if (!bills) return [];
        const map = new Map<string, PendingTransactionInfo>();

        bills.forEach(b => {
            if (b.status === 'Paid') return; // Ignore paid bills!
            if (b.payments) {
                b.payments.forEach(p => {
                    if ((p.payment_method === 'Xendit' || p.payment_method === 'Midtrans') && p.status === 'Pending' && p.transaction_id) {
                        if (processedOrdersRef.current.has(p.transaction_id)) return;
                        const existing = map.get(p.transaction_id);
                        if (existing) {
                            existing.amount += p.amount;
                            existing.count += 1;
                            existing.title = `Multi-Tagihan (${existing.count} Tagihan)`;
                            if (!existing.bill_ids.includes(b.id)) {
                                existing.bill_ids.push(b.id);
                            }
                        } else {
                            map.set(p.transaction_id, {
                                order_id: p.transaction_id,
                                amount: p.amount,
                                title: b.title,
                                count: 1,
                                bill_ids: [b.id],
                                payment_method: p.payment_method,
                            });
                        }
                    }
                });
            }
        });

        return Array.from(map.values());
    }, [bills]);

    const openPayModal = (bill: Bill) => {
        setSelectedBill(bill);
        setPaymentMethod(activeGateway === 'none' ? 'Transfer' : 'Midtrans');
        setProofFile(null);
        setSuccessMsg('');
        setLoadingSnap(false);
        setActiveMidtransDetail(null);
        setPaymentAmount(getRemainingAmount(bill));

        // ALWAYS open the payment selection modal (Online vs Transfer Manual) first!
        setShowPayModal(true);
    };

    // Live continuous status polling for active pending online transactions
    useEffect(() => {
        if (activePendingTransactions.length === 0) return;

        const checkAllPending = async () => {
            for (const pending of activePendingTransactions) {
                // Skip if already processed in this session
                if (processedOrdersRef.current.has(pending.order_id)) {
                    continue;
                }

                const endpoint = pending.order_id.startsWith('XEN-') || pending.order_id.startsWith('MULTI-') || pending.payment_method === 'Xendit'
                    ? '/finance/xendit/check-status'
                    : '/finance/midtrans/check-status';

                try {
                    const res = await api.post(endpoint, { order_id: pending.order_id }, { _suppressToast: true, timeout: 5000 } as any);
                    if (res.data) {
                        const status = res.data.status;
                        const txStatus = res.data.transaction_status;
                        if (status === 'Success') {
                            processedOrdersRef.current.add(pending.order_id);
                            toast.success(`Pembayaran Berhasil untuk ${pending.title}!`);
                            setSuccessMsg(`Pembayaran Berhasil! Tagihan ${pending.title} telah terverifikasi lunas.`);
                            setActiveMidtransDetail(null);
                            setShowPayModal(true);
                            refetch();
                            setTimeout(() => {
                                setShowPayModal(false);
                                setSuccessMsg('');
                            }, 4000);
                        } else if (status === 'Failed' || txStatus === 'expire' || txStatus === 'cancel' || txStatus === 'deny') {
                            processedOrdersRef.current.add(pending.order_id);
                            if (activeMidtransDetail?.order_id === pending.order_id) {
                                setActiveMidtransDetail(null);
                                setShowPayModal(false);
                            }
                            refetch();
                        } else if (res.data.va_numbers?.length > 0 || res.data.permata_va_number || res.data.bill_key || res.data.qr_code_url) {
                            // Update active VA details live from Midtrans status API
                            setActiveMidtransDetail(prev => prev && prev.order_id === pending.order_id ? {
                                ...prev,
                                va_numbers: res.data.va_numbers,
                                permata_va_number: res.data.permata_va_number,
                                bill_key: res.data.bill_key,
                                biller_code: res.data.biller_code,
                                qr_code_url: res.data.qr_code_url,
                                expiry_time: res.data.expiry_time,
                                payment_type: res.data.payment_type,
                            } : prev);
                        } else if (res.data.invoice_url && activeMidtransDetail?.order_id === pending.order_id) {
                            setActiveMidtransDetail(prev => prev ? { ...prev, invoice_url: res.data.invoice_url } : null);
                        }
                    }
                } catch (e) {
                    // Suppress silent errors during polling
                }
            }
        };

        checkAllPending();
        const interval = setInterval(checkAllPending, 4000);

        return () => clearInterval(interval);
    }, [activePendingTransactions, refetch, activeMidtransDetail?.order_id]);

    const resumePendingTransaction = async (orderId: string, currentBill?: Bill) => {
        setLoadingSnap(true);
        const pendingInfo = activePendingTransactions.find(p => p.order_id === orderId);
        const targetBill = currentBill || bills?.find(b => b.id === (pendingInfo?.bill_ids[0] || selectedBill?.id)) || selectedBill;

        if (targetBill) {
            setSelectedBill(targetBill);
            setPaymentAmount(pendingInfo?.amount || getRemainingAmount(targetBill));
        }

        const endpoint = orderId.startsWith('XEN-') || orderId.startsWith('MULTI-')
            ? '/finance/xendit/check-status'
            : '/finance/midtrans/check-status';

        try {
            const res = await api.post(endpoint, { order_id: orderId }, { _suppressToast: true, timeout: 5000 } as any);
            if (res.data) {
                if (res.data.status === 'Success') {
                    toast.success('Pembayaran ini telah terverifikasi lunas!');
                    refetch();
                    return;
                }

                if (res.data.status === 'Failed' || res.data.transaction_status === 'expire' || res.data.transaction_status === 'cancel' || res.data.transaction_status === 'deny') {
                    toast.error('Pembayaran ini telah kedaluwarsa atau dibatalkan.');
                    processedOrdersRef.current.add(orderId);
                    setActiveMidtransDetail(null);
                    setShowPayModal(false);
                    refetch();
                    return;
                }

                const redirectUrl = res.data.redirect_url || res.data.invoice_url;
                let snapToken = res.data.snap_token;
                if (!snapToken && redirectUrl) {
                    const parts = redirectUrl.split('/');
                    const lastPart = parts[parts.length - 1];
                    if (lastPart && !lastPart.startsWith('BILL-') && lastPart.length > 10 && !lastPart.includes('.')) {
                        snapToken = lastPart;
                    }
                }

                // If Xendit gateway
                if (orderId.startsWith('XEN-') || orderId.startsWith('MULTI-')) {
                    if (redirectUrl) {
                        window.open(redirectUrl, '_blank');
                    }
                    setShowPayModal(false);
                    return;
                }

                // Official Midtrans Snap Popup
                // @ts-ignore
                if (window.snap && snapToken) {
                    setShowPayModal(false);
                    // @ts-ignore
                    window.snap.pay(snapToken, {
                        onSuccess: () => {
                            toast.success('Pembayaran Berhasil!');
                            refetch();
                        },
                        onPending: () => {
                            toast.success('Pembayaran sedang diproses.');
                            refetch();
                        },
                        onError: () => {
                            toast.error('Pembayaran gagal. Silakan coba lagi.');
                            refetch();
                        },
                        onClose: () => {
                            refetch();
                        },
                    });
                    return;
                }

                if (redirectUrl && !redirectUrl.endsWith(orderId)) {
                    window.open(redirectUrl, '_blank');
                    setShowPayModal(false);
                    return;
                }

                // Fallback: If no valid token yet (e.g. old pending transaction), generate fresh Snap transaction
                if (targetBill) {
                    await reopenSnapPopup(targetBill);
                    return;
                }
            }

            if (targetBill) {
                await reopenSnapPopup(targetBill);
                return;
            }

            setShowPayModal(false);
        } catch (e: any) {
            toast.error('Gagal memuat status pembayaran.');
            setShowPayModal(false);
        } finally {
            setLoadingSnap(false);
        }
    };

    const cancelPendingPayment = async (orderId: string) => {
        setCancelingPayment(true);
        setActiveMidtransDetail(null);
        processedOrdersRef.current.add(orderId);
        if (selectedBill && selectedBill.payments) {
            setSelectedBill({
                ...selectedBill,
                payments: selectedBill.payments.filter(p => p.transaction_id !== orderId)
            });
        }

        try {
            const endpoint = orderId.startsWith('XEN-') || orderId.startsWith('MULTI-')
                ? '/finance/xendit/cancel-transaction'
                : '/finance/midtrans/cancel-transaction';
            await api.post(endpoint, { order_id: orderId });
            toast.success('Pembayaran telah dibatalkan. Silakan pilih metode pembayaran.');
            setShowPayModal(false);
            refetch();
        } catch (err: any) {
            console.error('Cancel transaction error:', err);
            refetch();
        } finally {
            setCancelingPayment(false);
        }
    };

    const reopenSnapPopup = async (bill?: Bill) => {
        const targetBill = bill || selectedBill;
        if (!targetBill) {
            toast.error('Data tagihan tidak ditemukan.');
            return;
        }
        const amt = paymentAmount > 0 ? paymentAmount : getRemainingAmount(targetBill);
        if (amt <= 0) {
            toast.error('Jumlah pembayaran harus lebih besar dari 0.');
            return;
        }
        setLoadingSnap(true);

        // Fetch fresh gateway config to guarantee accuracy
        let currentGateway = activeGateway;
        try {
            const featureRes = await api.get('/config/features', { _suppressToast: true } as any);
            if (featureRes.data?.school?.active_payment_gateway) {
                currentGateway = featureRes.data.school.active_payment_gateway;
            }
        } catch (e) {
            // fallback
        }

        try {
            if (currentGateway === 'xendit') {
                const res = await api.post('/finance/xendit/create-transaction', {
                    bill_id: targetBill.id,
                    amount: amt,
                });
                const invoiceUrl = res.data.invoice_url;
                if (invoiceUrl) {
                    window.open(invoiceUrl, '_blank');
                }
                setShowPayModal(false);
                toast.success('Halaman pembayaran Xendit dimuat!');
                refetch();
                return;
            }

            // Midtrans Online Gateway
            const res = await api.post('/finance/midtrans/create-transaction', {
                bill_id: targetBill.id,
                amount: amt,
            });

            const snapToken = res.data.snap_token;
            const redirectUrl = res.data.redirect_url;

            setShowPayModal(false);

            // @ts-ignore
            if (window.snap && snapToken) {
                // @ts-ignore
                window.snap.pay(snapToken, {
                    onSuccess: () => {
                        toast.success('Pembayaran Berhasil!');
                        refetch();
                    },
                    onPending: () => {
                        toast.success('Pembayaran sedang diproses.');
                        refetch();
                    },
                    onError: () => {
                        toast.error('Pembayaran gagal. Silakan coba lagi.');
                        refetch();
                    },
                    onClose: () => {
                        refetch();
                    },
                });
                return;
            }

            if (redirectUrl) {
                window.open(redirectUrl, '_blank');
                refetch();
                return;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal membuka halaman pembayaran');
        } finally {
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
        if (selectedBillIds.length < 1) {
            toast.error('Pilih setidaknya 1 tagihan untuk dibayar.');
            return;
        }
        if (selectedTotal <= 0) {
            toast.error('Total nominal pembayaran tidak valid.');
            return;
        }
        setIsSubmittingMulti(true);

        // Refresh activeGateway setting right before creating transaction
        let currentGateway = activeGateway;
        try {
            const featureRes = await api.get('/config/features', { _suppressToast: true } as any);
            if (featureRes.data?.school?.active_payment_gateway) {
                currentGateway = featureRes.data.school.active_payment_gateway;
            }
        } catch (e) {
            // fallback
        }

        const actualMethod = multiPayMethod === 'Midtrans'
            ? (currentGateway === 'xendit' ? 'Xendit' : 'Midtrans')
            : 'Transfer';

        try {
            const res = await api.post('/finance/bills/multi-payment', {
                bill_ids: selectedBillIds,
                amount: selectedTotal,
                payment_method: actualMethod
            });

            if (actualMethod === 'Xendit') {
                const invoiceUrl = res.data.invoice_url;
                const invoiceNumber = res.data.invoice_number;

                const dummyBill: Bill = {
                    id: bills && bills.length > 0 ? bills[0].id : '',
                    title: `Multi-Tagihan (${selectedBillIds.length} Tagihan)`,
                    amount: selectedTotal,
                    due_date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    status: 'Pending',
                    bill_type: 'MultiBill',
                    payments: [{
                        payment_method: 'Xendit',
                        status: 'Pending',
                        transaction_id: invoiceNumber,
                        amount: selectedTotal,
                        created_at: new Date().toISOString(),
                        paid_at: '',
                    }]
                };

                setSelectedBill(dummyBill);
                setPaymentAmount(selectedTotal);
                setActiveMidtransDetail({
                    order_id: invoiceNumber,
                    status: 'Pending',
                    invoice_url: invoiceUrl,
                });
                setShowMultiPayModal(false);
                setShowPayModal(true);
                toast.success('Halaman pembayaran multi-tagihan Xendit dimuat!');
                refetch();
                return;
            }

            if (actualMethod === 'Midtrans') {
                const midtransDomain = (res.data.redirect_url && res.data.redirect_url.includes('app.midtrans.com')) 
                    ? 'https://app.midtrans.com' 
                    : 'https://app.sandbox.midtrans.com';
                const redirectUrl = res.data.redirect_url || (res.data.snap_token ? `${midtransDomain}/snap/v2/vtweb/${res.data.snap_token}` : null);
                const invoiceNumber = res.data.invoice_number;

                if (redirectUrl) {
                    const dummyBill: Bill = {
                        id: bills && bills.length > 0 ? bills[0].id : '',
                        title: `Multi-Tagihan (${selectedBillIds.length} Tagihan)`,
                        amount: selectedTotal,
                        due_date: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        status: 'Pending',
                        bill_type: 'MultiBill',
                        payments: [{
                            payment_method: 'Midtrans',
                            status: 'Pending',
                            transaction_id: invoiceNumber,
                            amount: selectedTotal,
                            created_at: new Date().toISOString(),
                            paid_at: '',
                        }]
                    };

                    setSelectedBill(dummyBill);
                    setPaymentAmount(selectedTotal);
                    setActiveMidtransDetail({
                        order_id: invoiceNumber,
                        status: 'Pending',
                        invoice_url: redirectUrl,
                    });
                    setShowMultiPayModal(false);
                    setShowPayModal(true);
                    toast.success('Halaman pembayaran multi-tagihan Midtrans dimuat!');
                    refetch();
                    return;
                }
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
            if (actualMethod !== 'Midtrans') {
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
        activeGateway,

        // Multi Modal
        selectedBillIds, setSelectedBillIds, toggleBillSelection,
        showMultiPayModal, setShowMultiPayModal, multiPayMethod, setMultiPayMethod,
        isSubmittingMulti, handleMultiPayment,

        // Active Pending Transactions
        activePendingTransactions, resumePendingTransaction
    };
};
