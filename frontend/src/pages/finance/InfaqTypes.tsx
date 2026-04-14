import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Pencil, Trash2, X, AlertCircle, Heart } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface InfaqType {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
}

const InfaqTypes: React.FC = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<InfaqType | null>(null);
    const [form, setForm] = useState({ name: '', description: '', is_active: true });
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const { data: types = [], isLoading } = useQuery<InfaqType[]>({
        queryKey: ['infaq-types'],
        queryFn: async () => (await api.get('/finance/infaq-types')).data || [],
    });

    const createMutation = useMutation({
        mutationFn: (d: any) => api.post('/finance/infaq-types', d),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['infaq-types'] }); setShowModal(false); toast.success('Jenis infaq berhasil ditambahkan'); },
    });

    const updateMutation = useMutation({
        mutationFn: (d: any) => api.put(`/finance/infaq-types/${d.id}`, d),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['infaq-types'] }); setShowModal(false); setEditItem(null); toast.success('Berhasil diperbarui'); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/infaq-types/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['infaq-types'] }); setConfirmDelete(null); toast.success('Berhasil dihapus'); },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editItem) updateMutation.mutate({ ...form, id: editItem.id });
        else createMutation.mutate(form);
    };

    const openEdit = (item: InfaqType) => {
        setEditItem(item);
        setForm({ name: item.name, description: item.description, is_active: item.is_active });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditItem(null);
        setForm({ name: '', description: '', is_active: true });
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Jenis Infaq</h1>
                    <p className="text-slate-500 mt-1">Kelola jenis-jenis infaq yang tersedia</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 text-sm font-medium">
                    <Plus size={16} /> Tambah Jenis
                </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 text-sm">
                            <th className="p-4 font-medium">Nama</th>
                            <th className="p-4 font-medium">Deskripsi</th>
                            <th className="p-4 font-medium text-center">Status</th>
                            <th className="p-4 font-medium text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></td></tr>
                        ) : types.length === 0 ? (
                            <tr><td colSpan={4} className="p-12 text-center text-slate-500">
                                <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="font-medium">Belum ada jenis infaq</p>
                            </td></tr>
                        ) : types.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 font-semibold text-slate-800 flex items-center gap-2">
                                    <Heart size={16} className="text-emerald-500" /> {t.name}
                                </td>
                                <td className="p-4 text-sm text-slate-600">{t.description || '-'}</td>
                                <td className="p-4 text-center">
                                    <span className={clsx("px-2 py-0.5 text-xs font-semibold rounded-full", t.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={16} /></button>
                                        <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                            <h2 className="text-lg font-bold text-emerald-800">{editItem ? 'Edit Jenis Infaq' : 'Tambah Jenis Infaq'}</h2>
                            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Jenis Infaq</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Infaq Jumat" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" rows={3} placeholder="Deskripsi opsional..." />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                <label htmlFor="is_active" className="text-sm text-slate-700">Aktif</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title="Hapus Jenis Infaq"
                message="Apakah Anda yakin ingin menghapus jenis infaq ini?"
                onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
            />
        </div>
    );
};

export default InfaqTypes;
