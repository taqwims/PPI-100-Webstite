import React from 'react';
import { Briefcase, Tag, UserCheck, FileText } from 'lucide-react';
import clsx from 'clsx';
import { StaffUser, TransactionCode, CashLedgerEntry } from '../../../types/cashLedgerTypes';

interface Props {
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  editingEntry: CashLedgerEntry | null;
  setEditingEntry: (val: CashLedgerEntry | null) => void;
  formData: any;
  setFormData: (val: any) => void;
  submitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleInput: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleTransactionCodeChange: (codeId: string) => void;
  transactionCodes: TransactionCode[];
  staffList: StaffUser[];
}

const CashLedgerFormModal: React.FC<Props> = ({
  showModal, setShowModal,
  editingEntry, setEditingEntry,
  formData, setFormData,
  submitting, handleSubmit, handleInput,
  handleTransactionCodeChange,
  transactionCodes, staffList
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold flex items-center text-slate-800">
                    <Briefcase className="text-blue-600 mr-2" size={24} /> {editingEntry ? 'Edit Transaksi Kas' : 'Input Transaksi Kas'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingEntry(null); }} className="text-slate-400 hover:text-slate-600 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Anggaran</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'Income', responsible_id: '' })}
                                className={clsx(
                                    "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                    formData.type === 'Income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Pemasukan
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'Expense' })}
                                className={clsx(
                                    "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                    formData.type === 'Expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Pengeluaran
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5"><Tag size={14} className="text-green-500" /> Kode Transaksi</span>
                        </label>
                        <select
                            name="transaction_code_id"
                            value={formData.transaction_code_id}
                            onChange={e => handleTransactionCodeChange(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">-- Pilih Kode Transaksi --</option>
                            {transactionCodes.filter(tc => tc.is_active && !tc.parent_code_id).map(master => (
                                <optgroup key={master.id} label={`${master.code} — ${master.name}`}>
                                    <option value={master.id}>{master.code} — {master.name}</option>
                                    {transactionCodes.filter(c => c.parent_code_id === master.id && c.is_active).map(child => (
                                        <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.code} — {child.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {formData.transaction_code_id && (
                            <p className="text-xs text-slate-500 mt-1">
                                Kategori: <span className="font-medium text-slate-700">{formData.category}</span> | 
                                Tipe: <span className="font-medium text-slate-700">{formData.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Item / Keperluan</label>
                        <input
                            type="text"
                            name="item_name"
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
                            placeholder="Contoh: Pembayaran Listrik"
                            value={formData.item_name}
                            onChange={handleInput}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                        <input
                            type="number"
                            name="amount"
                            required
                            min="1000"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium text-sm"
                            placeholder="150000"
                            value={formData.amount}
                            onChange={handleInput}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sumber / Tujuan</label>
                    <input
                        type="text"
                        name="source"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
                        placeholder="Pihak penerima atau pemberi dana..."
                        value={formData.source}
                        onChange={handleInput}
                    />
                </div>

                {/* Sumber Dana */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5">💰 Sumber Dana</span>
                    </label>
                    <select
                        name="fund_source"
                        value={formData.fund_source}
                        onChange={handleInput}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="Kas Umum">Kas Umum</option>
                        <option value="Infaq">Infaq</option>
                        <option value="Tabungan Siswa">Tabungan Siswa</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Alokasi dana yang digunakan untuk transaksi ini</p>
                </div>

                {/* Penanggung Jawab - hanya untuk Pengeluaran */}
                {formData.type === 'Expense' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5">
                                <UserCheck size={14} className="text-blue-500" />
                                Penanggung Jawab (Staff)
                            </span>
                        </label>
                        <select
                            name="responsible_id"
                            value={formData.responsible_id}
                            onChange={handleInput}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">-- Pilih Penanggung Jawab --</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                        <textarea
                            name="notes"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
                            rows={2}
                            placeholder="Nomor referensi kwitansi dsb..."
                            value={formData.notes}
                            onChange={handleInput}
                        ></textarea>
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => { setShowModal(false); setEditingEntry(null); }}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={clsx(
                            "px-6 py-2.5 rounded-xl text-white font-medium transition flex justify-center items-center min-w-[120px]",
                            "bg-blue-600 hover:bg-blue-700",
                            submitting && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {submitting ? 'Memproses...' : (editingEntry ? 'Simpan Perubahan' : 'Simpan Transaksi')}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default CashLedgerFormModal;
