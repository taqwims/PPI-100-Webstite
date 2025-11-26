import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { Calendar, Clock, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Schedule {
    ID: number;
    Class: { Name: string };
    Subject: { Name: string };
    Day: string;
    StartTime: string;
    EndTime: string;
}

const TeacherSchedule: React.FC = () => {
    const { user } = useAuth();

    // In a real app, we would get the teacher ID from the user context or a separate API call
    // For now, we'll assume the user ID is linked to a teacher record and the backend handles the mapping
    // or we pass the user ID if the backend expects it.
    // Based on our backend implementation, we need to pass teacher_id. 
    // However, the current auth context might only have user ID. 
    // We might need to fetch the teacher profile first or assume the backend can filter by the authenticated user's teacher record.
    // Let's check if we can get the teacher ID. 
    // For this implementation, let's assume we can fetch all schedules and filter client-side or 
    // better, let's fetch the teacher profile first.

    // Actually, let's try to fetch schedules with the user's teacher ID.
    // Since we don't have the teacher ID in the auth context easily available without fetching profile,
    // let's fetch the profile first or just fetch all schedules and filter (not ideal for security/perf but works for MVP).
    // BETTER: The backend `GetAllSchedules` takes a `teacher_id`. 
    // Let's assume for now we are testing with a specific teacher or we need to fetch the teacher ID.

    // Let's fetch the current user's teacher profile to get the ID.
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const response = await api.get('/teachers/');
            // This returns ALL teachers. Not efficient to find "me".
            // Alternative: GET /profile should return teacher info if user is a teacher.
            // Let's check GET /profile response in a separate step if needed.
            // For now, let's hardcode a known teacher ID for testing or try to find it.
            return response.data;
        }
    });

    // Strategy: We will fetch all schedules and filter by the current user's name or ID if possible.
    // OR, since we implemented `teacher_id` filter in backend, we need that ID.
    // Let's try to get the teacher ID from the `profile` endpoint if it returns it.
    // If not, we might need to update `GetProfile` to return teacher details.

    // For this iteration, let's assume we can pass the user's ID and the backend handles it? 
    // No, backend expects `teacher_id` (UUID of teacher table), not `user_id`.

    // Workaround: We will fetch all teachers, find the one matching current user's email/ID, then use that ID.
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const response = await api.get('/teachers/');
            return response.data;
        }
    });

    const currentTeacher = teachers?.find((t: any) => t.User.ID === user?.id);

    const { data: schedules, isLoading } = useQuery({
        queryKey: ['schedules', currentTeacher?.ID],
        queryFn: async () => {
            if (!currentTeacher?.ID) return [];
            const response = await api.get(`/academic/schedules?teacher_id=${currentTeacher.ID}`);
            return response.data;
        },
        enabled: !!currentTeacher?.ID
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNames: { [key: string]: string } = {
        'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
        'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu'
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Jadwal Mengajar</h1>
                <p className="text-gray-400">Jadwal pelajaran Anda minggu ini</p>
            </div>

            <div className="grid gap-6">
                {days.map(day => {
                    const daySchedules = schedules?.filter((s: Schedule) => s.Day === day)
                        .sort((a: Schedule, b: Schedule) => a.StartTime.localeCompare(b.StartTime));

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
                                        <TableHeadGlass>Kelas</TableHeadGlass>
                                    </TableRowGlass>
                                </TableHeaderGlass>
                                <TableBodyGlass>
                                    {daySchedules.map((schedule: Schedule) => (
                                        <TableRowGlass key={schedule.ID}>
                                            <TableCellGlass>
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Clock size={14} />
                                                    {schedule.StartTime} - {schedule.EndTime}
                                                </div>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <div className="flex items-center gap-2 font-medium text-white">
                                                    <BookOpen size={14} className="text-indigo-400" />
                                                    {schedule.Subject.Name}
                                                </div>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Users size={14} />
                                                    {schedule.Class.Name}
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

export default TeacherSchedule;
