import React from 'react';
import { Heart, ArrowDownRight, UserCheck, Tag } from 'lucide-react';
import clsx from 'clsx';
import type { DailyInfaqEntry, ClassData, StaffUser, TransactionCode, InfaqType } from '../../../hooks/useDailyInfaq';

interface DailyInfaqFormModalProps {
    showModal: boolean;
    setShowModal: (val: boolean) => void;
    editingEntry: DailyInfaqEntry | null;
    setEditingEntry: (val: DailyInfaqEntry | null) => void;
    formData: any;
    setFormData: (val: any) => void;
    handleInput: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
    classList: ClassData[];
    staffList: StaffUser[];
    transactionCodes: TransactionCode[];
    infaqTypes: InfaqType[];
}

const DailyInfaqFormModal: React.FC<DailyInfaqFormModalProps> = ({
    showModal, setShowModal,
    editingEntry, setEditingEntry,
    formData, setFormData,
    handleInput, handleSubmit,
    submitting,
    classList, staffList, transactionCodes, infaqTypes
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-xl font-bold flex items-center text-slate-800">
                        {formData.type === 'Income' ? (
                            <><Heart className="text-emerald-500 mr-2" size={24} /> {editingEntry ? 'Edit Infaq' : 'Input Infaq Masuk'}</>
                        ) : (
                            <><ArrowDownRight className="text-red-500 mr-2" size={24} /> {editingEntry ? 'Edit Pengeluaran' : 'Input Pengeluaran Infaq'}</>
                        )}
                    </h2>
                    <button onClick={() => { setShowModal(false); setEditingEntry(null); }} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                </div>

                <div className="overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Type Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Transaksi</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'Income', responsible_id: '' })}
                                    className={clsx(
                                        "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                        formData.type === 'Income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    Pemasukan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'Expense' })}
                                    className={clsx(
                                        "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                        formData.type === 'Expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    Pengeluaran
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {formData.type === 'Income' ? 'Sumber / Nama Donatur' : 'Keperluan Pengeluaran'}
                            </label>
                            <input
                                type="text"
                                name="source"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                placeholder={formData.type === 'Income' ? "Contoh: Siswa Kelas 1A / Hamba Allah" : "Contoh: Bantuan untuk yayasan"}
                                value={formData.source}
                                onChange={handleInput}
                            />
                        </div>

                        {/* Kelas - optional, shown for Income */}
                        {formData.type === 'Income' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kelas (Opsional)</label>
                                <select
                                    name="class_name"
                                    value={formData.class_name}
                                    onChange={handleInput}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">-- Semua / Umum --</option>
                                    {classList.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Penanggung Jawab - for Expense */}
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
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">-- Pilih Penanggung Jawab --</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="1000"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 font-medium"
                                placeholder="50000"
                                value={formData.amount}
                                onChange={handleInput}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan (Opsional)</label>
                            <textarea
                                name="notes"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                rows={3}
                                placeholder="Catatan tambahan (misal: Kotak Amal Jumat)..."
                                value={formData.notes}
                                onChange={handleInput}
                            ></textarea>
                        </div>

                        {/* Kode Transaksi (Master/Child) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                <span className="flex items-center gap-1.5">
                                    <Tag size={14} className="text-green-500" />
                                    Kode Transaksi
                                </span>
                            </label>
                            <select
                                name="transaction_code_id"
                                value={formData.transaction_code_id}
                                onChange={handleInput}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
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
                        </div>

                        {/* Jenis Infaq */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Infaq</label>
                            <select
                                name="infaq_type_id"
                                value={formData.infaq_type_id}
                                onChange={handleInput}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                            >
                                <option value="">-- Semua / Umum --</option>
                                {infaqTypes.map(it => (
                                    <option key={it.id} value={it.id}>{it.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sumber Dana */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">💰 Sumber Dana</label>
                            <select
                                name="fund_source"
                                value={formData.fund_source}
                                onChange={handleInput}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                            >
                                <option value="Infaq">Infaq</option>
                                <option value="Kas Umum">Kas Umum</option>
                                <option value="Tabungan Siswa">Tabungan Siswa</option>
                            </select>
                        </div>

                        {/* Upload Bukti */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">📂 Upload Bukti (Link)</label>
                            <input
                                type="url"
                                name="proof_url"
                                value={formData.proof_url}
                                onChange={handleInput}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm placeholder-slate-400"
                                placeholder="https://drive.google.com/... (opsional)"
                            />
                            <p className="text-xs text-slate-400 mt-1">Link file bukti transaksi (Google Drive, dll)</p>
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
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
                                    formData.type === 'Income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
                                    submitting && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {submitting ? 'Menyimpan...' : (editingEntry ? 'Simpan Perubahan' : 'Simpan')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DailyInfaqFormModal;
