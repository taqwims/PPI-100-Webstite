import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchInvoiceSignatures } from './pdfUtils';
import { drawStandardHeaderA5, drawSignatureBlockCompact, drawVerificationFooterCompact } from './invoiceTemplate';
import { ReceivableWithdrawal } from '../components/finance/Savings/types';

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

export const generatePiutangInvoice = async (withdrawal: ReceivableWithdrawal, action: 'print' | 'download' = 'download') => {
    try {
        const doc = new jsPDF('p', 'mm', 'a5');
        const pageWidth = doc.internal.pageSize.getWidth();
        const invoiceType = 'Piutang';
        const dateStr = withdrawal.created_at.substring(0, 10);
        
        // Fetch backend signatures & verification code
        const { signatures, verificationCode, invoiceNumber } = await fetchInvoiceSignatures(
            invoiceType,
            withdrawal.id,
            withdrawal.amount,
            dateStr
        );

        // Header using Standard Template
        const titleText = withdrawal.status === 'Returned' ? 'KUITANSI LUNAS PIUTANG' : 'BUKTI PINJAMAN (PIUTANG)';
        
        let y = drawStandardHeaderA5(doc, {
            title: titleText,
            invoiceNumber: invoiceNumber,
        });

        const labelX = 14;
        const valueX = 50; // Move value closer to label
        y += 2;

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Informasi Peminjam', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Nama Peminjam', labelX, y + 6);
        doc.text(`: ${withdrawal.borrower_name}`, valueX, y + 6);
        doc.text('NUP / ID', labelX, y + 11);
        doc.text(`: ${withdrawal.borrower_id}`, valueX, y + 11);
        
        doc.setDrawColor(203, 213, 225);
        doc.line(labelX, y + 15, pageWidth - 14, y + 15);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Rincian Pinjaman', labelX, y + 21);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        doc.text('Tanggal Transaksi', labelX, y + 27);
        doc.text(`: ${formatDate(withdrawal.created_at)}`, valueX, y + 27);
        doc.text('Jatuh Tempo', labelX, y + 32);
        doc.text(`: ${formatDate(withdrawal.due_date)}`, valueX, y + 32);
        doc.text('Metode Bayar', labelX, y + 37);
        doc.text(`: ${withdrawal.return_method}`, valueX, y + 37);
        doc.text('Keterangan', labelX, y + 42);
        doc.text(`: ${withdrawal.purpose}`, valueX, y + 42);
        
        doc.line(labelX, y + 47, pageWidth - 14, y + 47);

        // Amount Box (More compact)
        let boxY = y + 52;
        doc.setFillColor(248, 250, 252); 
        doc.roundedRect(labelX, boxY, pageWidth - 28, 18, 2, 2, 'F');
        
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('TOTAL PINJAMAN', labelX + 4, boxY + 6);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(withdrawal.amount), pageWidth - 18, boxY + 6, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('TELAH DIBAYAR', labelX + 4, boxY + 11);
        doc.setTextColor(16, 185, 129); // Green
        doc.setFont('helvetica', 'bold');
        doc.text(`- ${formatCurrency(withdrawal.returned_amount)}`, pageWidth - 18, boxY + 11, { align: 'right' });
        
        const remaining = withdrawal.amount - withdrawal.returned_amount;
        doc.setTextColor(15, 23, 42);
        doc.text('SISA PIUTANG', labelX + 4, boxY + 16);
        doc.setTextColor(remaining > 0 ? 220 : 16, remaining > 0 ? 38 : 185, remaining > 0 ? 38 : 129);
        doc.setFontSize(8);
        doc.text(remaining > 0 ? formatCurrency(remaining) : 'LUNAS', pageWidth - 18, boxY + 16, { align: 'right' });

        y = boxY + 23;

        // Payment History Table (Very compact)
        if (withdrawal.returns && withdrawal.returns.length > 0) {
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Riwayat Pengembalian', labelX, y);
            
            autoTable(doc, {
                startY: y + 3,
                margin: { left: 14, right: 14 },
                head: [['Tanggal', 'Nominal', 'Admin', 'Keterangan']],
                body: withdrawal.returns.map(r => [
                    formatDate(r.created_at),
                    formatCurrency(r.amount),
                    r.handled_by?.name || '-',
                    r.notes || '-'
                ]),
                styles: { fontSize: 6.5, cellPadding: 1.5 },
                headStyles: { fillColor: [15, 23, 42], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
            });
            y = (doc as any).lastAutoTable.finalY + 6;
        } else {
            y += 4;
        }

        // Signature using imported helpers - restricted to Principal and Treasurer
        const sigY = await drawSignatureBlockCompact(doc, y, signatures, ['principal', 'treasurer']);
        await drawVerificationFooterCompact(doc, sigY, verificationCode);

        if (action === 'print') {
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(`Invoice_Piutang_${withdrawal.borrower_name.replace(/\s+/g, '_')}_${withdrawal.id.slice(0, 8)}.pdf`);
        }
    } catch (error) {
        console.error('Failed to generate piutang invoice:', error);
        throw error;
    }
};
