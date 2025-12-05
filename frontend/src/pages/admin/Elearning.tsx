import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { BookOpen, FileText, Plus, Link as LinkIcon, Filter, Edit, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useAuth } from '../../context/AuthContext';

interface Material {
    id: string;
    title: string;
    description: string;
    file_url: string;
    subject_id: number;
    class_id: number;
    teacher_id: string;
    subject: {
        name: string;
    };
    class: {
        name: string;
    };
}

interface Task {
    id: string;
    title: string;
    description: string;
    deadline: string;
    subject_id: number;
    class_id: number;
    teacher_id: string;
    subject: {
        name: string;
    };
    class: {
        name: string;
    };
}

interface Class {
    id: number;
    name: string;
}

interface Subject {
    id: number;
    name: string;
}

interface Teacher {
    id: string;
    name: string;
    user: {
        id: string;
        name: string;
    }
}

const Elearning: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'materials' | 'tasks'>('materials');
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [unitID, setUnitID] = useState(user?.unit_id || 1);
    const queryClient = useQueryClient();

    // --- Data Fetching ---
    const { data: classes } = useQuery({
        queryKey: ['classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Set default selected class when classes are loaded
    useEffect(() => {
        if (classes && classes.length > 0 && !selectedClassId) {
            setSelectedClassId(String(classes[0].id));
        }
    }, [classes]);

    const { data: materials, isLoading: isLoadingMaterials } = useQuery({
        queryKey: ['materials', selectedClassId],
        queryFn: async () => {
            if (!selectedClassId) return [];
            const res = await api.get(`/elearning/materials?class_id=${selectedClassId}`);
            return res.data;
        },
        enabled: !!selectedClassId
    });

    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', selectedClassId],
        queryFn: async () => {
            if (!selectedClassId) return [];
            const res = await api.get(`/elearning/tasks?class_id=${selectedClassId}`);
            return res.data;
        },
        enabled: !!selectedClassId
    });

    const { data: subjects } = useQuery({
        queryKey: ['subjects', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/subjects?unit_id=${unitID}`);
            return res.data;
        },
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers', unitID],
        queryFn: async () => {
            const res = await api.get(`/teachers?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Find current teacher ID if user is a teacher
    const currentTeacher = teachers?.find((t: Teacher) => t.user.id === user?.id);

    // --- Mutations ---
    const [newMaterial, setNewMaterial] = useState({ id: '', title: '', description: '', file_url: '', class_id: '', subject_id: '', teacher_id: '' });
    const [editingMaterial, setEditingMaterial] = useState<boolean>(false);

    const createMaterialMutation = useMutation({
        mutationFn: (data: typeof newMaterial) => api.post('/elearning/materials', {
            ...data,
            class_id: Number(data.class_id),
            subject_id: Number(data.subject_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
            handleCloseMaterialModal();
        },
        onError: (err: any) => {
            alert('Gagal menyimpan materi: ' + (err.response?.data?.error || err.message));
        }
    });

    const updateMaterialMutation = useMutation({
        mutationFn: (data: typeof newMaterial) => api.put(`/elearning/materials/${data.id}`, {
            ...data,
            class_id: Number(data.class_id),
            subject_id: Number(data.subject_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
            handleCloseMaterialModal();
        },
        onError: (err: any) => {
            alert('Gagal mengupdate materi: ' + (err.response?.data?.error || err.message));
        }
    });

    const deleteMaterialMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/elearning/materials/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
    });

    const [newTask, setNewTask] = useState({ id: '', title: '', description: '', deadline: '', class_id: '', subject_id: '', teacher_id: '' });
    const [editingTask, setEditingTask] = useState<boolean>(false);

    const createTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => api.post('/elearning/tasks', {
            ...data,
            class_id: Number(data.class_id),
            subject_id: Number(data.subject_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            handleCloseTaskModal();
        },
        onError: (err: any) => {
            alert('Gagal menyimpan tugas: ' + (err.response?.data?.error || err.message));
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => api.put(`/elearning/tasks/${data.id}`, {
            ...data,
            class_id: Number(data.class_id),
            subject_id: Number(data.subject_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            handleCloseTaskModal();
        },
        onError: (err: any) => {
            alert('Gagal mengupdate tugas: ' + (err.response?.data?.error || err.message));
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/elearning/tasks/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    });

    // Helper to open modal and set default teacher
    const openMaterialModal = (material?: Material) => {
        if (material) {
            setNewMaterial({
                id: material.id,
                title: material.title,
                description: material.description,
                file_url: material.file_url,
                class_id: material.class_id.toString(),
                subject_id: material.subject_id.toString(),
                teacher_id: material.teacher_id
            });
            setEditingMaterial(true);
        } else {
            setNewMaterial({
                id: '',
                title: '',
                description: '',
                file_url: '',
                class_id: selectedClassId,
                teacher_id: currentTeacher ? currentTeacher.id : '',
                subject_id: ''
            });
            setEditingMaterial(false);
        }
        setIsMaterialModalOpen(true);
    };

    const handleCloseMaterialModal = () => {
        setIsMaterialModalOpen(false);
        setNewMaterial({ id: '', title: '', description: '', file_url: '', class_id: '', subject_id: '', teacher_id: '' });
        setEditingMaterial(false);
    };

    const openTaskModal = (task?: Task) => {
        if (task) {
            setNewTask({
                id: task.id,
                title: task.title,
                description: task.description,
                deadline: task.deadline.split('T')[0],
                class_id: task.class_id.toString(),
                subject_id: task.subject_id.toString(),
                teacher_id: task.teacher_id
            });
            setEditingTask(true);
        } else {
            setNewTask({
                id: '',
                title: '',
                description: '',
                deadline: '',
                class_id: selectedClassId,
                teacher_id: currentTeacher ? currentTeacher.id : '',
                subject_id: ''
            });
            setEditingTask(false);
        }
        setIsTaskModalOpen(true);
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setNewTask({ id: '', title: '', description: '', deadline: '', class_id: '', subject_id: '', teacher_id: '' });
        setEditingTask(false);
    };

    const handleDeleteMaterial = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus materi ini?')) {
            deleteMaterialMutation.mutate(id);
        }
    };

    const handleDeleteTask = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
            deleteTaskMutation.mutate(id);
        }
    };

    // --- Render Helpers ---
    const renderMaterials = () => {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Daftar Materi Pelajaran</h2>
                    <ButtonGlass onClick={() => openMaterialModal()} className="flex items-center gap-2">
                        <Plus size={18} /> Tambah Materi
                    </ButtonGlass>
                </div>
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Judul</TableHeadGlass>
                            <TableHeadGlass>Mata Pelajaran</TableHeadGlass>
                            <TableHeadGlass>Link File</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoadingMaterials ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : materials?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Tidak ada materi untuk kelas ini.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            materials?.map((m: Material) => (
                                <TableRowGlass key={m.id}>
                                    <TableCellGlass>
                                        <div>
                                            <div className="font-medium text-white">{m.title}</div>
                                            <div className="text-xs text-gray-400">{m.description}</div>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-gray-300">{m.subject?.name || '-'}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                            <LinkIcon size={14} /> Buka File
                                        </a>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openMaterialModal(m)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteMaterial(m.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </div>
        );
    };

    const renderTasks = () => {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Daftar Tugas & PR</h2>
                    <ButtonGlass onClick={() => openTaskModal()} className="flex items-center gap-2">
                        <Plus size={18} /> Buat Tugas
                    </ButtonGlass>
                </div>
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Judul</TableHeadGlass>
                            <TableHeadGlass>Mata Pelajaran</TableHeadGlass>
                            <TableHeadGlass>Deadline</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoadingTasks ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : tasks?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Tidak ada tugas untuk kelas ini.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            tasks?.map((t: Task) => (
                                <TableRowGlass key={t.id}>
                                    <TableCellGlass>
                                        <div>
                                            <div className="font-medium text-white">{t.title}</div>
                                            <div className="text-xs text-gray-400">{t.description}</div>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-gray-300">{t.subject?.name || '-'}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-gray-400">
                                            {new Date(t.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-full">Aktif</span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openTaskModal(t)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteTask(t.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">E-Learning</h1>
                    <p className="text-gray-400">Manajemen materi pelajaran dan tugas siswa</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    {/* Unit Switcher */}
                    {(user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3) && (
                        <select
                            value={unitID}
                            onChange={(e) => setUnitID(Number(e.target.value))}
                            className="bg-transparent text-white border-none focus:ring-0 text-sm border-r border-white/20 pr-2 mr-2"
                            disabled={user?.role_id !== 1}
                        >
                            <option value={1} className="bg-gray-900">MTS</option>
                            <option value={2} className="bg-gray-900">MA</option>
                        </select>
                    )}
                    <Filter size={18} className="text-gray-400" />
                    <select
                        className="bg-transparent text-white border-none focus:ring-0 text-sm"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                        <option value="" className="bg-gray-900">-- Pilih Kelas --</option>
                        {classes?.map((c: Class) => (
                            <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex space-x-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'materials' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <BookOpen size={18} />
                    Materi
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'tasks' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <FileText size={18} />
                    Tugas
                </button>
            </div>

            <CardGlass className="p-6">
                {activeTab === 'materials' ? renderMaterials() : renderTasks()}
            </CardGlass>

            {/* Modal Create Material */}
            <ModalGlass
                isOpen={isMaterialModalOpen}
                onClose={handleCloseMaterialModal}
                title={editingMaterial ? "Edit Materi" : "Tambah Materi Baru"}
            >
                <div className="space-y-4">
                    <InputGlass
                        label="Judul Materi"
                        placeholder="Contoh: Pengenalan Aljabar"
                        value={newMaterial.title}
                        onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                    />
                    <InputGlass
                        label="Deskripsi"
                        placeholder="Keterangan singkat..."
                        value={newMaterial.description}
                        onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                    />
                    <InputGlass
                        label="Link File / Video"
                        placeholder="https://..."
                        value={newMaterial.file_url}
                        onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Kelas</label>
                            <select
                                className="w-full glass-input"
                                value={newMaterial.class_id}
                                onChange={(e) => setNewMaterial({ ...newMaterial, class_id: e.target.value })}
                            >
                                <option value="" className="bg-gray-900">-- Pilih Kelas --</option>
                                {classes?.map((c: Class) => (
                                    <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Mata Pelajaran</label>
                            <select
                                className="w-full glass-input"
                                value={newMaterial.subject_id}
                                onChange={(e) => setNewMaterial({ ...newMaterial, subject_id: e.target.value })}
                            >
                                <option value="" className="bg-gray-900">-- Pilih Mapel --</option>
                                {subjects?.map((s: Subject) => (
                                    <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Guru Pengampu</label>
                        <select
                            className="w-full glass-input"
                            value={newMaterial.teacher_id}
                            onChange={(e) => setNewMaterial({ ...newMaterial, teacher_id: e.target.value })}
                            disabled={!!currentTeacher} // Disable if logged in as teacher
                        >
                            <option value="" className="bg-gray-900">-- Pilih Guru --</option>
                            {teachers?.map((t: Teacher) => (
                                <option key={t.id} value={t.id} className="bg-gray-900">{t.user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={handleCloseMaterialModal}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => editingMaterial ? updateMaterialMutation.mutate(newMaterial) : createMaterialMutation.mutate(newMaterial)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>

            {/* Modal Create Task */}
            <ModalGlass
                isOpen={isTaskModalOpen}
                onClose={handleCloseTaskModal}
                title={editingTask ? "Edit Tugas" : "Buat Tugas Baru"}
            >
                <div className="space-y-4">
                    <InputGlass
                        label="Judul Tugas"
                        placeholder="Contoh: Latihan Soal Bab 1"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                    <InputGlass
                        label="Deskripsi / Instruksi"
                        placeholder="Kerjakan halaman 10-12..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                    <InputGlass
                        label="Deadline"
                        type="date"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Kelas</label>
                            <select
                                className="w-full glass-input"
                                value={newTask.class_id}
                                onChange={(e) => setNewTask({ ...newTask, class_id: e.target.value })}
                            >
                                <option value="" className="bg-gray-900">-- Pilih Kelas --</option>
                                {classes?.map((c: Class) => (
                                    <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Mata Pelajaran</label>
                            <select
                                className="w-full glass-input"
                                value={newTask.subject_id}
                                onChange={(e) => setNewTask({ ...newTask, subject_id: e.target.value })}
                            >
                                <option value="" className="bg-gray-900">-- Pilih Mapel --</option>
                                {subjects?.map((s: Subject) => (
                                    <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Guru Pengampu</label>
                        <select
                            className="w-full glass-input"
                            value={newTask.teacher_id}
                            onChange={(e) => setNewTask({ ...newTask, teacher_id: e.target.value })}
                            disabled={!!currentTeacher} // Disable if logged in as teacher
                        >
                            <option value="" className="bg-gray-900">-- Pilih Guru --</option>
                            {teachers?.map((t: Teacher) => (
                                <option key={t.id} value={t.id} className="bg-gray-900">{t.user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={handleCloseTaskModal}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => editingTask ? updateTaskMutation.mutate(newTask) : createTaskMutation.mutate(newTask)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default Elearning;
