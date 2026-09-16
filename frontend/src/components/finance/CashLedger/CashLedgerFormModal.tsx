import React, { useState, useMemo } from 'react';
import { Briefcase, Tag, UserCheck, FileText, Search, Layers, ArrowRight, CheckCircle2, Info } from 'lucide-react';
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
  const [codeSearch, setCodeSearch] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);

  // Selected Transaction Code & its parent (if child)
  const selectedTC = useMemo(() => {
    if (!formData.transaction_code_id) return null;
    return transactionCodes.find(tc => String(tc.id) === String(formData.transaction_code_id)) || null;
  }, [formData.transaction_code_id, transactionCodes]);

  const parentTC = useMemo(() => {
    if (!selectedTC || !selectedTC.parent_code_id) return null;
    return transactionCodes.find(tc => tc.id === selectedTC.parent_code_id) || selectedTC.parent_code || null;
  }, [selectedTC, transactionCodes]);

  // Filter transaction codes based on active type and search term
  const matchingCodes = useMemo(() => {
    return transactionCodes.filter(tc => {
      if (!tc.is_active) return false;
      
      // Type matching unless showAllTypes is toggled
      if (!showAllTypes) {
        if (formData.type === 'Expense' && !(tc.type === 'Expense' || tc.type === 'Pengeluaran')) return false;
        if (formData.type === 'Income' && !(tc.type === 'Income' || tc.type === 'Penerimaan')) return false;
      }

      // Search matching
      if (codeSearch.trim()) {
        const q = codeSearch.toLowerCase();
        const matchesSelf = tc.code.toLowerCase().includes(q) ||
                            tc.name.toLowerCase().includes(q) ||
                            tc.category.toLowerCase().includes(q) ||
                            (tc.description && tc.description.toLowerCase().includes(q));
        return matchesSelf;
      }

      return true;
    });
  }, [transactionCodes, formData.type, showAllTypes, codeSearch]);

  // Relevant master codes that either match or have matching children
  const relevantMasters = useMemo(() => {
    const matchingIds = new Set(matchingCodes.map(c => c.id));
    return transactionCodes.filter(tc => {
      if (!tc.is_active || tc.parent_code_id) return false;
      // If master itself matches
      if (matchingIds.has(tc.id)) return true;
      // If any child matches
      const hasMatchingChild = transactionCodes.some(c => c.parent_code_id === tc.id && matchingIds.has(c.id));
      return hasMatchingChild;
    });
  }, [transactionCodes, matchingCodes]);

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
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold text-slate-700">
                                <span className="flex items-center gap-1.5"><Tag size={14} className="text-blue-600" /> Pos Akun / Kode Transaksi (RKAS)</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowAllTypes(!showAllTypes)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                                {showAllTypes ? 'Filter Tipe Aktif' : 'Tampilkan Semua Pos'}
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {/* Search box for codes */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari kode akun / rincian pos (contoh: listrik, gaji, ATK)..."
                                    value={codeSearch}
                                    onChange={e => setCodeSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                                />
                                {codeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setCodeSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <select
                                name="transaction_code_id"
                                value={formData.transaction_code_id}
                                onChange={e => handleTransactionCodeChange(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white"
                            >
                                <option value="">-- Pilih Pos Akun / Kode Transaksi --</option>
                                {relevantMasters.map(master => {
                                    const children = matchingCodes.filter(c => c.parent_code_id === master.id && c.is_active);
                                    return (
                                        <optgroup key={master.id} label={`📁 [${master.code}] ${master.name} (${master.type === 'Income' ? 'Penerimaan' : 'Pengeluaran'})`}>
                                            <option value={master.id}>
                                                📁 [${master.code}] ${master.name} (Induk - ${master.category})
                                            </option>
                                            {children.map(child => (
                                                <option key={child.id} value={child.id}>
                                                    &nbsp;&nbsp;&nbsp;&nbsp;↳ 📄 [${child.code}] ${child.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Selected Hierarchy & Path Breakdown */}
                        {selectedTC ? (
                            selectedTC.parent_code_id ? (
                                <div className="mt-2.5 p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1.5 shadow-sm">
                                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                        <Layers size={14} className="text-blue-600 shrink-0" />
                                        <span>Jalur Aliran Pos Anggaran:</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-slate-700 bg-white/80 p-2 rounded-xl border border-blue-100 font-medium">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold">
                                            📁 Induk: {parentTC ? `[${parentTC.code}] ${parentTC.name}` : `Pos Induk #${selectedTC.parent_code_id}`}
                                        </span>
                                        <ArrowRight size={13} className="text-blue-500 shrink-0" />
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-[11px] font-bold">
                                            📄 Sub-Pos: [${selectedTC.code}] ${selectedTC.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-600">
                                        <span>Kategori: <strong className="text-slate-800">{selectedTC.category}</strong></span>
                                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Otomatis Merealisasikan RKAS
                                        </span>
                                    </div>
                                    {selectedTC.description && (
                                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                                            Catatan: {selectedTC.description}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl text-xs space-y-1 shadow-sm">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                        <Info size={14} className="text-amber-600 shrink-0" />
                                        <span>Pos Akun Induk: [${selectedTC.code}] ${selectedTC.name} ({selectedTC.category})</span>
                                    </div>
                                    <p className="text-[11px] text-amber-800">
                                        Ini adalah pos induk. Jika pengeluaran ini memiliki rincian belanja spesifik, Anda juga dapat memilih <strong>sub-pos / anak kode</strong> agar pembukuan lebih rinci.
                                    </p>
                                </div>
                            )
                        ) : (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Info size={12} /> Pilih pos akun untuk menghubungkan transaksi kas ini dengan realisasi anggaran RKAS.
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
