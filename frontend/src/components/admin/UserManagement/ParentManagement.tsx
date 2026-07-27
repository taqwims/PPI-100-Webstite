import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Plus, Trash2, Edit2, Phone, MapPin, Users, Briefcase, Eye, EyeOff } from 'lucide-react';
import { useUnits } from '../../../hooks/useUnits';
import toast from 'react-hot-toast';

interface Parent {
    id: string;
    user_id: string;
    phone: string;
    address: string;
    occupation: string;
    relation: string;
    user: {
        id: string;
        name: string;
        email: string;
        unit_id: number;
    };
    children: any[];
}

export const ParentManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const { units } = useUnits();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParent, setEditingParent] = useState<Parent | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', phone: '', address: '', occupation: '', relation: 'Ayah', unit_id: units[0]?.id || 1
    });

    const { data: parents = [], isLoading } = useQuery({
        queryKey: ['parents'],
        queryFn: async () => {
            const res = await api.get('/parents/');
            return res.data || [];
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => api.post('/parents/', data),
        onSuccess: () => {
            toast.success('Data orang tua berhasil ditambahkan');
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menyimpan data'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: typeof formData) => api.put(`/parents/${editingParent?.id}`, data),
        onSuccess: () => {
            toast.success('Data orang tua berhasil diperbarui');
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal mengupdate data'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/parents/${id}`),
        onSuccess: () => {
            toast.success('Data orang tua berhasil dihapus');
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menghapus data'),
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingParent(null);
        setFormData({ name: '', email: '', password: '', phone: '', address: '', occupation: '', relation: 'Ayah', unit_id: units[0]?.id || 1 });
    };

    const handleEdit = (p: Parent) => {
        setEditingParent(p);
        setFormData({
            name: p.user.name,
            email: p.user.email,
            password: '',
            phone: p.phone || '',
            address: p.address || '',
            occupation: p.occupation || '',
            relation: p.relation || 'Ayah',
            unit_id: p.user.unit_id
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingParent) {
            const payload = { ...formData };
            if (!payload.password) delete (payload as any).password;
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredParents = parents.filter((p: Parent) => 
        p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <input type="text" placeholder="Cari nama atau email..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 rounded-lg border border-slate-200 text-sm" />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-sm transition">
                    <Plus size={16} /> Tambah Orang Tua
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-5 py-3 font-medium">Data Orang Tua</th>
                            <th className="px-5 py-3 font-medium">Kontak & Pekerjaan</th>
                            <th className="px-5 py-3 font-medium">Anak (Siswa)</th>
                            <th className="px-5 py-3 font-medium text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">Memuat...</td></tr>
                        ) : filteredParents.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">Belum ada data orang tua</td></tr>
                        ) : filteredParents.map((p: Parent) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-5 py-4">
                                    <div className="font-semibold text-slate-800">{p.user?.name}</div>
                                    <div className="text-xs text-slate-500">{p.user?.email}</div>
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">
                                        {p.relation || 'Wali'}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 text-xs mb-1"><Phone size={12} className="text-slate-400" /> {p.phone || '-'}</div>
                                    <div className="flex items-center gap-2 text-xs mb-1"><Briefcase size={12} className="text-slate-400" /> {p.occupation || '-'}</div>
                                    <div className="flex items-start gap-2 text-xs"><MapPin size={12} className="text-slate-400 mt-0.5" /> <span className="line-clamp-2 max-w-[150px]">{p.address || '-'}</span></div>
                                </td>
                                <td className="px-5 py-4">
                                    {p.children && p.children.length > 0 ? (
                                        <div className="space-y-1">
                                            {p.children.map(child => (
                                                <div key={child.id} className="text-xs flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md w-fit">
                                                    <Users size={12} className="text-blue-500" />
                                                    <span className="font-medium">{child.user?.name}</span>
                                                    <span className="text-slate-400">({child.class?.name || 'No Class'})</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Belum terhubung</span>
                                    )}
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"><Edit2 size={16} /></button>
                                        <button onClick={() => { if(confirm('Hapus data orang tua ini?')) deleteMutation.mutate(p.id) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">{editingParent ? 'Edit Orang Tua' : 'Tambah Orang Tua'}</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required placeholder="Nama lengkap" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Email (Untuk Login)</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required placeholder="email@example.com" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">{editingParent ? 'Password Baru (Opsional)' : 'Password'}</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-lg text-sm" placeholder="••••••••" required={!editingParent} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">No. HP / WhatsApp</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="081234567890" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Hubungan</label>
                                    <select value={formData.relation} onChange={e => setFormData({ ...formData, relation: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        <option value="Ayah">Ayah</option>
                                        <option value="Ibu">Ibu</option>
                                        <option value="Wali">Wali</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Pekerjaan</label>
                                    <input type="text" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Wiraswasta / PNS dll" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                                <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={3} placeholder="Alamat tempat tinggal" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Akses</label>
                                <select value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 text-sm">Batal</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 text-sm disabled:opacity-50">
                                    Simpan Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
