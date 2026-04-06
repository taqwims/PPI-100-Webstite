import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayrollData {
    id: string;
    period_month: number;
    period_year: number;
    employee_name: string;
    employee_nik: string;
    position: string;
    user?: { name: string; email: string };
    
    base_salary: number;
    functional_allowance: number;
    transport_allowance: number;
    additional_task: number;
    total_income: number;
    
    lateness_penalty: number;
    infaq_deduction: number;
    cash_advance: number;
    total_deduction: number;
    
    net_salary: number;
    status: string;
    paid_at?: string;
}

const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('id-ID', { month: 'long' });
};

interface CashLedgerData {
    id: string;
    date: string;
    source: string;
    item_name: string;
    type: 'Income' | 'Expense';
    amount: number;
    category: string;
    notes: string;
}

export interface GlobalTransactionData {
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

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
    });
};

// ===================== PAYROLL RECEIPT =====================

export const generatePayrollReceipt = (payroll: PayrollData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SLIP GAJI', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Yayasan PPI 100 — Pondok Pesantren Islam', pageWidth / 2, 28, { align: 'center' });
    doc.text(`No: SG-${payroll.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 34, { align: 'center' });

    // Body
    doc.setTextColor(30, 41, 59);
    const startY = 52;
    const labelX = 20;
    const valueX = 80;

    const name = payroll.employee_name || payroll.user?.name || '-';
    // Employee info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pegawai', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nama', labelX, startY + 10);
    doc.text(`: ${name}`, valueX, startY + 10);
    doc.text('Jabatan', labelX, startY + 17);
    doc.text(`: ${payroll.position || '-'}`, valueX, startY + 17);
    doc.text('Periode', labelX, startY + 24);
    doc.text(`: ${getMonthName(payroll.period_month)} ${payroll.period_year}`, valueX, startY + 24);
    doc.text('Tanggal Bayar', labelX, startY + 31);
    doc.text(`: ${formatDate(payroll.paid_at || new Date().toISOString())}`, valueX, startY + 31);

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 37, pageWidth - 20, startY + 37);

    // Salary details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rincian Gaji', labelX, startY + 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let detailY = startY + 52;
    // Pendapatan
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('Pendapatan', labelX, detailY);
    doc.setFont('helvetica', 'normal');
    
    if (payroll.base_salary > 0) {
        detailY += 6;
        doc.text('Gaji Pokok', labelX, detailY);
        doc.text(formatCurrency(payroll.base_salary), pageWidth - 20, detailY, { align: 'right' });
    }
    if (payroll.functional_allowance > 0) {
        detailY += 6;
        doc.text('Tunjangan Fungsional', labelX, detailY);
        doc.text(formatCurrency(payroll.functional_allowance), pageWidth - 20, detailY, { align: 'right' });
    }
    if (payroll.transport_allowance > 0) {
        detailY += 6;
        doc.text('Tunjangan Transport', labelX, detailY);
        doc.text(formatCurrency(payroll.transport_allowance), pageWidth - 20, detailY, { align: 'right' });
    }
    if (payroll.additional_task > 0) {
        detailY += 6;
        doc.text('Tugas Tambahan', labelX, detailY);
        doc.text(formatCurrency(payroll.additional_task), pageWidth - 20, detailY, { align: 'right' });
    }
    
    detailY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text('Total Pendapatan', labelX, detailY);
    doc.text(`+ ${formatCurrency(payroll.total_income)}`, pageWidth - 20, detailY, { align: 'right' });
    
    // Potongan
    detailY += 10;
    doc.setTextColor(30, 41, 59);
    doc.text('Potongan', labelX, detailY);
    doc.setFont('helvetica', 'normal');
    
    if (payroll.lateness_penalty > 0) {
        detailY += 6;
        doc.text('Keterlambatan', labelX, detailY);
        doc.text(formatCurrency(payroll.lateness_penalty), pageWidth - 20, detailY, { align: 'right' });
    }
    if (payroll.infaq_deduction > 0) {
        detailY += 6;
        doc.text('Infaq', labelX, detailY);
        doc.text(formatCurrency(payroll.infaq_deduction), pageWidth - 20, detailY, { align: 'right' });
    }
    if (payroll.cash_advance > 0) {
        detailY += 6;
        doc.text('Kasbon', labelX, detailY);
        doc.text(formatCurrency(payroll.cash_advance), pageWidth - 20, detailY, { align: 'right' });
    }
    
    detailY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68); // red
    doc.text('Total Potongan', labelX, detailY);
    doc.text(`- ${formatCurrency(payroll.total_deduction)}`, pageWidth - 20, detailY, { align: 'right' });

    // Total Netto
    detailY += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, detailY + 2, pageWidth - 20, detailY + 2);
    doc.setTextColor(15, 23, 42); // slate 900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('GAJI BERSIH', labelX, detailY + 10);
    doc.text(formatCurrency(payroll.net_salary), pageWidth - 20, detailY + 10, { align: 'right' });

    // Status badge
    const statusY = detailY + 42;
    const statusText = payroll.status === 'Paid' ? 'LUNAS' : 'TERTUNDA';
    const statusColor: [number, number, number] = payroll.status === 'Paid' ? [16, 185, 129] : [245, 158, 11];
    doc.setFillColor(...statusColor);
    doc.roundedRect(labelX, statusY - 5, 30, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(statusText, labelX + 15, statusY + 1.5, { align: 'center' });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const printedDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    doc.text(`Dicetak secara otomatis oleh sistem pada: ${printedDate}`, labelX, statusY + 20);
    doc.text('Validasi dilakukan oleh sistem keuangan SDIT PPI 100.', labelX, statusY + 25);

    const fileNameName = name.replace(/\s+/g, '_');
    doc.save(`Slip_Gaji_${fileNameName}_${payroll.period_month}_${payroll.period_year}.pdf`);
};

// ===================== CASH LEDGER RECEIPT =====================

export const generateCashLedgerReceipt = (entry: CashLedgerData) => {
    const doc = new jsPDF({ format: [148, 210] }); // A5 size
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    const headerColor: [number, number, number] = entry.type === 'Income' ? [16, 185, 129] : [59, 130, 246];
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BUKTI TRANSAKSI KAS', pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: BK-${entry.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 22, { align: 'center' });

    // Body
    doc.setTextColor(30, 41, 59);
    const startY = 40;
    const labelX = 12;
    const valueX = 55;

    doc.setFontSize(9);
    doc.text('Tanggal', labelX, startY);
    doc.text(`: ${formatDate(entry.date)}`, valueX, startY);
    doc.text('Jenis', labelX, startY + 7);
    doc.text(`: ${entry.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'}`, valueX, startY + 7);
    doc.text('Kategori', labelX, startY + 14);
    doc.text(`: ${entry.category}`, valueX, startY + 14);
    doc.text('Item/Keperluan', labelX, startY + 21);
    doc.text(`: ${entry.item_name}`, valueX, startY + 21);
    doc.text('Sumber/Tujuan', labelX, startY + 28);
    doc.text(`: ${entry.source}`, valueX, startY + 28);

    if (entry.notes) {
        doc.text('Catatan', labelX, startY + 35);
        doc.text(`: ${entry.notes}`, valueX, startY + 35);
    }

    // Amount
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 42, pageWidth - 12, startY + 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NOMINAL', labelX, startY + 50);
    doc.setTextColor(...headerColor);
    doc.text(formatCurrency(entry.amount), pageWidth - 12, startY + 50, { align: 'right' });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, labelX, startY + 65);

    doc.save(`Bukti_Kas_${entry.item_name.replace(/\s+/g, '_')}_${new Date(entry.date).toISOString().split('T')[0]}.pdf`);
};

// ===================== FINANCIAL REPORT (GLOBAL) =====================

export const generateFinancialReportPDF = (
    transactions: GlobalTransactionData[],
    reportTitle: string,
    periodStr: string,
    action: 'preview' | 'download' = 'download'
): string | void => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle.toUpperCase(), pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${periodStr}`, pageWidth / 2, 22, { align: 'center' });

    // Summary
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const netto = totalIncome - totalExpense;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Pendapatan: ${formatCurrency(totalIncome)}`, 14, 40);
    doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 120, 40);
    doc.text(`Netto: ${formatCurrency(netto)}`, 226, 40);

    // Table
    autoTable(doc, {
        startY: 48,
        head: [['No', 'Tanggal', 'Modul', 'Deskripsi/Sumber', 'Kode', 'Ket', 'Kategori', 'Pemasukan', 'Pengeluaran']],
        body: transactions.map((t, i) => [
            i + 1,
            formatDate(t.date),
            t.module,
            `${t.description} / ${t.source}`,
            t.code || '-',
            t.code_name || '-',
            t.category || '-',
            t.type === 'Income' ? formatCurrency(t.amount) : '-',
            t.type === 'Expense' ? formatCurrency(t.amount) : '-'
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} - Yayasan PPI 100`, 14, doc.internal.pageSize.getHeight() - 10);

    if (action === 'preview') {
        return doc.output('bloburl').toString();
    } else {
        doc.save(`${reportTitle.replace(/\s+/g, '_')}_${periodStr.replace(/\s+/g, '_')}.pdf`);
    }
};

// ===================== CASH LEDGER REPORT =====================

export const generateCashLedgerReport = (
    entries: CashLedgerData[],
    startDate: string,
    endDate: string
) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN BUKU KAS UMUM', pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${formatDate(startDate)} — ${formatDate(endDate)}`, pageWidth / 2, 22, { align: 'center' });

    // Summary
    const totalIncome = entries.filter(e => e.type === 'Income').reduce((a, c) => a + c.amount, 0);
    const totalExpense = entries.filter(e => e.type === 'Expense').reduce((a, c) => a + c.amount, 0);
    const balance = totalIncome - totalExpense;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Pemasukan: ${formatCurrency(totalIncome)}`, 14, 40);
    doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 120, 40);
    doc.text(`Saldo: ${formatCurrency(balance)}`, 226, 40);

    // Table
    autoTable(doc, {
        startY: 48,
        head: [['No', 'Tanggal', 'Item/Keperluan', 'Sumber/Tujuan', 'Kategori', 'Pemasukan', 'Pengeluaran', 'Keterangan']],
        body: entries.map((e, i) => [
            i + 1,
            formatDate(e.date),
            e.item_name,
            e.source,
            e.category,
            e.type === 'Income' ? formatCurrency(e.amount) : '-',
            e.type === 'Expense' ? formatCurrency(e.amount) : '-',
            e.notes || '-'
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`Laporan_Kas_${startDate}_${endDate}.pdf`);
};

// ===================== SAVINGS REPORT =====================

interface SavingsAccountData {
    id: string;
    balance: number;
    student?: { user?: { name: string }; class?: { name: string }; nisn?: string };
}

interface SavingsTransactionData {
    id: string;
    type: string;
    amount: number;
    date: string;
    handled_by?: { name: string };
    notes?: string;
}

export const generateSavingsReport = (
    account: SavingsAccountData,
    transactions: SavingsTransactionData[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const studentName = account.student?.user?.name || 'Siswa';
    const className = account.student?.class?.name || '-';

    // Header
    doc.setFillColor(16, 185, 129); // emerald
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN TABUNGAN SISWA', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Yayasan PPI 100 — Pondok Pesantren Islam', pageWidth / 2, 25, { align: 'center' });
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 31, { align: 'center' });

    // Student Info
    doc.setTextColor(30, 41, 59);
    const startY = 47;
    const labelX = 14;
    const valueX = 55;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Siswa', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nama', labelX, startY + 10);
    doc.text(`: ${studentName}`, valueX, startY + 10);
    doc.text('Kelas', labelX, startY + 17);
    doc.text(`: ${className}`, valueX, startY + 17);
    if (account.student?.nisn) {
        doc.text('NISN', labelX, startY + 24);
        doc.text(`: ${account.student.nisn}`, valueX, startY + 24);
    }

    // Balance summary
    const totalDeposit = transactions.filter(t => t.type === 'Deposit' || t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalWithdrawal = transactions.filter(t => t.type === 'Withdrawal' || t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);

    doc.setDrawColor(203, 213, 225);
    const summaryY = account.student?.nisn ? startY + 32 : startY + 28;
    doc.line(labelX, summaryY, pageWidth - 14, summaryY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Saldo: ${formatCurrency(account.balance)}`, labelX, summaryY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Setoran: ${formatCurrency(totalDeposit)}`, 90, summaryY + 8);
    doc.setTextColor(239, 68, 68);
    doc.text(`Total Penarikan: ${formatCurrency(totalWithdrawal)}`, 155, summaryY + 8);

    // Transaction Table
    autoTable(doc, {
        startY: summaryY + 15,
        head: [['No', 'Tanggal', 'Jenis', 'Nominal', 'Petugas', 'Catatan']],
        body: transactions.map((t, i) => {
            const isDeposit = t.type === 'Deposit' || t.type === 'deposit';
            return [
                i + 1,
                formatDate(t.date),
                isDeposit ? 'Setoran' : 'Penarikan',
                `${isDeposit ? '+' : '-'} ${formatCurrency(t.amount)}`,
                t.handled_by?.name || '-',
                t.notes || '-'
            ];
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
    });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(`Laporan Tabungan — ${studentName}`, 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`Tabungan_${studentName.replace(/\s+/g, '_')}.pdf`);
};

// ===================== BILL PAYMENT RECEIPT =====================

interface BillReceiptData {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    bill_type: string;
    student?: {
        user: { name: string };
        class?: { name: string };
    };
    paid_at?: string;
}

export const generateBillReceipt = (bill: BillReceiptData, studentName?: string) => {
    const doc = new jsPDF({
        format: [148, 210], // A5 format for receipt feel
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, pageWidth, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('KUITANSI PEMBAYARAN', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Yayasan PPI 100 — Pondok Pesantren Islam', pageWidth / 2, 23, { align: 'center' });
    doc.text(`No: KP-${bill.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 30, { align: 'center' });

    // Body
    doc.setTextColor(30, 41, 59);
    const startY = 46;
    const labelX = 14;
    const valueX = 60;

    // Student info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Siswa', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const name = studentName || bill.student?.user?.name || '-';
    const className = bill.student?.class?.name || '-';
    doc.text('Nama', labelX, startY + 9);
    doc.text(`: ${name}`, valueX, startY + 9);
    doc.text('Kelas', labelX, startY + 16);
    doc.text(`: ${className}`, valueX, startY + 16);

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 22, pageWidth - 14, startY + 22);

    // Bill info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detail Tagihan', labelX, startY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text('Jenis', labelX, startY + 39);
    doc.text(`: ${bill.bill_type || 'SPP'}`, valueX, startY + 39);
    doc.text('Keterangan', labelX, startY + 46);
    doc.text(`: ${bill.title}`, valueX, startY + 46);
    doc.text('Jatuh Tempo', labelX, startY + 53);
    doc.text(`: ${formatDate(bill.due_date)}`, valueX, startY + 53);

    // Divider
    doc.line(labelX, startY + 59, pageWidth - 14, startY + 59);

    // Amount box
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.roundedRect(labelX, startY + 64, pageWidth - 28, 22, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Total Dibayar', labelX + 6, startY + 74);
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(formatCurrency(bill.amount), pageWidth - 20, startY + 77, { align: 'right' });

    // Status
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ LUNAS', pageWidth / 2, startY + 100, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const paidDate = bill.paid_at ? formatDate(bill.paid_at) : formatDate(new Date().toISOString());
    doc.text(`Dibayar pada: ${paidDate}`, pageWidth / 2, startY + 108, { align: 'center' });

    // Footer
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 120, pageWidth - 14, startY + 120);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('Dokumen ini dicetak secara otomatis oleh sistem keuangan PPI 100.', pageWidth / 2, startY + 128, { align: 'center' });
    doc.text('Kuitansi ini sah tanpa tanda tangan.', pageWidth / 2, startY + 133, { align: 'center' });

    doc.save(`Kuitansi_${bill.title.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}.pdf`);
};

// ===================== ACTIVITY REPORT =====================

interface ActivityReportOptions {
    activity: { name: string; target_amount: number; academic_year?: { name: string } };
    obligationsCount: number;
    summary: { total_income: number; total_expense: number; balance: number } | null;
    transactions: { date: string; description: string; transaction_type: string; amount: number }[];
}

export const generateActivityReportPDF = (data: ActivityReportOptions) => {
    const { activity, obligationsCount, summary, transactions } = data;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Laporan Rekapitulasi Keuangan Kegiatan', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    // @ts-ignore
    doc.text(`${activity.name} • Tahun Ajaran ${activity.academic_year?.name || '-'}`, 14, 30);
    
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text('1. Ringkasan Keuangan', 14, 45);
    
    const totalTargetAmt = obligationsCount * activity.target_amount;

    autoTable(doc, {
        startY: 50,
        head: [['Keterangan', 'Nominal']],
        body: [
            ['Total Target Pendapatan (Peserta x Tagihan)', formatCurrency(totalTargetAmt)],
            ['Proyeksi Sisa Belum Tertagih', formatCurrency(totalTargetAmt - (summary?.total_income || 0))],
            ['Total Dana Masuk dari Siswa', formatCurrency(summary?.total_income || 0)],
            ['Total Pengeluaran Panitia', formatCurrency(summary?.total_expense || 0)],
            ['Saldo Akhir Kegiatan', formatCurrency(summary?.balance || 0)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 50;

    doc.setFontSize(14);
    doc.text('2. Riwayat Transaksi', 14, finalY + 15);

    const txData = transactions.map(tx => [
        new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.date)),
        tx.description,
        tx.transaction_type === 'Income' ? formatCurrency(tx.amount) : '-',
        tx.transaction_type === 'Expense' ? formatCurrency(tx.amount) : '-'
    ]);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Tanggal', 'Uraian / Keterangan', 'Pemasukan', 'Pengeluaran']],
        body: txData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`Laporan_Kegiatan_${activity.name.replace(/\s+/g, '_')}.pdf`);
};

// ===================== OBLIGATION RECEIPT (Kwitansi Tanggungan/Kegiatan) =====================

interface ObligationReceiptData {
    id: string;
    studentName: string;
    className: string;
    activityName?: string;
    amount: number;
    paidAt?: string;
}

export const generateObligationReceipt = (data: ObligationReceiptData) => {
    const doc = new jsPDF({ format: [148, 210] }); // A5
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('KWITANSI PEMBAYARAN', pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Yayasan PPI 100 — Pondok Pesantren Islam', pageWidth / 2, 22, { align: 'center' });
    doc.text(`No: KW-${data.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 28, { align: 'center' });

    // Body
    doc.setTextColor(30, 41, 59);
    const startY = 44;
    const labelX = 12;
    const valueX = 55;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Siswa', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nama', labelX, startY + 9);
    doc.text(`: ${data.studentName}`, valueX, startY + 9);
    doc.text('Kelas', labelX, startY + 16);
    doc.text(`: ${data.className}`, valueX, startY + 16);

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 22, pageWidth - 12, startY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detail Pembayaran', labelX, startY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (data.activityName) {
        doc.text('Kegiatan', labelX, startY + 39);
        doc.text(`: ${data.activityName}`, valueX, startY + 39);
    }

    const dateLabel = data.activityName ? startY + 46 : startY + 39;
    doc.text('Tanggal Bayar', labelX, dateLabel);
    doc.text(`: ${data.paidAt ? formatDate(data.paidAt) : formatDate(new Date().toISOString())}`, valueX, dateLabel);

    // Amount box
    const boxY = dateLabel + 10;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.roundedRect(labelX, boxY, pageWidth - 24, 20, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('TOTAL DIBAYAR', labelX + 6, boxY + 10);
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(formatCurrency(data.amount), pageWidth - 18, boxY + 13, { align: 'right' });

    // Status
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ LUNAS', pageWidth / 2, boxY + 34, { align: 'center' });

    // Footer
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, boxY + 48, pageWidth - 12, boxY + 48);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Dokumen ini dicetak secara otomatis oleh sistem keuangan PPI 100.', pageWidth / 2, boxY + 55, { align: 'center' });
    doc.text('Kwitansi ini sah tanpa tanda tangan.', pageWidth / 2, boxY + 60, { align: 'center' });

    doc.save(`Kwitansi_${data.studentName.replace(/\s+/g, '_')}_${data.id.slice(0, 8)}.pdf`);
};

// ===================== STUDENT BILL SUMMARY (Surat Tagihan Per Siswa) =====================

interface StudentBillItem {
    name: string;
    amount: number;
    paid_amount: number;
    status: string;
    billing_month?: number;
    due_date?: string;
}

interface StudentBillPDFData {
    studentName: string;
    className: string;
    nisn?: string;
    academicYear: string;
    obligations: StudentBillItem[];
}

export const generateStudentBillPDF = (data: StudentBillPDFData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Header
    doc.setFillColor(220, 38, 38); // red-600 (urgent letter feel)
    doc.rect(0, 0, pageWidth, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT TAGIHAN SISWA', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Yayasan PPI 100 — Pondok Pesantren Islam', pageWidth / 2, 25, { align: 'center' });
    doc.text(`Tahun Ajaran: ${data.academicYear}`, pageWidth / 2, 32, { align: 'center' });

    // Student info
    doc.setTextColor(30, 41, 59);
    const startY = 50;
    const labelX = 14;
    const valueX = 60;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Siswa', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nama', labelX, startY + 9);
    doc.text(`: ${data.studentName}`, valueX, startY + 9);
    doc.text('Kelas', labelX, startY + 16);
    doc.text(`: ${data.className}`, valueX, startY + 16);
    if (data.nisn) {
        doc.text('NISN', labelX, startY + 23);
        doc.text(`: ${data.nisn}`, valueX, startY + 23);
    }
    doc.text('Tanggal Cetak', labelX, data.nisn ? startY + 30 : startY + 23);
    doc.text(`: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, valueX, data.nisn ? startY + 30 : startY + 23);

    // Divider
    const divY = data.nisn ? startY + 36 : startY + 29;
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, divY, pageWidth - 14, divY);

    // Unpaid items
    const unpaid = data.obligations.filter(o => o.status !== 'Paid');
    const totalUnpaid = unpaid.reduce((s, o) => s + (o.amount - o.paid_amount), 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rincian Tunggakan', labelX, divY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${unpaid.length} item belum lunas — Total: ${formatCurrency(totalUnpaid)}`, labelX, divY + 15);

    // Table
    autoTable(doc, {
        startY: divY + 20,
        head: [['No', 'Jenis Pembayaran', 'Bulan', 'Tagihan', 'Terbayar', 'Sisa', 'Status', 'Jatuh Tempo']],
        body: unpaid.map((o, i) => [
            i + 1,
            o.name,
            o.billing_month && o.billing_month > 0 ? monthNames[o.billing_month] : '-',
            formatCurrency(o.amount),
            formatCurrency(o.paid_amount),
            formatCurrency(o.amount - o.paid_amount),
            o.status === 'Partial' ? 'Cicil' : 'Belum',
            o.due_date ? formatDate(o.due_date) : '-'
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || divY + 60;

    // Total box
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(labelX, finalY + 5, pageWidth - 28, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('TOTAL SISA TUNGGAKAN', labelX + 6, finalY + 16);
    doc.setFontSize(14);
    doc.text(formatCurrency(totalUnpaid), pageWidth - 20, finalY + 17, { align: 'right' });

    // Closing message
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Mohon segera melakukan pembayaran atas tunggakan di atas.', labelX, finalY + 32);
    doc.text('Apabila sudah melakukan pembayaran, mohon abaikan surat ini.', labelX, finalY + 38);

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('Surat tagihan ini dicetak secara otomatis oleh sistem keuangan PPI 100.', pageWidth / 2, finalY + 52, { align: 'center' });

    doc.save(`Surat_Tagihan_${data.studentName.replace(/\s+/g, '_')}.pdf`);
};
