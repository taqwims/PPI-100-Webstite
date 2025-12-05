import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle, XCircle, ArrowLeft, Users, Clock, Calendar } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';

interface Student {
    id: string;
    user: {
        name: string;
    };
    nisn: string;
}

interface Attendance {
    id: string;
    student_id: string;
    status: string;
    method: string;
}

const TeacherAttendance: React.FC = () => {
    const { scheduleId } = useParams<{ scheduleId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch Schedule Details (to get class info)
    // Ideally we should have an endpoint for single schedule, but filtering from list is okay for now if list is cached
    // Or we can fetch all schedules and find one. 
    // Let's assume we can fetch the schedule details or class students directly.
    // Actually, we need to know which class this schedule belongs to, to fetch students.
    // Let's rely on the fact that we can fetch attendance for a schedule, and maybe we can get class ID from there?
    // No, attendance endpoint returns attendance records.
    // We need to fetch the schedule to get the class_id.
    // Let's assume we have an endpoint GET /academic/schedules/:id or we filter.
    // Since we don't have GET /academic/schedules/:id, we'll fetch all and filter.
    const { data: schedules } = useQuery({
        queryKey: ['all_schedules'], // Broad key, might be inefficient but works
        queryFn: async () => {
            const res = await api.get('/academic/schedules');
            return res.data;
        }
    });

    const schedule = schedules?.find((s: any) => s.id === Number(scheduleId));

    // Fetch Students for the class
    const { data: allStudents } = useQuery({
        queryKey: ['students_by_unit'], // We need to filter by class
        queryFn: async () => {
            // We don't know the unit ID easily, but we can try to fetch all students and filter by class_id
            // Or better, GET /students/?class_id=... if supported.
            // Our backend supports unit_id filter. It doesn't explicitly say class_id filter in handler.
            // Let's check student_handler.go. 
            // It seems GetAllStudents takes unit_id.
            // We will fetch all students for the unit (assuming unit 1 for now or from schedule if available) and filter.
            // Wait, schedule has class, class has unit_id.
            if (!schedule) return [];
            const res = await api.get(`/students/?unit_id=${schedule.class.unit_id}`);
            return res.data;
        },
        enabled: !!schedule
    });

    const students = allStudents?.filter((s: any) => s.class_id === schedule?.class_id);

    // Fetch Existing Attendance
    const { data: attendances } = useQuery({
        queryKey: ['attendance', scheduleId],
        queryFn: async () => {
            const res = await api.get(`/students/attendance/${scheduleId}`);
            return res.data;
        },
        enabled: !!scheduleId
    });

    const recordAttendanceMutation = useMutation({
        mutationFn: (data: { student_id: string, status: string }) => api.post('/students/attendance', {
            ...data,
            schedule_id: Number(scheduleId),
            method: 'Manual'
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', scheduleId] }),
    });

    const handleAttendance = (studentID: string, status: string) => {
        recordAttendanceMutation.mutate({ student_id: studentID, status });
    };

    const getStatus = (studentID: string) => {
        const record = attendances?.find((a: Attendance) => a.student_id === studentID);
        return record ? record.status : null;
    };

    if (!schedule) return <div className="p-6 text-white">Loading schedule...</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <ButtonGlass onClick={() => navigate(-1)} className="p-2">
                    <ArrowLeft size={20} />
                </ButtonGlass>
                <div>
                    <h1 className="text-2xl font-bold text-white">Absensi: {schedule.subject.name}</h1>
                    <div className="flex items-center gap-4 text-gray-400 text-sm mt-1">
                        <span className="flex items-center gap-1"><Users size={14} /> {schedule.class.name}</span>
                        <span className="flex items-center gap-1"><Calendar size={14} /> {schedule.day}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {schedule.start_time} - {schedule.end_time}</span>
                    </div>
                </div>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama Siswa</TableHeadGlass>
                            <TableHeadGlass>NISN</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {students?.map((student: Student) => {
                            const status = getStatus(student.id);
                            return (
                                <TableRowGlass key={student.id}>
                                    <TableCellGlass>
                                        <span className="font-medium text-white">{student.user.name}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="font-mono text-gray-300">{student.nisn}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {status ? (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {status === 'Present' ? 'Hadir' : 'Tidak Hadir'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm italic">Belum absen</span>
                                        )}
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ButtonGlass
                                                variant={status === 'Present' ? 'primary' : 'secondary'}
                                                onClick={() => handleAttendance(student.id, 'Present')}
                                                className={`py-1 px-3 text-xs ${status === 'Present' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                                disabled={status === 'Present'}
                                            >
                                                <CheckCircle size={16} /> Hadir
                                            </ButtonGlass>
                                            <ButtonGlass
                                                variant={status === 'Absent' ? 'danger' : 'secondary'}
                                                onClick={() => handleAttendance(student.id, 'Absent')}
                                                className="py-1 px-3 text-xs"
                                                disabled={status === 'Absent'}
                                            >
                                                <XCircle size={16} /> Absen
                                            </ButtonGlass>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            );
                        })}
                        {students?.length === 0 && (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Tidak ada siswa di kelas ini</TableCellGlass>
                            </TableRowGlass>
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>
        </div>
    );
};

export default TeacherAttendance;
