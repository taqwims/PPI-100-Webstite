import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayrollData {
    id: string;
    month_year: string;
    user?: { name: string; email: string };
    basic_salary: number;
    allowances: number;
    deductions: number;
    total: number;
    status: string;
    payment_date: string;
    processed_by?: { name: string };
}

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

    // Employee info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pegawai', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nama', labelX, startY + 10);
    doc.text(`: ${payroll.user?.name || '-'}`, valueX, startY + 10);
    doc.text('Email', labelX, startY + 17);
    doc.text(`: ${payroll.user?.email || '-'}`, valueX, startY + 17);
    doc.text('Periode', labelX, startY + 24);
    doc.text(`: ${payroll.month_year}`, valueX, startY + 24);
    doc.text('Tanggal Bayar', labelX, startY + 31);
    doc.text(`: ${formatDate(payroll.payment_date)}`, valueX, startY + 31);

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 37, pageWidth - 20, startY + 37);

    // Salary details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rincian Gaji', labelX, startY + 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const detailY = startY + 55;
    doc.text('Gaji Pokok', labelX, detailY);
    doc.text(formatCurrency(payroll.basic_salary), pageWidth - 20, detailY, { align: 'right' });
    doc.text('Tunjangan', labelX, detailY + 8);
    doc.setTextColor(16, 185, 129);
    doc.text(`+ ${formatCurrency(payroll.allowances)}`, pageWidth - 20, detailY + 8, { align: 'right' });
    doc.setTextColor(239, 68, 68);
    doc.text('Potongan', labelX, detailY + 16);
    doc.text(`- ${formatCurrency(payroll.deductions)}`, pageWidth - 20, detailY + 16, { align: 'right' });

    // Total
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, detailY + 22, pageWidth - 20, detailY + 22);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL DITERIMA', labelX, detailY + 30);
    doc.text(formatCurrency(payroll.total), pageWidth - 20, detailY + 30, { align: 'right' });

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
    doc.text(`Diproses oleh: ${payroll.processed_by?.name || 'Sistem'}`, labelX, statusY + 20);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`, labelX, statusY + 26);

    doc.save(`Slip_Gaji_${payroll.user?.name?.replace(/\s+/g, '_') || 'Unknown'}_${payroll.month_year}.pdf`);
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
