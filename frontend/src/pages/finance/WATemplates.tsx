import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Pencil, Trash2, X, AlertCircle, MessageCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface WATemplate {
    id: number;
    name: string;
    body_template: string;
    is_default: boolean;
    created_at: string;
}

const PLACEHOLDER_VARS = ['{nama_siswa}', '{nis}', '{kelas}', '{total_tagihan}', '{rincian}', '{tanggal}'];

const WATemplates: React.FC = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<WATemplate | null>(null);
    const [form, setForm] = useState({ name: '', body_template: '', is_default: false });
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const { data: templates = [], isLoading } = useQuery<WATemplate[]>({
        queryKey: ['wa-templates'],
        queryFn: async () => (await api.get('/finance/wa-templates')).data || [],
    });

    const createMutation = useMutation({
        mutationFn: (d: any) => api.post('/finance/wa-templates', d),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wa-templates'] }); setShowModal(false); toast.success('Template berhasil ditambahkan'); },
        onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal menyimpan'),
    });

    const updateMutation = useMutation({
        mutationFn: (d: any) => api.put(`/finance/wa-templates/${d.id}`, d),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wa-templates'] }); setShowModal(false); setEditItem(null); toast.success('Berhasil diperbarui'); },
        onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal memperbarui'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/wa-templates/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wa-templates'] }); setConfirmDelete(null); toast.success('Berhasil dihapus'); },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editItem) updateMutation.mutate({ ...form, id: editItem.id });
        else createMutation.mutate(form);
    };

    const openEdit = (item: WATemplate) => {
        setEditItem(item);
        setForm({ name: item.name, body_template: item.body_template, is_default: item.is_default });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditItem(null);
        setForm({
            name: '',
            body_template: `Assalamu'alaikum Wr. Wb.\n\nKepada Orang Tua/Wali dari:\nNama: {nama_siswa}\nNIS: {nis}\nKelas: {kelas}\n\nBerikut rincian tagihan yang belum dibayarkan:\n{rincian}\n\nTotal Tagihan: {total_tagihan}\n\nMohon segera melakukan pembayaran. Terima kasih.\n\nTanggal: {tanggal}\nBagian Keuangan SDIT`,
            is_default: false,
        });
        setShowModal(true);
    };

    const insertVar = (varName: string) => {
        setForm(prev => ({ ...prev, body_template: prev.body_template + varName }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Template WhatsApp</h1>
                    <p className="text-slate-500 mt-1">Template pesan untuk pengiriman tagihan ke orang tua via WhatsApp</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 text-sm font-medium">
                    <Plus size={16} /> Tambah Template
                </button>
            </div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {isLoading ? (
                    <div className="col-span-2 p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
                ) : templates.length === 0 ? (
                    <div className="col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-medium">Belum ada template</p>
                        <p className="text-sm mt-1">Buat template pesan WA untuk dikirim ke orang tua siswa</p>
                    </div>
                ) : templates.map(t => (
                    <div key={t.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-50">
                                    <MessageCircle size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        {t.name}
                                        {t.is_default && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                                <Star size={10} /> Default
                                            </span>
                                        )}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={16} /></button>
                                <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="p-5">
                            <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-48 overflow-y-auto font-sans">
                                {t.body_template}
                            </pre>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
                            <h2 className="text-lg font-bold text-emerald-800">{editItem ? 'Edit Template' : 'Tambah Template WA'}</h2>
                            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Template</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" placeholder="Template Tagihan Bulanan" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Isi Template</label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {PLACEHOLDER_VARS.map(v => (
                                        <button key={v} type="button" onClick={() => insertVar(v)}
                                            className="px-2 py-1 text-xs font-mono bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition border border-emerald-100">
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={form.body_template}
                                    onChange={e => setForm({ ...form, body_template: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                                    rows={12}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_default" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                <label htmlFor="is_default" className="text-sm text-slate-700 flex items-center gap-1"><Star size={14} className="text-amber-500" /> Jadikan Default</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title="Hapus Template"
                message="Apakah Anda yakin ingin menghapus template ini?"
                onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
            />
        </div>
    );
};

export default WATemplates;
