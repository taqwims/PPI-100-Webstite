import React, { useState } from 'react';
import { AlertCircle, UserCheck, Printer, Pencil, Trash2, Image as ImageIcon, ExternalLink, X } from 'lucide-react';
import { CashLedgerEntry } from '../../../types/cashLedgerTypes';

interface Props {
    paginatedEntries: CashLedgerEntry[];
    loading: boolean;
    canManage: boolean;
    searchQuery: string;
    filterStartDate: string;
    filterEndDate: string;
    formatCurrency: (amount: number) => string;
    handlePrintReceipt: (entry: CashLedgerEntry) => void;
    openEditModal: (entry: CashLedgerEntry) => void;
    setConfirmDelete: (id: string) => void;
}

const CashLedgerTable: React.FC<Props> = ({
    paginatedEntries, loading, canManage,
    searchQuery, filterStartDate, filterEndDate,
    formatCurrency, handlePrintReceipt, openEditModal, setConfirmDelete
}) => {
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

    const getFullImageUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return url.startsWith('/') ? url : `/${url}`;
    };

    return (
        <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                        <th className="p-4 font-medium">Tanggal</th>
                        <th className="p-4 font-medium">No. Invoice</th>
                        <th className="p-4 font-medium">Nama Item / Keperluan</th>
                        <th className="p-4 font-medium">Sumber/Tujuan</th>
                        <th className="p-4 font-medium">Kategori</th>
                        <th className="p-4 font-medium">Komponen</th>
                        <th className="p-4 font-medium">Penanggung Jawab</th>
                        <th className="p-4 font-medium text-center">Bukti</th>
                        <th className="p-4 font-medium text-right">Pemasukan</th>
                        <th className="p-4 font-medium text-right">Pengeluaran</th>
                        {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td colSpan={canManage ? 11 : 10} className="p-8 text-center">
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            </td>
                        </tr>
                    ) : paginatedEntries.length === 0 ? (
                        <tr>
                            <td colSpan={canManage ? 11 : 10} className="p-12 text-center text-slate-500">
                                <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-lg font-medium text-slate-700">
                                    {searchQuery || filterStartDate || filterEndDate ? 'Tidak ditemukan hasil pencarian' : 'Buku Kas Kosong'}
                                </p>
                            </td>
                        </tr>
                    ) : (
                        paginatedEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                    {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit' })}
                                </td>
                                <td className="p-4 text-sm whitespace-nowrap">
                                    {entry.invoice_number ? (
                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/90 text-xs shadow-2xs tracking-wide">
                                            {entry.invoice_number}
                                        </span>
                                    ) : (
                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/90 text-xs shadow-2xs tracking-wide">
                                            {`${entry.transaction_code?.parent_code?.code || entry.transaction_code?.code || 'BK'}-${new Date(entry.date).getFullYear()}${String(new Date(entry.date).getMonth() + 1).padStart(2, '0')}-0001`}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-800">{entry.item_name}</p>
                                        {entry.auto_generated && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-semibold uppercase tracking-wide">Auto</span>
                                        )}
                                    </div>
                                    {entry.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={entry.notes}>{entry.notes}</p>}
                                </td>
                                <td className="p-4 text-slate-600 text-sm">{entry.source}</td>
                                <td className="p-4">
                                    <div>
                                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md font-medium">
                                            {entry.category || 'Umum'}
                                        </span>
                                        {entry.transaction_code && (
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate max-w-[150px]" title={entry.transaction_code.name}>
                                                {entry.transaction_code.name}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    {entry.component ? (
                                        <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 text-xs rounded-md font-medium">
                                            {entry.component}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-sm">
                                    {entry.type === 'Expense' && entry.responsible ? (
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <UserCheck size={14} className="text-blue-500" />
                                            {entry.responsible.name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    {entry.proof_url ? (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewImage({ url: getFullImageUrl(entry.proof_url), title: entry.item_name })}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-semibold shadow-2xs transition group cursor-pointer"
                                            title="Klik untuk melihat bukti transaksi"
                                        >
                                            <ImageIcon size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                                            <span>Lihat</span>
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 text-xs font-mono">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                                    {entry.type === 'Income' ? formatCurrency(entry.amount) : '-'}
                                </td>
                                <td className="p-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                                    {entry.type === 'Expense' ? formatCurrency(entry.amount) : '-'}
                                </td>
                                {canManage && (
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button
                                                onClick={() => handlePrintReceipt(entry)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Cetak Struk"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(entry)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(entry.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Hapus"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Proof Image Lightbox / Modal */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Bukti Transaksi / Nota</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{previewImage.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewImage.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Buka Ukuran Penuh"
                                >
                                    <ExternalLink size={16} />
                                </a>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-center overflow-auto bg-slate-900/5">
                            <img
                                src={previewImage.url}
                                alt="Bukti Transaksi"
                                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm border border-slate-200"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashLedgerTable;
