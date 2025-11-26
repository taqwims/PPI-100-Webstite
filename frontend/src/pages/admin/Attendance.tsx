import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle, XCircle, Calendar, Users, Clock } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass } from '../../components/ui/glass/TableGlass';

interface Student {
    ID: string;
    User: {
        Name: string;
    };
    NISN: string;
}

interface Attendance {
    ID: string;
    StudentID: string;
    Status: string;
    Method: string;
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

    const students = allStudents?.filter((s: any) => s.ClassID === selectedClassID);

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
        const record = attendances?.find((a: Attendance) => a.StudentID === studentID);
        return record ? record.Status : null;
    };

    const tableHeaders = ['Nama Siswa', 'NISN', 'Status', 'Aksi'];
    const tableData = students?.map((student: Student) => {
        const status = getStatus(student.ID);
        return {
            id: student.ID,
            name: student.User.Name,
            nisn: student.NISN,
            status: status ? (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {status === 'Present' ? 'Hadir' : 'Tidak Hadir'}
                </span>
            ) : (
                <span className="text-gray-400 text-sm italic">Belum absen</span>
            ),
            actions: (
                <div className="flex justify-end gap-2">
                    <ButtonGlass
                        variant={status === 'Present' ? 'primary' : 'secondary'}
                        onClick={() => handleAttendance(student.ID, 'Present')}
                        className={`py-1 px-3 text-xs ${status === 'Present' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        disabled={status === 'Present'}
                    >
                        <CheckCircle size={16} /> Hadir
                    </ButtonGlass>
                    <ButtonGlass
                        variant={status === 'Absent' ? 'danger' : 'secondary'}
                        onClick={() => handleAttendance(student.ID, 'Absent')}
                        className="py-1 px-3 text-xs"
                        disabled={status === 'Absent'}
                    >
                        <XCircle size={16} /> Absen
                    </ButtonGlass>
                </div>
            )
        };
    }) || [];

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Absensi Siswa</h1>
                    <p className="text-gray-400">Catat kehadiran siswa per jadwal pelajaran</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <Users size={16} /> Pilih Kelas
                            </div>
                        </label>
                        <select
                            value={selectedClassID || ''}
                            onChange={(e) => setSelectedClassID(Number(e.target.value))}
                            className="w-full glass-input text-gray-900"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes?.map((c: any) => (
                                <option key={c.ID} value={c.ID}>{c.Name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <Clock size={16} /> Pilih Jadwal
                            </div>
                        </label>
                        <select
                            value={selectedScheduleID || ''}
                            onChange={(e) => setSelectedScheduleID(Number(e.target.value))}
                            className="w-full glass-input text-gray-900"
                            disabled={!selectedClassID}
                        >
                            <option value="">-- Pilih Jadwal --</option>
                            {schedules?.map((s: any) => (
                                <option key={s.ID} value={s.ID}>{s.Day} - {s.Subject.Name} ({s.StartTime})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardGlass>

            {selectedScheduleID ? (
                <CardGlass>
                    <div className="p-6">
                        {isLoadingAttendance ? (
                            <div className="text-center py-8 text-gray-400">Loading data...</div>
                        ) : (
                            <TableGlass headers={tableHeaders} data={tableData} />
                        )}
                    </div>
                </CardGlass>
            ) : (
                <div className="text-center py-12 text-gray-500 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Silakan pilih kelas dan jadwal terlebih dahulu untuk menampilkan daftar siswa.</p>
                </div>
            )}
        </div>
    );
};

export default Attendance;
