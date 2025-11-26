import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { BookOpen, FileText, Plus, Link as LinkIcon, Calendar } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

const Elearning: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'materials' | 'tasks'>('materials');
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // --- Data Fetching ---
    const { data: materials } = useQuery({
        queryKey: ['materials'],
        queryFn: async () => {
            const res = await api.get('/elearning/materials?class_id=1'); // Defaulting to class 1 for now
            return res.data;
        },
    });

    const { data: tasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await api.get('/elearning/tasks?class_id=1'); // Defaulting to class 1 for now
            return res.data;
        },
    });

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            const res = await api.get('/academic/classes');
            return res.data;
        },
    });

    const { data: subjects } = useQuery({
        queryKey: ['subjects'],
        queryFn: async () => {
            const res = await api.get('/academic/subjects');
            return res.data;
        },
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const res = await api.get('/users/?role_id=4'); // Fetch users with role Teacher
            return res.data;
        },
    });

    // --- Mutations ---
    const [newMaterial, setNewMaterial] = useState({ title: '', description: '', file_url: '', class_id: '', subject_id: '', teacher_id: '' });
    const createMaterialMutation = useMutation({
        mutationFn: (data: typeof newMaterial) => api.post('/elearning/materials', {
            ...data,
            class_id: Number(data.class_id),
            subject_id: Number(data.subject_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
            setIsMaterialModalOpen(false);
            setNewMaterial({ title: '', description: '', file_url: '', class_id: '', subject_id: '', teacher_id: '' });
        },
    });

    const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '', class_id: '', subject_id: '', teacher_id: '' });
    const createTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => api.post('/elearning/tasks', {
            ...data,
            class_id: Number(data.class_id),
            subject_id: Number(data.subject_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setIsTaskModalOpen(false);
            setNewTask({ title: '', description: '', deadline: '', class_id: '', subject_id: '', teacher_id: '' });
        },
    });

    // --- Render Helpers ---
    const renderMaterials = () => {
        const headers = ['Judul', 'Mata Pelajaran', 'Link File'];
        const data = materials?.map((m: any) => ({
            id: m.ID,
            title: (
                <div>
                    <div className="font-medium text-white">{m.Title}</div>
                    <div className="text-xs text-gray-400">{m.Description}</div>
                </div>
            ),
            subject: m.Subject?.Name || '-',
            link: (
                <a href={m.FileURL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <LinkIcon size={14} /> Buka File
                </a>
            ),
        })) || [];

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Daftar Materi Pelajaran</h2>
                    <ButtonGlass onClick={() => setIsMaterialModalOpen(true)} icon={Plus}>
                        Tambah Materi
                    </ButtonGlass>
                </div>
                <TableGlass headers={headers} data={data} />
            </div>
        );
    };

    const renderTasks = () => {
        const headers = ['Judul', 'Mata Pelajaran', 'Deadline', 'Status'];
        const data = tasks?.map((t: any) => ({
            id: t.ID,
            title: (
                <div>
                    <div className="font-medium text-white">{t.Title}</div>
                    <div className="text-xs text-gray-400">{t.Description}</div>
                </div>
            ),
            subject: t.Subject?.Name || '-',
            deadline: new Date(t.Deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            status: <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-full">Aktif</span>,
        })) || [];

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Daftar Tugas & PR</h2>
                    <ButtonGlass onClick={() => setIsTaskModalOpen(true)} icon={Plus}>
                        Buat Tugas
                    </ButtonGlass>
                </div>
                <TableGlass headers={headers} data={data} />
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
                onClose={() => setIsMaterialModalOpen(false)}
                title="Tambah Materi Baru"
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
                                className="w-full glass-input text-gray-900"
                                value={newMaterial.class_id}
                                onChange={(e) => setNewMaterial({ ...newMaterial, class_id: e.target.value })}
                            >
                                <option value="">-- Pilih Kelas --</option>
                                {classes?.map((c: any) => (
                                    <option key={c.ID} value={c.ID}>{c.Name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Mata Pelajaran</label>
                            <select
                                className="w-full glass-input text-gray-900"
                                value={newMaterial.subject_id}
                                onChange={(e) => setNewMaterial({ ...newMaterial, subject_id: e.target.value })}
                            >
                                <option value="">-- Pilih Mapel --</option>
                                {subjects?.map((s: any) => (
                                    <option key={s.ID} value={s.ID}>{s.Name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Guru Pengampu</label>
                        <select
                            className="w-full glass-input text-gray-900"
                            value={newMaterial.teacher_id}
                            onChange={(e) => setNewMaterial({ ...newMaterial, teacher_id: e.target.value })}
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers?.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option> // Assuming teacher ID is user ID for now, need to verify
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setIsMaterialModalOpen(false)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => createMaterialMutation.mutate(newMaterial)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>

            {/* Modal Create Task */}
            <ModalGlass
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                title="Buat Tugas Baru"
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
                                className="w-full glass-input text-gray-900"
                                value={newTask.class_id}
                                onChange={(e) => setNewTask({ ...newTask, class_id: e.target.value })}
                            >
                                <option value="">-- Pilih Kelas --</option>
                                {classes?.map((c: any) => (
                                    <option key={c.ID} value={c.ID}>{c.Name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Mata Pelajaran</label>
                            <select
                                className="w-full glass-input text-gray-900"
                                value={newTask.subject_id}
                                onChange={(e) => setNewTask({ ...newTask, subject_id: e.target.value })}
                            >
                                <option value="">-- Pilih Mapel --</option>
                                {subjects?.map((s: any) => (
                                    <option key={s.ID} value={s.ID}>{s.Name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Guru Pengampu</label>
                        <select
                            className="w-full glass-input text-gray-900"
                            value={newTask.teacher_id}
                            onChange={(e) => setNewTask({ ...newTask, teacher_id: e.target.value })}
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers?.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setIsTaskModalOpen(false)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => createTaskMutation.mutate(newTask)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default Elearning;
