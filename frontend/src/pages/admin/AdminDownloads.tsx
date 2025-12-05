import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, Edit, Trash2, FileText } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

interface DownloadItem {
    id: number;
    title: string;
    category: string;
    file_url: string;
    created_at: string;
}

const AdminDownloads: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDownload, setEditingDownload] = useState<DownloadItem | null>(null);
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        category: 'Brosur',
        file_url: '',
    });

    const { data: downloads, isLoading } = useQuery({
        queryKey: ['admin-downloads'],
        queryFn: async () => {
            const res = await api.get('/public/downloads');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/public-content/downloads', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-downloads'] });
            queryClient.invalidateQueries({ queryKey: ['public-downloads'] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert('Gagal menyimpan data: ' + (err.response?.data?.error || err.message));
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/public-content/downloads/${editingDownload?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-downloads'] });
            queryClient.invalidateQueries({ queryKey: ['public-downloads'] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert('Gagal mengupdate data: ' + (err.response?.data?.error || err.message));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/public-content/downloads/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-downloads'] });
            queryClient.invalidateQueries({ queryKey: ['public-downloads'] });
        },
    });

    const handleOpenModal = (download?: DownloadItem) => {
        if (download) {
            setEditingDownload(download);
            setFormData({
                title: download.title,
                category: download.category,
                file_url: download.file_url,
            });
        } else {
            setEditingDownload(null);
            setFormData({
                title: '',
                category: 'Brosur',
                file_url: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDownload(null);
        setFormData({
            title: '',
            category: 'Brosur',
            file_url: '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDownload) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus file ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredDownloads = downloads?.filter((item: DownloadItem) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Pusat Unduhan</h1>
                    <p className="text-slate-600">Kelola file yang dapat diunduh oleh publik</p>
                </div>
                <ButtonGlass onClick={() => handleOpenModal()} icon={Plus}>
                    Tambah File
                </ButtonGlass>
            </div>

            <CardGlass className="p-6">
                <div className="mb-6">
                    <InputGlass
                        icon={Search}
                        placeholder="Cari judul atau kategori..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Judul File</TableHeadGlass>
                            <TableHeadGlass>Kategori</TableHeadGlass>
                            <TableHeadGlass>Link</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredDownloads?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Tidak ada file</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredDownloads?.map((item: DownloadItem) => (
                                <TableRowGlass key={item.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <FileText size={16} className="text-blue-600" />
                                            </div>
                                            <span className="font-medium text-slate-900">{item.title}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                                            {item.category}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs block">
                                            {item.file_url}
                                        </a>
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
                title={editingDownload ? "Edit File" : "Tambah File"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputGlass
                        label="Judul File"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Kategori</label>
                        <select
                            className="w-full glass-input text-slate-900 bg-white/50 border-slate-200 focus:border-purple-500"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Brosur" className="bg-white">Brosur</option>
                            <option value="Kalender" className="bg-white">Kalender</option>
                            <option value="Dokumen" className="bg-white">Dokumen</option>
                            <option value="Lainnya" className="bg-white">Lainnya</option>
                        </select>
                    </div>
                    <InputGlass
                        label="URL File"
                        value={formData.file_url}
                        onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                        placeholder="https://..."
                        required
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

export default AdminDownloads;
