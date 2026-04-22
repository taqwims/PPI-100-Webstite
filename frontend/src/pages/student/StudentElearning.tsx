import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { BookOpen, FileText, Download, Upload, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Material {
    id: number;
    title: string;
    description: string;
    file_url: string;
    subject: { name: string };
    created_at: string;
}

interface Task {
    id: number;
    title: string;
    description: string;
    deadline: string;
    subject: { name: string };
}

const StudentElearning: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'materials' | 'tasks'>('materials');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [submissionFile, setSubmissionFile] = useState('');

    // Get student data directly from user profile (loaded via /profile endpoint)
    const studentProfile = user?.student;
    const classID = studentProfile?.class_id;
    const studentID = studentProfile?.id;

    // Fetch Materials — uses class_id from profile
    const { data: materials, isLoading: isLoadingMaterials } = useQuery({
        queryKey: ['materials', classID],
        queryFn: async () => {
            const response = await api.get(`/elearning/materials?class_id=${classID}`);
            return response.data;
        },
        enabled: !!classID
    });

    // Fetch Tasks — uses class_id from profile
    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', classID],
        queryFn: async () => {
            const response = await api.get(`/elearning/tasks?class_id=${classID}`);
            return response.data;
        },
        enabled: !!classID
    });

    // Submit Task Mutation
    const submitTaskMutation = useMutation({
        mutationFn: (data: { task_id: number, file_url: string }) => api.post('/elearning/submissions', {
            ...data,
            student_id: studentID
        }),
        onSuccess: () => {
            alert('Tugas berhasil dikumpulkan!');
            setSelectedTask(null);
            setSubmissionFile('');
        },
        onError: (error: any) => {
            alert('Gagal mengumpulkan tugas: ' + (error.response?.data?.error || error.message));
        }
    });

    const handleSubmit = () => {
        if (selectedTask && submissionFile) {
            submitTaskMutation.mutate({ task_id: selectedTask.id, file_url: submissionFile });
        }
    };

    // Show message if user profile doesn't have student data yet
    if (!studentProfile) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle size={48} className="text-yellow-500 mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Data Siswa Tidak Ditemukan</h2>
                <p className="text-slate-600">Pastikan akun Anda sudah terdaftar sebagai siswa. Hubungi admin jika masalah berlanjut.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">E-Learning</h1>
                <p className="text-slate-600">Materi pelajaran dan tugas kelas Anda</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-200 pb-1">
                <button
                    onClick={() => setActiveTab('materials')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'materials' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Materi Pelajaran
                    {activeTab === 'materials' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'tasks' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Tugas & PR
                    {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />}
                </button>
            </div>

            {/* Content */}
            {activeTab === 'materials' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoadingMaterials ? (
                        <p className="text-slate-600">Loading materi...</p>
                    ) : materials?.length === 0 ? (
                        <p className="text-slate-600">Belum ada materi.</p>
                    ) : (
                        materials?.map((material: Material) => (
                            <CardGlass key={material.id} className="p-6 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                        <BookOpen size={24} />
                                    </div>
                                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                        {material.subject?.name || 'Umum'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{material.title}</h3>
                                <p className="text-slate-600 text-sm mb-6 flex-1 line-clamp-3">{material.description}</p>
                                <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="mt-auto">
                                    <ButtonGlass variant="secondary" className="w-full flex items-center justify-center gap-2">
                                        <Download size={16} /> Download Materi
                                    </ButtonGlass>
                                </a>
                            </CardGlass>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {isLoadingTasks ? (
                        <p className="text-slate-600">Loading tugas...</p>
                    ) : tasks?.length === 0 ? (
                        <p className="text-slate-600">Belum ada tugas.</p>
                    ) : (
                        tasks?.map((task: Task) => (
                            <CardGlass key={task.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-purple-100 rounded-xl text-purple-600 mt-1">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                {task.subject?.name || 'Umum'}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm mb-2">{task.description}</p>
                                        <div className="flex items-center gap-2 text-sm text-red-600">
                                            <Clock size={14} />
                                            Deadline: {new Date(task.deadline).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <ButtonGlass onClick={() => setSelectedTask(task)} className="flex items-center gap-2 whitespace-nowrap">
                                    <Upload size={16} /> Kumpulkan Tugas
                                </ButtonGlass>
                            </CardGlass>
                        ))
                    )}
                </div>
            )}

            {/* Submission Modal */}
            <ModalGlass
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                title="Kumpulkan Tugas"
            >
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl mb-4">
                        <h4 className="font-bold text-slate-900">{selectedTask?.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{selectedTask?.description}</p>
                    </div>

                    <InputGlass
                        label="Link File Tugas (Google Drive / Dropbox)"
                        placeholder="https://..."
                        value={submissionFile}
                        onChange={(e) => setSubmissionFile(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setSelectedTask(null)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={handleSubmit} disabled={submitTaskMutation.isPending}>
                            {submitTaskMutation.isPending ? 'Mengirim...' : 'Kirim Tugas'}
                        </ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default StudentElearning;
