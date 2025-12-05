import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { ArrowLeft, AlertTriangle, Calendar, User } from 'lucide-react';

interface BKCall {
    id: string;
    student: { user: { name: string } };
    teacher: { user: { name: string } };
    reason: string;
    date: string;
    status: string;
}

const ParentChildBK: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    const { data: bkCalls, isLoading } = useQuery({
        queryKey: ['bk-calls', studentId],
        queryFn: async () => {
            const res = await api.get(`/bk/calls?student_id=${studentId}`);
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
                    <h1 className="text-2xl font-bold text-slate-900">Catatan BK</h1>
                    <p className="text-slate-600">Riwayat panggilan dan pelanggaran</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Tanggal</TableHeadGlass>
                            <TableHeadGlass>Alasan Panggilan</TableHeadGlass>
                            <TableHeadGlass>Guru BK</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : bkCalls?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Tidak ada catatan BK.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            bkCalls?.map((call: BKCall) => (
                                <TableRowGlass key={call.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar size={14} />
                                            {new Date(call.date).toLocaleDateString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                            <AlertTriangle size={14} className="text-orange-600" />
                                            {call.reason}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <User size={14} />
                                            {call.teacher.user.name}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                                            {call.status || 'Terjadwal'}
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

export default ParentChildBK;
