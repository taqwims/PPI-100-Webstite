import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, Download, Filter, ArrowUpDown, ArrowUp, ArrowDown, Clock, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { generateBillReceipt } from '../../utils/pdfUtils';
import { Bill, formatCurrency, getRemainingAmount, hasPendingTransfer, hasPendingMidtrans, getStatusInfo } from '../../components/finance/Billing/BillingUtils';
import { useBillingPayment } from '../../hooks/useBillingPayment';
import BillingPaymentModal from '../../components/finance/Billing/BillingPaymentModal';
import BillingMultiPaymentModal from '../../components/finance/Billing/BillingMultiPaymentModal';

const StudentBills: React.FC = () => {
    const { user } = useAuth();
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Bill | 'remaining'; direction: 'asc' | 'desc' | null }>({
        key: 'created_at', direction: 'desc'
    });

    const { data: academicYears } = useQuery({
        queryKey: ['academic-years'],
        queryFn: async () => {
            const res = await api.get('/finance/academic-years');
            return res.data;
        }
    });

    const { data: bills, isLoading, refetch } = useQuery({
        queryKey: ['student-bills', user?.id],
        queryFn: async () => {
            const res = await api.get('/finance/bills');
            return res.data;
        },
        enabled: !!user,
    });

    const bp = useBillingPayment(refetch, bills);

    const [activeMainTab, setActiveMainTab] = useState<'unpaid' | 'history'>('unpaid');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const handleSort = (key: keyof Bill | 'remaining') => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Bill | 'remaining') => {
        if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={12} className="text-slate-400" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
    };

    const categories: string[] = Array.from(new Set((bills || []).map((b: Bill) => b.bill_type || 'SPP')));

    const filteredBills = (bills || []).filter((b: Bill) => {
        if (activeMainTab === 'unpaid' && b.status === 'Paid') return false;
        if (activeMainTab === 'history' && b.status !== 'Paid') return false;

        if (selectedCategory !== 'all' && (b.bill_type || 'SPP') !== selectedCategory) return false;
        if (selectedYear !== 'all' && b.academic_year_id?.toString() !== selectedYear) return false;
        return true;
    });

    const sortedBills = [...filteredBills].sort((a, b) => {
        if (!sortConfig.direction) return 0;
        let aVal: any = sortConfig.key === 'remaining' ? getRemainingAmount(a) : a[sortConfig.key as keyof Bill];
        let bVal: any = sortConfig.key === 'remaining' ? getRemainingAmount(b) : b[sortConfig.key as keyof Bill];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const unpaidBills = (bills || []).filter((b: Bill) => b.status !== 'Paid');
    const paidBills = (bills || []).filter((b: Bill) => b.status === 'Paid');
    const totalUnpaid = unpaidBills.reduce((acc: number, b: Bill) => acc + getRemainingAmount(b), 0);

    const selectedBills = unpaidBills.filter((b: Bill) => bp.selectedBillIds.includes(b.id));
    const selectedTotal = selectedBills.reduce((sum: number, b: Bill) => sum + getRemainingAmount(b), 0);

    const getPaidDateText = (bill: Bill) => {
        if (bill.payments && bill.payments.length > 0) {
            const lastPayment = bill.payments[bill.payments.length - 1];
            if (lastPayment.paid_at) {
                return new Date(lastPayment.paid_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }
        }
        return new Date(bill.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tagihan Saya</h1>
                <p className="text-slate-500 mt-1">Lihat dan bayar tagihan sekolah Anda.</p>
            </div>

            {/* Active Pending Transaction Banners */}
            {bp.activePendingTransactions.map(tx => (
                <div key={tx.order_id} className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 animate-pulse">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white">Transaksi Sedang Berlangsung</span>
                                <span className="text-xs font-mono font-bold text-slate-600">Invoice: {tx.order_id}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mt-1">{tx.title} • <span className="text-emerald-700">{formatCurrency(tx.amount)}</span></h4>
                            <p className="text-xs text-slate-500">Invoice pembayaran telah dibuat. Silakan selesaikan pembayaran QRIS / Bank Transfer.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => bp.cancelPendingPayment(tx.order_id)}
                            disabled={bp.cancelingPayment}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-slate-200"
                        >
                            Batalkan Transaksi
                        </button>
                        <button
                            onClick={() => bp.resumePendingTransaction(tx.order_id)}
                            disabled={bp.loadingSnap}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                        >
                            <ExternalLink size={14} /> Lanjutkan Pembayaran
                        </button>
                    </div>
                </div>
            ))}

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => setActiveMainTab('unpaid')} className={clsx("rounded-2xl p-5 border cursor-pointer transition-all", activeMainTab === 'unpaid' ? "bg-gradient-to-r from-red-50 to-amber-50 border-red-200 shadow-md ring-2 ring-red-500/20" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm")}>
                    <p className="text-sm text-red-600 font-medium">Total Sisa Tagihan</p>
                    <h2 className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalUnpaid)}</h2>
                    <p className="text-xs text-red-500 mt-1">{unpaidBills.length} tagihan belum lunas</p>
                </div>
                <div onClick={() => setActiveMainTab('history')} className={clsx("rounded-2xl p-5 border cursor-pointer transition-all", activeMainTab === 'history' ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-md ring-2 ring-emerald-500/20" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm")}>
                    <p className="text-sm text-emerald-600 font-medium">Tagihan Lunas & Riwayat</p>
                    <h2 className="text-2xl font-bold text-emerald-700 mt-1">{paidBills.length} Tagihan</h2>
                    <p className="text-xs text-emerald-600 mt-1">Klik untuk melihat riwayat & kuitansi</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveMainTab('unpaid')}
                                className={clsx("px-4 py-2 rounded-xl text-sm font-semibold transition", activeMainTab === 'unpaid' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-600 hover:bg-slate-200/60")}
                            >
                                Tagihan Aktif ({unpaidBills.length})
                            </button>
                            <button
                                onClick={() => setActiveMainTab('history')}
                                className={clsx("px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2", activeMainTab === 'history' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "text-slate-600 hover:bg-slate-200/60")}
                            >
                                Riwayat Pembayaran ({paidBills.length})
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            {activeMainTab === 'unpaid' && bp.selectedBillIds.length >= 1 && (
                                <button
                                    onClick={() => bp.setShowMultiPayModal(true)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
                                >
                                    Bayar Terpilih ({bp.selectedBillIds.length})
                                </button>
                            )}
                            <div className="flex items-center gap-2">
                                <Filter size={14} className="text-slate-700" />
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="text-xs border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1.5 pl-2 pr-8 bg-white font-medium"
                                >
                                    <option value="all">Semua Tahun Ajaran</option>
                                    {academicYears?.map((year: any) => (
                                        <option key={year.id} value={year.id.toString()}>{year.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sub Categories Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition", selectedCategory === 'all' ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
                        >
                            Semua Jenis Tagihan
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition", selectedCategory === cat ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div></div>
                ) : sortedBills.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-700">
                            {activeMainTab === 'history' ? 'Belum Ada Riwayat Tagihan Lunas' : 'Tidak Ada Tagihan Aktif'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {activeMainTab === 'history' ? 'Tagihan yang sudah Anda bayar lunas akan muncul di tab ini.' : 'Semua tagihan Anda telah lunas.'}
                        </p>
                    </div>
                ) : (
                    <>
                    {/* Mobile Card Layout (sm:hidden) */}
                    <div className="block sm:hidden divide-y divide-slate-100">
                        {sortedBills.map((bill: Bill) => {
                            const status = getStatusInfo(bill);
                            const StatusIcon = status.icon;
                            const remainingAmount = getRemainingAmount(bill);
                            const isSelected = bp.selectedBillIds.includes(bill.id);
                            const canSelect = bill.status !== 'Paid' && !hasPendingTransfer(bill);

                            return (
                                <div
                                    key={bill.id}
                                    onClick={() => {
                                        if (canSelect && activeMainTab === 'unpaid') {
                                            bp.toggleBillSelection(bill.id);
                                        }
                                    }}
                                    className={clsx(
                                        "p-4 flex flex-col gap-3 transition-colors cursor-pointer",
                                        isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/60"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3">
                                            {activeMainTab === 'unpaid' && canSelect && (
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        bp.toggleBillSelection(bill.id);
                                                    }}
                                                />
                                            )}
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{bill.title}</h3>
                                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[9px] font-semibold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{bill.bill_type || 'SPP'}</span>
                                                    {bill.academic_year && <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{bill.academic_year.name}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold gap-1 shrink-0",
                                            status.color === 'emerald' && "bg-emerald-100 text-emerald-800",
                                            status.color === 'amber' && "bg-amber-100 text-amber-800",
                                            status.color === 'blue' && "bg-blue-100 text-blue-800",
                                            status.color === 'red' && "bg-red-100 text-red-800"
                                        )}>
                                            <StatusIcon size={10} /> {status.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {activeMainTab === 'history' ? 'Tanggal Bayar' : 'Jatuh Tempo'}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-600 mt-0.5">
                                                {activeMainTab === 'history' ? getPaidDateText(bill) : new Date(bill.due_date).toLocaleDateString('id-ID')}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-medium">Sisa Tagihan</p>
                                            <p className="text-sm font-bold text-slate-900 mt-0.5">
                                                {remainingAmount > 0 ? formatCurrency(remainingAmount) : formatCurrency(bill.amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons for Mobile */}
                                    <div className="pt-1 flex justify-end">
                                        {hasPendingMidtrans(bill) ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const pendingTx = bill.payments?.find(p => (p.payment_method === 'Midtrans' || p.payment_method === 'Xendit') && p.status === 'Pending' && p.transaction_id);
                                                    if (pendingTx && pendingTx.transaction_id) {
                                                        bp.resumePendingTransaction(pendingTx.transaction_id, bill);
                                                    } else {
                                                        bp.openPayModal(bill);
                                                    }
                                                }}
                                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm animate-pulse"
                                            >
                                                <Clock size={14} /> Lihat VA / Kode QRIS (Pending)
                                            </button>
                                        ) : bill.status !== 'Paid' && !hasPendingTransfer(bill) ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    bp.openPayModal(bill);
                                                }}
                                                className="w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <DollarSign size={14} /> Bayar Sekarang ({formatCurrency(remainingAmount)})
                                            </button>
                                        ) : bill.status === 'Paid' ? (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try { await generateBillReceipt(bill); toast.success('Kuitansi diunduh'); }
                                                    catch { toast.error('Gagal unduh kuitansi'); }
                                                }}
                                                className="w-full py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl hover:bg-emerald-100 border border-emerald-200 transition flex items-center justify-center gap-1.5"
                                            >
                                                <Download size={13} /> Unduh Kuitansi
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table (hidden on mobile) */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider">
                                    {activeMainTab === 'unpaid' && (
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                onChange={(e) => {
                                                    const validBills = unpaidBills.filter((b: Bill) => !hasPendingTransfer(b));
                                                    bp.setSelectedBillIds(e.target.checked ? validBills.map((b: Bill) => b.id) : []);
                                                }}
                                                checked={unpaidBills.length > 0 && bp.selectedBillIds.length === unpaidBills.filter((b: Bill) => !hasPendingTransfer(b)).length}
                                            />
                                        </th>
                                    )}
                                    <th className="p-4 font-semibold cursor-pointer" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center gap-1">Info Tagihan {getSortIcon('created_at')}</div>
                                    </th>
                                    <th className="p-4 font-semibold text-right cursor-pointer" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center justify-end gap-1">Total {getSortIcon('amount')}</div>
                                    </th>
                                    <th className="p-4 font-semibold text-right cursor-pointer" onClick={() => handleSort('remaining')}>
                                        <div className="flex items-center justify-end gap-1">Sisa {getSortIcon('remaining')}</div>
                                    </th>
                                    <th className="p-4 font-semibold text-center cursor-pointer" onClick={() => handleSort('due_date')}>
                                        <div className="flex items-center justify-center gap-1">
                                            {activeMainTab === 'history' ? 'Tanggal Bayar' : 'Jatuh Tempo'} {getSortIcon('due_date')}
                                        </div>
                                    </th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedBills.map((bill: Bill) => {
                                    const status = getStatusInfo(bill);
                                    const StatusIcon = status.icon;
                                    const remainingAmount = getRemainingAmount(bill);
                                    const canSelect = bill.status !== 'Paid' && !hasPendingTransfer(bill);

                                    return (
                                        <tr
                                            key={bill.id}
                                            onClick={() => {
                                                if (canSelect && activeMainTab === 'unpaid') {
                                                    bp.toggleBillSelection(bill.id);
                                                }
                                            }}
                                            className={clsx(
                                                "hover:bg-slate-50/80 transition-colors cursor-pointer",
                                                bp.selectedBillIds.includes(bill.id) && "bg-indigo-50/40"
                                            )}
                                        >
                                            {activeMainTab === 'unpaid' && (
                                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                    {canSelect && (
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={bp.selectedBillIds.includes(bill.id)}
                                                            onChange={() => bp.toggleBillSelection(bill.id)}
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            <td className="p-4">
                                                <p className="font-semibold text-slate-800">{bill.title}</p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded inline-block">{bill.bill_type || 'SPP'}</span>
                                                    {bill.academic_year && <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded inline-block">{bill.academic_year.name}</span>}
                                                    {bill.is_installment && <span className="text-[10px] font-semibold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded inline-block border border-blue-100">Dapat Dicicil</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right text-slate-500 text-sm whitespace-nowrap">{formatCurrency(bill.amount)}</td>
                                            <td className="p-4 text-right font-semibold text-slate-800 whitespace-nowrap">{remainingAmount > 0 ? formatCurrency(remainingAmount) : '-'}</td>
                                            <td className="p-4 text-center text-sm text-slate-600 font-medium">
                                                {activeMainTab === 'history' ? (
                                                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block text-xs font-semibold">
                                                        {getPaidDateText(bill)}
                                                    </span>
                                                ) : (
                                                    new Date(bill.due_date).toLocaleDateString('id-ID')
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium gap-1",
                                                    status.color === 'emerald' && "bg-emerald-100 text-emerald-800",
                                                    status.color === 'amber' && "bg-amber-100 text-amber-800",
                                                    status.color === 'blue' && "bg-blue-100 text-blue-800",
                                                    status.color === 'red' && "bg-red-100 text-red-800"
                                                )}>
                                                    <StatusIcon size={12} /> {status.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                {hasPendingMidtrans(bill) ? (
                                                    <button
                                                        onClick={() => {
                                                            const pendingTx = bill.payments?.find(p => (p.payment_method === 'Midtrans' || p.payment_method === 'Xendit') && p.status === 'Pending' && p.transaction_id);
                                                            if (pendingTx && pendingTx.transaction_id) {
                                                                bp.resumePendingTransaction(pendingTx.transaction_id, bill);
                                                            } else {
                                                                bp.openPayModal(bill);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 mx-auto animate-pulse"
                                                    >
                                                        <Clock size={13} /> Lihat VA / QRIS
                                                    </button>
                                                ) : bill.status !== 'Paid' && !hasPendingTransfer(bill) ? (
                                                    <button onClick={() => bp.openPayModal(bill)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5 mx-auto">
                                                        <DollarSign size={14} /> Bayar
                                                    </button>
                                                ) : bill.status === 'Paid' ? (
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <button
                                                            onClick={async () => {
                                                                try { await generateBillReceipt(bill); toast.success('Kuitansi diunduh'); }
                                                                catch { toast.error('Gagal unduh kuitansi'); }
                                                            }}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition flex items-center gap-1.5 mx-auto"
                                                        >
                                                            <Download size={13} /> Kuitansi
                                                        </button>
                                                        {bill.invoice_number && <span className="text-[9px] text-slate-400 font-mono tracking-tighter" title="Nomor Invoice">{bill.invoice_number}</span>}
                                                    </div>
                                                ) : <span className="text-xs text-slate-500">Menunggu</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </div>

            {/* Floating Sticky Bottom Bar for Multi Payment Selection */}
            {activeMainTab === 'unpaid' && bp.selectedBillIds.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-40 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 border border-slate-700/50 backdrop-blur-lg animate-in slide-in-from-bottom-5">
                    <div>
                        <p className="text-xs text-slate-300 font-medium">{bp.selectedBillIds.length} Tagihan Terpilih</p>
                        <p className="text-base font-bold text-white leading-tight">{formatCurrency(selectedTotal)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => bp.setSelectedBillIds([])}
                            className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => bp.setShowMultiPayModal(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/40 transition flex items-center gap-1.5"
                        >
                            <DollarSign size={14} /> Bayar Sekaligus
                        </button>
                    </div>
                </div>
            )}

            <BillingPaymentModal
                showPayModal={bp.showPayModal} setShowPayModal={bp.setShowPayModal}
                selectedBill={bp.selectedBill}
                paymentMethod={bp.paymentMethod} setPaymentMethod={bp.setPaymentMethod}
                paymentAmount={bp.paymentAmount} setPaymentAmount={bp.setPaymentAmount}
                proofFile={bp.proofFile} setProofFile={bp.setProofFile}
                submitting={bp.submitting} loadingSnap={bp.loadingSnap} cancelingPayment={bp.cancelingPayment} successMsg={bp.successMsg}
                activeMidtransDetail={bp.activeMidtransDetail} cancelPendingPayment={bp.cancelPendingPayment}
                handleMidtransPayment={bp.handleMidtransPayment} handleSubmitPayment={bp.handleSubmitPayment}
            />

            <BillingMultiPaymentModal
                showMultiPayModal={bp.showMultiPayModal} setShowMultiPayModal={bp.setShowMultiPayModal}
                selectedBillIds={bp.selectedBillIds} selectedTotal={selectedTotal}
                multiPayMethod={bp.multiPayMethod} setMultiPayMethod={bp.setMultiPayMethod}
                isSubmittingMulti={bp.isSubmittingMulti} handleMultiPayment={bp.handleMultiPayment}
            />
        </div>
    );
};

export default StudentBills;
