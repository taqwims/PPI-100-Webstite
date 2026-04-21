import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Calendar, Users, Clock, AlertCircle, Coffee } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { useAuth } from '../../context/AuthContext';

interface Student {
    id: string;
    user: {
        name: string;
    };
    nisn: string;
    class_id: number;
}

interface AttendanceRecord {
    id: string;
    student_id: string;
    status: string;
    method: string;
}

const ATTENDANCE_STATUSES = [
    { value: 'Present', label: 'Hadir', icon: CheckCircle, color: 'green' },
    { value: 'Absent', label: 'Absen', icon: XCircle, color: 'red' },
    { value: 'Late', label: 'Terlambat', icon: Clock, color: 'yellow' },
    { value: 'Permission', label: 'Izin', icon: AlertCircle, color: 'blue' },
    { value: 'Sick', label: 'Sakit', icon: Coffee, color: 'purple' },
];

const statusStyles: Record<string, string> = {
    Present: 'bg-green-100 text-green-700',
    Absent: 'bg-red-100 text-red-700',
    Late: 'bg-yellow-100 text-yellow-700',
    Permission: 'bg-blue-100 text-blue-700',
    Sick: 'bg-purple-100 text-purple-700',
};

const statusLabels: Record<string, string> = {
    Present: 'Hadir',
    Absent: 'Absen',
    Late: 'Terlambat',
    Permission: 'Izin',
    Sick: 'Sakit',
};

const AttendancePage: React.FC = () => {
    const { user } = useAuth();
    const unitID = user?.unit_id || 1;
    const [selectedClassID, setSelectedClassID] = useState<number | null>(null);
    const [selectedScheduleID, setSelectedScheduleID] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // Fetch Classes dynamically based on user's unit
    const { data: classes } = useQuery({
        queryKey: ['classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
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

    // Fetch Students for the user's unit
    const { data: allStudents } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', selectedScheduleID] });
            toast.success('Absensi berhasil dicatat');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Gagal mencatat absensi');
        }
    });

    const handleAttendance = (studentID: string, status: string) => {
        if (!selectedScheduleID) return;
        recordAttendanceMutation.mutate({ student_id: studentID, status });
    };

    const getStatus = (studentID: string) => {
        const record = attendances?.find((a: AttendanceRecord) => a.student_id === studentID);
        return record ? record.status : null;
    };

    // Count attendance stats
    const presentCount = attendances?.filter((a: AttendanceRecord) => a.status === 'Present').length || 0;
    const totalStudents = students?.length || 0;

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Absensi Siswa</h1>
                    <p className="text-slate-500">Catat kehadiran siswa per jadwal pelajaran</p>
                </div>
                {selectedScheduleID && totalStudents > 0 && (
                    <div className="text-sm text-slate-600 bg-white/60 px-4 py-2 rounded-xl border border-slate-200">
                        Hadir: <span className="font-bold text-green-600">{presentCount}</span> / {totalStudents}
                    </div>
                )}
            </div>

            <CardGlass className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <Users size={16} /> Pilih Kelas
                            </div>
                        </label>
                        <select
                            value={selectedClassID || ''}
                            onChange={(e) => {
                                setSelectedClassID(Number(e.target.value));
                                setSelectedScheduleID(null);
                            }}
                            className="w-full bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <Clock size={16} /> Pilih Jadwal
                            </div>
                        </label>
                        <select
                            value={selectedScheduleID || ''}
                            onChange={(e) => setSelectedScheduleID(Number(e.target.value))}
                            className="w-full bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                            disabled={!selectedClassID}
                        >
                            <option value="">-- Pilih Jadwal --</option>
                            {schedules?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.day} - {s.subject?.name || 'N/A'} ({s.start_time})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardGlass>

            {selectedScheduleID ? (
                <CardGlass>
                    <div className="p-6">
                        {isLoadingAttendance ? (
                            <div className="text-center py-8 text-slate-500">Loading data...</div>
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
                                                    <span className="font-medium text-slate-900">{student.user.name}</span>
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    <span className="font-mono text-slate-500">{student.nisn}</span>
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    {status ? (
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-slate-100 text-slate-600'}`}>
                                                            {statusLabels[status] || status}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm italic">Belum absen</span>
                                                    )}
                                                </TableCellGlass>
                                                <TableCellGlass className="text-right">
                                                    <div className="flex justify-end gap-1 flex-wrap">
                                                        {ATTENDANCE_STATUSES.map((s) => {
                                                            const isActive = status === s.value;
                                                            return (
                                                                <button
                                                                    key={s.value}
                                                                    onClick={() => handleAttendance(student.id, s.value)}
                                                                    disabled={isActive}
                                                                    className={`py-1 px-2 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 ${
                                                                        isActive
                                                                            ? `bg-${s.color}-600 text-white cursor-not-allowed opacity-70`
                                                                            : `text-${s.color}-600 bg-${s.color}-50 hover:bg-${s.color}-100`
                                                                    }`}
                                                                    title={s.label}
                                                                >
                                                                    <s.icon size={12} />
                                                                    <span className="hidden sm:inline">{s.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCellGlass>
                                            </TableRowGlass>
                                        );
                                    })}
                                    {students?.length === 0 && (
                                        <TableRowGlass>
                                            <TableCellGlass colSpan={4} className="text-center py-8 text-slate-500">Tidak ada siswa di kelas ini</TableCellGlass>
                                        </TableRowGlass>
                                    )}
                                </TableBodyGlass>
                            </TableGlass>
                        )}
                    </div>
                </CardGlass>
            ) : (
                <div className="text-center py-12 text-slate-500 bg-white/30 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Silakan pilih kelas dan jadwal terlebih dahulu untuk menampilkan daftar siswa.</p>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
