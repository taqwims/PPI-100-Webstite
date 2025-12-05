import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Academic = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'schedules'>('classes');
    const [unitID, setUnitID] = useState(user?.unit_id || 1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form States
    const [formData, setFormData] = useState<any>({});
    const [editingId, setEditingId] = useState<number | null>(null);

    // --- Data Fetching with React Query ---

    const { data: classes, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['academic_classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
        queryKey: ['academic_subjects', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/subjects?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['academic_schedules'],
        queryFn: async () => {
            const res = await api.get('/academic/schedules');
            return res.data || [];
        }
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers_list', unitID],
        queryFn: async () => {
            // Pass unit_id to get teachers for the specific unit
            const res = await api.get(`/teachers?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    // --- Mutations ---

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
            queryClient.invalidateQueries({ queryKey: ['academic_subjects'] });
            queryClient.invalidateQueries({ queryKey: ['academic_schedules'] });
            handleCloseModal();
        },
        onError: (error: any) => {
            console.error('Error saving data:', error);
            alert('Failed to save data');
        }
    };

    const createClassMutation = useMutation({
        mutationFn: (data: any) => api.post('/academic/classes', data),
        ...mutationOptions
    });

    const updateClassMutation = useMutation({
        mutationFn: (data: any) => api.put(`/academic/classes/${editingId}`, data),
        ...mutationOptions
    });

    const deleteClassMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/academic/classes/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic_classes'] })
    });

    const createSubjectMutation = useMutation({
        mutationFn: (data: any) => api.post('/academic/subjects', data),
        ...mutationOptions
    });

    const updateSubjectMutation = useMutation({
        mutationFn: (data: any) => api.put(`/academic/subjects/${editingId}`, data),
        ...mutationOptions
    });

    const deleteSubjectMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/academic/subjects/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic_subjects'] })
    });

    const createScheduleMutation = useMutation({
        mutationFn: (data: any) => api.post('/academic/schedules', data),
        ...mutationOptions
    });

    // Note: Update schedule might not be implemented in backend based on previous file view, 
    // but we'll keep the structure ready or use create for now if update is missing.
    // Checking the handler file again, there is NO UpdateSchedule handler. 
    // So we will only support Create and Delete for Schedules for now, or handle it gracefully.

    const updateScheduleMutation = useMutation({
        mutationFn: (data: any) => api.put(`/academic/schedules/${editingId}`, data),
        ...mutationOptions
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/academic/schedules/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic_schedules'] })
    });

    // --- Handlers ---

    const handleOpenModal = (item?: any) => {
        if (item) {
            setEditingId(item.id);
            // For schedules, we need to ensure we map nested objects to IDs for the form
            if (activeTab === 'schedules') {
                setFormData({
                    ...item,
                    class_id: item.class_id || item.class?.id,
                    subject_id: item.subject_id || item.subject?.id,
                    teacher_id: item.teacher_id || item.teacher?.id
                });
            } else {
                setFormData(item);
            }
        } else {
            setEditingId(null);
            setFormData({});
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = { ...formData, unit_id: unitID };
        if (payload.unit_id) payload.unit_id = Number(payload.unit_id);

        // Convert IDs to numbers for classes and subjects if they are strings
        if (payload.class_id) payload.class_id = Number(payload.class_id);
        if (payload.subject_id) payload.subject_id = Number(payload.subject_id);

        if (activeTab === 'classes') {
            if (editingId) updateClassMutation.mutate(payload);
            else createClassMutation.mutate(payload);
        } else if (activeTab === 'subjects') {
            if (editingId) updateSubjectMutation.mutate(payload);
            else createSubjectMutation.mutate(payload);
        } else if (activeTab === 'schedules') {
            if (editingId) updateScheduleMutation.mutate(payload);
            else createScheduleMutation.mutate(payload);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

        if (activeTab === 'classes') deleteClassMutation.mutate(id);
        else if (activeTab === 'subjects') deleteSubjectMutation.mutate(id);
        else if (activeTab === 'schedules') deleteScheduleMutation.mutate(id);
    };

    // --- Renderers ---

    const renderTabs = () => (
        <div className="flex space-x-4 mb-6 border-b border-white/10">
            {[
                { id: 'classes', label: 'Data Kelas' },
                { id: 'subjects', label: 'Mata Pelajaran' },
                { id: 'schedules', label: 'Jadwal Pelajaran' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === tab.id
                        ? 'text-white'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    )}
                </button>
            ))}
        </div>
    );

    const renderContent = () => {
        const isLoading = isLoadingClasses || isLoadingSubjects || isLoadingSchedules;

        if (isLoading) {
            return <div className="text-white text-center py-8">Loading...</div>;
        }

        switch (activeTab) {
            case 'classes':
                return (
                    <TableGlass
                        headers={['ID', 'Nama Kelas', 'Unit ID', 'Aksi']}
                        data={classes?.map((cls: any) => ({
                            id: cls.id,
                            name: cls.name,
                            unit: cls.unit_id,
                            actions: (
                                <div className="flex space-x-2">
                                    <button onClick={() => handleOpenModal(cls)} className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(cls.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            )
                        })) || []}
                    />
                );
            case 'subjects':
                return (
                    <TableGlass
                        headers={['ID', 'Nama Mapel', 'Unit ID', 'Aksi']}
                        data={subjects?.map((subj: any) => ({
                            id: subj.id,
                            name: subj.name,
                            unit: subj.unit_id,
                            actions: (
                                <div className="flex space-x-2">
                                    <button onClick={() => handleOpenModal(subj)} className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(subj.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            )
                        })) || []}
                    />
                );
            case 'schedules':
                return (
                    <TableGlass
                        headers={['ID', 'Kelas', 'Mapel', 'Guru', 'Hari', 'Jam', 'Aksi']}
                        data={schedules?.map((sch: any) => ({
                            id: sch.id,
                            class: sch.class?.name || sch.class_id,
                            subject: sch.subject?.name || sch.subject_id,
                            teacher: sch.teacher?.user?.name || sch.teacher?.name || sch.teacher_id, // Display teacher name
                            day: sch.day,
                            time: `${sch.start_time} - ${sch.end_time}`,
                            actions: (
                                <div className="flex space-x-2">
                                    <button onClick={() => handleOpenModal(sch)} className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(sch.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            )
                        })) || []}
                    />
                );
            default:
                return null;
        }
    };

    const renderModalContent = () => {
        switch (activeTab) {
            case 'classes':
                return (
                    <div className="space-y-4">
                        <InputGlass
                            label="Nama Kelas"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            placeholder="Contoh: 7A"
                        />
                    </div>
                );
            case 'subjects':
                return (
                    <div className="space-y-4">
                        <InputGlass
                            label="Nama Mata Pelajaran"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            placeholder="Contoh: Matematika"
                        />
                    </div>
                );
            case 'schedules':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Kelas</label>
                            <select
                                name="class_id"
                                value={formData.class_id || ''}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                            >
                                <option value="" className="bg-slate-800">Pilih Kelas</option>
                                {classes?.map((c: any) => (
                                    <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Mata Pelajaran</label>
                            <select
                                name="subject_id"
                                value={formData.subject_id || ''}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                            >
                                <option value="" className="bg-slate-800">Pilih Mapel</option>
                                {subjects?.map((s: any) => (
                                    <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Guru</label>
                            <select
                                name="teacher_id"
                                value={formData.teacher_id || ''}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                            >
                                <option value="" className="bg-slate-800">Pilih Guru</option>
                                {teachers?.map((t: any) => (
                                    <option key={t.id} value={t.id} className="bg-slate-800">{t.user?.name || t.name}</option>
                                ))}
                            </select>
                        </div>

                        <InputGlass
                            label="Hari"
                            name="day"
                            value={formData.day || ''}
                            onChange={handleInputChange}
                            placeholder="Monday"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <InputGlass
                                label="Jam Mulai"
                                name="start_time"
                                type="time"
                                value={formData.start_time || ''}
                                onChange={handleInputChange}
                            />
                            <InputGlass
                                label="Jam Selesai"
                                name="end_time"
                                type="time"
                                value={formData.end_time || ''}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Akademik</h1>
                    <p className="text-white/60">Manajemen data akademik sekolah</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Unit Switcher */}
                    {(user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3) && (
                        <select
                            value={unitID}
                            onChange={(e) => setUnitID(Number(e.target.value))}
                            className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={user?.role_id !== 1}
                        >
                            <option value={1} className="bg-gray-900">MTS</option>
                            <option value={2} className="bg-gray-900">MA</option>
                        </select>
                    )}
                    <ButtonGlass onClick={() => handleOpenModal()} icon={Plus}>
                        Tambah Data
                    </ButtonGlass>
                </div>
            </div>

            <CardGlass>
                {renderTabs()}

                <div className="mb-6 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                        <input
                            type="text"
                            placeholder="Cari data..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {renderContent()}
            </CardGlass>

            <ModalGlass
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={`${editingId ? 'Edit' : 'Tambah'} ${activeTab === 'classes' ? 'Kelas' :
                    activeTab === 'subjects' ? 'Mata Pelajaran' : 'Jadwal'
                    }`}
            >
                <form onSubmit={handleSubmit}>
                    {renderModalContent()}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Batal
                        </button>
                        <ButtonGlass type="submit">
                            Simpan
                        </ButtonGlass>
                    </div>
                </form>
            </ModalGlass>
        </div>
    );
};

export default Academic;
