import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { Clock, AlertCircle } from 'lucide-react';
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

    // Get student ID directly from user profile (loaded via /profile endpoint)
    const studentProfile = user?.student;
    const studentID = studentProfile?.id;

    const { data: calls, isLoading, isError } = useQuery({
        queryKey: ['my-bk-calls', studentID],
        queryFn: async () => {
            const response = await api.get(`/bk/calls?student_id=${studentID}`);
            return response.data;
        },
        enabled: !!studentID  // Only fetch when student ID is available from profile
    });

    // Wait for user profile to load
    if (!user) {
        return <div className="text-slate-600 p-6">Memuat profil...</div>;
    }

    // User is not a student
    if (user && !studentProfile) {
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
                        ) : isError ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-red-500">Gagal memuat data BK.</TableCellGlass>
                            </TableRowGlass>
                        ) : !calls || calls?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Tidak ada riwayat panggilan.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            calls?.map((call: BKCall) => (
                                <TableRowGlass key={call.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-900">
                                            <Clock size={14} className="text-slate-400" />
                                            {call.date ? new Date(call.date).toLocaleDateString() : '-'}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-900">{call.teacher?.user?.name || '-'}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{call.reason || '-'}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${call.status === 'Resolved'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {call.status || 'Pending'}
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
