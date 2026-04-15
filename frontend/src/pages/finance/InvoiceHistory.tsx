import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, FileText, 
    Calendar, Tag, CheckCircle2,
    SearchX, Loader2, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { 
    generatePayrollReceipt, 
    generateBillReceipt,
    fetchInvoiceSignatures
} from '../../utils/pdfUtils';
import { generateInvoiceA5Double } from '../../utils/invoiceTemplate';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';

interface InvoiceHistoryItem {
    invoice_number: string;
    invoice_type: string;
    reference_id: string;
    amount: number;
    document_date: string;
    signed_at: string;
    verification_code: string;
}

const INVOICE_TYPES = [
    { id: '', label: 'Semua Kategori', icon: Tag },
    { id: 'Bill', label: 'Pembayaran Siswa', icon: FileText },
    { id: 'Payroll', label: 'Slip Gaji', icon: FileText },
    { id: 'Savings', label: 'Tabungan', icon: FileText },
    { id: 'Activity', label: 'Kegiatan', icon: FileText },
    { id: 'CashLedger', label: 'Buku Kas', icon: FileText },
    { id: 'Debt', label: 'Hutang', icon: FileText },
];

const InvoiceHistory: React.FC = () => {
    const [invoices, setInvoices] = useState<InvoiceHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState<InvoiceHistoryItem | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedType) params.append('type', selectedType);
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await api.get(`/finance/invoice/history?${params.toString()}`);
            setInvoices(response.data || []);
        } catch (error) {
            console.error("Failed to fetch invoices", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [selectedType, startDate, endDate]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchInvoices();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handlePrintClick = (inv: InvoiceHistoryItem) => {
        setActiveInvoice(inv);
        setShowPrintModal(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[], format: 'A4' | 'A5') => {
        if (!activeInvoice) return;
        const inv = activeInvoice;
        setIsExporting(inv.invoice_number);
        try {
            // Depending on the invoice type, we might need to fetch the underlying record
            if (inv.invoice_type === 'Payroll') {
                const res = await api.get(`/finance/payroll`); // Payroll doesn't have a direct detail API by ID, usually we filter from list
                const payroll = res.data.find((p: any) => p.id === inv.reference_id);
                if (payroll) {
                    await generatePayrollReceipt(payroll, selectedRoles);
                } else {
                    toast.error("Data slip gaji tidak ditemukan");
                }
            } else if (inv.invoice_type === 'Bill' || inv.invoice_type === 'Obligation' || inv.invoice_type === 'Activity') {
                // Try fetching bill details
                try {
                    const res = await api.get(`/finance/bills/${inv.reference_id}`);
                    if (res.data) {
                        const bill = res.data;
                        const studentName = bill.student?.user?.name || '-';
                        const paidDate = bill.paid_at || inv.document_date || new Date().toISOString();
                        const dateStr = paidDate.split('T')[0];

                        if (format === 'A5') {
                            const sigData = await fetchInvoiceSignatures('Bill', bill.id, bill.amount, dateStr);
                            
                            // A5 Double
                            await generateInvoiceA5Double(
                                {
                                    invoiceNumber: inv.invoice_number,
                                    studentName,
                                    paymentMethod: 'Signed Digital',
                                    bills: [{ title: bill.title, amount: bill.amount }],
                                    totalAmount: bill.amount,
                                    date: dateStr,
                                    selectedRoles,
                                    signatures: sigData.signatures,
                                },
                                {
                                    invoiceNumber: inv.invoice_number,
                                    studentName,
                                    paymentMethod: 'Signed Digital',
                                    bills: [{ title: bill.title, amount: bill.amount }],
                                    totalAmount: bill.amount,
                                    date: dateStr,
                                    selectedRoles,
                                    signatures: sigData.signatures,
                                }
                            );
                        } else {
                            // A4 Standard
                            await generateBillReceipt(res.data, selectedRoles);
                        }
                    }
                } catch (e) {
                    // interceptor handles API errors
                }
            } else if (inv.invoice_type === 'Savings') {
                // Savings report needs different data structure
                toast.error("Format cetak tabungan otomatis sedang dikembangkan");
            } else {
                toast.error("Format cetak untuk tipe ini belum tersedia di halaman riwayat");
            }
        } catch (error) {
            console.error("Print failed", error);
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-extrabold text-slate-900 tracking-tight"
                    >
                        Riwayat Kuitansi
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-500 mt-2 text-lg"
                    >
                        Lihat dan unduh kembali dokumen keuangan yang telah diterbitkan.
                    </motion.p>
                </div>
            </div>

            {/* Filters Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6"
            >
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Cari Nomor Kuitansi atau Kode Verifikasi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 font-medium"
                        />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 text-sm"
                            />
                        </div>
                        <div className="relative flex-1">
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 text-sm"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <button 
                            type="submit"
                            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Filter size={18} /> Filter
                        </button>
                    </div>
                    <div className="md:col-span-2">
                         <button 
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedType('');
                                setStartDate('');
                                setEndDate('');
                                fetchInvoices();
                            }}
                            className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition active:scale-95"
                        >
                            Reset
                        </button>
                    </div>
                </form>

                <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {INVOICE_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedType === type.id;
                        return (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={clsx(
                                    "flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2",
                                    isSelected 
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200" 
                                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <Icon size={16} />
                                {type.label}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Table/List Section */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-emerald-500" size={40} />
                        <p className="text-slate-500 font-medium animate-pulse">Menghubungkan ke pusat data...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center gap-6">
                        <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                            <SearchX size={60} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Tidak ada kuitansi ditemukan</h3>
                            <p className="text-slate-500 mt-2 max-w-sm">
                                Coba ubah kata kunci pencarian atau bersihkan filter untuk melihat semua kuitansi.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Detail Dokumen</th>
                                    <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Nominal</th>
                                    <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Tanggal TTD</th>
                                    <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout">
                                    {invoices.map((inv, idx) => (
                                        <motion.tr 
                                            key={inv.invoice_number}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <td className="p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className={clsx(
                                                        "p-3 rounded-2xl flex-shrink-0",
                                                        inv.invoice_type === 'Payroll' ? "bg-blue-50 text-blue-600" :
                                                        inv.invoice_type === 'Savings' ? "bg-amber-50 text-amber-600" :
                                                        inv.invoice_type === 'Activity' ? "bg-purple-50 text-purple-600" :
                                                        "bg-emerald-50 text-emerald-600"
                                                    )}>
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{inv.invoice_number}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold uppercase tracking-tighter">
                                                                {inv.invoice_type}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {inv.verification_code}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="font-extrabold text-slate-900">{formatCurrency(inv.amount)}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Metode: Signed Digital</p>
                                            </td>
                                            <td className="p-6 hidden md:table-cell">
                                                <div className="flex flex-col">
                                                    <p className="text-sm text-slate-700 font-medium">
                                                        {new Date(inv.signed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Dokumen: {inv.document_date}</p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handlePrintClick(inv)}
                                                        disabled={isExporting === inv.invoice_number}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isExporting === inv.invoice_number ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <Printer size={16} />
                                                        )}
                                                        Cetak
                                                    </button>
                                                    <a 
                                                        href={`/verify?code=${inv.verification_code}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                                                        title="Verifikasi Dokumen"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </a>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <PrintOptionsModal 
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                onConfirm={handleConfirmPrint}
            />
        </div>
    );
};

export default InvoiceHistory;
