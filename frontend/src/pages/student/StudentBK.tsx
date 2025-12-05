import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BKCall {
    id: string;
    teacher: { user: { name: string } };
    reason: string;
    date: string;
    status: string;
}

const StudentBK: React.FC = () => {
    const { user } = useAuth();

    // Fetch student profile to get student_id
    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const response = await api.get('/students/');
            return response.data;
        }
    });

    const currentStudent = students?.find((s: any) => s.user.id === user?.id);

    const { data: calls, isLoading } = useQuery({
        queryKey: ['my-bk-calls', currentStudent?.id],
        queryFn: async () => {
            if (!currentStudent?.id) return [];
            const response = await api.get(`/bk/calls?student_id=${currentStudent.id}`);
            return response.data;
        },
        enabled: !!currentStudent?.id
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Bimbingan Konseling</h1>
                <p className="text-slate-600">Riwayat panggilan dan bimbingan</p>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Tanggal</TableHeadGlass>
                            <TableHeadGlass>Guru BK</TableHeadGlass>
                            <TableHeadGlass>Keterangan</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : calls?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Tidak ada riwayat panggilan.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            calls?.map((call: BKCall) => (
                                <TableRowGlass key={call.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-900">
                                            <Clock size={14} className="text-slate-400" />
                                            {new Date(call.date).toLocaleDateString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-900">{call.teacher.user.name}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{call.reason}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${call.status === 'Resolved'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {call.status}
                                        </span>
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

export default StudentBK;
