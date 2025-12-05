import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { ArrowLeft, BookOpen, Calendar, CheckCircle, Clock } from 'lucide-react';

interface Submission {
    id: string;
    task: {
        title: string;
        subject: { name: string };
        deadline: string;
    };
    grade: number;
    created_at: string;
}

const ParentChildGrades: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    const { data: submissions, isLoading } = useQuery({
        queryKey: ['grades', studentId],
        queryFn: async () => {
            const res = await api.get(`/elearning/submissions?student_id=${studentId}`);
            return res.data;
        },
        enabled: !!studentId
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <ButtonGlass onClick={() => navigate(-1)} className="p-2">
                    <ArrowLeft size={20} />
                </ButtonGlass>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nilai Akademik</h1>
                    <p className="text-slate-600">Daftar nilai tugas dan ujian</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Mata Pelajaran</TableHeadGlass>
                            <TableHeadGlass>Tugas</TableHeadGlass>
                            <TableHeadGlass>Tanggal Kumpul</TableHeadGlass>
                            <TableHeadGlass>Nilai</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : submissions?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8 text-slate-600">Belum ada data nilai.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            submissions?.map((sub: Submission) => (
                                <TableRowGlass key={sub.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                            <BookOpen size={14} className="text-indigo-600" />
                                            {sub.task.subject.name}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{sub.task.title}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar size={14} />
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {sub.grade > 0 ? (
                                            <span className="text-green-600 font-bold text-lg">{sub.grade}</span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {sub.grade > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">
                                                <CheckCircle size={12} /> Dinilai
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-600 text-xs font-medium">
                                                <Clock size={12} /> Menunggu
                                            </span>
                                        )}
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>
        </div>
    );
};

export default ParentChildGrades;
