import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { BookOpen, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

const StudentGrades: React.FC = () => {
    const { user } = useAuth();

    // Fetch Student Profile to get ID (or use user ID if backend supports it)
    // We need student ID for GetStudentSubmissions
    const { data: submissions, isLoading } = useQuery({
        queryKey: ['my-submissions'],
        queryFn: async () => {
            const response = await api.get(`/elearning/submissions`);
            return response.data;
        },
    });

    if (!user?.student && !isLoading) {
        return <div className="text-white p-6">Data siswa tidak ditemukan. Hubungi admin.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Nilai Tugas</h1>
                <p className="text-gray-400">Daftar nilai dari tugas yang telah dikumpulkan</p>
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
                                <TableCellGlass colSpan={5} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : submissions?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Belum ada tugas yang dikumpulkan.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            submissions?.map((sub: Submission) => (
                                <TableRowGlass key={sub.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 font-medium text-white">
                                            <BookOpen size={14} className="text-indigo-400" />
                                            {sub.task.subject.name}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-gray-300">{sub.task.title}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar size={14} />
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {sub.grade > 0 ? (
                                            <span className="text-green-400 font-bold text-lg">{sub.grade}</span>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {sub.grade > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                                                <CheckCircle size={12} /> Dinilai
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
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

export default StudentGrades;
