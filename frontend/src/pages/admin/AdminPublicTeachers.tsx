import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

interface Teacher {
    id: number;
    name: string;
    position: string;
    photo_url: string;
    bio: string;
}

const AdminPublicTeachers: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        position: '',
        photo_url: '',
        bio: '',
    });

    const { data: teachers, isLoading } = useQuery({
        queryKey: ['admin-public-teachers'],
        queryFn: async () => {
            const res = await api.get('/public/teachers');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/public-content/teachers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-public-teachers'] });
            queryClient.invalidateQueries({ queryKey: ['public-teachers'] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert('Gagal menyimpan data: ' + (err.response?.data?.error || err.message));
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/public-content/teachers/${editingTeacher?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-public-teachers'] });
            queryClient.invalidateQueries({ queryKey: ['public-teachers'] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert('Gagal mengupdate data: ' + (err.response?.data?.error || err.message));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/public-content/teachers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-public-teachers'] });
            queryClient.invalidateQueries({ queryKey: ['public-teachers'] });
        },
    });

    const handleOpenModal = (teacher?: Teacher) => {
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({
                name: teacher.name,
                position: teacher.position,
                photo_url: teacher.photo_url,
                bio: teacher.bio,
            });
        } else {
            setEditingTeacher(null);
            setFormData({
                name: '',
                position: '',
                photo_url: '',
                bio: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTeacher(null);
        setFormData({
            name: '',
            position: '',
            photo_url: '',
            bio: '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTeacher) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus data pengajar ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredTeachers = teachers?.filter((item: Teacher) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.position.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Manajemen Dewan Asatidz</h1>
                    <p className="text-slate-600">Kelola data pengajar untuk ditampilkan di website publik</p>
                </div>
                <ButtonGlass onClick={() => handleOpenModal()} icon={Plus}>
                    Tambah Pengajar
                </ButtonGlass>
            </div>

            <CardGlass className="p-6">
                <div className="mb-6">
                    <InputGlass
                        icon={Search}
                        placeholder="Cari nama atau jabatan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>Jabatan</TableHeadGlass>
                            <TableHeadGlass>Bio Singkat</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredTeachers?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Tidak ada data pengajar</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredTeachers?.map((item: Teacher) => (
                                <TableRowGlass key={item.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                                                {item.photo_url ? (
                                                    <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={16} className="text-slate-400" />
                                                )}
                                            </div>
                                            <span className="font-medium text-slate-900">{item.name}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{item.position}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <p className="text-sm text-slate-600 truncate max-w-xs">{item.bio}</p>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-red-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>

            <ModalGlass
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingTeacher ? "Edit Pengajar" : "Tambah Pengajar"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputGlass
                        label="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <InputGlass
                        label="Jabatan"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Bio Singkat</label>
                        <textarea
                            className="w-full glass-input min-h-[100px] text-slate-900 placeholder-slate-400 border-slate-200 focus:border-purple-500 bg-white/50"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Deskripsi singkat..."
                        />
                    </div>
                    <InputGlass
                        label="URL Foto (Opsional)"
                        value={formData.photo_url}
                        onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                        placeholder="https://..."
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <ButtonGlass type="button" variant="ghost" onClick={handleCloseModal}>
                            Batal
                        </ButtonGlass>
                        <ButtonGlass type="submit">
                            Simpan
                        </ButtonGlass>
                    </div>
                </form>
            </ModalGlass>
        </div>
    );
};

export default AdminPublicTeachers;
