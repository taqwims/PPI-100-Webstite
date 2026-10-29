import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import {
    Calendar, Search, RefreshCw,
    Users, Briefcase, Eye, FileText,
    X
} from 'lucide-react';

interface PersonnelStatusItem {
    id: string;
    user_id: string;
    name: string;
    role: 'Student' | 'Teacher' | 'Staff';
    role_title: string;
    unit_id: number;
    unit_name: string;
    status: 'Present' | 'Late' | 'Duty' | 'Sick' | 'Permission' | 'Absent';
    check_in_time?: string;
    late_minutes: number;
    penalty_amount: number;
    reason: string;
    attachment_url?: string;
    approved_by?: string;
    leave_type?: string;
}

interface PersonnelCategorySummary {
    total: number;
    present: number;
    late: number;
    duty: number;
    sick: number;
    permission: number;
    absent: number;
}

interface DailyPersonnelStatusData {
    date: string;
    summary: {
        students: PersonnelCategorySummary;
        staff: PersonnelCategorySummary;
    };
    personnel: PersonnelStatusItem[];
}

export const AttendanceDailyPersonnelStatus: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'student'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'out' | 'duty' | 'sick_permit' | 'absent'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

    const { data, isLoading, refetch } = useQuery<DailyPersonnelStatusData>({
        queryKey: ['executive-daily-personnel-status', selectedDate, roleFilter],
        queryFn: async () => {
            const res = await api.get(`/attendance/daily-personnel-status?date=${selectedDate}&role_type=${roleFilter}`);
            return res.data;
        }
    });

    const summary = data?.summary;
    const personnel = data?.personnel || [];

    // Filter logic
    const filteredPersonnel = personnel.filter((item) => {
        // Status Category filter
        let matchStatus = true;
        if (statusFilter === 'in') {
            matchStatus = item.status === 'Present' || item.status === 'Late';
        } else if (statusFilter === 'out') {
            matchStatus = item.status !== 'Present' && item.status !== 'Late';
        } else if (statusFilter === 'duty') {
            matchStatus = item.status === 'Duty';
        } else if (statusFilter === 'sick_permit') {
            matchStatus = item.status === 'Sick' || item.status === 'Permission';
        } else if (statusFilter === 'absent') {
            matchStatus = item.status === 'Absent';
        }

        // Search query
        const matchSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.role_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchStatus && matchSearch;
    });

    const getStatusBadge = (status: string, lateMinutes: number) => {
        switch (status) {
            case 'Present':
                return {
                    label: 'Tepat Waktu',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dot: 'bg-emerald-500'
                };
            case 'Late':
                return {
                    label: `Terlambat ${lateMinutes > 0 ? `(${lateMinutes} mnt)` : ''}`,
                    bg: 'bg-amber-50 text-amber-700 border-amber-200',
                    dot: 'bg-amber-500'
                };
            case 'Duty':
                return {
                    label: 'Tugas Luar / Dinas',
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    dot: 'bg-indigo-500'
                };
            case 'Sick':
                return {
                    label: 'Sakit',
                    bg: 'bg-rose-50 text-rose-700 border-rose-200',
                    dot: 'bg-rose-500'
                };
            case 'Permission':
                return {
                    label: 'Izin',
                    bg: 'bg-blue-50 text-blue-700 border-blue-200',
                    dot: 'bg-blue-500'
                };
            case 'Absent':
            default:
                return {
                    label: 'Belum Hadir / Alpa',
                    bg: 'bg-red-50 text-red-700 border-red-200',
                    dot: 'bg-red-500'
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Date Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {!isEmbedded ? (
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Users className="text-emerald-600" size={26} />
                            Monitoring Kehadiran & Status Harian
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Pantau real-time siapa yang masuk dan yang tidak masuk hari ini beserta alasannya secara transparan.
                        </p>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Status Kehadiran & Ketidakhadiran Harian</h3>
                        <p className="text-xs text-slate-500">Rekap personil masuk & tidak masuk beserta alasan dan lampiran surat izin.</p>
                    </div>
                )}

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
                        <Calendar size={14} className="text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent focus:outline-none text-slate-800"
                        />
                    </div>

                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm text-xs"
                        title="Segarkan Data"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Cards: Guru & Siswa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Guru & Staf */}
                <CardGlass className="p-5 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Briefcase size={14} className="text-indigo-600" />
                            Kehadiran Guru & Tenaga Pendidik
                        </span>
                        <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            Total: {summary?.staff.total || 0}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <p className="text-[10px] text-emerald-800 font-bold uppercase">Hadir</p>
                            <p className="text-lg font-black text-emerald-700">{summary?.staff.present || 0}</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <p className="text-[10px] text-amber-800 font-bold uppercase">Telat</p>
                            <p className="text-lg font-black text-amber-700">{summary?.staff.late || 0}</p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-xl">
                            <p className="text-[10px] text-indigo-800 font-bold uppercase">Dinas</p>
                            <p className="text-lg font-black text-indigo-700">{summary?.staff.duty || 0}</p>
                        </div>
                        <div className="p-2 bg-rose-50 rounded-xl">
                            <p className="text-[10px] text-rose-800 font-bold uppercase">Sakit</p>
                            <p className="text-lg font-black text-rose-700">{summary?.staff.sick || 0}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <p className="text-[10px] text-blue-800 font-bold uppercase">Izin</p>
                            <p className="text-lg font-black text-blue-700">{summary?.staff.permission || 0}</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded-xl">
                            <p className="text-[10px] text-red-800 font-bold uppercase">Alpa</p>
                            <p className="text-lg font-black text-red-700">{summary?.staff.absent || 0}</p>
                        </div>
                    </div>
                </CardGlass>

                {/* Siswa */}
                <CardGlass className="p-5 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Users size={14} className="text-emerald-600" />
                            Kehadiran Siswa
                        </span>
                        <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                            Total: {summary?.students.total || 0}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <p className="text-[10px] text-emerald-800 font-bold uppercase">Tepat Waktu</p>
                            <p className="text-lg font-black text-emerald-700">{summary?.students.present || 0}</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <p className="text-[10px] text-amber-800 font-bold uppercase">Terlambat</p>
                            <p className="text-lg font-black text-amber-700">{summary?.students.late || 0}</p>
                        </div>
                        <div className="p-2 bg-rose-50 rounded-xl">
                            <p className="text-[10px] text-rose-800 font-bold uppercase">Sakit</p>
                            <p className="text-lg font-black text-rose-700">{summary?.students.sick || 0}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <p className="text-[10px] text-blue-800 font-bold uppercase">Izin</p>
                            <p className="text-lg font-black text-blue-700">{summary?.students.permission || 0}</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded-xl">
                            <p className="text-[10px] text-red-800 font-bold uppercase">Belum/Alpa</p>
                            <p className="text-lg font-black text-red-700">{summary?.students.absent || 0}</p>
                        </div>
                    </div>
                </CardGlass>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-3">
                {/* Role Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                            onClick={() => setRoleFilter('all')}
                            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Semua Personil ({personnel.length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('staff')}
                            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'staff' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Guru & Staf Saja
                        </button>
                        <button
                            onClick={() => setRoleFilter('student')}
                            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'student' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Siswa Saja
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Cari nama, kelas, atau alasan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                </div>

                {/* Status Category Pills */}
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {[
                        { id: 'all', label: 'Semua Status' },
                        { id: 'in', label: '🟢 Masuk (Hadir & Telat)' },
                        { id: 'out', label: '🔴 Tidak Masuk (Semua)' },
                        { id: 'duty', label: '🏢 Tugas Luar / Dinas' },
                        { id: 'sick_permit', label: '🏥 Izin & Sakit' },
                        { id: 'absent', label: '⚠️ Alpa / Belum Hadir' },
                    ].map((pill) => (
                        <button
                            key={pill.id}
                            onClick={() => setStatusFilter(pill.id as any)}
                            className={`px-3 py-1.5 rounded-xl border transition ${
                                statusFilter === pill.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white/80 hover:bg-white text-slate-600 border-slate-200'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Personnel List Table */}
            <CardGlass className="overflow-hidden border border-slate-200/80 shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="py-3 px-4">Nama Personil</th>
                                <th className="py-3 px-4">Peran / Kelas</th>
                                <th className="py-3 px-4">Status Hari Ini</th>
                                <th className="py-3 px-4">Jam Masuk</th>
                                <th className="py-3 px-4 min-w-[200px]">Alasan & Keterangan</th>
                                <th className="py-3 px-4">Dokumen</th>
                                <th className="py-3 px-4">Penyetujui</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                                        Memuat data kehadiran personil hari ini...
                                    </td>
                                </tr>
                            ) : filteredPersonnel.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        Tidak ada personil yang cocok dengan kriteria filter saat ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredPersonnel.map((item) => {
                                    const badge = getStatusBadge(item.status, item.late_minutes);
                                    const isTeacher = item.role === 'Teacher' || item.role === 'Staff';

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                            {/* Nama */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center text-white ${
                                                        isTeacher ? 'bg-indigo-600' : 'bg-emerald-600'
                                                    }`}>
                                                        {item.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 block">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400">{isTeacher ? 'Guru/Staf' : 'Siswa'}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Kelas / Role */}
                                            <td className="py-3 px-4 font-medium text-slate-700">
                                                {item.role_title}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.bg}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                    {badge.label}
                                                </span>
                                            </td>

                                            {/* Jam Masuk */}
                                            <td className="py-3 px-4 text-slate-700 font-mono font-medium">
                                                {item.check_in_time || '-'}
                                            </td>

                                            {/* Alasan & Keterangan */}
                                            <td className="py-3 px-4">
                                                {item.reason ? (
                                                    <div className="max-w-xs text-slate-700 leading-relaxed font-medium">
                                                        {item.reason}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 italic">-</span>
                                                )}
                                            </td>

                                            {/* Dokumen Lampiran */}
                                            <td className="py-3 px-4">
                                                {item.attachment_url ? (
                                                    <button
                                                        onClick={() => setPreviewDocUrl(item.attachment_url!)}
                                                        className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                                                    >
                                                        <Eye size={12} className="text-emerald-600" />
                                                        Surat
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            {/* Penyetujui */}
                                            <td className="py-3 px-4 text-slate-600 text-[11px]">
                                                {item.approved_by || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </CardGlass>

            {/* Modal Preview Surat/Dokumen */}
            {previewDocUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={16} className="text-emerald-600" />
                                Dokumen Surat / Lampiran Pendukung
                            </h4>
                            <button
                                onClick={() => setPreviewDocUrl(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100/50">
                            {previewDocUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={previewDocUrl}
                                    title="Dokumen PDF"
                                    className="w-full h-96 rounded-xl border border-slate-200"
                                />
                            ) : (
                                <img
                                    src={previewDocUrl}
                                    alt="Lampiran"
                                    className="max-h-96 max-w-full object-contain rounded-xl shadow-sm"
                                />
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
                            <a
                                href={previewDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                            >
                                Buka di Tab Baru
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceDailyPersonnelStatus;
