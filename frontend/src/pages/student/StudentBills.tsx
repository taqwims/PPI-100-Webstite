import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, Download, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { generateBillReceipt } from '../../utils/pdfUtils';
import { Bill, formatCurrency, getRemainingAmount, hasPendingTransfer, getStatusInfo } from '../../components/finance/Billing/BillingUtils';
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

    const filteredBills = (bills || []).filter((b: Bill) => {
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

    const unpaidBills = sortedBills.filter((b: Bill) => b.status !== 'Paid');
    const paidBills = sortedBills.filter((b: Bill) => b.status === 'Paid');
    const totalUnpaid = unpaidBills.reduce((acc: number, b: Bill) => acc + getRemainingAmount(b), 0);

    const selectedBills = unpaidBills.filter(b => bp.selectedBillIds.includes(b.id));
    const selectedTotal = selectedBills.reduce((sum, b) => sum + getRemainingAmount(b), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tagihan Saya</h1>
                <p className="text-slate-500 mt-1">Lihat dan bayar tagihan sekolah Anda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Total Sisa Tagihan</p>
                    <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalUnpaid)}</h2>
                    <p className="text-xs text-slate-400 mt-1">{unpaidBills.length} tagihan belum lunas</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Tagihan Lunas</p>
                    <h2 className="text-2xl font-bold text-emerald-600 mt-1">{paidBills.length}</h2>
                    <p className="text-xs text-slate-400 mt-1">tagihan selesai</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-slate-800">Daftar Tagihan</h2>
                        {bp.selectedBillIds.length >= 2 && (
                            <button
                                onClick={() => bp.setShowMultiPayModal(true)}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
                            >
                                Bayar Terpilih ({bp.selectedBillIds.length})
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-slate-700" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1.5 pl-2 pr-8 bg-white"
                        >
                            <option value="all">Semua Tahun Ajaran</option>
                            {academicYears?.map((year: any) => (
                                <option key={year.id} value={year.id.toString()}>{year.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div></div>
                ) : !bills?.length ? (
                    <div className="p-12 text-center text-slate-500">
                        <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-700">Belum Ada Tagihan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider">
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            onChange={(e) => {
                                                const validBills = unpaidBills.filter(b => !hasPendingTransfer(b));
                                                bp.setSelectedBillIds(e.target.checked ? validBills.map(b => b.id) : []);
                                            }}
                                            checked={unpaidBills.length > 0 && bp.selectedBillIds.length === unpaidBills.filter(b => !hasPendingTransfer(b)).length}
                                        />
                                    </th>
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
                                        <div className="flex items-center justify-center gap-1">Jatuh Tempo {getSortIcon('due_date')}</div>
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
                                    return (
                                        <tr key={bill.id} className={clsx("hover:bg-slate-50/50 transition-colors", bp.selectedBillIds.includes(bill.id) && "bg-indigo-50/30")}>
                                            <td className="p-4">
                                                {bill.status !== 'Paid' && !hasPendingTransfer(bill) && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={bp.selectedBillIds.includes(bill.id)}
                                                        onChange={() => bp.toggleBillSelection(bill.id)}
                                                    />
                                                )}
                                            </td>
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
                                            <td className="p-4 text-center text-sm text-slate-500">{new Date(bill.due_date).toLocaleDateString('id-ID')}</td>
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
                                            <td className="p-4 text-center">
                                                {bill.status !== 'Paid' && !hasPendingTransfer(bill) ? (
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
                )}
            </div>

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
