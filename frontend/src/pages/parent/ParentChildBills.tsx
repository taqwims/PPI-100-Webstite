import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, CheckCircle, Clock, AlertTriangle, Upload, CreditCard, Wallet, X, Landmark, Copy, Send, User, Download, PieChart, Smartphone, ArrowUpDown, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { generateBillReceipt } from '../../utils/pdfUtils';

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    created_at: string;
    status: string;
    bill_type: string;
    academic_year_id?: number;
    academic_year?: {
        name: string;
    };
    is_installment?: boolean;
    student?: {
        user: { name: string };
    };
    payments?: { amount: number; status: string; payment_method: string; proof_url?: string; paid_at: string; transaction_id?: string; created_at: string; }[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const getRemainingAmount = (bill: Bill) => {
    if (bill.status === 'Paid') return 0;
    const totalPaid = (bill.payments || []).reduce((sum, p) => p.status === 'Success' ? sum + p.amount : sum, 0);
    return bill.amount - totalPaid;
};

const hasPendingTransfer = (bill: Bill) => {
    return bill.status !== 'Paid' && (bill.payments || []).some(p => p.payment_method === 'Transfer' && p.proof_url && p.status !== 'Success');
};

const formatPaymentDate = (p: any) => {
    if (p.status === 'Success' && p.paid_at && !p.paid_at.startsWith('0001-01-01')) {
        return new Date(p.paid_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (p.created_at && !p.created_at.startsWith('0001-01-01')) {
        return new Date(p.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return '-';
};

const ParentChildBills: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const { user } = useAuth();

    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer' | 'Midtrans'>('Midtrans');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingSnap, setLoadingSnap] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedSemester, setSelectedSemester] = useState<string>('all');
    const [itemsPerPage, setItemsPerPage] = useState<number>(20);
    const [currentPage, setCurrentPage] = useState<number>(1);
    
    const [sortConfig, setSortConfig] = useState<{ key: keyof Bill | 'remaining'; direction: 'asc' | 'desc' | null }>({
        key: 'bill_type', // Terorganisir berdasarkan jenis tagihan by default
        direction: 'asc'
    });

    const { data: academicYears } = useQuery({
        queryKey: ['academic-years'],
        queryFn: async () => {
            const res = await api.get('/finance/academic-years');
            return res.data;
        }
    });

    const { data: bills, isLoading, refetch } = useQuery({
        queryKey: ['child-bills', studentId || user?.id],
        queryFn: async () => {
            const url = studentId ? `/finance/bills?student_id=${studentId}` : '/finance/bills';
            const res = await api.get(url);
            return res.data;
        },
        enabled: !!user,
    });

    const handleSort = (key: keyof Bill | 'remaining') => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null;
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Bill | 'remaining') => {
        if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={12} className="text-slate-400" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
    };

    const filteredAndSortedBills = () => {
        let filtered = (bills || []).filter((b: Bill) => {
            if (selectedYear !== 'all' && b.academic_year_id?.toString() !== selectedYear) return false;
            
            if (selectedSemester !== 'all') {
                const dt = new Date(b.due_date || b.created_at);
                const month = dt.getMonth() + 1; // 1-12
                // Semester 1: Jul - Dec (7-12)
                const isSem1 = month >= 7 && month <= 12;
                if (selectedSemester === '1' && !isSem1) return false;
                if (selectedSemester === '2' && isSem1) return false;
            }

            return true;
        });

        if (!sortConfig.direction) return filtered;

        return [...filtered].sort((a, b) => {
            let aVal: any, bVal: any;
            if (sortConfig.key === 'remaining') {
                aVal = getRemainingAmount(a);
                bVal = getRemainingAmount(b);
            } else {
                aVal = a[sortConfig.key as keyof Bill];
                bVal = b[sortConfig.key as keyof Bill];
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const processedBills = filteredAndSortedBills();
    const unpaidBills = (bills || []).filter((b: Bill) => b.status !== 'Paid');
    const totalUnpaid = unpaidBills.reduce((acc: number, b: Bill) => acc + getRemainingAmount(b), 0);



    const openPayModal = (bill: Bill) => {
        setSelectedBill(bill);
        setPaymentMethod('Midtrans');
        setProofFile(null);
        setSuccessMsg('');
        setLoadingSnap(false);
        setPaymentAmount(getRemainingAmount(bill));
        setShowPayModal(true);
    };

    const handleMidtransPayment = async () => {
        if (!selectedBill || paymentAmount <= 0) return;
        setLoadingSnap(true);
        try {
            const res = await api.post('/finance/midtrans/create-transaction', {
                bill_id: selectedBill.id,
                amount: paymentAmount,
            });
            const snapToken = res.data.snap_token;
            const orderID = res.data.order_id;

            // Helper: verify payment status with backend (calls Midtrans API directly)
            const verifyAndRefresh = (delay = 2000) => {
                setTimeout(() => {
                    api.post('/finance/midtrans/check-status', { order_id: orderID })
                        .then(() => refetch())
                        .catch((e) => {
                            console.error('Failed to verify Midtrans status:', e);
                            refetch();
                        });
                }, delay);
            };

            // @ts-ignore - snap is loaded globally from Midtrans Snap.js
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
                    setSuccessMsg('Pembayaran sedang diproses. Status akan diperbarui otomatis.');
                    setTimeout(() => {
                        setShowPayModal(false);
                        setSuccessMsg('');
                    }, 3500);
                },
                onError: () => {
                    alert('Pembayaran gagal. Silakan coba lagi.');
                    setLoadingSnap(false);
                },
                onClose: () => {
                    verifyAndRefresh(1000);
                    setLoadingSnap(false);
                },
            });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal membuat transaksi Midtrans');
            setLoadingSnap(false);
        }
    };

    // Auto-check pending midtrans payments on load
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
                                        // If backend says it became Success, mark for refetch
                                        if (res.data.status === 'Success') shouldRefetch = true;
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

    const handleSubmitPayment = async () => {
        if (!selectedBill) return;

        if (paymentAmount <= 0 || paymentAmount > getRemainingAmount(selectedBill)) {
            alert('Jumlah pembayaran tidak valid.');
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
            alert(error.response?.data?.error || 'Gagal mengirim pembayaran');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusInfo = (bill: Bill) => {
        if (bill.status === 'Paid') return { color: 'emerald', icon: CheckCircle, label: 'Lunas' };
        if (bill.status === 'Partial') return { color: 'amber', icon: PieChart, label: 'Sebagian/Dicicil' };
        if (hasPendingTransfer(bill)) return { color: 'blue', icon: Clock, label: 'Menunggu Verifikasi' };
        const overdue = new Date(bill.due_date) < new Date();
        if (overdue) return { color: 'red', icon: AlertTriangle, label: 'Terlambat' };
        return { color: 'amber', icon: Clock, label: 'Belum Lunas' };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tagihan Anak</h1>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tahun:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="text-sm border-none focus:ring-0 p-0 bg-transparent font-semibold text-black"
                    >
                        <option value="all">Semua</option>
                        {academicYears?.map((year: any) => (
                            <option key={year.id} value={year.id.toString()} className="bg-white text-black">{year.name}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Filter size={14} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester:</span>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="text-sm border-none focus:ring-0 p-0 bg-transparent font-semibold text-black"
                        >
                            <option value="all" className="bg-white text-black">Semua</option>
                            <option value="1" className="bg-white text-black">Ganjil</option>
                            <option value="2" className="bg-white text-black">Genap</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex justify-end gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tampilkan:</span>
                    <select 
                        value={itemsPerPage} 
                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                        className="text-sm border-none focus:ring-0 p-0 bg-transparent font-semibold text-black"
                    >
                        <option value="20" className="bg-white text-black">20</option>
                        <option value="40" className="bg-white text-black">40</option>
                        <option value="80" className="bg-white text-black">80</option>
                    </select>
                </div>
            </div>

            {/* Summary */}
            {totalUnpaid > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl p-5 border border-red-100">
                    <p className="text-sm text-red-600 font-medium">Total Sisa Tagihan Seluruh Anak</p>
                    <h2 className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalUnpaid)}</h2>
                    <p className="text-xs text-red-500 mt-1">{unpaidBills.length} tagihan menunggu penyelesaian</p>
                </div>
            )}

            {/* Grouped Bills */}
            {isLoading ? (
                <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
                </div>
            ) : processedBills.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-500">
                    <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-slate-700">Belum Ada Tagihan</p>
                </div>
            ) : (
                <>
                {Object.entries(
                    processedBills
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .reduce((acc: any, bill: Bill) => {
                            const sName = bill.student?.user?.name || 'Lainnya';
                            if (!acc[sName]) acc[sName] = [];
                            acc[sName].push(bill);
                            return acc;
                        }, {})
                ).map(([studentName, studentBills]: [string, any]) => (
                    <div key={studentName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <User size={16} />
                            </div>
                            <h2 className="font-semibold text-slate-800 text-lg">Tagihan: {studentName}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white text-slate-400 border-b border-slate-200 text-[10px] uppercase tracking-widest font-bold">
                                        <th
                                            className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => handleSort('created_at')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Info Tagihan {getSortIcon('created_at')}
                                            </div>
                                        </th>
                                        <th
                                            className="p-4 text-right cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => handleSort('amount')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Total {getSortIcon('amount')}
                                            </div>
                                        </th>
                                        <th
                                            className="p-4 text-right cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => handleSort('remaining')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Sisa {getSortIcon('remaining')}
                                            </div>
                                        </th>
                                        <th
                                            className="p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => handleSort('due_date')}
                                        >
                                            <div className="flex items-center justify-center gap-1 text-center">
                                                Jatuh Tempo {getSortIcon('due_date')}
                                            </div>
                                        </th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(studentBills as Bill[]).map((bill: Bill) => {
                                        const status = getStatusInfo(bill);
                                        const StatusIcon = status.icon;
                                        const remainingAmount = getRemainingAmount(bill);
                                        return (
                                            <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-semibold text-slate-800">{bill.title}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded inline-block">
                                                            {bill.bill_type || 'SPP'}
                                                        </span>
                                                        {bill.academic_year && (
                                                            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded inline-block">
                                                                {bill.academic_year.name}
                                                            </span>
                                                        )}
                                                        {bill.is_installment && (
                                                            <span className="text-[10px] font-semibold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded inline-block border border-blue-100">
                                                                Dapat Dicicil
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right text-slate-500 text-sm whitespace-nowrap">
                                                    {formatCurrency(bill.amount)}
                                                </td>
                                                <td className="p-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                                                    {remainingAmount > 0 ? formatCurrency(remainingAmount) : '-'}
                                                </td>
                                                <td className="p-4 text-center text-sm text-slate-500">
                                                    {new Date(bill.due_date).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium gap-1",
                                                        status.color === 'emerald' && "bg-emerald-100 text-emerald-800",
                                                        status.color === 'amber' && "bg-amber-100 text-amber-800",
                                                        status.color === 'blue' && "bg-blue-100 text-blue-800",
                                                        status.color === 'red' && "bg-red-100 text-red-800",
                                                    )}>
                                                        <StatusIcon size={12} /> {status.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {bill.status !== 'Paid' && !hasPendingTransfer(bill) ? (
                                                        <button
                                                            onClick={() => openPayModal(bill)}
                                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5 mx-auto"
                                                        >
                                                            <DollarSign size={14} /> Bayar
                                                        </button>
                                                    ) : bill.status === 'Paid' ? (
                                                        <button
                                                            onClick={() => generateBillReceipt(bill)}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition flex items-center gap-1.5 mx-auto"
                                                        >
                                                            <Download size={13} /> Kuitansi
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">Menunggu</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* Pagination Controls */}
                {processedBills.length > itemsPerPage && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 mt-4 bg-white rounded-xl shadow-sm border">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Sebelumnya
                        </button>
                        <span className="font-medium text-slate-700">
                            Halaman {currentPage} dari {Math.ceil(processedBills.length / itemsPerPage)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(processedBills.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(processedBills.length / itemsPerPage)}
                            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Selanjutnya
                        </button>
                    </div>
                )}
                </>
            )}

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
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-sm text-slate-500">{selectedBill.title}</p>
                                    <div className="flex justify-between items-end mt-2">
                                        <p className="text-xs font-medium text-slate-500">Sisa Tagihan:</p>
                                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(getRemainingAmount(selectedBill))}</p>
                                    </div>
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
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <p className="text-xs text-blue-600 font-medium mb-2">Transfer ke rekening:</p>
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
                                                        className="text-xs text-blue-600 flex items-center gap-1 justify-end mt-1"
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

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Bukti Transfer</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                                id="parent-proof-upload"
                                            />
                                            <label
                                                htmlFor="parent-proof-upload"
                                                className={clsx(
                                                    "w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed rounded-xl cursor-pointer transition",
                                                    proofFile ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-500"
                                                )}
                                            >
                                                <Upload size={20} />
                                                {proofFile ? proofFile.name : 'Klik untuk upload bukti transfer'}
                                            </label>
                                        </div>
                                    </>
                                )}

                                {paymentMethod === 'Cash' && (
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                        <p className="text-sm text-emerald-800">
                                            💰 Silakan bayar langsung ke bendahara sekolah dengan nominal {formatCurrency(paymentAmount)}.
                                        </p>
                                    </div>
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
            )}
        </div>
    );
};

export default ParentChildBills;
