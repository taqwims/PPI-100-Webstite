import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, Edit, Trash2, User, Quote } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

interface Alumni {
    id: number;
    name: string;
    graduation_year: number;
    profession: string;
    testimony: string;
    photo_url: string;
}

const AdminAlumni: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAlumni, setEditingAlumni] = useState<Alumni | null>(null);
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        graduation_year: '',
        profession: '',
        testimony: '',
        photo_url: '',
    });

    const { data: alumni, isLoading } = useQuery({
        queryKey: ['admin-alumni'],
        queryFn: async () => {
            const res = await api.get('/public/alumni');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/public-content/alumni', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-alumni'] });
            queryClient.invalidateQueries({ queryKey: ['public-alumni'] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert('Gagal menyimpan data: ' + (err.response?.data?.error || err.message));
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/public-content/alumni/${editingAlumni?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-alumni'] });
            queryClient.invalidateQueries({ queryKey: ['public-alumni'] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert('Gagal mengupdate data: ' + (err.response?.data?.error || err.message));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/public-content/alumni/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-alumni'] });
            queryClient.invalidateQueries({ queryKey: ['public-alumni'] });
        },
    });

    const handleOpenModal = (alumni?: Alumni) => {
        if (alumni) {
            setEditingAlumni(alumni);
            setFormData({
                name: alumni.name,
                graduation_year: alumni.graduation_year.toString(),
                profession: alumni.profession,
                testimony: alumni.testimony,
                photo_url: alumni.photo_url,
            });
        } else {
            setEditingAlumni(null);
            setFormData({
                name: '',
                graduation_year: '',
                profession: '',
                testimony: '',
                photo_url: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAlumni(null);
        setFormData({
            name: '',
            graduation_year: '',
            profession: '',
            testimony: '',
            photo_url: '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            graduation_year: parseInt(formData.graduation_year),
        };

        if (editingAlumni) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus data alumni ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredAlumni = alumni?.filter((item: Alumni) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.profession.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Manajemen Alumni</h1>
                    <p className="text-white/60">Kelola data alumni untuk ditampilkan di website publik</p>
                </div>
                <ButtonGlass onClick={() => handleOpenModal()} icon={Plus}>
                    Tambah Alumni
                </ButtonGlass>
            </div>

            <CardGlass className="p-6">
                <div className="mb-6">
                    <InputGlass
                        icon={Search}
                        placeholder="Cari nama atau profesi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>Angkatan</TableHeadGlass>
                            <TableHeadGlass>Profesi</TableHeadGlass>
                            <TableHeadGlass>Testimoni</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredAlumni?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Tidak ada data alumni</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredAlumni?.map((item: Alumni) => (
                                <TableRowGlass key={item.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                                                {item.photo_url ? (
                                                    <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={16} className="text-gray-400" />
                                                )}
                                            </div>
                                            <span className="font-medium text-white">{item.name}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-gray-300">{item.graduation_year}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-gray-300">{item.profession}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-start gap-2 max-w-xs">
                                            <Quote size={12} className="text-gray-500 shrink-0 mt-1" />
                                            <p className="text-sm text-gray-400 truncate">{item.testimony}</p>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
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
                title={editingAlumni ? "Edit Alumni" : "Tambah Alumni"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputGlass
                        label="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <InputGlass
                            label="Tahun Lulus"
                            type="number"
                            value={formData.graduation_year}
                            onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                            required
                        />
                        <InputGlass
                            label="Profesi / Pekerjaan"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1 ml-1">Testimoni</label>
                        <textarea
                            className="w-full glass-input min-h-[100px]"
                            value={formData.testimony}
                            onChange={(e) => setFormData({ ...formData, testimony: e.target.value })}
                            placeholder="Tuliskan kesan dan pesan..."
                            required
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

export default AdminAlumni;
