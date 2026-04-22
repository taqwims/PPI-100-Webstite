import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Star, StarOff, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import type { SchoolBankAccount } from '../../store/featureStore';
import { useFeatureStore } from '../../store/featureStore';

const SchoolBankAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<SchoolBankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<SchoolBankAccount | null>(null);
    const [form, setForm] = useState({ bank_name: '', account_number: '', account_holder: '', is_active: true });
    const fetchFeatures = useFeatureStore((s) => s.fetchFeatures);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/bank-accounts');
            setAccounts(res.data || []);
        } catch (err) {
            toast.error('Gagal memuat data rekening');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const openCreateModal = () => {
        setEditingAccount(null);
        setForm({ bank_name: '', account_number: '', account_holder: '', is_active: true });
        setShowModal(true);
    };

    const openEditModal = (account: SchoolBankAccount) => {
        setEditingAccount(account);
        setForm({
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_holder: account.account_holder,
            is_active: account.is_active,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await api.put(`/finance/bank-accounts/${editingAccount.id}`, form);
                toast.success('Rekening berhasil diperbarui');
            } else {
                await api.post('/finance/bank-accounts', form);
                toast.success('Rekening berhasil ditambahkan');
            }
            setShowModal(false);
            fetchAccounts();
            fetchFeatures(); // Refresh global bank data
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Gagal menyimpan rekening');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Yakin ingin menghapus rekening ini?')) return;
        try {
            await api.delete(`/finance/bank-accounts/${id}`);
            toast.success('Rekening berhasil dihapus');
            fetchAccounts();
            fetchFeatures();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Gagal menghapus rekening');
        }
    };

    const handleSetPrimary = async (id: number) => {
        try {
            await api.put(`/finance/bank-accounts/${id}/primary`);
            toast.success('Rekening utama berhasil diubah');
            fetchAccounts();
            fetchFeatures();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Gagal mengubah rekening utama');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                        <Building2 size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Rekening Bank Sekolah</h1>
                        <p className="text-sm text-slate-500">Kelola rekening bank untuk pembayaran transfer</p>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all duration-200 font-medium text-sm"
                >
                    <Plus size={18} />
                    Tambah Rekening
                </button>
            </div>

            {/* Cards */}
            {accounts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Belum ada rekening bank</h3>
                    <p className="text-slate-500 text-sm mb-4">Tambahkan rekening bank sekolah agar siswa/orang tua dapat melakukan transfer pembayaran.</p>
                    <button onClick={openCreateModal} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                        Tambah Rekening Pertama
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className={`relative bg-white rounded-2xl border p-6 transition-all duration-200 hover:shadow-lg ${account.is_primary
                                    ? 'border-green-300 ring-2 ring-green-100 shadow-md shadow-green-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                } ${!account.is_active ? 'opacity-60' : ''}`}
                        >
                            {/* Primary Badge */}
                            {account.is_primary && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    Utama
                                </div>
                            )}

                            {/* Bank Info */}
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{account.bank_name}</h3>
                                <p className="text-2xl font-mono font-bold text-green-700 tracking-wider">{account.account_number}</p>
                                <p className="text-sm text-slate-600 mt-1">a/n <span className="font-semibold">{account.account_holder}</span></p>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 mb-4">
                                {account.is_active ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                        <ToggleRight size={14} /> Aktif
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                        <ToggleLeft size={14} /> Nonaktif
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                {!account.is_primary && (
                                    <button
                                        onClick={() => handleSetPrimary(account.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                                        title="Jadikan Utama"
                                    >
                                        <Star size={14} /> Jadikan Utama
                                    </button>
                                )}
                                {account.is_primary && (
                                    <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg">
                                        <StarOff size={14} /> Rekening Utama
                                    </span>
                                )}
                                <div className="ml-auto flex items-center gap-1">
                                    <button
                                        onClick={() => openEditModal(account)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(account.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingAccount ? 'Edit Rekening' : 'Tambah Rekening Baru'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Bank</label>
                                <input
                                    type="text"
                                    value={form.bank_name}
                                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                                    placeholder="BSI, BCA, Mandiri..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Rekening</label>
                                <input
                                    type="text"
                                    value={form.account_number}
                                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                                    placeholder="7123456789"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pemilik Rekening</label>
                                <input
                                    type="text"
                                    value={form.account_holder}
                                    onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                                    placeholder="SDIT An-Nur"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm"
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                                <span className="text-sm text-slate-600">Aktif (tampil di halaman pembayaran)</span>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium transition-all"
                                >
                                    {editingAccount ? 'Simpan Perubahan' : 'Tambah Rekening'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolBankAccounts;
