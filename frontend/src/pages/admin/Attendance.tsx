import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    CheckCircle, XCircle, Calendar, Users, Clock, AlertCircle, Coffee,
    Radio, Search, RefreshCw
} from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import AttendanceRFID from './AttendanceRFID';

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

interface DailyAttendanceRecord {
    id: string;
    timestamp: string;
    method: string;
    status: string;
    type: string;
    notes?: string;
    student: {
        id: string;
        nisn: string;
        user: { name: string };
        class?: { name: string };
    };
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
    const { defaultUnitId } = useUnits();
    const unitID = user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId;
    const [activeTab, setActiveTab] = useState<'scanner' | 'daily' | 'schedule'>('scanner');

    // Schedule Tab States
    const [selectedClassID, setSelectedClassID] = useState<number | null>(null);
    const [selectedScheduleID, setSelectedScheduleID] = useState<number | null>(null);

    // Daily Tab States
    const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyClassID, setDailyClassID] = useState<number | null>(null);
    const [dailySearch, setDailySearch] = useState('');

    const queryClient = useQueryClient();

    // Fetch Classes
    const { data: classes } = useQuery({
        queryKey: ['classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Fetch Schedules for selected class (Schedule Tab)
    const { data: schedules } = useQuery({
        queryKey: ['schedules', selectedClassID],
        queryFn: async () => {
            if (!selectedClassID) return [];
            const res = await api.get(`/academic/schedules?class_id=${selectedClassID}`);
            return res.data;
        },
        enabled: !!selectedClassID,
    });

    // Fetch Students for Schedule Tab
    const { data: allStudents } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
            return res.data;
        },
    });

    const students = allStudents?.filter((s: Student) => s.class_id === selectedClassID);

    // Fetch Attendance for selected schedule (Schedule Tab)
    const { data: attendances, isLoading: isLoadingAttendance } = useQuery({
        queryKey: ['attendance', selectedScheduleID],
        queryFn: async () => {
            if (!selectedScheduleID) return [];
            const res = await api.get(`/students/attendance/${selectedScheduleID}`);
            return res.data;
        },
        enabled: !!selectedScheduleID,
    });

    // Fetch Daily Attendance (Daily Tab)
    const { data: dailyAttendances = [], isLoading: isLoadingDaily, refetch: refetchDaily } = useQuery<DailyAttendanceRecord[]>({
        queryKey: ['daily-attendance', unitID, dailyDate, dailyClassID],
        queryFn: async () => {
            let url = `/students/attendance/daily?unit_id=${unitID}&date=${dailyDate}`;
            if (dailyClassID) url += `&class_id=${dailyClassID}`;
            const res = await api.get(url);
            return res.data || [];
        },
        enabled: activeTab === 'daily',
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

    // Filter daily attendances
    const filteredDaily = dailyAttendances.filter((att) => {
        if (!dailySearch) return true;
        const q = dailySearch.toLowerCase();
        return (
            att.student?.user?.name?.toLowerCase().includes(q) ||
            att.student?.nisn?.toLowerCase().includes(q) ||
            att.student?.class?.name?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex space-x-1 bg-white/60 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 shadow-sm w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveTab('scanner')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'scanner'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Radio size={16} /> Scanner RFID & NFC
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('daily')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'daily'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Calendar size={16} /> Rekap Harian
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'schedule'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Clock size={16} /> Presensi Per Mapel
                    </button>
                </div>
            </div>

            {/* TAB 1: RFID & NFC Scanner */}
            {activeTab === 'scanner' && <AttendanceRFID />}

            {/* TAB 2: Rekap Presensi Harian */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    <CardGlass className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Tanggal Presensi
                                </label>
                                <input
                                    type="date"
                                    value={dailyDate}
                                    onChange={(e) => setDailyDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Filter Kelas
                                </label>
                                <select
                                    value={dailyClassID || ''}
                                    onChange={(e) => setDailyClassID(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">Semua Kelas</option>
                                    {classes?.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Cari Siswa
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={dailySearch}
                                        onChange={(e) => setDailySearch(e.target.value)}
                                        placeholder="Nama / NISN siswa..."
                                        className="w-full px-3 py-2 pl-9 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </CardGlass>

                    <CardGlass className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-slate-900">
                                Daftar Kehadiran ({filteredDaily.length} Catatan)
                            </h2>
                            <button
                                type="button"
                                onClick={() => refetchDaily()}
                                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                            >
                                <RefreshCw size={12} /> Segarkan
                            </button>
                        </div>

                        {isLoadingDaily ? (
                            <div className="text-center py-12 text-slate-400 text-xs">Memuat data presensi...</div>
                        ) : filteredDaily.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs">
                                Tidak ada data presensi untuk tanggal dan filter yang dipilih.
                            </div>
                        ) : (
                            <TableGlass>
                                <TableHeaderGlass>
                                    <TableRowGlass>
                                        <TableHeadGlass>Waktu Tap</TableHeadGlass>
                                        <TableHeadGlass>Nama Siswa</TableHeadGlass>
                                        <TableHeadGlass>NISN</TableHeadGlass>
                                        <TableHeadGlass>Kelas</TableHeadGlass>
                                        <TableHeadGlass>Tipe</TableHeadGlass>
                                        <TableHeadGlass>Status</TableHeadGlass>
                                        <TableHeadGlass>Metode</TableHeadGlass>
                                    </TableRowGlass>
                                </TableHeaderGlass>
                                <TableBodyGlass>
                                    {filteredDaily.map((att) => (
                                        <TableRowGlass key={att.id}>
                                            <TableCellGlass className="font-mono text-xs text-slate-600">
                                                {new Date(att.timestamp).toLocaleTimeString('id-ID')} WIB
                                            </TableCellGlass>
                                            <TableCellGlass className="font-bold text-slate-800 text-xs">
                                                {att.student?.user?.name || '-'}
                                            </TableCellGlass>
                                            <TableCellGlass className="font-mono text-xs text-slate-500">
                                                {att.student?.nisn || '-'}
                                            </TableCellGlass>
                                            <TableCellGlass className="text-xs text-slate-600">
                                                {att.student?.class?.name || '-'}
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                    att.type === 'CheckOut' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {att.type === 'CheckOut' ? 'Pulang' : 'Masuk'}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                    att.status === 'Late'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : att.status === 'Present'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {att.status === 'Late' ? 'Terlambat' : att.status === 'Present' ? 'Hadir' : att.status}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass className="text-xs font-mono text-slate-500">
                                                {att.method || 'RFID'}
                                            </TableCellGlass>
                                        </TableRowGlass>
                                    ))}
                                </TableBodyGlass>
                            </TableGlass>
                        )}
                    </CardGlass>
                </div>
            )}

            {/* TAB 3: Presensi Per Jadwal / Mapel (Eksisting) */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
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
            )}
        </div>
    );
};

export default AttendancePage;
