import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// ─── Types ───
export interface StakeholderSignature {
    role: string;
    role_label: string;
    name: string;
    short_code: string;
}

export interface InvoiceTemplateOptions {
    title: string;
    subtitle?: string;
    invoiceNumber: string;
    signatures?: StakeholderSignature[];
    selectedRoles?: string[];
    verificationCode?: string;
    headerColor?: [number, number, number];
    isA5?: boolean;
}

// ─── Brand Colors ───
const BRAND_GREEN: [number, number, number] = [0, 128, 0];
const BRAND_BLUE: [number, number, number] = [0, 32, 96];

// ─── Institutional Details ───
const INST_NAME = 'SEKOLAH DASAR ISLAM TERPADU  AN-NUR BANJARSARI';
const INST_TAGLINE = 'Apply Sunnah in Daily Activity - Caracter Building - Tahfidz With Fun Learning - Life Skill';
const INST_ADDRESS = 'Dusun Sindanglaya RT.006 RW 001 Desa Sindangsari Kecamtan Banjarsari Kabupaten Ciamis';
const INST_PHONE = 'TLP. 081282109785 Kode Pos 46383';

// ─── Logo as Base64 (loaded once) ───
let logoBase64: string | null = null;

async function loadLogo(): Promise<string | null> {
    if (logoBase64) return logoBase64;
    try {
        const response = await fetch(new URL('../assets/logo.jpeg', import.meta.url).href);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                logoBase64 = reader.result as string;
                resolve(logoBase64);
            };
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// Pre-load logo on module import
loadLogo();

// ─── Standardized Header ───
export function drawStandardHeader(
    doc: jsPDF,
    options: InvoiceTemplateOptions
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    // const headerH = 48; // Old height with background

    // Logo (if loaded) - Positioned at LEFT
    if (logoBase64) {
        try {
            // Left-aligned logo
            doc.addImage(logoBase64, 'JPEG', 18, 10, 28, 28);
        } catch { /* skip logo if error */ }
    }

    // Institution name (Green) - Shifted slightly or keep centered but higher Y
    doc.setTextColor(...BRAND_GREEN);
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(INST_NAME, pageWidth / 2 + 10, 18, { align: 'center' });

    // Tagline (Green)
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text(INST_TAGLINE, pageWidth / 2 + 10, 24, { align: 'center' });

    // Address & Phone (Blue/Navy)
    doc.setTextColor(...BRAND_BLUE);
    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.text(INST_ADDRESS, pageWidth / 2 + 10, 30, { align: 'center' });
    doc.text(INST_PHONE, pageWidth / 2 + 10, 34, { align: 'center' });

    // Separator line (Double Green line)
    doc.setDrawColor(...BRAND_GREEN);
    doc.setLineWidth(0.8);
    doc.line(14, 42, pageWidth - 14, 42);
    doc.setLineWidth(0.2);
    doc.line(14, 43.5, pageWidth - 14, 43.5);

    // Document title (Black)
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title.toUpperCase(), pageWidth / 2, 53, { align: 'center' });

    // Subtitle
    if (options.subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(options.subtitle, pageWidth / 2, 59, { align: 'center' });
    }

    // Invoice number
    if (options.invoiceNumber) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`No: ${options.invoiceNumber}`, pageWidth / 2, options.subtitle ? 65 : 60, { align: 'center' });
    }

    const nextY = options.invoiceNumber ? (options.subtitle ? 70 : 65) : (options.subtitle ? 64 : 58);
    return nextY;
}

// ─── A5 Header (for receipts) ───
export function drawStandardHeaderA5(
    doc: jsPDF,
    options: InvoiceTemplateOptions
): number {
    const pageWidth = doc.internal.pageSize.getWidth();

    if (logoBase64) {
        try {
            // Logo at LEFT side for A5
            doc.addImage(logoBase64, 'JPEG', 10, 8, 18, 18);
        } catch { }
    }

    doc.setTextColor(...BRAND_GREEN);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text(INST_NAME, pageWidth / 2 + 5, 14, { align: 'center' });

    doc.setFontSize(6.5);
    doc.text(INST_TAGLINE, pageWidth / 2 + 5, 18, { align: 'center' });

    doc.setTextColor(...BRAND_BLUE);
    doc.setFontSize(5.5);
    doc.setFont('times', 'normal');
    doc.text('Dusun Sindanglaya RT.006 RW 001 Desa Sindangsari Banjarsari - Ciamis.', pageWidth / 2 + 5, 22, { align: 'center' });
    doc.text('TLP. 081282109785', pageWidth / 2 + 5, 25, { align: 'center' });

    doc.setDrawColor(...BRAND_GREEN);
    doc.setLineWidth(0.5);
    doc.line(8, 28, pageWidth - 8, 28);
    doc.setLineWidth(0.15);
    doc.line(8, 36, pageWidth - 8, 36);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title.toUpperCase(), pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: ${options.invoiceNumber}`, pageWidth / 2, 50, { align: 'center' });

    if (options.subtitle) {
        doc.setFontSize(6);
        doc.text(options.subtitle, pageWidth / 2, 54, { align: 'center' });
    }

    return options.subtitle ? 58 : 54;
}

// ─── Signature Block ───
export async function drawSignatureBlock(
    doc: jsPDF,
    startY: number,
    signatures?: StakeholderSignature[],
    selectedRoles?: string[]
): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const labelX = 14;

    // Check if enough space, add page if needed
    if (startY + 45 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY, pageWidth - 14, startY);

    startY += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Otentikasi Digital Penanggung Jawab:', labelX, startY);

    startY += 4;

    const defaults = [
        { role: 'admin_tu', role_label: 'Tata Usaha', name: 'Tata Usaha', short_code: 'SIG-ADM-PLACEHOLDER' },
        { role: 'treasurer', role_label: 'Bendahara', name: 'Bendahara', short_code: 'SIG-TRE-PLACEHOLDER' },
        { role: 'principal', role_label: 'Kepala Sekolah', name: 'Kepala Sekolah', short_code: 'SIG-PRI-PLACEHOLDER' },
        { role: 'committee', role_label: 'Komite', name: 'Komite', short_code: 'SIG-COM-PLACEHOLDER' },
    ];

    const allSigs = (signatures && signatures.length > 0) ? signatures : defaults;

    // Filter based on selectedRoles if provided
    let sigs = selectedRoles
        ? allSigs.filter(s => selectedRoles.includes(s.role))
        : allSigs;

    // If after filtering we have nothing, but we have selectedRoles, 
    // it means the provided signatures don't contain the requested roles.
    // Fallback to defaults for those specific roles.
    if (sigs.length === 0 && selectedRoles) {
        sigs = defaults.filter(s => selectedRoles.includes(s.role));
    }

    if (sigs.length === 0) return startY;

    const colW = (pageWidth - 28) / Math.max(sigs.length, 1);

    for (let i = 0; i < sigs.length; i++) {
        const sig = sigs[i];
        const x = labelX + i * colW;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sig.role_label + ',', x, startY + 4);

        // QR Code Signature (Replacing manual signature line)
        try {
            const sigQr = await QRCode.toDataURL(sig.short_code, {
                margin: 0,
                width: 60,
                color: { dark: '#1e293b', light: '#ffffff' }
            });
            doc.addImage(sigQr, 'PNG', x, startY + 6, 15, 15);
        } catch {
            // Fallback if QR fails
            doc.setDrawColor(148, 163, 184);
            doc.line(x, startY + 20, x + colW - 8, startY + 20);
        }

        // Name
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7);
        doc.text(sig.name, x, startY + 26);

        // Signature code
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(5);
        doc.text(sig.short_code, x, startY + 30);
    }

    return startY + 35;
}

// ─── Verification Footer with QR ───
export async function drawVerificationFooter(
    doc: jsPDF,
    startY: number,
    verificationCode?: string
): Promise<number> {
    if (startY + 40 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    }

    const code = verificationCode || '—';

    // QR Code
    try {
        const qrDataUrl = await QRCode.toDataURL(
            `${window.location.origin}/verify?code=${code}`,
            { width: 100, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }
        );
        doc.addImage(qrDataUrl, 'PNG', 14, startY, 20, 20);
    } catch { /* skip QR on error */ }

    // Text
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Dokumen ini ditandatangani secara digital.', 38, startY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Kode Verifikasi: ${code}`, 38, startY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Verifikasi: ${window.location.origin}/verify?code=${code}`, 38, startY + 15);

    // Print timestamp
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6);
    const printedDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Dicetak oleh sistem keuangan SDIT pada: ${printedDate}`, 38, startY + 20);

    return startY + 25;
}

// ─── Compact Verification Footer (for A5 receipts) ───
export async function drawVerificationFooterCompact(
    doc: jsPDF,
    startY: number,
    verificationCode?: string
): Promise<number> {
    if (startY + 30 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    }

    const code = verificationCode || '—';

    try {
        const qrDataUrl = await QRCode.toDataURL(
            `${window.location.origin}/verify?code=${code}`,
            { width: 80, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }
        );
        doc.addImage(qrDataUrl, 'PNG', 10, startY, 15, 15);
    } catch { }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Ditandatangani digital.', 28, startY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`Verifikasi: ${code}`, 28, startY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const printedDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Dicetak: ${printedDate}`, 28, startY + 12);

    return startY + 18;
}

// ─── Signature Block Compact (A5) ───
export async function drawSignatureBlockCompact(
    doc: jsPDF,
    startY: number,
    signatures?: StakeholderSignature[],
    selectedRoles?: string[]
): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const labelX = 10;

    if (startY + 40 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY, pageWidth - 10, startY);
    startY += 4;

    const defaults = [
        { role: 'admin_tu', role_label: 'Tata Usaha', name: 'Tata Usaha', short_code: 'SIG-ADM-PLACEHOLDER' },
        { role: 'treasurer', role_label: 'Bendahara', name: 'Bendahara', short_code: 'SIG-TRE-PLACEHOLDER' },
        { role: 'principal', role_label: 'Kepala Sekolah', name: 'Kepala Sekolah', short_code: 'SIG-PRI-PLACEHOLDER' },
        { role: 'committee', role_label: 'Komite', name: 'Komite', short_code: 'SIG-COM-PLACEHOLDER' },
    ];

    const allSigs = (signatures && signatures.length > 0) ? signatures : defaults;

    // Filter based on selectedRoles if provided
    let sigs = selectedRoles
        ? allSigs.filter(s => selectedRoles.includes(s.role))
        : allSigs;

    // If after filtering we have nothing, but we have selectedRoles,
    // it means the provided signatures don't contain the requested roles.
    // Fallback to defaults for those specific roles.
    if (sigs.length === 0 && selectedRoles) {
        sigs = defaults.filter(s => selectedRoles.includes(s.role));
    }

    if (sigs.length === 0) return startY;

    const colW = (pageWidth - 20) / Math.max(sigs.length, 1);

    for (let i = 0; i < sigs.length; i++) {
        const sig = sigs[i];
        const x = labelX + i * colW;
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sig.role_label + ',', x, startY + 3);

        // QR Code Signature
        try {
            const sigQr = await QRCode.toDataURL(sig.short_code, {
                margin: 0,
                width: 40,
                color: { dark: '#1e293b', light: '#ffffff' }
            });
            doc.addImage(sigQr, 'PNG', x, startY + 4, 10, 10);
        } catch {
            doc.setDrawColor(148, 163, 184);
            doc.line(x, startY + 15, x + colW - 6, startY + 15);
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(5.5);
        doc.text(sig.name, x, startY + 17);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(4);
        doc.text(sig.short_code, x, startY + 20);
    }

    return startY + 25;
}

// ─── HMAC Signature (Client-side for display) ───
async function generateHmacSha256(message: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const msgData = encoder.encode(message);
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const KEYS: Record<string, string> = {
    principal: 'ppi100-principal-sig-key-2026',
    treasurer: 'ppi100-treasurer-sig-key-2026',
    committee: 'ppi100-committee-sig-key-2026',
    admin_tu: 'ppi100-admin-tu-sig-key-2026',
};

export async function generateLocalSignatures(
    invoiceType: string,
    referenceId: string,
    amount: number,
    dateStr: string,
    stakeholderNames?: Record<string, string>
): Promise<{ signatures: StakeholderSignature[]; verificationCode: string }> {
    const roles = ['admin_tu', 'treasurer', 'principal', 'committee'];
    const labels: Record<string, string> = {
        admin_tu: 'Tata Usaha',
        treasurer: 'Bendahara',
        principal: 'Kepala Sekolah',
        committee: 'Komite',
    };

    const signatures: StakeholderSignature[] = [];
    for (const role of roles) {
        const payload = `${role}|${invoiceType}|${referenceId}|${amount.toFixed(2)}|${dateStr}`;
        const full = await generateHmacSha256(payload, KEYS[role]);
        const prefix = role.substring(0, 3).toUpperCase();
        signatures.push({
            role,
            role_label: labels[role],
            name: stakeholderNames?.[role] || labels[role],
            short_code: `SIG-${prefix}-${full.substring(0, 12)}`,
        });
    }

    // Verification code
    const combined = `VERIFY|${invoiceType}|${referenceId}|${amount.toFixed(2)}|${dateStr}`;
    const hash = await generateHmacSha256(combined, 'ppi100-verify-key');
    const verificationCode = `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`.toUpperCase();

    return { signatures, verificationCode };
}

// ─── Page Footer (for multi-page reports) ───
export function addPageFooters(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const printDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(6);
        doc.text(`SDIT AN NUR BANJARSARI — Dicetak: ${printDate}`, 14, doc.internal.pageSize.getHeight() - 6);
        doc.text(`Halaman ${i}/${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    }
}

// ─── Invoice A5 ───
export async function generateInvoiceA5(params: {
    invoiceNumber: string;
    studentName: string;
    paymentMethod: string;
    bills: { title: string; amount: number }[];
    totalAmount: number;
    date: string;
    signatures?: StakeholderSignature[];
    selectedRoles?: string[];
}): Promise<void> {
    const { invoiceNumber, studentName, paymentMethod, bills, totalAmount, date } = params;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 148mm

    await loadLogo();

    let y = drawStandardHeaderA5(doc, {
        title: 'KWITANSI PEMBAYARAN',
        subtitle: 'Bukti Pembayaran',
        invoiceNumber,
    });

    const labelX = 10;
    const valueX = 50;

    // Info block
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pembayaran', labelX, y);
    y += 5;

    const infoRows: [string, string][] = [
        ['Nama Siswa', studentName],
        ['Tanggal Bayar', date],
        ['Metode Bayar', paymentMethod],
        ['No. Invoice', invoiceNumber],
    ];

    doc.setFontSize(6);
    for (const [label, value] of infoRows) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, labelX, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${value}`, valueX, y);
        y += 4.5;
    }

    y += 3;

    // Bills table header
    const tableW = pageWidth - 20;
    doc.setFillColor(15, 23, 42);
    doc.rect(labelX, y, tableW, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('No.', labelX + 2, y + 4);
    doc.text('Keterangan', labelX + 10, y + 4);
    doc.text('Jumlah', pageWidth - 10, y + 4, { align: 'right' });
    y += 6;

    const formatRp = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    bills.forEach((bill, idx) => {
        const rowBg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.rect(labelX, y, tableW, 6, 'F');

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(String(idx + 1), labelX + 2, y + 4);
        doc.text(bill.title, labelX + 10, y + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(formatRp(bill.amount), pageWidth - 10, y + 4, { align: 'right' });
        y += 6;
    });

    // Total row
    doc.setFillColor(15, 23, 42);
    doc.rect(labelX, y, tableW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', labelX + 2, y + 4.5);
    doc.text(formatRp(totalAmount), pageWidth - 10, y + 4.5, { align: 'right' });
    y += 11;

    // Note
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.text('* Dokumen ini merupakan bukti pembayaran yang sah.', labelX, y);
    y += 6;

    // Signatures & verification
    const { signatures, verificationCode } = await generateLocalSignatures(
        'INVOICE-A5',
        invoiceNumber,
        totalAmount,
        date,
    );
    const sigsToUse = params.signatures || signatures;
    const finalSigs = params.selectedRoles && params.selectedRoles.length > 0
        ? sigsToUse.filter(s => params.selectedRoles?.includes(s.role))
        : sigsToUse;

    y = await drawSignatureBlockCompact(doc, y, finalSigs);
    y = await drawVerificationFooterCompact(doc, y, verificationCode);

    doc.save(`invoice-a5-${invoiceNumber}.pdf`);
}

// ─── Multi-Payment Invoice ───
export interface MultiPaymentBillItem {
    title: string;
    amount: number;
}

export async function generateMultiPaymentInvoice(params: {
    invoiceNumber: string;
    studentName: string;
    paymentMethod: string;
    bills: MultiPaymentBillItem[];
    totalAmount: number;
    date: string;
    signatures?: StakeholderSignature[];
    selectedRoles?: string[];
}): Promise<void> {
    const { invoiceNumber, studentName, paymentMethod, bills, totalAmount, date } = params;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Ensure logo is loaded
    await loadLogo();

    // Draw header
    let y = drawStandardHeader(doc, {
        title: 'KWITANSI PEMBAYARAN',
        subtitle: 'Pembayaran Multi-Tagihan',
        invoiceNumber,
    });

    // Info block
    const labelX = 14;
    const valueX = 60;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pembayaran', labelX, y);
    y += 6;

    const infoRows: [string, string][] = [
        ['Nama Siswa', studentName],
        ['Tanggal Bayar', date],
        ['Metode Pembayaran', paymentMethod],
        ['No. Invoice', invoiceNumber],
    ];

    doc.setFontSize(8);
    for (const [label, value] of infoRows) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, labelX, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${value}`, valueX, y);
        y += 5;
    }

    y += 4;

    // Bills table header
    doc.setFillColor(15, 23, 42);
    doc.rect(labelX, y, pageWidth - 28, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('No.', labelX + 2, y + 4.5);
    doc.text('Keterangan Tagihan', labelX + 12, y + 4.5);
    doc.text('Jumlah', pageWidth - 14, y + 4.5, { align: 'right' });
    y += 7;

    // Bills rows
    const formatRp = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    bills.forEach((bill, idx) => {
        const rowBg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.rect(labelX, y, pageWidth - 28, 7, 'F');

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(String(idx + 1), labelX + 2, y + 4.5);
        doc.text(bill.title, labelX + 12, y + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(formatRp(bill.amount), pageWidth - 14, y + 4.5, { align: 'right' });
        y += 7;
    });

    // Total row
    doc.setFillColor(15, 23, 42);
    doc.rect(labelX, y, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PEMBAYARAN', labelX + 2, y + 5.5);
    doc.text(formatRp(totalAmount), pageWidth - 14, y + 5.5, { align: 'right' });
    y += 12;

    // Note
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('* Dokumen ini merupakan bukti pembayaran yang sah.', labelX, y);
    y += 8;

    // Generate signatures & verification
    const { signatures, verificationCode } = await generateLocalSignatures(
        'MULTI-PAYMENT',
        invoiceNumber,
        totalAmount,
        date,
    );
    const sigsToUse = params.signatures || signatures;
    const finalSigs = params.selectedRoles && params.selectedRoles.length > 0
        ? sigsToUse.filter(s => params.selectedRoles?.includes(s.role))
        : sigsToUse;

    y = await drawSignatureBlock(doc, y, finalSigs);
    y = await drawVerificationFooter(doc, y, verificationCode);

    addPageFooters(doc);

    doc.save(`invoice-multi-${invoiceNumber}.pdf`);
}

// ─── Invoice A5 Double (two A5 invoices on one A4 page) ───
export interface InvoiceA5Params {
    invoiceNumber: string;
    studentName: string;
    paymentMethod: string;
    bills: { title: string; amount: number }[];
    totalAmount: number;
    date: string;
    signatures?: StakeholderSignature[];
    selectedRoles?: string[];
}

/**
 * Renders a single A5 invoice section at a given y-offset on an A4 page.
 * All coordinates are offset by `yOffset` to place the invoice in the correct half.
 */
async function renderInvoiceSection(
    doc: jsPDF,
    params: InvoiceA5Params,
    yOffset: number
): Promise<void> {
    const { invoiceNumber, studentName, paymentMethod, bills, totalAmount, date } = params;
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm (A4 width)

    // A5 content area margins (scaled to fit within 210mm wide A4)
    const labelX = 10;
    const valueX = 55;
    const tableW = pageWidth - 20;
    const color: [number, number, number] = [15, 23, 42];

    const formatRp = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    // ── Header (Standard White) ──
    const headerH = 36;
    if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', pageWidth - 24, yOffset + 6, 14, 14); } catch { }
    }

    doc.setTextColor(...BRAND_GREEN);
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text(INST_NAME, pageWidth / 2, yOffset + 18, { align: 'center' });

    doc.setFontSize(5.5);
    doc.text(INST_TAGLINE, pageWidth / 2, yOffset + 22, { align: 'center' });

    doc.setTextColor(...BRAND_BLUE);
    doc.setFontSize(5);
    doc.setFont('times', 'normal');
    doc.text('Dusun Sindanglaya RT.006 RW 001 Desa Sindangsari Banjarsari - Ciamis.', pageWidth / 2, yOffset + 25, { align: 'center' });
    doc.text('TLP. 081282109785', pageWidth / 2, yOffset + 28, { align: 'center' });

    doc.setDrawColor(...BRAND_GREEN);
    doc.setLineWidth(0.5);
    doc.line(8, yOffset + 30, pageWidth - 8, yOffset + 30);
    doc.setLineWidth(0.1);
    doc.line(8, yOffset + 31, pageWidth - 8, yOffset + 31);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('KWITANSI PEMBAYARAN', pageWidth / 2, yOffset + 38, { align: 'center' });

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: ${invoiceNumber}`, pageWidth / 2, yOffset + 43, { align: 'center' });

    let y = yOffset + headerH + 4;

    // ── Info block ──
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pembayaran', labelX, y);
    y += 4;

    const infoRows: [string, string][] = [
        ['Nama Siswa', studentName],
        ['Tanggal Bayar', date],
        ['Metode Bayar', paymentMethod],
        ['No. Invoice', invoiceNumber],
    ];

    doc.setFontSize(6);
    for (const [label, value] of infoRows) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, labelX, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${value}`, valueX, y);
        y += 4;
    }

    y += 2;

    // ── Bills table ──
    doc.setFillColor(...color);
    doc.rect(labelX, y, tableW, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('No.', labelX + 2, y + 3.5);
    doc.text('Keterangan', labelX + 10, y + 3.5);
    doc.text('Jumlah', pageWidth - 10, y + 3.5, { align: 'right' });
    y += 5.5;

    bills.forEach((bill, idx) => {
        const rowBg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.rect(labelX, y, tableW, 5.5, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(String(idx + 1), labelX + 2, y + 3.5);
        doc.text(bill.title, labelX + 10, y + 3.5);
        doc.setFont('helvetica', 'bold');
        doc.text(formatRp(bill.amount), pageWidth - 10, y + 3.5, { align: 'right' });
        y += 5.5;
    });

    // Total row
    doc.setFillColor(...color);
    doc.rect(labelX, y, tableW, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', labelX + 2, y + 4);
    doc.text(formatRp(totalAmount), pageWidth - 10, y + 4, { align: 'right' });
    y += 9;

    // Note
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'italic');
    doc.text('* Dokumen ini merupakan bukti pembayaran yang sah.', labelX, y);
    y += 5;

    // ── Compact signature block ──
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(labelX, y, pageWidth - 10, y);
    y += 3;

    const { signatures, verificationCode } = await generateLocalSignatures(
        'INVOICE-A5',
        invoiceNumber,
        totalAmount,
        date,
    );
    const sigsToUse = params.signatures || signatures;
    const finalSigs = params.selectedRoles && params.selectedRoles.length > 0
        ? sigsToUse.filter(s => params.selectedRoles?.includes(s.role))
        : sigsToUse;

    const colW = (pageWidth - 20) / Math.max(finalSigs.length, 1);
    for (let i = 0; i < finalSigs.length; i++) {
        const sig = finalSigs[i];
        const x = labelX + i * colW;
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sig.role_label + ',', x, y + 3);

        try {
            const sigQr = await QRCode.toDataURL(sig.short_code, {
                margin: 0, width: 40,
                color: { dark: '#1e293b', light: '#ffffff' }
            });
            doc.addImage(sigQr, 'PNG', x, y + 4, 9, 9);
        } catch {
            doc.setDrawColor(148, 163, 184);
            doc.line(x, y + 14, x + colW - 6, y + 14);
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(5.5);
        doc.text(sig.name, x, y + 15);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(4);
        doc.text(sig.short_code, x, y + 18);
    }

    y += 22;

    // ── Compact verification footer ──
    try {
        const qrDataUrl = await QRCode.toDataURL(
            `${window.location.origin}/verify?code=${verificationCode}`,
            { width: 60, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }
        );
        doc.addImage(qrDataUrl, 'PNG', labelX, y, 12, 12);
    } catch { }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Ditandatangani digital.', labelX + 14, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`Verifikasi: ${verificationCode}`, labelX + 14, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const printedDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Dicetak: ${printedDate}`, labelX + 14, y + 12);
}

/**
 * Generates a single A4 PDF containing two A5 invoices stacked vertically.
 * The first invoice occupies the top half (0–148mm) and the second the bottom half (148–297mm).
 * A dashed cut line is drawn at the midpoint (148mm).
 *
 * Requirements: 4.2
 */
export async function generateInvoiceA5Double(
    invoice1: InvoiceA5Params,
    invoice2: InvoiceA5Params
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const halfHeight = pageHeight / 2;                    // 148.5mm

    await loadLogo();

    // Render first invoice in the top half
    await renderInvoiceSection(doc, invoice1, 0);

    // ── Dashed cut line at midpoint ──
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(5, halfHeight, pageWidth - 5, halfHeight);
    doc.setLineDashPattern([], 0); // reset dash

    // Scissors icon text near the cut line
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('(Potong di sini)', 2, halfHeight + 1);

    // Render second invoice in the bottom half
    await renderInvoiceSection(doc, invoice2, halfHeight + 1);

    doc.save(`invoice-a5-double-${invoice1.invoiceNumber}.pdf`);
}
