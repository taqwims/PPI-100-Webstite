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
    verificationCode?: string;
    headerColor?: [number, number, number];
}

// ─── Logo as Base64 (loaded once) ───
let logoBase64: string | null = null;

async function loadLogo(): Promise<string | null> {
    if (logoBase64) return logoBase64;
    try {
        const response = await fetch(new URL('../assets/school_logo.png', import.meta.url).href);
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
    const headerH = 48;
    const color = options.headerColor || [15, 23, 42];

    // Background
    doc.setFillColor(...color);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    // Logo (if loaded)
    const logoX = 14;
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', logoX, 4, 16, 16);
        } catch { /* skip logo if error */ }
    }

    // Institution name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PONDOK PESANTREN ISLAM (PPI) 100', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(11);
    doc.text('SDIT AL-MUHAJIRIN', pageWidth / 2, 15, { align: 'center' });

    // Address
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Pesantren No. 100 — Telp. (021) XXXXXXX', pageWidth / 2, 20, { align: 'center' });

    // Separator line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(14, 23, pageWidth - 14, 23);

    // Document title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title.toUpperCase(), pageWidth / 2, 31, { align: 'center' });

    // Subtitle
    if (options.subtitle) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(options.subtitle, pageWidth / 2, 37, { align: 'center' });
    }

    // Invoice number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: ${options.invoiceNumber}`, pageWidth / 2, options.subtitle ? 43 : 38, { align: 'center' });

    return headerH + 6;
}

// ─── A5 Header (for receipts) ───
export function drawStandardHeaderA5(
    doc: jsPDF,
    options: InvoiceTemplateOptions
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const headerH = 40;
    const color = options.headerColor || [15, 23, 42];

    doc.setFillColor(...color);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', 8, 3, 12, 12); } catch {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN PPI 100', pageWidth / 2, 7, { align: 'center' });
    doc.setFontSize(9);
    doc.text('SDIT AL-MUHAJIRIN', pageWidth / 2, 13, { align: 'center' });

    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Pesantren No. 100', pageWidth / 2, 17, { align: 'center' });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.2);
    doc.line(8, 19, pageWidth - 8, 19);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title.toUpperCase(), pageWidth / 2, 27, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: ${options.invoiceNumber}`, pageWidth / 2, 33, { align: 'center' });

    if (options.subtitle) {
        doc.setFontSize(6);
        doc.text(options.subtitle, pageWidth / 2, 37, { align: 'center' });
    }

    return headerH + 4;
}

// ─── Signature Block ───
export function drawSignatureBlock(
    doc: jsPDF,
    startY: number,
    signatures?: StakeholderSignature[]
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const labelX = 14;

    // Check if enough space, add page if needed
    if (startY + 65 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY, pageWidth - 14, startY);

    startY += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Ditandatangani secara digital oleh:', labelX, startY);

    startY += 4;

    const sigs = signatures || [
        { role: 'chairman', role_label: 'Ketua Yayasan', name: 'Ketua Yayasan PPI 100', short_code: '—' },
        { role: 'treasurer', role_label: 'Bendahara', name: 'Bendahara PPI 100', short_code: '—' },
        { role: 'principal', role_label: 'Kepala Sekolah', name: 'Kepala Sekolah SDIT', short_code: '—' },
    ];

    const colW = (pageWidth - 28) / 3;

    sigs.forEach((sig, i) => {
        const x = labelX + i * colW;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sig.role_label + ',', x, startY + 4);

        // Signature line
        doc.setDrawColor(148, 163, 184);
        doc.line(x, startY + 28, x + colW - 8, startY + 28);

        // Name
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7);
        doc.text(sig.name, x, startY + 33);

        // Signature code
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(5);
        doc.text(sig.short_code, x, startY + 37);
    });

    return startY + 42;
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
            `${window.location.origin}/verify/${code}`,
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
    doc.text(`Verifikasi: ${window.location.origin}/verify/${code}`, 38, startY + 15);

    // Print timestamp
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6);
    const printedDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Dicetak oleh sistem keuangan SDIT PPI 100 pada: ${printedDate}`, 38, startY + 20);

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
            `${window.location.origin}/verify/${code}`,
            { width: 80, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }
        );
        doc.addImage(qrDataUrl, 'PNG', 10, startY, 15, 15);
    } catch {}

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
export function drawSignatureBlockCompact(
    doc: jsPDF,
    startY: number,
    signatures?: StakeholderSignature[]
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const labelX = 10;

    if (startY + 50 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(labelX, startY, pageWidth - 10, startY);
    startY += 4;

    const sigs = signatures || [
        { role: 'chairman', role_label: 'Ketua Yayasan', name: 'Ketua Yayasan PPI 100', short_code: '—' },
        { role: 'treasurer', role_label: 'Bendahara', name: 'Bendahara PPI 100', short_code: '—' },
        { role: 'principal', role_label: 'Kepala Sekolah', name: 'Kepala Sekolah SDIT', short_code: '—' },
    ];

    const colW = (pageWidth - 20) / 3;
    sigs.forEach((sig, i) => {
        const x = labelX + i * colW;
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sig.role_label + ',', x, startY + 3);
        doc.setDrawColor(148, 163, 184);
        doc.line(x, startY + 20, x + colW - 6, startY + 20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(5.5);
        doc.text(sig.name, x, startY + 24);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(4);
        doc.text(sig.short_code, x, startY + 27);
    });

    return startY + 30;
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
    chairman: 'ppi100-chairman-sig-key-2026',
};

export async function generateLocalSignatures(
    invoiceType: string,
    referenceId: string,
    amount: number,
    dateStr: string,
    stakeholderNames?: Record<string, string>
): Promise<{ signatures: StakeholderSignature[]; verificationCode: string }> {
    const roles = ['chairman', 'treasurer', 'principal'];
    const labels: Record<string, string> = {
        chairman: 'Ketua Yayasan',
        treasurer: 'Bendahara',
        principal: 'Kepala Sekolah',
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
        doc.text(`SDIT PPI 100 — Dicetak: ${printDate}`, 14, doc.internal.pageSize.getHeight() - 6);
        doc.text(`Halaman ${i}/${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    }
}
