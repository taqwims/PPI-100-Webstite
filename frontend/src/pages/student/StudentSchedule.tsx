import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { Calendar, Clock, BookOpen, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Schedule {
    id: number;
    class: { name: string };
    subject: { name: string };
    day: string;
    start_time: string;
    end_time: string;
    teacher: { user: { name: string } };
}

const StudentSchedule: React.FC = () => {
    const { user } = useAuth();
    const studentProfile = user?.student;
    const classID = studentProfile?.class_id;

    // Fetch schedules with explicit class_id from student profile
    const { data: schedules, isLoading } = useQuery({
        queryKey: ['student-schedules', classID],
        queryFn: async () => {
            const response = await api.get(`/academic/schedules?class_id=${classID}`);
            return response.data;
        },
        enabled: !!classID  // Only fetch when class_id is available from profile
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNames: { [key: string]: string } = {
        'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
        'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu'
    };

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
                <h1 className="text-2xl font-bold text-slate-900">Jadwal Pelajaran</h1>
                <p className="text-slate-600">Jadwal kelas Anda minggu ini</p>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-slate-600 py-8 text-center">Loading jadwal...</div>
                ) : (
                    <>
                        {days.map(day => {
                            const daySchedules = schedules?.filter((s: Schedule) => s.day === day)
                                .sort((a: Schedule, b: Schedule) => a.start_time.localeCompare(b.start_time));

                            if (!daySchedules || daySchedules.length === 0) return null;

                            return (
                                <CardGlass key={day} className="p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Calendar className="text-purple-600" size={20} />
                                        {dayNames[day]}
                                    </h3>
                                    <TableGlass>
                                        <TableHeaderGlass>
                                            <TableRowGlass>
                                                <TableHeadGlass>Waktu</TableHeadGlass>
                                                <TableHeadGlass>Mata Pelajaran</TableHeadGlass>
                                                <TableHeadGlass>Guru</TableHeadGlass>
                                            </TableRowGlass>
                                        </TableHeaderGlass>
                                        <TableBodyGlass>
                                            {daySchedules.map((schedule: Schedule) => (
                                                <TableRowGlass key={schedule.id}>
                                                    <TableCellGlass>
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <Clock size={14} />
                                                            {schedule.start_time} - {schedule.end_time}
                                                        </div>
                                                    </TableCellGlass>
                                                    <TableCellGlass>
                                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                                            <BookOpen size={14} className="text-indigo-600" />
                                                            {schedule.subject?.name || '-'}
                                                        </div>
                                                    </TableCellGlass>
                                                    <TableCellGlass>
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <User size={14} />
                                                            {schedule.teacher?.user?.name || '-'}
                                                        </div>
                                                    </TableCellGlass>
                                                </TableRowGlass>
                                            ))}
                                        </TableBodyGlass>
                                    </TableGlass>
                                </CardGlass>
                            );
                        })}

                        {!isLoading && (!schedules || schedules?.length === 0) && (
                            <div className="text-center py-12 text-slate-500">
                                Belum ada jadwal yang ditentukan.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentSchedule;
