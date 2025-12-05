import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle, XCircle, Calendar, Users, Clock } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';

interface Student {
    id: string;
    user: {
        name: string;
    };
    nisn: string;
    class_id: number;
}

interface Attendance {
    id: string;
    student_id: string;
    status: string;
    method: string;
}

const Attendance: React.FC = () => {
    const [selectedClassID, setSelectedClassID] = useState<number | null>(null);
    const [selectedScheduleID, setSelectedScheduleID] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // Fetch Classes (Assuming Unit 1 for simplicity, should be dynamic)
    const { data: classes } = useQuery({
        queryKey: ['classes', 1],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=1`);
            return res.data;
        },
    });

    // Fetch Schedules for selected class
    const { data: schedules } = useQuery({
        queryKey: ['schedules', selectedClassID],
        queryFn: async () => {
            if (!selectedClassID) return [];
            const res = await api.get(`/academic/schedules?class_id=${selectedClassID}`);
            return res.data;
        },
        enabled: !!selectedClassID,
    });

    // Fetch Students for selected class
    const { data: allStudents } = useQuery({
        queryKey: ['students', 1],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=1`);
            return res.data;
        },
    });

    const students = allStudents?.filter((s: Student) => s.class_id === selectedClassID);

    // Fetch Attendance for selected schedule
    const { data: attendances, isLoading: isLoadingAttendance } = useQuery({
        queryKey: ['attendance', selectedScheduleID],
        queryFn: async () => {
            if (!selectedScheduleID) return [];
            const res = await api.get(`/students/attendance/${selectedScheduleID}`);
            return res.data;
        },
        enabled: !!selectedScheduleID,
    });

    const recordAttendanceMutation = useMutation({
        mutationFn: (data: { student_id: string, status: string }) => api.post('/students/attendance', {
            ...data,
            schedule_id: selectedScheduleID,
            method: 'Manual'
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', selectedScheduleID] }),
    });

    const handleAttendance = (studentID: string, status: string) => {
        if (!selectedScheduleID) return;
        recordAttendanceMutation.mutate({ student_id: studentID, status });
    };

    const getStatus = (studentID: string) => {
        const record = attendances?.find((a: Attendance) => a.student_id === studentID);
        return record ? record.status : null;
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate">Absensi Siswa</h1>
                    <p className="text-slate-300-400">Catat kehadiran siswa per jadwal pelajaran</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate/80 mb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <Users size={16} /> Pilih Kelas
                            </div>
                        </label>
                        <select
                            value={selectedClassID || ''}
                            onChange={(e) => {
                                setSelectedClassID(Number(e.target.value));
                                setSelectedScheduleID(null); // Reset schedule when class changes
                            }}
                            className="w-full glass-input text-slate-300-900"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate/80 mb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <Clock size={16} /> Pilih Jadwal
                            </div>
                        </label>
                        <select
                            value={selectedScheduleID || ''}
                            onChange={(e) => setSelectedScheduleID(Number(e.target.value))}
                            className="w-full glass-input text-slate-300-900"
                            disabled={!selectedClassID}
                        >
                            <option value="">-- Pilih Jadwal --</option>
                            {schedules?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.day} - {s.subject.name} ({s.start_time})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardGlass>

            {selectedScheduleID ? (
                <CardGlass>
                    <div className="p-6">
                        {isLoadingAttendance ? (
                            <div className="text-center py-8 text-slate-300-400">Loading data...</div>
                        ) : (
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
                                                    <span className="font-medium text-slate">{student.user.name}</span>
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    <span className="font-mono text-slate-300-300">{student.nisn}</span>
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    {status ? (
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {status === 'Present' ? 'Hadir' : 'Tidak Hadir'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300-400 text-sm italic">Belum absen</span>
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
                        )}
                    </div>
                </CardGlass>
            ) : (
                <div className="text-center py-12 text-slate-300-500 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Silakan pilih kelas dan jadwal terlebih dahulu untuk menampilkan daftar siswa.</p>
                </div>
            )}
        </div>
    );
};

export default Attendance;
