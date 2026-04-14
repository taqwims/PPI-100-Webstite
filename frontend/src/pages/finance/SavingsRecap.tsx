import React, { useState, useCallback } from 'react';
import api from '../../services/api';
import { Filter, Download, FileText, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import jsPDF from 'jspdf';
import { drawStandardHeader, addPageFooters } from '../../utils/invoiceTemplate';

interface ClassData { id: number; name: string; }

interface SavingsRecapRow {
    student_id: string;
    student_name: string;
    class_name: string;
    total_deposit: number;
    total_withdraw: number;
    end_balance: number;
}

interface SavingsRecapResponse {
    period: string;
    rows: SavingsRecapRow[];
    grand_deposit: number;
    grand_withdraw: number;
    grand_balance: number;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const currentYear = new Date().getFullYear();

interface SavingsRecapProps {
    classList: ClassData[];
    unitID: number;
}

const SavingsRecap: React.FC<SavingsRecapProps> = ({ classList, unitID }) => {
    const [periodType, setPeriodType] = useState<'monthly' | 'range' | 'semester' | 'yearly'>('monthly');
    const [year, setYear] = useState<number>(currentYear);
    const [semester, setSemester] = useState<1 | 2>(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [classFilter, setClassFilter] = useState('');

    const [loading, setLoading] = useState(false);
    const [recapData, setRecapData] = useState<SavingsRecapResponse | null>(null);

    const fetchRecap = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('period_type', periodType);

            if (periodType === 'monthly' || periodType === 'yearly') {
                params.set('year', String(year));
            } else if (periodType === 'semester') {
                params.set('year', String(year));
                params.set('semester', String(semester));
            } else if (periodType === 'range') {
                if (startDate) params.set('start_date', startDate);
                if (endDate) params.set('end_date', endDate);
            }

            if (classFilter) params.set('class_id', classFilter);

            const res = await api.get(`/finance/savings/recap?${params.toString()}`);
            setRecapData(res.data);
        } catch (error) {
            console.error('Failed to fetch savings recap', error);
        } finally {
            setLoading(false);
        }
    }, [periodType, year, semester, startDate, endDate, classFilter]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchRecap();
    };

    const periodLabel = () => {
        if (periodType === 'monthly') return `Bulanan — Tahun ${year}`;
        if (periodType === 'yearly') return `Tahunan — ${year}`;
        if (periodType === 'semester') return `Semester ${semester} — Tahun ${year}`;
        if (periodType === 'range') return `${startDate} s/d ${endDate}`;
        return '';
    };

    const handleExportCSV = () => {
        if (!recapData || !recapData.rows?.length) return;
        const header = ['Nama Siswa', 'Kelas', 'Total Setoran', 'Total Penarikan', 'Saldo Akhir'];
        const rows = recapData.rows.map(r => [
            r.student_name,
            r.class_name,
            r.total_deposit,
            r.total_withdraw,
            r.end_balance,
        ]);
        rows.push(['TOTAL', '', recapData.grand_deposit, recapData.grand_withdraw, recapData.grand_balance]);

        const csv = [header, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rekap-tabungan-${periodLabel().replace(/\s/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        if (!recapData || !recapData.rows?.length) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const label = recapData.period || periodLabel();

        let y = drawStandardHeader(doc, {
            title: 'REKAP TABUNGAN',
            subtitle: label,
            invoiceNumber: '',
        });

        // Period label row
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Periode: ${label}`, 14, y);
        y += 8;

        // Table header
        const colX = { no: 14, name: 22, kelas: 90, deposit: 125, withdraw: 158, balance: 196 };
        const tableW = pageWidth - 28;

        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, tableW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('No.', colX.no + 1, y + 4.5);
        doc.text('Nama Siswa', colX.name, y + 4.5);
        doc.text('Kelas', colX.kelas, y + 4.5);
        doc.text('Total Setoran', colX.deposit, y + 4.5, { align: 'right' });
        doc.text('Total Penarikan', colX.withdraw, y + 4.5, { align: 'right' });
        doc.text('Saldo Akhir', colX.balance, y + 4.5, { align: 'right' });
        y += 7;

        // Table rows
        recapData.rows.forEach((row, idx) => {
            if (y + 7 > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                y = 20;
            }
            const rowBg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
            doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
            doc.rect(14, y, tableW, 7, 'F');

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(String(idx + 1), colX.no + 1, y + 4.5);
            doc.text(row.student_name, colX.name, y + 4.5);
            doc.text(row.class_name || '-', colX.kelas, y + 4.5);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrency(row.total_deposit), colX.deposit, y + 4.5, { align: 'right' });
            doc.text(formatCurrency(row.total_withdraw), colX.withdraw, y + 4.5, { align: 'right' });
            doc.text(formatCurrency(row.end_balance), colX.balance, y + 4.5, { align: 'right' });
            y += 7;
        });

        // Grand total row
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, tableW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', colX.name, y + 5.5);
        doc.text(formatCurrency(recapData.grand_deposit), colX.deposit, y + 5.5, { align: 'right' });
        doc.text(formatCurrency(recapData.grand_withdraw), colX.withdraw, y + 5.5, { align: 'right' });
        doc.text(formatCurrency(recapData.grand_balance), colX.balance, y + 5.5, { align: 'right' });

        addPageFooters(doc);
        doc.save(`rekap-tabungan-${label.replace(/\s/g, '-')}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Filter Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <Filter size={18} />
                    <span className="font-semibold text-sm">Filter Rekap Tabungan</span>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Period Type */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Jenis Periode</label>
                            <select
                                value={periodType}
                                onChange={e => setPeriodType(e.target.value as typeof periodType)}
                                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="monthly">Bulanan</option>
                                <option value="range">Rentang Tanggal</option>
                                <option value="semester">Semester</option>
                                <option value="yearly">Tahunan</option>
                            </select>
                        </div>

                        {/* Year input (monthly, yearly, semester) */}
                        {(periodType === 'monthly' || periodType === 'yearly' || periodType === 'semester') && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Tahun</label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={e => setYear(Number(e.target.value))}
                                    min={2000}
                                    max={currentYear + 1}
                                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm w-28 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* Semester selector */}
                        {periodType === 'semester' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Semester</label>
                                <select
                                    value={semester}
                                    onChange={e => setSemester(Number(e.target.value) as 1 | 2)}
                                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value={1}>Semester 1 (Jul–Des)</option>
                                    <option value={2}>Semester 2 (Jan–Jun)</option>
                                </select>
                            </div>
                        )}

                        {/* Date range inputs */}
                        {periodType === 'range' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Mulai Tanggal</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        required
                                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        required
                                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                            </>
                        )}

                        {/* Class filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Filter Kelas</label>
                            <select
                                value={classFilter}
                                onChange={e => setClassFilter(e.target.value)}
                                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="">Semua Kelas</option>
                                {classList.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            <BarChart3 size={16} />
                            {loading ? 'Memuat...' : 'Tampilkan Rekap'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results */}
            {recapData && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Table header */}
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Rekap Tabungan</h2>
                            <p className="text-xs text-emerald-600 font-medium mt-0.5">{recapData.period || periodLabel()}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                            >
                                <Download size={14} /> CSV
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                            >
                                <FileText size={14} /> PDF
                            </button>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-px bg-slate-100 border-b border-slate-200">
                        <div className="bg-white p-4 text-center">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Setoran</p>
                            <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(recapData.grand_deposit)}</p>
                        </div>
                        <div className="bg-white p-4 text-center">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Penarikan</p>
                            <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(recapData.grand_withdraw)}</p>
                        </div>
                        <div className="bg-white p-4 text-center">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Saldo Akhir</p>
                            <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(recapData.grand_balance)}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                                    <th className="p-4 font-medium">Nama Siswa</th>
                                    <th className="p-4 font-medium">Kelas</th>
                                    <th className="p-4 font-medium text-right">Total Setoran</th>
                                    <th className="p-4 font-medium text-right">Total Penarikan</th>
                                    <th className="p-4 font-medium text-right">Saldo Akhir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : !recapData.rows?.length ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500">
                                            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="font-medium text-slate-700">Tidak ada data pada periode ini</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {recapData.rows.map(row => (
                                            <tr key={row.student_id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-4 font-medium text-slate-800">{row.student_name}</td>
                                                <td className="p-4">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                                                        {row.class_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-semibold text-emerald-600">
                                                    {formatCurrency(row.total_deposit)}
                                                </td>
                                                <td className="p-4 text-right font-semibold text-red-600">
                                                    {formatCurrency(row.total_withdraw)}
                                                </td>
                                                <td className={clsx(
                                                    'p-4 text-right font-bold',
                                                    row.end_balance >= 0 ? 'text-blue-600' : 'text-red-700'
                                                )}>
                                                    {formatCurrency(row.end_balance)}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Grand total row */}
                                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                                            <td className="p-4 text-slate-800" colSpan={2}>TOTAL</td>
                                            <td className="p-4 text-right text-emerald-700">
                                                {formatCurrency(recapData.grand_deposit)}
                                            </td>
                                            <td className="p-4 text-right text-red-700">
                                                {formatCurrency(recapData.grand_withdraw)}
                                            </td>
                                            <td className="p-4 text-right text-blue-700">
                                                {formatCurrency(recapData.grand_balance)}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state before first fetch */}
            {!recapData && !loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <BarChart3 size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Pilih periode dan klik "Tampilkan Rekap" untuk melihat data</p>
                </div>
            )}
        </div>
    );
};

export default SavingsRecap;
