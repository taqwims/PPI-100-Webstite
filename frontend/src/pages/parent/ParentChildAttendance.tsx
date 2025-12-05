import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { ArrowLeft, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Attendance {
    id: string;
    schedule: {
        subject: { name: string };
        day: string;
        start_time: string;
        end_time: string;
    };
    status: string;
    timestamp: string;
}

const ParentChildAttendance: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    // Fetch Student Details (Optional, for name)


    const { data: attendances, isLoading } = useQuery({
        queryKey: ['attendance', studentId],
        queryFn: async () => {
            const res = await api.get(`/students/attendance?student_id=${studentId}`);
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
                    <h1 className="text-2xl font-bold text-white">Riwayat Absensi</h1>
                    <p className="text-gray-400">Data kehadiran siswa</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Tanggal</TableHeadGlass>
                            <TableHeadGlass>Mata Pelajaran</TableHeadGlass>
                            <TableHeadGlass>Waktu</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : attendances?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Belum ada data absensi.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            attendances?.map((att: Attendance) => (
                                <TableRowGlass key={att.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Calendar size={14} />
                                            {new Date(att.timestamp).toLocaleDateString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="font-medium text-white">{att.schedule.subject.name}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Clock size={14} />
                                            {att.schedule.start_time} - {att.schedule.end_time}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {att.status === 'Present' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                                                <CheckCircle size={12} /> Hadir
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                                                <XCircle size={12} /> Tidak Hadir
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

export default ParentChildAttendance;
