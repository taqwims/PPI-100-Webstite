import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Download, FileText, BarChart3, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import { drawStandardHeader, addPageFooters } from '../../utils/invoiceTemplate';

interface AssetCategoryCount {
    category: string;
    count: number;
    value: number;
}

interface AssetStatusCount {
    status: string;
    count: number;
}

interface AssetRecap {
    by_category: AssetCategoryCount[];
    by_status: AssetStatusCount[];
    total_value: number;
    total_assets: number;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const AssetRecapPanel: React.FC = () => {
    const [exported, setExported] = useState(false);

    const { data: recap, isLoading } = useQuery<AssetRecap>({
        queryKey: ['assets-recap'],
        queryFn: async () => {
            const res = await api.get('/assets/recap');
            return res.data;
        },
    });

    const handleExportCSV = () => {
        if (!recap) return;

        const rows: string[][] = [];
        rows.push(['REKAP ASET SEKOLAH']);
        rows.push([`Tanggal Laporan: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`]);
        rows.push([]);
        rows.push(['Total Aset', String(recap.total_assets)]);
        rows.push(['Total Nilai Aset', String(recap.total_value)]);
        rows.push([]);
        rows.push(['REKAP PER KATEGORI']);
        rows.push(['Kategori', 'Jumlah Aset', 'Total Nilai']);
        (recap.by_category || []).forEach(c => {
            rows.push([c.category, String(c.count), String(c.value)]);
        });
        rows.push([]);
        rows.push(['REKAP PER STATUS']);
        rows.push(['Status', 'Jumlah Aset']);
        (recap.by_status || []).forEach(s => {
            rows.push([s.status, String(s.count)]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rekap-aset-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExported(true);
    };

    const handleExportPDF = () => {
        if (!recap) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const reportDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        let y = drawStandardHeader(doc, {
            title: 'REKAP ASET SEKOLAH',
            subtitle: `Tanggal Laporan: ${reportDate}`,
            invoiceNumber: '',
        });

        // Summary cards
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Ringkasan Aset', 14, y);
        y += 6;

        const cardW = (pageWidth - 28 - 4) / 2;
        // Card 1: Total Aset
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(14, y, cardW, 14, 2, 2, 'F');
        doc.setTextColor(22, 101, 52);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Aset', 18, y + 5);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(String(recap.total_assets), 18, y + 11);

        // Card 2: Total Nilai
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(14 + cardW + 4, y, cardW, 14, 2, 2, 'F');
        doc.setTextColor(29, 78, 216);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Nilai Aset', 18 + cardW + 4, y + 5);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(recap.total_value), 18 + cardW + 4, y + 11);
        y += 20;

        // Table: By Category
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Rekap per Kategori', 14, y);
        y += 5;

        const tableW = pageWidth - 28;
        const colCat = 14;
        const colCount = 14 + tableW * 0.5;
        const colVal = pageWidth - 14;

        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, tableW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Kategori', colCat + 2, y + 4.5);
        doc.text('Jumlah Aset', colCount, y + 4.5);
        doc.text('Total Nilai', colVal, y + 4.5, { align: 'right' });
        y += 7;

        (recap.by_category || []).forEach((row, idx) => {
            const rowBg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
            doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
            doc.rect(14, y, tableW, 7, 'F');
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(row.category, colCat + 2, y + 4.5);
            doc.text(String(row.count), colCount, y + 4.5);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrency(row.value), colVal, y + 4.5, { align: 'right' });
            y += 7;
        });

        y += 8;

        // Table: By Status
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Rekap per Status', 14, y);
        y += 5;

        const colStat = 14;
        const colStatCount = 14 + tableW * 0.6;

        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, tableW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Status', colStat + 2, y + 4.5);
        doc.text('Jumlah Aset', colStatCount, y + 4.5);
        y += 7;

        (recap.by_status || []).forEach((row, idx) => {
            const rowBg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
            doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
            doc.rect(14, y, tableW, 7, 'F');
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(row.status, colStat + 2, y + 4.5);
            doc.setFont('helvetica', 'bold');
            doc.text(String(row.count), colStatCount, y + 4.5);
            y += 7;
        });

        addPageFooters(doc);
        doc.save(`rekap-aset-${new Date().toISOString().split('T')[0]}.pdf`);
        setExported(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    if (!recap) {
        return (
            <div className="text-center py-16 text-slate-500">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p>Gagal memuat data rekap aset.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Aset</p>
                    <p className="text-3xl font-bold text-green-700 mt-1">{recap.total_assets}</p>
                    <p className="text-xs text-green-500 mt-1">unit aset tercatat</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Nilai Aset</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(recap.total_value)}</p>
                    <p className="text-xs text-blue-500 mt-1">nilai perolehan keseluruhan</p>
                </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 justify-end">
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                >
                    <Download size={15} /> Ekspor CSV
                </button>
                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition"
                >
                    <FileText size={15} /> Ekspor PDF
                </button>
            </div>

            {/* By Category Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <BarChart3 size={16} className="text-green-600" />
                    <h3 className="font-semibold text-slate-800 text-sm">Rekap per Kategori</h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <th className="px-5 py-3 text-left font-medium">Kategori</th>
                            <th className="px-5 py-3 text-center font-medium">Jumlah Aset</th>
                            <th className="px-5 py-3 text-right font-medium">Total Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(recap.by_category || []).length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Tidak ada data</td>
                            </tr>
                        ) : (
                            (recap.by_category || []).map((row) => (
                                <tr key={row.category} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3 font-medium text-slate-800">{row.category}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className="inline-block px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                            {row.count}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold text-slate-700">
                                        {formatCurrency(row.value)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* By Status Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Package size={16} className="text-indigo-600" />
                    <h3 className="font-semibold text-slate-800 text-sm">Rekap per Status</h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <th className="px-5 py-3 text-left font-medium">Status</th>
                            <th className="px-5 py-3 text-center font-medium">Jumlah Aset</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(recap.by_status || []).length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-5 py-8 text-center text-slate-400">Tidak ada data</td>
                            </tr>
                        ) : (
                            (recap.by_status || []).map((row) => (
                                <tr key={row.status} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3 font-medium text-slate-800">{row.status}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            row.status === 'Aktif' ? 'bg-green-100 text-green-700' :
                                            row.status === 'Dalam Perbaikan' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {row.count}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {exported && (
                <p className="text-xs text-slate-400 text-right">File berhasil diunduh.</p>
            )}
        </div>
    );
};

export default AssetRecapPanel;
