import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Users, Download, GraduationCap, Edit, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

const AdminPublicContent: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'teachers' | 'downloads' | 'alumni'>('teachers');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // --- Forms State ---
    const [teacherForm, setTeacherForm] = useState({ id: '', name: '', position: '', photo_url: '', bio: '' });
    const [downloadForm, setDownloadForm] = useState({ id: '', title: '', category: '', file_url: '' });
    const [alumniForm, setAlumniForm] = useState({ id: '', name: '', graduation_year: '', profession: '', testimony: '', photo_url: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- Data Fetching ---
    const { data: teachers } = useQuery({
        queryKey: ['public_teachers'],
        queryFn: async () => {
            const res = await api.get('/public/teachers');
            return res.data;
        },
    });

    const { data: downloads } = useQuery({
        queryKey: ['public_downloads'],
        queryFn: async () => {
            const res = await api.get('/public/downloads');
            return res.data;
        },
    });

    const { data: alumni } = useQuery({
        queryKey: ['public_alumni'],
        queryFn: async () => {
            const res = await api.get('/public/alumni');
            return res.data;
        },
    });

    // --- Mutations ---
    const createTeacherMutation = useMutation({
        mutationFn: (data: typeof teacherForm) => api.post('/public-content/teachers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_teachers'] });
            handleCloseModal();
        },
    });

    const updateTeacherMutation = useMutation({
        mutationFn: (data: typeof teacherForm) => api.put(`/public-content/teachers/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_teachers'] });
            handleCloseModal();
        },
    });

    const deleteTeacherMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/public-content/teachers/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public_teachers'] }),
    });

    const createDownloadMutation = useMutation({
        mutationFn: (data: typeof downloadForm) => api.post('/public-content/downloads', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_downloads'] });
            handleCloseModal();
        },
    });

    const updateDownloadMutation = useMutation({
        mutationFn: (data: typeof downloadForm) => api.put(`/public-content/downloads/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_downloads'] });
            handleCloseModal();
        },
    });

    const deleteDownloadMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/public-content/downloads/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public_downloads'] }),
    });

    const createAlumniMutation = useMutation({
        mutationFn: (data: typeof alumniForm) => api.post('/public-content/alumni', {
            ...data,
            graduation_year: Number(data.graduation_year)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_alumni'] });
            handleCloseModal();
        },
    });

    const updateAlumniMutation = useMutation({
        mutationFn: (data: typeof alumniForm) => api.put(`/public-content/alumni/${data.id}`, {
            ...data,
            graduation_year: Number(data.graduation_year)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_alumni'] });
            handleCloseModal();
        },
    });

    const deleteAlumniMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/public-content/alumni/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public_alumni'] }),
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setTeacherForm({ id: '', name: '', position: '', photo_url: '', bio: '' });
        setDownloadForm({ id: '', title: '', category: '', file_url: '' });
        setAlumniForm({ id: '', name: '', graduation_year: '', profession: '', testimony: '', photo_url: '' });
    };

    const handleOpenModal = (item?: any) => {
        if (item) {
            setEditingId(item.id);
            if (activeTab === 'teachers') {
                setTeacherForm({ id: item.id, name: item.name, position: item.position, photo_url: item.photo_url, bio: item.bio });
            } else if (activeTab === 'downloads') {
                setDownloadForm({ id: item.id, title: item.title, category: item.category, file_url: item.file_url });
            } else if (activeTab === 'alumni') {
                setAlumniForm({ id: item.id, name: item.name, graduation_year: item.graduation_year, profession: item.profession, testimony: item.testimony, photo_url: item.photo_url });
            }
        } else {
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            if (activeTab === 'teachers') deleteTeacherMutation.mutate(id);
            if (activeTab === 'downloads') deleteDownloadMutation.mutate(id);
            if (activeTab === 'alumni') deleteAlumniMutation.mutate(id);
        }
    };

    const handleSubmit = () => {
        if (activeTab === 'teachers') {
            if (editingId) updateTeacherMutation.mutate(teacherForm);
            else createTeacherMutation.mutate(teacherForm);
        }
        if (activeTab === 'downloads') {
            if (editingId) updateDownloadMutation.mutate(downloadForm);
            else createDownloadMutation.mutate(downloadForm);
        }
        if (activeTab === 'alumni') {
            if (editingId) updateAlumniMutation.mutate(alumniForm);
            else createAlumniMutation.mutate(alumniForm);
        }
    };

    // --- Render Helpers ---
    const renderTeachers = () => (
        <TableGlass>
            <TableHeaderGlass>
                <TableRowGlass>
                    <TableHeadGlass>Nama</TableHeadGlass>
                    <TableHeadGlass>Jabatan</TableHeadGlass>
                    <TableHeadGlass>Bio</TableHeadGlass>
                    <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                </TableRowGlass>
            </TableHeaderGlass>
            <TableBodyGlass>
                {teachers?.map((t: any) => (
                    <TableRowGlass key={t.id}>
                        <TableCellGlass><span className="font-medium text-white">{t.name}</span></TableCellGlass>
                        <TableCellGlass><span className="text-gray-300">{t.position}</span></TableCellGlass>
                        <TableCellGlass><span className="text-gray-400 text-sm truncate max-w-xs">{t.bio}</span></TableCellGlass>
                        <TableCellGlass className="text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleOpenModal(t)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </TableCellGlass>
                    </TableRowGlass>
                ))}
            </TableBodyGlass>
        </TableGlass>
    );

    const renderDownloads = () => (
        <TableGlass>
            <TableHeaderGlass>
                <TableRowGlass>
                    <TableHeadGlass>Judul</TableHeadGlass>
                    <TableHeadGlass>Kategori</TableHeadGlass>
                    <TableHeadGlass>Link</TableHeadGlass>
                    <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                </TableRowGlass>
            </TableHeaderGlass>
            <TableBodyGlass>
                {downloads?.map((d: any) => (
                    <TableRowGlass key={d.id}>
                        <TableCellGlass><span className="font-medium text-white">{d.title}</span></TableCellGlass>
                        <TableCellGlass><span className="text-gray-300">{d.category}</span></TableCellGlass>
                        <TableCellGlass>
                            <a href={d.file_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm">Download</a>
                        </TableCellGlass>
                        <TableCellGlass className="text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleOpenModal(d)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(d.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </TableCellGlass>
                    </TableRowGlass>
                ))}
            </TableBodyGlass>
        </TableGlass>
    );

    const renderAlumni = () => (
        <TableGlass>
            <TableHeaderGlass>
                <TableRowGlass>
                    <TableHeadGlass>Nama</TableHeadGlass>
                    <TableHeadGlass>Tahun Lulus</TableHeadGlass>
                    <TableHeadGlass>Profesi</TableHeadGlass>
                    <TableHeadGlass>Testimoni</TableHeadGlass>
                    <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                </TableRowGlass>
            </TableHeaderGlass>
            <TableBodyGlass>
                {alumni?.map((a: any) => (
                    <TableRowGlass key={a.id}>
                        <TableCellGlass><span className="font-medium text-white">{a.name}</span></TableCellGlass>
                        <TableCellGlass><span className="text-gray-300">{a.graduation_year}</span></TableCellGlass>
                        <TableCellGlass><span className="text-gray-300">{a.profession}</span></TableCellGlass>
                        <TableCellGlass><span className="text-gray-400 text-sm truncate max-w-xs">{a.testimony}</span></TableCellGlass>
                        <TableCellGlass className="text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleOpenModal(a)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </TableCellGlass>
                    </TableRowGlass>
                ))}
            </TableBodyGlass>
        </TableGlass>
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Konten Publik</h1>
                    <p className="text-gray-400">Kelola konten website publik</p>
                </div>
                <ButtonGlass onClick={() => handleOpenModal()} className="flex items-center gap-2">
                    <Plus size={18} /> Tambah Data
                </ButtonGlass>
            </div>

            <div className="flex space-x-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('teachers')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'teachers' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Users size={18} /> Guru
                </button>
                <button
                    onClick={() => setActiveTab('downloads')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'downloads' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Download size={18} /> Download
                </button>
                <button
                    onClick={() => setActiveTab('alumni')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'alumni' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <GraduationCap size={18} /> Alumni
                </button>
            </div>

            <CardGlass className="p-6">
                {activeTab === 'teachers' && renderTeachers()}
                {activeTab === 'downloads' && renderDownloads()}
                {activeTab === 'alumni' && renderAlumni()}
            </CardGlass>

            <ModalGlass
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={`${editingId ? 'Edit' : 'Tambah'} ${activeTab === 'teachers' ? 'Guru' : activeTab === 'downloads' ? 'File Download' : 'Alumni'}`}
            >
                <div className="space-y-4">
                    {activeTab === 'teachers' && (
                        <>
                            <InputGlass label="Nama Lengkap" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} />
                            <InputGlass label="Jabatan" value={teacherForm.position} onChange={(e) => setTeacherForm({ ...teacherForm, position: e.target.value })} />
                            <InputGlass label="Link Foto" value={teacherForm.photo_url} onChange={(e) => setTeacherForm({ ...teacherForm, photo_url: e.target.value })} />
                            <InputGlass label="Bio Singkat" value={teacherForm.bio} onChange={(e) => setTeacherForm({ ...teacherForm, bio: e.target.value })} />
                        </>
                    )}
                    {activeTab === 'downloads' && (
                        <>
                            <InputGlass label="Judul File" value={downloadForm.title} onChange={(e) => setDownloadForm({ ...downloadForm, title: e.target.value })} />
                            <InputGlass label="Kategori" value={downloadForm.category} onChange={(e) => setDownloadForm({ ...downloadForm, category: e.target.value })} placeholder="Contoh: Brosur" />
                            <InputGlass label="Link File" value={downloadForm.file_url} onChange={(e) => setDownloadForm({ ...downloadForm, file_url: e.target.value })} />
                        </>
                    )}
                    {activeTab === 'alumni' && (
                        <>
                            <InputGlass label="Nama Alumni" value={alumniForm.name} onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })} />
                            <InputGlass label="Tahun Lulus" type="number" value={alumniForm.graduation_year} onChange={(e) => setAlumniForm({ ...alumniForm, graduation_year: e.target.value })} />
                            <InputGlass label="Profesi Saat Ini" value={alumniForm.profession} onChange={(e) => setAlumniForm({ ...alumniForm, profession: e.target.value })} />
                            <InputGlass label="Testimoni" value={alumniForm.testimony} onChange={(e) => setAlumniForm({ ...alumniForm, testimony: e.target.value })} />
                            <InputGlass label="Link Foto" value={alumniForm.photo_url} onChange={(e) => setAlumniForm({ ...alumniForm, photo_url: e.target.value })} />
                        </>
                    )}
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={handleCloseModal}>Batal</ButtonGlass>
                        <ButtonGlass onClick={handleSubmit}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default AdminPublicContent;
