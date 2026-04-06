import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ArrowDownLeft, ArrowUpRight, Filter, Eye, Download, X, FileText } from 'lucide-react';
import clsx from 'clsx';
import { generateFinancialReportPDF } from '../../utils/pdfUtils';

interface GlobalTransaction {
    date: string;
    source: string;
    description: string;
    type: string;
    amount: number;
    category: string;
    code: string;
    code_name: string;
    module: string;
}

interface AcademicYear { id: number; name: string; is_active: boolean; }
interface Bill { id: string; title: string; amount: number; status: string; bill_type: string; due_date: string; academic_year_id?: number; student: { user: { name: string }; class?: { name: string } }; }

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const Reports: React.FC = () => {
    const [reportType, setReportType] = useState('daily');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterYearId, setFilterYearId] = useState('');

    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState('');

    const { data: years = [] } = useQuery<AcademicYear[]>({
        queryKey: ['academic-years'],
        queryFn: async () => (await api.get('/finance/academic-years')).data,
    });

    // Daily: fetch all transactions for the selected date
    const { data: dailyData = [], isLoading: loadingDaily } = useQuery<GlobalTransaction[]>({
        queryKey: ['report-daily', filterDate],
        queryFn: async () => (await api.get(`/finance/global-transactions?start_date=${filterDate}&end_date=${filterDate}`)).data || [],
        enabled: reportType === 'daily',
    });

    // Monthly: first and last day of month
    const monthStart = filterMonth + '-01';
    const monthEnd = (() => { const d = new Date(filterMonth + '-01'); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().split('T')[0]; })();
    const { data: monthlyData = [], isLoading: loadingMonthly } = useQuery<GlobalTransaction[]>({
        queryKey: ['report-monthly', filterMonth],
        queryFn: async () => (await api.get(`/finance/global-transactions?start_date=${monthStart}&end_date=${monthEnd}`)).data || [],
        enabled: reportType === 'monthly',
    });

    // Tunggakan: fetch unpaid bills, optionally filtered by academic year
    const { data: billsData = [], isLoading: loadingBills } = useQuery<Bill[]>({
        queryKey: ['report-tunggakan', filterYearId],
        queryFn: async () => {
            const bills: Bill[] = (await api.get('/finance/bills')).data || [];
            let unpaid = bills.filter(b => b.status === 'Unpaid' || b.status === 'Partial' || b.status === 'Overdue');
            if (filterYearId) unpaid = unpaid.filter(b => String(b.academic_year_id) === filterYearId);
            return unpaid;
        },
        enabled: reportType === 'tunggakan',
    });

    const transactions = reportType === 'daily' ? dailyData : reportType === 'monthly' ? monthlyData : [];
    const isLoading = reportType === 'daily' ? loadingDaily : reportType === 'monthly' ? loadingMonthly : loadingBills;
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

    // Monthly summary by category
    const monthlySummary: Record<string, { income: number; expense: number }> = {};
    if (reportType === 'monthly') {
        monthlyData.forEach(t => {
            if (!monthlySummary[t.category]) monthlySummary[t.category] = { income: 0, expense: 0 };
            if (t.type === 'Income') monthlySummary[t.category].income += t.amount;
            else monthlySummary[t.category].expense += t.amount;
        });
    }

    const moduleLabels: Record<string, string> = { Bill: 'SPP/Tagihan', CashLedger: 'Kas Umum', DailyInfaq: 'Infaq', Payroll: 'Gaji' };

    const handlePreviewReport = () => {
        if (transactions.length === 0) return;
        const periodStr = reportType === 'daily' ? formatDate(filterDate) : `Bulan ${filterMonth}`;
        const title = reportType === 'daily' ? 'Laporan Transaksi Harian' : 'Laporan Transaksi Bulanan';
        const url = generateFinancialReportPDF(transactions as any, title, periodStr, 'preview') as string;
        setPdfBlobUrl(url);
        setShowPdfPreview(true);
    };

    const handleDownloadReport = () => {
        if (transactions.length === 0) return;
        const periodStr = reportType === 'daily' ? formatDate(filterDate) : `Bulan ${filterMonth}`;
        const title = reportType === 'daily' ? 'Laporan Transaksi Harian' : 'Laporan Transaksi Bulanan';
        generateFinancialReportPDF(transactions as any, title, periodStr, 'download');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan</h1>
                <p className="text-slate-500 mt-1">Laporan transaksi harian, bulanan, dan tunggakan siswa</p>
            </div>

            {/* Controls */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <Filter size={18} />
                    <span className="font-medium text-sm">Filter Laporan</span>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Jenis Laporan</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="daily">Harian</option>
                            <option value="monthly">Bulanan</option>
                            <option value="tunggakan">Tunggakan Siswa</option>
                        </select>
                    </div>
                    {reportType === 'daily' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal</label>
                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                        </div>
                    )}
                    {reportType === 'monthly' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Bulan</label>
                            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                        </div>
                    )}
                    {reportType === 'tunggakan' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tahun Ajaran</label>
                            <select value={filterYearId} onChange={e => setFilterYearId(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                <option value="">Semua</option>
                                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {(reportType === 'daily' || reportType === 'monthly') && transactions.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                        <button onClick={handlePreviewReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition shadow-sm text-sm font-medium">
                            <Eye size={16} className="text-blue-500" /> Preview Laporan
                        </button>
                        <button onClick={handleDownloadReport} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-sm text-sm font-medium">
                            <Download size={16} /> Download PDF
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Cards for daily/monthly */}
            {(reportType === 'daily' || reportType === 'monthly') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Transaksi</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.length}</p>
                    </div>
                    <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-200 shadow-sm">
                        <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-1"><ArrowDownLeft size={14} /> Pendapatan</p>
                        <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="bg-red-50/80 rounded-2xl p-5 border border-red-200 shadow-sm">
                        <p className="text-xs font-medium text-red-600 uppercase tracking-wider flex items-center gap-1"><ArrowUpRight size={14} /> Pengeluaran</p>
                        <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(totalExpense)}</p>
                    </div>
                </div>
            )}

            {/* Monthly Summary by Category */}
            {reportType === 'monthly' && Object.keys(monthlySummary).length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Ringkasan per Kategori</h3></div>
                    <table className="w-full">
                        <thead className="bg-slate-50/80"><tr>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-emerald-600 uppercase">Pendapatan</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-red-600 uppercase">Pengeluaran</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Netto</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(monthlySummary).map(([cat, val]) => (
                                <tr key={cat} className="hover:bg-slate-50/50">
                                    <td className="px-5 py-3 font-medium text-slate-900 text-sm">{cat}</td>
                                    <td className="px-5 py-3 text-right text-sm text-emerald-600 font-medium">{formatCurrency(val.income)}</td>
                                    <td className="px-5 py-3 text-right text-sm text-red-600 font-medium">{formatCurrency(val.expense)}</td>
                                    <td className={clsx('px-5 py-3 text-right text-sm font-bold', val.income - val.expense >= 0 ? 'text-emerald-700' : 'text-red-700')}>{formatCurrency(val.income - val.expense)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Transaction Table (daily/monthly) */}
            {(reportType === 'daily' || reportType === 'monthly') && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Detail Transaksi</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80"><tr>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tanggal</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Modul</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Sumber</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Kode</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Jumlah</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Memuat...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada transaksi</td></tr>
                                ) : transactions.map((t, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                        <td className="px-5 py-3 text-sm text-slate-600">{moduleLabels[t.module] || t.module}</td>
                                        <td className="px-5 py-3 text-sm text-slate-700 max-w-[150px] truncate">{t.source}</td>
                                        <td className="px-5 py-3 text-sm text-slate-700 max-w-[150px] truncate">{t.description}</td>
                                        <td className="px-5 py-3">{t.code ? <span className="font-mono text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded">{t.code}</span> : <span className="text-slate-400 text-xs">-</span>}</td>
                                        <td className={clsx('px-5 py-3 text-sm font-semibold text-right', t.type === 'Income' ? 'text-emerald-600' : 'text-red-600')}>
                                            {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tunggakan Table */}
            {reportType === 'tunggakan' && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Daftar Tunggakan Siswa</h3>
                        <span className="text-sm text-slate-500">{billsData.length} tagihan tertunggak — Total: {formatCurrency(billsData.reduce((s, b) => s + b.amount, 0))}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80"><tr>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Siswa</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Kelas</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tagihan</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Jenis</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Jatuh Tempo</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Jumlah</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingBills ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Memuat...</td></tr>
                                ) : billsData.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada tunggakan</td></tr>
                                ) : billsData.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{b.student?.user?.name || '-'}</td>
                                        <td className="px-5 py-3 text-sm text-slate-600">{b.student?.class?.name || '-'}</td>
                                        <td className="px-5 py-3 text-sm text-slate-700">{b.title}</td>
                                        <td className="px-5 py-3 text-sm text-slate-600">{b.bill_type}</td>
                                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(b.due_date)}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', b.status === 'Overdue' ? 'bg-red-50 text-red-700' : b.status === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>{b.status}</span>
                                        </td>
                                        <td className="px-5 py-3 text-sm font-semibold text-right text-red-600">{formatCurrency(b.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPdfPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPdfPreview(false)}></div>

                    {/* Modal Content */}
                    <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Preview Laporan</h2>
                                    <p className="text-xs text-slate-500">Pratinjau dokumen sebelum diunduh</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        handleDownloadReport();
                                        setShowPdfPreview(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition shadow-sm"
                                >
                                    <Download size={16} /> Unduh
                                </button>
                                <button
                                    onClick={() => setShowPdfPreview(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* PDF Viewer */}
                        <div className="flex-1 w-full bg-slate-100/50 p-4 sm:p-6 overflow-hidden">
                            <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                                <iframe
                                    src={`${pdfBlobUrl}#toolbar=0`}
                                    className="w-full h-full border-0"
                                    title="PDF Preview"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
