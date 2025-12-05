import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { Calendar, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Task {
    id: number;
    title: string;
    deadline: string;
    class: { name: string };
    subject: { name: string };
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
    const queryClient = useQueryClient();

    // Fetch Teachers to get current teacher ID (same strategy as Schedule)
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const response = await api.get('/teachers/');
            return response.data;
        }
    });
    const currentTeacher = teachers?.find((t: any) => t.user.id === user?.id);

    // Fetch Tasks created by this teacher
    // Note: Backend GetTasks currently filters by ClassID. 
    // We might need to fetch all tasks for a class and filter by teacher on client, 
    // or update backend to filter by teacher. 
    // For now, let's assume we select a class first? 
    // Or simpler: Fetch tasks for a default class (e.g. 1) for MVP, or iterate all classes.
    // Let's stick to Class ID 1 for now as per previous implementation, but ideally we should let teacher select class.
    const [selectedClassId] = useState(1);

    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', selectedClassId],
        queryFn: async () => {
            const response = await api.get(`/elearning/tasks?class_id=${selectedClassId}`);
            return response.data;
        }
    });

    // Filter tasks by current teacher
    const myTasks = tasks?.filter((t: any) => t.teacher_id === currentTeacher?.id);

    // Fetch Submissions for selected task
    // We need a new endpoint for this: GET /elearning/tasks/:id/submissions
    // Wait, we didn't add this endpoint in the plan!
    // We added `UpdateSubmissionGrade` but not `GetSubmissions`.
    // Let's check `elearning_handler.go`. 
    // Ah, we missed adding a handler to GET submissions for a task.
    // We need to add that. 

    // HOLD ON: I need to add GET /elearning/tasks/:id/submissions to backend first.
    // I will add a placeholder/comment here and then go fix the backend.

    // Assuming the endpoint exists for now to structure the code:
    const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
        queryKey: ['submissions', selectedTask?.id],
        queryFn: async () => {
            if (!selectedTask) return [];
            // We need to implement this endpoint
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
        }
    });

    const handleGrade = () => {
        if (gradingSubmission && gradeInput) {
            gradeMutation.mutate({ id: gradingSubmission.id, grade: parseFloat(gradeInput) });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Penilaian Tugas</h1>
                <p className="text-slate-600">Kelola nilai tugas siswa</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Task List */}
                <div className="md:col-span-1 space-y-4">
                    <CardGlass className="p-4">
                        <h3 className="font-bold text-slate-900 mb-4">Daftar Tugas</h3>
                        <div className="space-y-2">
                            {isLoadingTasks ? (
                                <p className="text-slate-600 text-sm">Loading...</p>
                            ) : myTasks?.length === 0 ? (
                                <p className="text-slate-600 text-sm">Belum ada tugas.</p>
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
                                            {new Date(task.deadline).toLocaleDateString()}
                                        </div>
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
                                    <p className="text-slate-600 text-sm mt-1">Submissions</p>
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
                                                            <div className="font-medium text-slate-900">{sub.student.user.name}</div>
                                                            <div className="text-xs text-slate-500">{sub.student.nisn}</div>
                                                        </div>
                                                    </div>
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                                        Lihat File
                                                    </a>
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
                                                            setGradeInput(sub.grade.toString());
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
                        <div className="h-full flex items-center justify-center text-slate-500">
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
                        Input nilai untuk <span className="font-bold text-slate-900">{gradingSubmission?.student.user.name}</span>
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
