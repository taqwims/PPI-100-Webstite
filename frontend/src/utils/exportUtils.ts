import * as XLSX from 'xlsx';
import { PayrollRecord } from '../components/finance/Payroll/types';
import { CashLedgerEntry } from '../types/cashLedgerTypes';

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format date YYYY-MM-DD to Indonesian DD/MM/YYYY
 */
const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

/**
 * Export Payroll to Professional Excel (.xlsx) file
 */
export const exportPayrollToExcel = (payrolls: PayrollRecord[], month: number, year: number) => {
    if (!payrolls || !payrolls.length) {
        alert("Tidak ada data penggajian untuk diekspor");
        return;
    }

    const monthName = MONTH_NAMES[month - 1] || `Bulan_${month}`;

    // Collect all dynamic custom income and deduction names
    const customIncomeNames = Array.from(new Set(
        payrolls.flatMap(p => (p.custom_income_items || []).map(i => i.name).filter(Boolean))
    ));
    const customDeductionNames = Array.from(new Set(
        payrolls.flatMap(p => (p.custom_deduction_items || []).map(i => i.name).filter(Boolean))
    ));

    // Define table headers
    const headers: string[] = [
        'No',
        'Nama Pegawai',
        'NIK / NIP',
        'Jabatan',
        'Gaji Pokok',
        'Tunj. Fungsional',
        'Tunj. Transport',
        'Tugas Tambahan',
        ...customIncomeNames,
        'TOTAL PENDAPATAN',
        'Keterlambatan',
        'Infaq (2.5%)',
        'Kasbon',
        ...customDeductionNames,
        'TOTAL POTONGAN',
        'GAJI BERSIH',
        'Status',
        'Metode Bayar',
        'Nama Bank',
        'No. Rekening',
        'Atas Nama',
        'Catatan'
    ];

    // Build data rows
    let totalBase = 0;
    let totalFunctional = 0;
    let totalTransport = 0;
    let totalTask = 0;
    const totalCustomIncomes: Record<string, number> = {};
    let grandTotalIncome = 0;

    let totalLateness = 0;
    let totalInfaq = 0;
    let totalCashAdvance = 0;
    const totalCustomDeductions: Record<string, number> = {};
    let grandTotalDeduction = 0;
    let grandNetSalary = 0;

    customIncomeNames.forEach(n => totalCustomIncomes[n] = 0);
    customDeductionNames.forEach(n => totalCustomDeductions[n] = 0);

    const rows = payrolls.map((p, index) => {
        const cIncomeMap: Record<string, number> = {};
        (p.custom_income_items || []).forEach(i => {
            if (i.name) cIncomeMap[i.name] = (cIncomeMap[i.name] || 0) + (i.amount || 0);
        });

        const cDeductMap: Record<string, number> = {};
        (p.custom_deduction_items || []).forEach(i => {
            if (i.name) cDeductMap[i.name] = (cDeductMap[i.name] || 0) + (i.amount || 0);
        });

        totalBase += p.base_salary || 0;
        totalFunctional += p.functional_allowance || 0;
        totalTransport += p.transport_allowance || 0;
        totalTask += p.additional_task || 0;
        grandTotalIncome += p.total_income || 0;

        totalLateness += p.lateness_penalty || 0;
        totalInfaq += p.infaq_deduction || 0;
        totalCashAdvance += p.cash_advance || 0;
        grandTotalDeduction += p.total_deduction || 0;
        grandNetSalary += p.net_salary || 0;

        customIncomeNames.forEach(n => {
            totalCustomIncomes[n] += cIncomeMap[n] || 0;
        });
        customDeductionNames.forEach(n => {
            totalCustomDeductions[n] += cDeductMap[n] || 0;
        });

        return [
            index + 1,
            p.employee_name || p.user?.name || '-',
            p.employee_nik || '-',
            p.position || '-',
            p.base_salary || 0,
            p.functional_allowance || 0,
            p.transport_allowance || 0,
            p.additional_task || 0,
            ...customIncomeNames.map(n => cIncomeMap[n] || 0),
            p.total_income || 0,
            p.lateness_penalty || 0,
            p.infaq_deduction || 0,
            p.cash_advance || 0,
            ...customDeductionNames.map(n => cDeductMap[n] || 0),
            p.total_deduction || 0,
            p.net_salary || 0,
            p.status === 'Paid' ? 'Lunas' : 'Draft',
            p.payment_method || 'Transfer',
            p.bank_name || '-',
            p.bank_account_number || '-',
            p.bank_account_holder || '-',
            p.notes || ''
        ];
    });

    // Summary / Total row
    const totalRow = [
        'TOTAL',
        '',
        '',
        '',
        totalBase,
        totalFunctional,
        totalTransport,
        totalTask,
        ...customIncomeNames.map(n => totalCustomIncomes[n] || 0),
        grandTotalIncome,
        totalLateness,
        totalInfaq,
        totalCashAdvance,
        ...customDeductionNames.map(n => totalCustomDeductions[n] || 0),
        grandTotalDeduction,
        grandNetSalary,
        '',
        '',
        '',
        '',
        '',
        ''
    ];

    // Header info rows
    const titleRows = [
        ['LAPORAN REKAPITULASI PENGGAJIAN PEGAWAI & GURU'],
        [`Periode: ${monthName} ${year}`],
        [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`],
        [] // Blank row
    ];

    const worksheetData = [
        ...titleRows,
        headers,
        ...rows,
        totalRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = headers.map((h, i) => {
        if (i === 0) return { wch: 5 };
        if (i === 1) return { wch: 25 };
        if (i === 2 || i === 3) return { wch: 18 };
        if (h.includes('TOTAL') || h.includes('GAJI')) return { wch: 18 };
        return { wch: 15 };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Gaji ${monthName} ${year}`);

    XLSX.writeFile(wb, `Laporan_Gaji_${monthName}_${year}.xlsx`);
};

/**
 * Export Cash Ledger (BKU) to Professional Excel (.xlsx) file
 */
export const exportCashLedgerToExcel = (
    entries: CashLedgerEntry[],
    startDate?: string,
    endDate?: string
) => {
    if (!entries || !entries.length) {
        alert("Tidak ada data Buku Kas Umum untuk diekspor");
        return;
    }

    const headers = [
        'No',
        'Tanggal',
        'No. Bukti / Invoice',
        'Kode Akun',
        'Kategori Akun',
        'Uraian Transaksi',
        'Sumber Dana',
        'Pemasukan (Debit)',
        'Pengeluaran (Kredit)',
        'Saldo Berjalan',
        'Penanggung Jawab',
        'Catatan'
    ];

    let totalIncome = 0;
    let totalExpense = 0;
    let runningBalance = 0;

    // Sort chronologically ascending for proper ledger export
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const rows = sortedEntries.map((e, index) => {
        const isIncome = e.type === 'Income';
        const debit = isIncome ? (e.amount || 0) : 0;
        const credit = !isIncome ? (e.amount || 0) : 0;

        totalIncome += debit;
        totalExpense += credit;
        runningBalance += (debit - credit);

        return [
            index + 1,
            formatDateIndo(e.date),
            e.invoice_number || '-',
            e.transaction_code?.code || '-',
            e.transaction_code?.name || e.category || '-',
            e.item_name || '-',
            e.fund_source || e.source || 'Kas Utama',
            debit,
            credit,
            runningBalance,
            e.responsible?.name || '-',
            e.notes || ''
        ];
    });

    const totalRow = [
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        totalIncome,
        totalExpense,
        runningBalance,
        '',
        ''
    ];

    const periodLabel = startDate && endDate 
        ? `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`
        : startDate ? `Sejak ${formatDateIndo(startDate)}` : endDate ? `Sampai ${formatDateIndo(endDate)}` : 'Semua Periode';

    const titleRows = [
        ['BUKU KAS UMUM (BKU)'],
        [`Periode: ${periodLabel}`],
        [`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`],
        []
    ];

    const worksheetData = [
        ...titleRows,
        headers,
        ...rows,
        totalRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 14 }, // Tanggal
        { wch: 20 }, // Invoice
        { wch: 12 }, // Kode Akun
        { wch: 22 }, // Kategori Akun
        { wch: 32 }, // Uraian Transaksi
        { wch: 18 }, // Sumber Dana
        { wch: 18 }, // Pemasukan
        { wch: 18 }, // Pengeluaran
        { wch: 20 }, // Saldo Berjalan
        { wch: 20 }, // PIC
        { wch: 25 }  // Catatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas Umum');

    const filename = `BKU_${(startDate || 'Awal').replace(/-/g, '')}_${(endDate || 'Akhir').replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, filename);
};

/**
 * Export Daily Infaq to Excel (.xlsx) file
 */
export const exportDailyInfaqToExcel = (
    entries: any[],
    startDate?: string,
    endDate?: string
) => {
    if (!entries || !entries.length) {
        alert("Tidak ada data infaq harian untuk diekspor");
        return;
    }

    const headers = [
        'No',
        'Tanggal',
        'Nama / Uraian Infaq',
        'Kategori / Jenis Infaq',
        'Sumber / Dari',
        'Nominal (Rp)',
        'Penerima / Petugas',
        'Catatan'
    ];

    let totalAmount = 0;
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const rows = sortedEntries.map((e, index) => {
        const amount = e.amount || 0;
        totalAmount += amount;
        return [
            index + 1,
            formatDateIndo(e.date),
            e.name || e.item_name || 'Infaq Harian',
            e.infaq_type?.name || e.category || 'Infaq Umum',
            e.source || e.donor_name || '-',
            amount,
            e.receiver?.name || e.responsible?.name || '-',
            e.notes || ''
        ];
    });

    const totalRow = [
        'TOTAL',
        '',
        '',
        '',
        '',
        totalAmount,
        '',
        ''
    ];

    const periodLabel = startDate && endDate 
        ? `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`
        : startDate ? `Sejak ${formatDateIndo(startDate)}` : endDate ? `Sampai ${formatDateIndo(endDate)}` : 'Semua Periode';

    const titleRows = [
        ['REKAPITULASI INFAQ HARIAN'],
        [`Periode: ${periodLabel}`],
        [`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`],
        []
    ];

    const worksheetData = [
        ...titleRows,
        headers,
        ...rows,
        totalRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 14 },
        { wch: 28 },
        { wch: 22 },
        { wch: 20 },
        { wch: 18 },
        { wch: 22 },
        { wch: 25 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Infaq Harian');

    const filename = `Infaq_Harian_${(startDate || 'Awal').replace(/-/g, '')}_${(endDate || 'Akhir').replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, filename);
};

/**
 * Generic Fallback CSV Exporter with UTF-8 BOM
 */
export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
        alert("Tidak ada data untuk diekspor");
        return;
    }

    const headers = Object.keys(data[0]);

    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => {
                let cellData = row[fieldName];
                if (cellData === null || cellData === undefined) {
                    return '""';
                }
                if (typeof cellData === 'object') {
                    cellData = JSON.stringify(cellData).replace(/"/g, '""');
                }
                return `"${String(cellData).replace(/"/g, '""')}"`;
            }).join(',')
        )
    ].join('\r\n');

    // Include UTF-8 BOM so Excel opens special characters and encoding properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
