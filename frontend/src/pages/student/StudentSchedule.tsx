import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { Calendar, Clock, BookOpen, User } from 'lucide-react';
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

    // Fetch Student Profile to get Class ID
    // Assuming GET /students/me or similar exists, or we filter from all students.
    // Let's try to fetch all students and find "me" by user ID.
    const { data: schedules, isLoading } = useQuery({
        queryKey: ['schedules'],
        queryFn: async () => {
            const response = await api.get(`/academic/schedules`);
            return response.data;
        },
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNames: { [key: string]: string } = {
        'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
        'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu'
    };

    if (!user?.student && !isLoading) {
        return <div className="text-white p-6">Data siswa tidak ditemukan. Hubungi admin.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Jadwal Pelajaran</h1>
                <p className="text-gray-400">Jadwal kelas Anda minggu ini</p>
            </div>

            <div className="grid gap-6">
                {days.map(day => {
                    const daySchedules = schedules?.filter((s: Schedule) => s.day === day)
                        .sort((a: Schedule, b: Schedule) => a.start_time.localeCompare(b.start_time));

                    if (!daySchedules || daySchedules.length === 0) return null;

                    return (
                        <CardGlass key={day} className="p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Calendar className="text-purple-400" size={20} />
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
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Clock size={14} />
                                                    {schedule.start_time} - {schedule.end_time}
                                                </div>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <div className="flex items-center gap-2 font-medium text-white">
                                                    <BookOpen size={14} className="text-indigo-400" />
                                                    {schedule.subject.name}
                                                </div>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <div className="flex items-center gap-2 text-gray-300">
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

                {!isLoading && schedules?.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Belum ada jadwal yang ditentukan.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSchedule;
