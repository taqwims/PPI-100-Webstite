import React from 'react';
import { Calendar, UserCheck, Printer, Pencil, Trash2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { DailyInfaqEntry } from '../../../hooks/useDailyInfaq';

interface DailyInfaqTableProps {
    entries: DailyInfaqEntry[];
    loading: boolean;
    canManage: boolean;
    searchQuery: string;
    handlePrintReceipt: (params: any) => void;
    openEditModal: (entry: DailyInfaqEntry) => void;
    setConfirmDelete: (id: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const DailyInfaqTable: React.FC<DailyInfaqTableProps> = ({
    entries, loading, canManage, searchQuery,
    handlePrintReceipt, openEditModal, setConfirmDelete
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 text-sm">
                        <th className="p-4 font-medium">Tanggal</th>
                        <th className="p-4 font-medium">Tipe</th>
                        <th className="p-4 font-medium">Sumber / Donatur</th>
                        <th className="p-4 font-medium">Kelas</th>
                        <th className="p-4 font-medium">Keterangan</th>
                        <th className="p-4 font-medium">Petugas</th>
                        <th className="p-4 font-medium">Penanggung Jawab</th>
                        <th className="p-4 font-medium text-right">Nominal</th>
                        {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td colSpan={canManage ? 9 : 8} className="p-8 text-center">
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                </div>
                            </td>
                        </tr>
                    ) : entries.length === 0 ? (
                        <tr>
                            <td colSpan={canManage ? 9 : 8} className="p-12 text-center text-slate-500">
                                <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-lg font-medium text-slate-700">{searchQuery ? 'Tidak ditemukan hasil' : 'Belum Ada Data Infaq'}</p>
                                <p className="text-sm">Data transaksi infaq harian akan muncul di sini.</p>
                            </td>
                        </tr>
                    ) : (
                        entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Calendar size={14} className="mr-2 text-slate-400" />
                                        {new Date(entry.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={clsx(
                                        "px-2 py-0.5 text-xs font-semibold rounded-full",
                                        entry.type === 'Income' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {entry.type === 'Income' ? 'Masuk' : 'Keluar'}
                                    </span>
                                </td>
                                <td className="p-4 font-medium text-slate-800">{entry.source}</td>
                                <td className="p-4 text-sm">
                                    {entry.class_name ? (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">{entry.class_name}</span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500 text-sm max-w-xs truncate" title={entry.notes}>{entry.notes || '-'}</td>
                                <td className="p-4 text-slate-600 text-sm">{entry.handled_by?.name || '-'}</td>
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
                                <td className={clsx("p-4 text-right font-semibold whitespace-nowrap", entry.type === 'Income' ? "text-emerald-600" : "text-red-600")}>
                                    {entry.type === 'Income' ? '+' : '-'} {formatCurrency(entry.amount)}
                                </td>
                                {canManage && (
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                onClick={() => {
                                                    handlePrintReceipt({
                                                        id: entry.id,
                                                        date: entry.date,
                                                        class_name: entry.class_name || 'Umum',
                                                        student_count: 0,
                                                        amount: entry.amount,
                                                        notes: entry.notes || '',
                                                        handled_by_name: entry.handled_by?.name || '-'
                                                    });
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                title="Cetak Kuitansi"
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
        </div>
    );
};

export default DailyInfaqTable;
