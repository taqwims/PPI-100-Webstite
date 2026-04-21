import React from 'react';
import { AlertCircle, UserCheck, Printer, Pencil, Trash2 } from 'lucide-react';
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
  return (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                    <th className="p-4 font-medium">Tanggal</th>
                    <th className="p-4 font-medium">Nama Item / Keperluan</th>
                    <th className="p-4 font-medium">Sumber/Tujuan</th>
                    <th className="p-4 font-medium">Kategori</th>
                    <th className="p-4 font-medium">Penanggung Jawab</th>
                    <th className="p-4 font-medium text-right">Pemasukan</th>
                    <th className="p-4 font-medium text-right">Pengeluaran</th>
                    {canManage && <th className="p-4 font-medium text-center">Aksi</th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {loading ? (
                    <tr>
                        <td colSpan={canManage ? 8 : 7} className="p-8 text-center">
                            <div className="flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        </td>
                    </tr>
                ) : paginatedEntries.length === 0 ? (
                    <tr>
                        <td colSpan={canManage ? 8 : 7} className="p-12 text-center text-slate-500">
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
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                    {entry.category}
                                </span>
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
    </div>
  );
};

export default CashLedgerTable;
