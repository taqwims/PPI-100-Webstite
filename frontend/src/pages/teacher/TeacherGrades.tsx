import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { Calendar, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface Task {
    id: number;
    title: string;
    deadline: string;
    class: { id: number; name: string };
    class_id: number;
    subject: { name: string };
    teacher_id: string;
}

interface Submission {
    id: string;
    student: { user: { name: string }, nisn: string };
    file_url: string;
    grade: number;
    created_at: string;
}

const TeacherGrades: React.FC = () => {
    const { user } = useAuth();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [gradeInput, setGradeInput] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // Fetch teacher record for current user
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const response = await api.get('/teachers/');
            return response.data;
        }
    });
    const currentTeacher = teachers?.find((t: any) => t.user?.id === user?.id);

    // Fetch schedules to figure out which classes this teacher teaches
    const { data: schedules } = useQuery({
        queryKey: ['teacher_schedules', currentTeacher?.id],
        queryFn: async () => {
            if (!currentTeacher?.id) return [];
            const response = await api.get(`/academic/schedules?teacher_id=${currentTeacher.id}`);
            return response.data;
        },
        enabled: !!currentTeacher?.id
    });

    // Extract unique classes from teacher's schedules
    const teacherClasses = useMemo(() => {
        if (!schedules) return [];
        const classMap = new Map<number, string>();
        schedules.forEach((s: any) => {
            if (s.class?.id && s.class?.name) {
                classMap.set(s.class.id, s.class.name);
            }
        });
        return Array.from(classMap, ([id, name]) => ({ id, name }));
    }, [schedules]);

    // Auto-select first class if none selected
    React.useEffect(() => {
        if (teacherClasses.length > 0 && selectedClassId === null) {
            setSelectedClassId(teacherClasses[0].id);
        }
    }, [teacherClasses, selectedClassId]);

    // Fetch Tasks for the selected class
    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', selectedClassId],
        queryFn: async () => {
            if (!selectedClassId) return [];
            const response = await api.get(`/elearning/tasks?class_id=${selectedClassId}`);
            return response.data;
        },
        enabled: !!selectedClassId
    });

    // Filter tasks by current teacher
    const myTasks = tasks?.filter((t: any) => t.teacher_id === currentTeacher?.id);

    // Fetch Submissions for selected task
    const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
        queryKey: ['submissions', selectedTask?.id],
        queryFn: async () => {
            if (!selectedTask) return [];
            const response = await api.get(`/elearning/tasks/${selectedTask.id}/submissions`);
            return response.data;
        },
        enabled: !!selectedTask
    });

    const gradeMutation = useMutation({
        mutationFn: ({ id, grade }: { id: string, grade: number }) =>
            api.put(`/elearning/submissions/${id}/grade`, { grade }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions', selectedTask?.id] });
            setGradingSubmission(null);
            setGradeInput('');
            toast.success('Nilai berhasil disimpan');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Gagal menyimpan nilai');
        }
    });

    const handleGrade = () => {
        if (gradingSubmission && gradeInput) {
            gradeMutation.mutate({ id: gradingSubmission.id, grade: parseFloat(gradeInput) });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Penilaian Tugas</h1>
                    <p className="text-slate-600">Kelola nilai tugas siswa</p>
                </div>
                {/* Class Selector */}
                {teacherClasses.length > 0 && (
                    <select
                        value={selectedClassId || ''}
                        onChange={(e) => {
                            setSelectedClassId(Number(e.target.value));
                            setSelectedTask(null);
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-700"
                    >
                        {teacherClasses.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Task List */}
                <div className="md:col-span-1 space-y-4">
                    <CardGlass className="p-4">
                        <h3 className="font-bold text-slate-900 mb-4">Daftar Tugas</h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {isLoadingTasks ? (
                                <p className="text-slate-600 text-sm">Loading...</p>
                            ) : myTasks?.length === 0 ? (
                                <p className="text-slate-500 text-sm">Belum ada tugas untuk kelas ini.</p>
                            ) : (
                                myTasks?.map((task: Task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className={`p-3 rounded-xl cursor-pointer transition-colors ${selectedTask?.id === task.id
                                            ? 'bg-purple-100 border border-purple-200'
                                            : 'bg-white hover:bg-slate-50 border border-transparent'
                                            }`}
                                    >
                                        <h4 className="font-medium text-slate-900">{task.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <Calendar size={12} />
                                            {new Date(task.deadline).toLocaleDateString('id-ID')}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">{task.subject?.name}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardGlass>
                </div>

                {/* Submissions List */}
                <div className="md:col-span-2">
                    {selectedTask ? (
                        <CardGlass className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{selectedTask.title}</h3>
                                    <p className="text-slate-600 text-sm mt-1">Pengumpulan tugas</p>
                                </div>
                            </div>

                            <TableGlass>
                                <TableHeaderGlass>
                                    <TableRowGlass>
                                        <TableHeadGlass>Siswa</TableHeadGlass>
                                        <TableHeadGlass>File</TableHeadGlass>
                                        <TableHeadGlass>Nilai</TableHeadGlass>
                                        <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                                    </TableRowGlass>
                                </TableHeaderGlass>
                                <TableBodyGlass>
                                    {isLoadingSubmissions ? (
                                        <TableRowGlass>
                                            <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                                        </TableRowGlass>
                                    ) : submissions?.length === 0 ? (
                                        <TableRowGlass>
                                            <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Belum ada pengumpulan.</TableCellGlass>
                                        </TableRowGlass>
                                    ) : (
                                        submissions?.map((sub: Submission) => (
                                            <TableRowGlass key={sub.id}>
                                                <TableCellGlass>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-600">
                                                            <User size={14} />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-900">{sub.student?.user?.name}</div>
                                                            <div className="text-xs text-slate-500">{sub.student?.nisn}</div>
                                                        </div>
                                                    </div>
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    {sub.file_url ? (
                                                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                                            Lihat File
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">-</span>
                                                    )}
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    {sub.grade > 0 ? (
                                                        <span className="text-green-600 font-bold">{sub.grade}</span>
                                                    ) : (
                                                        <span className="text-slate-500">-</span>
                                                    )}
                                                </TableCellGlass>
                                                <TableCellGlass className="text-right">
                                                    <ButtonGlass
                                                        className="py-1 px-3 text-xs"
                                                        onClick={() => {
                                                            setGradingSubmission(sub);
                                                            setGradeInput(sub.grade > 0 ? sub.grade.toString() : '');
                                                        }}
                                                    >
                                                        Nilai
                                                    </ButtonGlass>
                                                </TableCellGlass>
                                            </TableRowGlass>
                                        ))
                                    )}
                                </TableBodyGlass>
                            </TableGlass>
                        </CardGlass>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 bg-white/30 rounded-2xl border border-slate-200/50 p-12">
                            Pilih tugas untuk melihat pengumpulan.
                        </div>
                    )}
                </div>
            </div>

            {/* Grading Modal */}
            <ModalGlass
                isOpen={!!gradingSubmission}
                onClose={() => setGradingSubmission(null)}
                title="Input Nilai"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Input nilai untuk <span className="font-bold text-slate-900">{gradingSubmission?.student?.user?.name}</span>
                    </p>
                    <InputGlass
                        type="number"
                        placeholder="0-100"
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        max={100}
                        min={0}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setGradingSubmission(null)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={handleGrade}>Simpan Nilai</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default TeacherGrades;
