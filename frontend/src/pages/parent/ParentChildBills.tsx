import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, Download, Filter, ArrowUpDown, ArrowUp, ArrowDown, User } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { generateBillReceipt } from '../../utils/pdfUtils';
import { Bill, formatCurrency, getRemainingAmount, hasPendingTransfer, getStatusInfo } from '../../components/finance/Billing/BillingUtils';
import { useBillingPayment } from '../../hooks/useBillingPayment';
import BillingPaymentModal from '../../components/finance/Billing/BillingPaymentModal';
import BillingMultiPaymentModal from '../../components/finance/Billing/BillingMultiPaymentModal';

const ParentChildBills: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const { user } = useAuth();

    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedSemester, setSelectedSemester] = useState<string>('all');
    const [itemsPerPage, setItemsPerPage] = useState<number>(20);
    const [currentPage, setCurrentPage] = useState<number>(1);
    
    const [sortConfig, setSortConfig] = useState<{ key: keyof Bill | 'remaining'; direction: 'asc' | 'desc' | null }>({
        key: 'bill_type', 
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

    const filteredAndSortedBills = () => {
        let filtered = (bills || []).filter((b: Bill) => {
            if (selectedYear !== 'all' && b.academic_year_id?.toString() !== selectedYear) return false;
            
            if (selectedSemester !== 'all') {
                const dt = new Date(b.due_date || b.created_at);
                const month = dt.getMonth() + 1; // 1-12
                const isSem1 = month >= 7 && month <= 12;
                if (selectedSemester === '1' && !isSem1) return false;
                if (selectedSemester === '2' && isSem1) return false;
            }
            return true;
        });

        if (!sortConfig.direction) return filtered;

        return [...filtered].sort((a, b) => {
            let aVal: any = sortConfig.key === 'remaining' ? getRemainingAmount(a) : a[sortConfig.key as keyof Bill];
            let bVal: any = sortConfig.key === 'remaining' ? getRemainingAmount(b) : b[sortConfig.key as keyof Bill];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const processedBills = filteredAndSortedBills();
    const unpaidBills = (bills || []).filter((b: Bill) => b.status !== 'Paid');
    const totalUnpaid = unpaidBills.reduce((acc: number, b: Bill) => acc + getRemainingAmount(b), 0);

    const selectedBills = (bills || []).filter((b: Bill) => bp.selectedBillIds.includes(b.id));
    const selectedTotal = selectedBills.reduce((sum: number, b: Bill) => sum + getRemainingAmount(b), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tagihan Anak</h1>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tahun:</span>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="text-sm border-none focus:ring-0 p-0 bg-transparent font-semibold text-black">
                        <option value="all">Semua</option>
                        {academicYears?.map((year: any) => (<option key={year.id} value={year.id.toString()}>{year.name}</option>))}
                    </select>
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester:</span>
                        <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="text-sm border-none focus:ring-0 p-0 bg-transparent font-semibold text-black">
                            <option value="all">Semua</option>
                            <option value="1">Ganjil</option>
                            <option value="2">Genap</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tampilkan:</span>
                    <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm border-none focus:ring-0 p-0 bg-transparent font-semibold text-black">
                        <option value="20">20</option>
                        <option value="40">40</option>
                        <option value="80">80</option>
                    </select>
                </div>
                {bp.selectedBillIds.length >= 2 && (
                    <button onClick={() => bp.setShowMultiPayModal(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition">
                        Bayar Terpilih ({bp.selectedBillIds.length})
                    </button>
                )}
            </div>

            {totalUnpaid > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl p-5 border border-red-100">
                    <p className="text-sm text-red-600 font-medium">Total Sisa Tagihan Seluruh Anak</p>
                    <h2 className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalUnpaid)}</h2>
                    <p className="text-xs text-red-500 mt-1">{unpaidBills.length} tagihan menunggu penyelesaian</p>
                </div>
            )}

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
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={studentBills.length > 0 && studentBills.filter((b: any) => b.status !== 'Paid' && !hasPendingTransfer(b)).every((b: any) => bp.selectedBillIds.includes(b.id)) && studentBills.some((b: any) => b.status !== 'Paid' && !hasPendingTransfer(b))}
                                                onChange={(e) => {
                                                    const availableIds = studentBills.filter((b: any) => b.status !== 'Paid' && !hasPendingTransfer(b)).map((b: any) => b.id);
                                                    if (e.target.checked) {
                                                        bp.setSelectedBillIds(prev => Array.from(new Set([...prev, ...availableIds])));
                                                    } else {
                                                        bp.setSelectedBillIds(prev => prev.filter(id => !availableIds.includes(id)));
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('created_at')}>
                                            <div className="flex items-center gap-1">Info Tagihan {getSortIcon('created_at')}</div>
                                        </th>
                                        <th className="p-4 text-right cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('amount')}>
                                            <div className="flex items-center justify-end gap-1">Total {getSortIcon('amount')}</div>
                                        </th>
                                        <th className="p-4 text-right cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('remaining')}>
                                            <div className="flex items-center justify-end gap-1">Sisa {getSortIcon('remaining')}</div>
                                        </th>
                                        <th className="p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('due_date')}>
                                            <div className="flex items-center justify-center gap-1 text-center">Jatuh Tempo {getSortIcon('due_date')}</div>
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
                                            <tr key={bill.id} className={clsx("hover:bg-slate-50/50 transition-colors", bp.selectedBillIds.includes(bill.id) && "bg-indigo-50/30")}>
                                                <td className="p-4">
                                                    {bill.status !== 'Paid' && !hasPendingTransfer(bill) ? (
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={bp.selectedBillIds.includes(bill.id)}
                                                            onChange={() => bp.toggleBillSelection(bill.id)}
                                                        />
                                                    ) : null}
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
                                                        status.color === 'red' && "bg-red-100 text-red-800",
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
                                                                    try { await generateBillReceipt(bill); toast.success('Kuitansi berhasil diunduh'); }
                                                                    catch { toast.error('Gagal mengunduh kuitansi'); }
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
                    </div>
                ))}

                {processedBills.length > itemsPerPage && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 mt-4 bg-white rounded-xl shadow-sm border">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">Sebelumnya</button>
                        <span className="font-medium text-slate-700">Halaman {currentPage} dari {Math.ceil(processedBills.length / itemsPerPage)}</span>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(processedBills.length / itemsPerPage)))} disabled={currentPage === Math.ceil(processedBills.length / itemsPerPage)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">Selanjutnya</button>
                    </div>
                )}
                </>
            )}

            <BillingPaymentModal
                showPayModal={bp.showPayModal} setShowPayModal={bp.setShowPayModal}
                selectedBill={bp.selectedBill}
                paymentMethod={bp.paymentMethod} setPaymentMethod={bp.setPaymentMethod}
                paymentAmount={bp.paymentAmount} setPaymentAmount={bp.setPaymentAmount}
                proofFile={bp.proofFile} setProofFile={bp.setProofFile}
                submitting={bp.submitting} loadingSnap={bp.loadingSnap} successMsg={bp.successMsg}
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

export default ParentChildBills;
