import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import {
    drawStandardHeader, drawStandardHeaderA5,
    drawSignatureBlock, drawSignatureBlockCompact,
    drawVerificationFooter, drawVerificationFooterCompact,
    generateLocalSignatures, addPageFooters
} from './invoiceTemplate';

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

// ─── Helper: Fetch signatures from backend ───
export async function fetchInvoiceSignatures(
    invoiceType: string,
    referenceId: string,
    amount: number,
    dateStr: string
): Promise<{ signatures: any[]; verificationCode: string; invoiceNumber: string }> {
    try {
        const response = await api.post('/finance/invoice/sign', {
            invoice_type: invoiceType,
            reference_id: referenceId,
            amount: amount,
            date_str: dateStr
        });
        const data = response.data;
        return {
            signatures: data.signatures,
            verificationCode: data.verification_code || data.code,
            invoiceNumber: data.invoice_number
        };
    } catch (error) {
        console.error('Failed to fetch backend signatures, falling back to local', error);
        // Fallback to local generation if backend fails
        const local = await generateLocalSignatures(invoiceType, referenceId, amount, dateStr);
        return {
            ...local,
            invoiceNumber: `${invoiceType.substring(0, 3).toUpperCase()}-${referenceId.substring(0, 8)}`
        };
    }
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

export const generatePayrollReceipt = async (payroll: PayrollData, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const name = payroll.employee_name || payroll.user?.name || '-';
    const invoiceType = 'Payroll';
    const dateStr = payroll.paid_at ? payroll.paid_at.substring(0, 10) : new Date().toISOString().substring(0, 10);

    // Fetch backend signatures & verification code
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        payroll.id,
        payroll.net_salary,
        dateStr
    );

    const bodyStart = drawStandardHeader(doc, {
        title: 'SLIP GAJI KARYAWAN',
        subtitle: `Periode: ${getMonthName(payroll.period_month)} ${payroll.period_year}`,
        invoiceNumber: invoiceNumber,
        headerColor: [15, 23, 42],
    });

    const labelX = 20;
    const valueX = 80;
    let y = bodyStart + 4;

    // Employee info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pegawai', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nama', labelX, y + 10);
    doc.text(`: ${name}`, valueX, y + 10);
    doc.text('Jabatan', labelX, y + 17);
    doc.text(`: ${payroll.position || '-'}`, valueX, y + 17);
    doc.text('Tanggal Bayar', labelX, y + 24);
    doc.text(`: ${formatDate(dateStr)}`, valueX, y + 24);

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, y + 30, pageWidth - 20, y + 30);

    // Salary details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rincian Gaji', labelX, y + 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let detailY = y + 45;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('Pendapatan', labelX, detailY);
    doc.setFont('helvetica', 'normal');

    const incomeItems = [
        { label: 'Gaji Pokok', value: payroll.base_salary },
        { label: 'Tunjangan Fungsional', value: payroll.functional_allowance },
        { label: 'Tunjangan Transport', value: payroll.transport_allowance },
        { label: 'Tugas Tambahan', value: payroll.additional_task },
    ];
    for (const item of incomeItems) {
        if (item.value > 0) {
            detailY += 6;
            doc.text(item.label, labelX, detailY);
            doc.text(formatCurrency(item.value), pageWidth - 20, detailY, { align: 'right' });
        }
    }
    detailY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Total Pendapatan', labelX, detailY);
    doc.text(`+ ${formatCurrency(payroll.total_income)}`, pageWidth - 20, detailY, { align: 'right' });

    // Deductions
    detailY += 10;
    doc.setTextColor(30, 41, 59);
    doc.text('Potongan', labelX, detailY);
    doc.setFont('helvetica', 'normal');
    const deductionItems = [
        { label: 'Keterlambatan', value: payroll.lateness_penalty },
        { label: 'Infaq', value: payroll.infaq_deduction },
        { label: 'Kasbon', value: payroll.cash_advance },
    ];
    for (const item of deductionItems) {
        if (item.value > 0) {
            detailY += 6;
            doc.text(item.label, labelX, detailY);
            doc.text(formatCurrency(item.value), pageWidth - 20, detailY, { align: 'right' });
        }
    }
    detailY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('Total Potongan', labelX, detailY);
    doc.text(`- ${formatCurrency(payroll.total_deduction)}`, pageWidth - 20, detailY, { align: 'right' });

    // Net Salary
    detailY += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, detailY + 2, pageWidth - 20, detailY + 2);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('GAJI BERSIH', labelX, detailY + 10);
    doc.text(formatCurrency(payroll.net_salary), pageWidth - 20, detailY + 10, { align: 'right' });

    // Status badge
    detailY += 20;
    const statusText = payroll.status === 'Paid' ? 'LUNAS' : 'TERTUNDA';
    const statusColor: [number, number, number] = payroll.status === 'Paid' ? [16, 185, 129] : [245, 158, 11];
    doc.setFillColor(...statusColor);
    doc.roundedRect(labelX, detailY, 30, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(statusText, labelX + 15, detailY + 6.5, { align: 'center' });

    // Signature block & verification
    const sigY = await drawSignatureBlock(doc, detailY + 18, signatures, selectedRoles);
    await drawVerificationFooter(doc, sigY, verificationCode);

    const fileNameName = name.replace(/\s+/g, '_');
    doc.save(`Slip_Gaji_${fileNameName}_${payroll.period_month}_${payroll.period_year}.pdf`);
};

// ===================== CASH LEDGER RECEIPT =====================

export const generateCashLedgerReceipt = async (entry: CashLedgerData, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const invoiceType = 'CashLedger';
    const dateStr = entry.date.split('T')[0];

    // Fetch backend signatures
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        entry.id,
        entry.amount,
        dateStr
    );

    const bodyStart = drawStandardHeaderA5(doc, {
        title: entry.type === 'Income' ? 'KUITANSI PENERIMAAN' : 'BUKTI PENGELUARAN KAS',
        invoiceNumber: invoiceNumber,
        headerColor: entry.type === 'Income' ? [5, 150, 105] : [220, 38, 38],
    });

    const labelX = 12;
    const valueX = 55;
    let y = bodyStart;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('Tanggal', labelX, y);
    doc.text(`: ${formatDate(entry.date)}`, valueX, y);
    doc.text('Jenis', labelX, y + 7);
    doc.text(`: ${entry.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'}`, valueX, y + 7);
    doc.text('Kategori', labelX, y + 14);
    doc.text(`: ${entry.category}`, valueX, y + 14);
    doc.text('Item/Keperluan', labelX, y + 21);
    doc.text(`: ${entry.item_name}`, valueX, y + 21);
    doc.text('Sumber/Tujuan', labelX, y + 28);
    doc.text(`: ${entry.source}`, valueX, y + 28);

    if (entry.notes) {
        doc.text('Catatan', labelX, y + 35);
        doc.text(`: ${entry.notes}`, valueX, y + 35);
    }

    const amountY = entry.notes ? y + 42 : y + 35;
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, amountY, pageWidth - 12, amountY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NOMINAL', labelX, amountY + 8);
    doc.setTextColor(entry.type === 'Income' ? 5 : 220, entry.type === 'Income' ? 150 : 38, entry.type === 'Income' ? 105 : 38);
    doc.text(formatCurrency(entry.amount), pageWidth - 12, amountY + 8, { align: 'right' });

    const sigY = await drawSignatureBlockCompact(doc, amountY + 16, signatures, selectedRoles);
    await drawVerificationFooterCompact(doc, sigY, verificationCode);

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

    // Standardized Header (landscape)
    const headerH = 36;
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PPI 100 — SDIT AN-NUR', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(14);
    doc.text(reportTitle.toUpperCase(), pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${periodStr}`, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(6);
    doc.text('Jl. Pesantren No. 100', pageWidth / 2, 30, { align: 'center' });

    // Summary
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const netto = totalIncome - totalExpense;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Pendapatan: ${formatCurrency(totalIncome)}`, 14, headerH + 10);
    doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 120, headerH + 10);
    doc.text(`Netto: ${formatCurrency(netto)}`, 226, headerH + 10);

    // Per-Module Summary Table
    const moduleMap: Record<string, { income: number; expense: number; count: number }> = {};
    transactions.forEach(t => {
        const mod = t.module || 'Lainnya';
        if (!moduleMap[mod]) moduleMap[mod] = { income: 0, expense: 0, count: 0 };
        moduleMap[mod].count++;
        if (t.type === 'Income') moduleMap[mod].income += t.amount;
        else moduleMap[mod].expense += t.amount;
    });

    autoTable(doc, {
        startY: headerH + 16,
        head: [['Modul', 'Jumlah Transaksi', 'Total Pemasukan', 'Total Pengeluaran', 'Netto']],
        body: Object.entries(moduleMap).map(([mod, v]) => [
            mod, v.count, formatCurrency(v.income), formatCurrency(v.expense), formatCurrency(v.income - v.expense)
        ]),
        foot: [['TOTAL', transactions.length, formatCurrency(totalIncome), formatCurrency(totalExpense), formatCurrency(netto)]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const summaryFinalY = (doc as any).lastAutoTable?.finalY || 80;

    // Detail Transaction Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Detail Transaksi', 14, summaryFinalY + 8);

    autoTable(doc, {
        startY: summaryFinalY + 12,
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
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Standardized page footers
    addPageFooters(doc);

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

    // Standardized Header (landscape)
    const headerH = 36;
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PPI 100 — SDIT AN-NUR', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(14);
    doc.text('LAPORAN BUKU KAS UMUM', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${formatDate(startDate)} — ${formatDate(endDate)}`, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(6);
    doc.text('Jl. Pesantren No. 100', pageWidth / 2, 30, { align: 'center' });

    // Summary
    const totalIncome = entries.filter(e => e.type === 'Income').reduce((a, c) => a + c.amount, 0);
    const totalExpense = entries.filter(e => e.type === 'Expense').reduce((a, c) => a + c.amount, 0);
    const balance = totalIncome - totalExpense;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Pemasukan: ${formatCurrency(totalIncome)}`, 14, headerH + 10);
    doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 120, headerH + 10);
    doc.text(`Saldo: ${formatCurrency(balance)}`, 226, headerH + 10);

    // Table
    autoTable(doc, {
        startY: headerH + 16,
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

    // Standardized page footers
    addPageFooters(doc);

    doc.save(`Laporan_Kas_${startDate}_${endDate}.pdf`);
};

// ===================== SAVINGS REPORT =====================

export const generateSavingsReport = async (studentName: string, className: string, transactions: any[], totalBalance: number) => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const invoiceType = 'Savings';
        const dateStr = new Date().toISOString().split('T')[0];

        // Clean student name for reference ID
        const safeName = (studentName || 'Siswa').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5);
        const referenceId = `SAV-${safeName}-${Date.now()}`;

        console.log(`Generating Savings Report for ${studentName}, Ref: ${referenceId}`);

        // Fetch backend signatures & verification code
        const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
            invoiceType,
            referenceId,
            totalBalance,
            dateStr
        );

        const bodyStart = drawStandardHeader(doc, {
            title: 'LAPORAN TABUNGAN SISWA',
            subtitle: `${studentName} - ${className}`,
            invoiceNumber: invoiceNumber,
        });

        // Transaction Table
        autoTable(doc, {
            startY: bodyStart + 10,
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

        // Summary box
        const summaryY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFillColor(248, 250, 252);
        doc.rect(14, summaryY, pageWidth - 28, 20, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('SALDO AKHIR', 20, summaryY + 12);
        doc.text(formatCurrency(totalBalance), pageWidth - 20, summaryY + 12, { align: 'right' });

        // Signature & Verification
        const sigY = await drawSignatureBlock(doc, summaryY + 30, signatures);
        await drawVerificationFooter(doc, sigY, verificationCode);

        addPageFooters(doc);
        doc.save(`Tabungan_${studentName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error('Failed to generate savings report:', error);
        throw error;
    }
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

export const generateBillReceipt = async (bill: BillReceiptData, studentName?: string, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const name = studentName || bill.student?.user?.name || '-';
    const invoiceType = 'Bill';
    const paidDate = bill.paid_at || new Date().toISOString();
    const dateStr = paidDate.split('T')[0];

    // Fetch backend signatures
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        bill.id,
        bill.amount,
        dateStr
    );

    const bodyStart = drawStandardHeaderA5(doc, {
        title: 'KUITANSI PEMBAYARAN',
        invoiceNumber: invoiceNumber,
        headerColor: [16, 185, 129],
    });

    const labelX = 14;
    const valueX = 60;
    let y = bodyStart + 4;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Siswa', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const className = bill.student?.class?.name || '-';
    doc.text('Nama', labelX, y + 9);
    doc.text(`: ${name}`, valueX, y + 9);
    doc.text('Kelas', labelX, y + 16);
    doc.text(`: ${className}`, valueX, y + 16);

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, y + 22, pageWidth - 14, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detail Tagihan', labelX, y + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text('Jenis', labelX, y + 39);
    doc.text(`: ${bill.bill_type || 'SPP'}`, valueX, y + 39);
    doc.text('Keterangan', labelX, y + 46);
    doc.text(`: ${bill.title}`, valueX, y + 46);
    doc.text('Jatuh Tempo', labelX, y + 53);
    doc.text(`: ${formatDate(bill.due_date)}`, valueX, y + 53);

    doc.line(labelX, y + 59, pageWidth - 14, y + 59);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(labelX, y + 64, pageWidth - 28, 22, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Total Dibayar', labelX + 6, y + 74);
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text(formatCurrency(bill.amount), pageWidth - 20, y + 77, { align: 'right' });

    doc.setTextColor(5, 150, 105);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ LUNAS', pageWidth / 2, y + 100, { align: 'center' });

    const sigY = await drawSignatureBlockCompact(doc, y + 108, signatures, selectedRoles);
    await drawVerificationFooterCompact(doc, sigY, verificationCode);

    doc.save(`Kuitansi_${bill.title.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}.pdf`);
};

// ===================== ACTIVITY REPORT =====================

interface ActivityReportOptions {
    activity: { name: string; target_amount: number; academic_year?: { name: string } };
    obligationsCount: number;
    summary: { total_income: number; total_expense: number; balance: number } | null;
    transactions: { date: string; description: string; transaction_type: string; amount: number }[];
}

export const generateActivityReportPDF = (options: ActivityReportOptions) => {
    const { activity, obligationsCount, summary, transactions } = options;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Standardized Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PPI 100 — SDIT AN-NUR', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(16);
    doc.text('LAPORAN PERTANGGUNGJAWABAN', pageWidth / 2, 18, { align: 'center' });
    doc.text('KEGIATAN SISWA (LPJ)', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${activity.name} • Tahun Ajaran ${activity.academic_year?.name || '-'}`, pageWidth / 2, 33, { align: 'center' });
    doc.setFontSize(6);
    doc.text('Jl. Pesantren No. 100', pageWidth / 2, 38, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Keuangan', 14, 52);
    doc.setFont('helvetica', 'normal');

    const totalTargetAmt = obligationsCount * activity.target_amount;

    autoTable(doc, {
        startY: 56,
        head: [['Keterangan', 'Nominal']],
        body: [
            ['Total Target Pendapatan (Peserta x Tagihan)', formatCurrency(totalTargetAmt)],
            ['Proyeksi Sisa Belum Tertagih', formatCurrency(totalTargetAmt - (summary?.total_income || 0))],
            ['Total Dana Masuk dari Siswa', formatCurrency(summary?.total_income || 0)],
            ['Total Pengeluaran Panitia', formatCurrency(summary?.total_expense || 0)],
            ['Saldo Akhir Kegiatan', formatCurrency(summary?.balance || 0)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
        styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 56;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Riwayat Transaksi', 14, finalY + 12);

    const txData = transactions.map((tx, i) => [
        i + 1,
        new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.date)),
        tx.description,
        tx.transaction_type === 'Income' ? formatCurrency(tx.amount) : '-',
        tx.transaction_type === 'Expense' ? formatCurrency(tx.amount) : '-'
    ]);

    autoTable(doc, {
        startY: finalY + 16,
        head: [['No', 'Tanggal', 'Uraian / Keterangan', 'Pemasukan', 'Pengeluaran']],
        body: txData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    addPageFooters(doc);

    doc.save(`Laporan_Kegiatan_${activity.name.replace(/\s+/g, '_')}.pdf`);
};

// ===================== ACTIVITY OBLIGATION RECEIPT (Kwitansi Tanggungan/Kegiatan) =====================

interface ActivityObligationReceiptData {
    id: string;
    studentName: string;
    className: string;
    activityName?: string;
    amount: number;
    paidAt?: string;
}

export const generateActivityObligationReceipt = async (data: ActivityObligationReceiptData, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const invoiceType = 'Activity';
    const dateStr = new Date().toISOString().split('T')[0];

    // Fetch backend signatures
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        data.id,
        data.amount,
        dateStr
    );

    const bodyStart = drawStandardHeaderA5(doc, {
        title: 'KUITANSI PEMBAYARAN KEGIATAN',
        invoiceNumber: invoiceNumber,
    });

    const labelX = 12;
    const valueX = 55;
    let y = bodyStart + 4;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Siswa', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nama', labelX, y + 9);
    doc.text(`: ${data.studentName}`, valueX, y + 9);
    doc.text('Kelas', labelX, y + 16);
    doc.text(`: ${data.className}`, valueX, y + 16);

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, y + 22, pageWidth - 12, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detail Pembayaran', labelX, y + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (data.activityName) {
        doc.text('Kegiatan', labelX, y + 39);
        doc.text(`: ${data.activityName}`, valueX, y + 39);
    }

    const dateLabel = data.activityName ? y + 46 : y + 39;
    doc.text('Tanggal Bayar', labelX, dateLabel);
    doc.text(`: ${formatDate(data.paidAt || dateStr)}`, valueX, dateLabel);

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

    doc.setTextColor(16, 185, 129);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ LUNAS', pageWidth / 2, boxY + 34, { align: 'center' });

    const sigY = await drawSignatureBlockCompact(doc, boxY + 44, signatures, selectedRoles);
    await drawVerificationFooterCompact(doc, sigY, verificationCode);

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
    installment_number?: number;
    total_installments?: number;
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

    // Standardized Header
    const headerH = drawStandardHeader(doc, {
        title: 'SURAT TAGIHAN SISWA',
        subtitle: `Tahun Ajaran: ${data.academicYear}`,
        invoiceNumber: `-`,
        headerColor: [220, 38, 38], // red-600
    });

    // Student info
    doc.setTextColor(30, 41, 59);
    const startY = headerH + 8;
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

    // ALL items (paid + unpaid)
    const allObs = data.obligations;
    const totalAmount = allObs.reduce((s, o) => s + o.amount, 0);
    const totalPaid = allObs.reduce((s, o) => s + o.paid_amount, 0);
    const totalUnpaid = totalAmount - totalPaid;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rincian Tagihan', labelX, divY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${allObs.length} item tagihan`, labelX, divY + 15);

    // Table with all obligations
    autoTable(doc, {
        startY: divY + 20,
        head: [['No', 'Jenis Pembayaran', 'Bulan/Cicilan', 'Tagihan', 'Terbayar', 'Sisa', 'Status', 'Jatuh Tempo']],
        body: allObs.map((o, i) => [
            i + 1,
            o.name,
            o.billing_month && o.billing_month > 0
                ? monthNames[o.billing_month]
                : o.installment_number && o.total_installments
                    ? `Cicilan ${o.installment_number}/${o.total_installments}`
                    : '-',
            formatCurrency(o.amount),
            formatCurrency(o.paid_amount),
            formatCurrency(o.amount - o.paid_amount),
            o.status === 'Paid' ? 'Lunas' : o.status === 'Partial' ? 'Cicil' : 'Belum',
            o.due_date ? formatDate(o.due_date) : '-'
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body' && hookData.column.index === 6) {
                const val = hookData.cell.raw;
                if (val === 'Lunas') {
                    hookData.cell.styles.textColor = [22, 163, 74];
                    hookData.cell.styles.fontStyle = 'bold';
                } else if (val === 'Belum') {
                    hookData.cell.styles.textColor = [220, 38, 38];
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || divY + 60;

    if (finalY + 80 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        finalY = 20;
    }

    // Summary box
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(labelX, finalY + 5, pageWidth - 28, 28, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text('Total Tagihan', labelX + 6, finalY + 14);
    doc.text(formatCurrency(totalAmount), pageWidth / 2 - 10, finalY + 14, { align: 'right' });
    doc.text('Total Terbayar', labelX + 6, finalY + 21);
    doc.setTextColor(22, 163, 74);
    doc.text(formatCurrency(totalPaid), pageWidth / 2 - 10, finalY + 21, { align: 'right' });

    // Unpaid highlight
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(pageWidth / 2, finalY + 5, pageWidth / 2 - 14, 28, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('SISA TUNGGAKAN', pageWidth / 2 + 6, finalY + 14);
    doc.setFontSize(14);
    doc.text(formatCurrency(totalUnpaid), pageWidth - 20, finalY + 24, { align: 'right' });

    // Closing message
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Mohon segera melakukan pembayaran atas tunggakan di atas.', labelX, finalY + 42);
    doc.text('Apabila sudah melakukan pembayaran, mohon abaikan surat ini.', labelX, finalY + 48);

    addPageFooters(doc);

    doc.save(`Surat_Tagihan_${data.studentName.replace(/\s+/g, '_')}.pdf`);
};

// ===================== INFAQ RECEIPT =====================

interface InfaqData {
    id: string;
    date: string;
    class_name: string;
    student_count: number;
    amount: number;
    notes: string;
    handled_by_name: string;
}

export const generateInfaqReceipt = async (entry: InfaqData, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const invoiceType = 'Infaq';
    const dateStr = entry.date.split('T')[0];

    // Fetch backend signatures
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        entry.id,
        entry.amount,
        dateStr
    );

    const bodyStart = drawStandardHeaderA5(doc, {
        title: 'KUITANSI PENERIMAAN INFAQ',
        invoiceNumber: invoiceNumber,
        headerColor: [5, 150, 105],
    });

    const lX = 12;
    const vX = 55;
    let sY = bodyStart;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('Tanggal', lX, sY);
    doc.text(`: ${formatDate(entry.date)}`, vX, sY);
    doc.text('Kelas', lX, sY + 7);
    doc.text(`: ${entry.class_name}`, vX, sY + 7);
    doc.text('Jumlah Siswa', lX, sY + 14);
    doc.text(`: ${entry.student_count} siswa`, vX, sY + 14);
    doc.text('Diterima Oleh', lX, sY + 21);
    doc.text(`: ${entry.handled_by_name}`, vX, sY + 21);

    if (entry.notes) {
        doc.text('Catatan', lX, sY + 28);
        doc.text(`: ${entry.notes}`, vX, sY + 28);
    }

    const amountY = entry.notes ? sY + 35 : sY + 28;
    doc.setDrawColor(203, 213, 225);
    doc.line(lX, amountY, pageWidth - 12, amountY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NOMINAL', lX, amountY + 8);
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(entry.amount), pageWidth - 12, amountY + 8, { align: 'right' });

    const sigY = await drawSignatureBlockCompact(doc, amountY + 16, signatures, selectedRoles);
    await drawVerificationFooterCompact(doc, sigY, verificationCode);

    doc.save(`Bukti_Infaq_${entry.class_name.replace(/\s+/g, '_')}_${new Date(entry.date).toISOString().split('T')[0]}.pdf`);
};

// ===================== OBLIGATION RECEIPT =====================

interface ObligationReceiptData {
    id: string;
    studentName: string;
    className: string;
    paymentTypeName: string;
    amount: number;
    paidAmount: number;
    billingMonth?: number;
    installmentNumber?: number;
    totalInstallments?: number;
}

export const generateObligationReceipt = async (data: ObligationReceiptData, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const invoiceType = 'Obligation';
    const dateStr = new Date().toISOString().split('T')[0];

    // Fetch backend signatures
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        data.id,
        data.paidAmount,
        dateStr
    );

    const bodyStart = drawStandardHeaderA5(doc, {
        title: 'KUITANSI PEMBAYARAN',
        invoiceNumber: invoiceNumber,
    });

    const lX = 12;
    const vX = 55;
    let sY = bodyStart;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('Siswa', lX, sY);
    doc.text(`: ${data.studentName}`, vX, sY);
    doc.text('Kelas', lX, sY + 7);
    doc.text(`: ${data.className}`, vX, sY + 7);
    doc.text('Jenis Bayar', lX, sY + 14);
    doc.text(`: ${data.paymentTypeName}`, vX, sY + 14);

    let currentY = sY + 21;
    if (data.billingMonth && data.billingMonth > 0) {
        doc.text('Bulan', lX, currentY);
        doc.text(`: ${monthNames[data.billingMonth]}`, vX, currentY);
        currentY += 7;
    }
    if (data.installmentNumber && data.totalInstallments) {
        doc.text('Cicilan', lX, currentY);
        doc.text(`: ${data.installmentNumber}/${data.totalInstallments}`, vX, currentY);
        currentY += 7;
    }
    doc.text('Tanggal', lX, currentY);
    doc.text(`: ${formatDate(dateStr)}`, vX, currentY);
    currentY += 7;

    // Amount
    doc.setDrawColor(203, 213, 225);
    doc.line(lX, currentY, pageWidth - 12, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL DIBAYAR', lX, currentY + 8);
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(14);
    doc.text(formatCurrency(data.paidAmount), pageWidth - 12, currentY + 8, { align: 'right' });

    // Status
    currentY += 15;
    const isLunas = data.paidAmount >= data.amount;
    doc.setTextColor(isLunas ? 16 : 245, isLunas ? 185 : 158, isLunas ? 129 : 11);
    doc.setFontSize(12);
    doc.text(isLunas ? '✓ LUNAS' : '◐ CICILAN', pageWidth / 2, currentY + 5, { align: 'center' });

    const sigY = await drawSignatureBlockCompact(doc, currentY + 10, signatures, selectedRoles);
    await drawVerificationFooterCompact(doc, sigY, verificationCode);

    doc.save(`Kuitansi_${data.studentName.replace(/\s+/g, '_')}_${data.paymentTypeName.replace(/\s+/g, '_')}.pdf`);
};

// ===================== ACTIVITY BILL LETTER (Surat Tagihan Kegiatan) =====================

interface ActivityBillItem {
    studentName: string;
    className: string;
    activityName: string;
    amount: number;
    paidAmount: number;
    status: string;
}

export const generateActivityBillPDF = (items: ActivityBillItem[], activityName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Standardized Header
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PPI 100 — SDIT AN-NUR', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(16);
    doc.text('SURAT TAGIHAN KEGIATAN', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kegiatan: ${activityName}`, pageWidth / 2, 26, { align: 'center' });
    doc.setFontSize(6);
    doc.text('Jl. Pesantren No. 100', pageWidth / 2, 32, { align: 'center' });

    // Summary
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const totalUnpaid = items.reduce((s, i) => s + (i.amount - i.paidAmount), 0);
    doc.text(`Total Siswa: ${items.length}  |  Total Tunggakan: ${formatCurrency(totalUnpaid)}`, 14, 48);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 55);

    // Table
    autoTable(doc, {
        startY: 62,
        head: [['No', 'Nama Siswa', 'Kelas', 'Tagihan', 'Terbayar', 'Sisa', 'Status']],
        body: items.map((item, i) => [
            i + 1,
            item.studentName,
            item.className,
            formatCurrency(item.amount),
            formatCurrency(item.paidAmount),
            formatCurrency(item.amount - item.paidAmount),
            item.status === 'Paid' ? 'Lunas' : item.status === 'Partial' ? 'Cicil' : 'Belum'
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body' && hookData.column.index === 6) {
                const val = hookData.cell.raw;
                if (val === 'Lunas') {
                    hookData.cell.styles.textColor = [22, 163, 74];
                    hookData.cell.styles.fontStyle = 'bold';
                } else if (val === 'Belum') {
                    hookData.cell.styles.textColor = [220, 38, 38];
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    addPageFooters(doc);

    doc.save(`Tagihan_Kegiatan_${activityName.replace(/\s+/g, '_')}.pdf`);
};

// Generate single student activity bill letter
export const generateSingleActivityBillPDF = (item: ActivityBillItem) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Standardized Header
    const headerH = drawStandardHeader(doc, {
        title: 'SURAT TAGIHAN KEGIATAN',
        subtitle: `Kegiatan: ${item.activityName}`,
        invoiceNumber: '-',
        headerColor: [59, 130, 246], // blue-500
    });

    // Student info
    doc.setTextColor(30, 41, 59);
    const startY = headerH + 8;
    const labelX = 14;
    const valueX = 60;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Siswa', labelX, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nama', labelX, startY + 9);
    doc.text(`: ${item.studentName}`, valueX, startY + 9);
    doc.text('Kelas', labelX, startY + 16);
    doc.text(`: ${item.className}`, valueX, startY + 16);
    doc.text('Tanggal Cetak', labelX, startY + 23);
    doc.text(`: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, valueX, startY + 23);

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY + 29, pageWidth - 14, startY + 29);

    // Bill details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rincian Tagihan Kegiatan', labelX, startY + 37);

    autoTable(doc, {
        startY: startY + 42,
        head: [['Kegiatan', 'Tagihan', 'Terbayar', 'Sisa', 'Status']],
        body: [[
            item.activityName,
            formatCurrency(item.amount),
            formatCurrency(item.paidAmount),
            formatCurrency(item.amount - item.paidAmount),
            item.status === 'Paid' ? 'Lunas' : item.status === 'Partial' ? 'Cicilan' : 'Belum Bayar'
        ]],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 80;

    // Unpaid highlight
    const unpaid = item.amount - item.paidAmount;
    if (unpaid > 0) {
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(labelX, finalY + 5, pageWidth - 28, 24, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(185, 28, 28);
        doc.text('SISA TUNGGAKAN', labelX + 6, finalY + 16);
        doc.setFontSize(14);
        doc.text(formatCurrency(unpaid), pageWidth - 20, finalY + 20, { align: 'right' });
    }

    // Closing message
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Mohon segera melakukan pembayaran atas tunggakan di atas.', labelX, finalY + 38);
    doc.text('Apabila sudah melakukan pembayaran, mohon abaikan surat ini.', labelX, finalY + 44);

    addPageFooters(doc);

    doc.save(`Tagihan_${item.activityName.replace(/\s+/g, '_')}_${item.studentName.replace(/\s+/g, '_')}.pdf`);
};

// ===================== RKAS / RAB REPORT PDF =====================

interface RKASBudgetItem {
    id: string;
    item_name: string;
    budget_type: string;
    period: string;
    month: number;
    quantity: number;
    unit_price: number;
    planned_amount: number;
    realized_amount: number;
    status: string;
    notes: string;
    category?: { name: string };
    transaction_code?: { code: string; name: string };
}

export const generateRKASReportPDF = (
    budgets: RKASBudgetItem[],
    academicYearName: string,
    budgetTypeFilter: string
) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    // Standardized Header (landscape)
    const headerH = 36;
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PPI 100 — SDIT AN-NUR', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(14);
    doc.text('RENCANA ANGGARAN KAS SEKOLAH (RKAS)', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tahun Ajaran: ${academicYearName} — Tipe: ${budgetTypeFilter}`, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(6);
    doc.text('Jl. Pesantren No. 100', pageWidth / 2, 30, { align: 'center' });

    const totalPlanned = budgets.reduce((s, b) => s + b.planned_amount, 0);
    const totalRealized = budgets.reduce((s, b) => s + b.realized_amount, 0);
    const pct = totalPlanned > 0 ? ((totalRealized / totalPlanned) * 100).toFixed(1) : '0';

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Anggaran: ${formatCurrency(totalPlanned)}`, 14, headerH + 10);
    doc.text(`Total Realisasi: ${formatCurrency(totalRealized)}`, 120, headerH + 10);
    doc.text(`Realisasi: ${pct}%`, 226, headerH + 10);

    // Group by transaction code / standar
    const grouped: Record<string, RKASBudgetItem[]> = {};
    budgets.forEach(b => {
        const key = b.transaction_code?.name || 'Tanpa Standar';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(b);
    });

    const tableBody: (string | number)[][] = [];
    let rowNum = 0;
    Object.entries(grouped).forEach(([group, items]) => {
        // Group header row
        tableBody.push([{ content: group, colSpan: 10, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } } as any]);
        items.forEach(b => {
            rowNum++;
            tableBody.push([
                rowNum,
                b.item_name,
                b.period === 'Bulanan' && b.month > 0 ? monthNames[b.month] : b.period,
                b.quantity,
                formatCurrency(b.unit_price),
                formatCurrency(b.planned_amount),
                formatCurrency(b.realized_amount),
                totalPlanned > 0 ? `${((b.realized_amount / b.planned_amount) * 100).toFixed(0)}%` : '0%',
                b.status,
                b.notes || '-'
            ]);
        });
    });

    autoTable(doc, {
        startY: headerH + 16,
        head: [['No', 'Nama Item', 'Periode', 'Qty', 'Harga Satuan', 'Anggaran', 'Realisasi', '%', 'Status', 'Catatan']],
        body: tableBody,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    addPageFooters(doc);

    doc.save(`RKAS_${budgetTypeFilter}_${academicYearName.replace(/\s+/g, '_')}.pdf`);
};

// ===================== EXTERNAL DEBT PAYMENT RECEIPT =====================

export const generateDebtReceipt = async (payment: any, debt: any, selectedRoles?: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const invoiceType = 'Debt';
    const dateStr = payment.payment_date.split('T')[0];

    // Fetch backend signatures
    const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
        invoiceType,
        payment.id,
        payment.amount,
        dateStr
    );

    const bodyStart = drawStandardHeaderA5(doc, {
        title: 'BUKTI PEMBAYARAN HUTANG',
        invoiceNumber: invoiceNumber,
        headerColor: [220, 38, 38],
    });

    const lX = 12;
    const vX = 55;
    let sY = bodyStart;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('Tanggal', lX, sY);
    doc.text(`: ${formatDate(payment.created_at)}`, vX, sY);
    doc.text('Kreditur/Vendor', lX, sY + 7);
    doc.text(`: ${debt.creditor_name}`, vX, sY + 7);
    doc.text('Keterangan', lX, sY + 14);
    doc.text(`: ${debt.description}`, vX, sY + 14);
    doc.text('Sumber Dana', lX, sY + 21);
    doc.text(`: ${payment.fund_source}`, vX, sY + 21);
    doc.text('Dibayar Oleh', lX, sY + 28);
    doc.text(`: ${payment.paid_by?.name || '-'}`, vX, sY + 28);

    if (payment.notes) {
        doc.text('Catatan', lX, sY + 35);
        doc.text(`: ${payment.notes}`, vX, sY + 35);
    }

    const amountY = payment.notes ? sY + 42 : sY + 35;
    doc.setDrawColor(203, 213, 225);
    doc.line(lX, amountY, pageWidth - 12, amountY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NOMINAL DIBAYAR', lX, amountY + 8);
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrency(payment.amount), pageWidth - 12, amountY + 8, { align: 'right' });

    const sigY = await drawSignatureBlockCompact(doc, amountY + 16, signatures, selectedRoles);
    await drawVerificationFooterCompact(doc, sigY, verificationCode);

    doc.save(`Bukti_Bayar_Hutang_${debt.creditor_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
