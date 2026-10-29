import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
    Trophy, Medal, Users, GraduationCap, Briefcase,
    Download, Printer, Search, RefreshCw, Star,
    TrendingUp, CheckCircle
} from 'lucide-react';

export interface StudentLeaderboardItem {
    rank: number;
    student_id: string | number;
    name: string;
    nisn: string;
    class_id: number;
    class_name: string;
    total_present: number;
    total_late: number;
    total_permission: number;
    total_sick: number;
    total_absent: number;
    total_days: number;
    attendance_percentage: number;
    discipline_score: number;
    predicate: string;
}

export interface StaffLeaderboardItem {
    rank: number;
    user_id: string;
    name: string;
    nip: string;
    role_name: string;
    total_present: number;
    total_late: number;
    total_late_minutes: number;
    total_penalty_amount: number;
    total_checkout: number;
    total_days: number;
    attendance_percentage: number;
    discipline_score: number;
    predicate: string;
}

const AttendanceAnalyticsLeaderboard: React.FC = () => {
    const { user } = useAuth();
    const { defaultUnitId } = useUnits();
    const unitID = user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId;

    // Tab Target: 'students' | 'teachers'
    const [targetType, setTargetType] = useState<'students' | 'teachers'>('students');

    // Date Preset Filter
    // Options: '1year', 'semester', 'month', 'custom'
    const [preset, setPreset] = useState<'1year' | 'semester' | 'month' | 'custom'>('1year');

    // Compute Date Range based on Preset
    const defaultDates = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        // 1 Tahun Ajaran (365 hari terakhir atau dari awal tahun ajaran Juli s/d sekarang)
        const oneYearAgo = new Date(y - 1, m, d);

        return {
            today: formatDate(today),
            oneYearAgo: formatDate(oneYearAgo),
            monthStart: formatDate(new Date(y, m, 1)),
            semesterStart: formatDate(new Date(y, m >= 6 ? 6 : 0, 1)), // Juli atau Januari
        };
    }, []);

    const [startDate, setStartDate] = useState<string>(defaultDates.oneYearAgo);
    const [endDate, setEndDate] = useState<string>(defaultDates.today);

    // Filter Kelas untuk Siswa
    const [selectedClassID, setSelectedClassID] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Handle Preset Change
    const handlePresetChange = (newPreset: '1year' | 'semester' | 'month' | 'custom') => {
        setPreset(newPreset);
        if (newPreset === '1year') {
            setStartDate(defaultDates.oneYearAgo);
            setEndDate(defaultDates.today);
        } else if (newPreset === 'semester') {
            setStartDate(defaultDates.semesterStart);
            setEndDate(defaultDates.today);
        } else if (newPreset === 'month') {
            setStartDate(defaultDates.monthStart);
            setEndDate(defaultDates.today);
        }
    };

    // Fetch Classes
    const { data: classes = [] } = useQuery({
        queryKey: ['leaderboard-classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    // Fetch Student Leaderboard
    const {
        data: studentData = [],
        isLoading: isLoadingStudents,
        isFetching: isFetchingStudents,
        refetch: refetchStudents
    } = useQuery<StudentLeaderboardItem[]>({
        queryKey: ['student-leaderboard', unitID, startDate, endDate, selectedClassID],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('unit_id', String(unitID || 0));
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedClassID) params.append('class_id', selectedClassID);

            const res = await api.get(`/students/attendance/leaderboard?${params.toString()}`);
            return res.data?.data || [];
        },
        enabled: targetType === 'students',
    });

    // Fetch Staff Leaderboard
    const {
        data: staffData = [],
        isLoading: isLoadingStaff,
        isFetching: isFetchingStaff,
        refetch: refetchStaff
    } = useQuery<StaffLeaderboardItem[]>({
        queryKey: ['staff-leaderboard', unitID, startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('unit_id', String(unitID || 0));
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const res = await api.get(`/staff-attendance/leaderboard?${params.toString()}`);
            return res.data?.data || [];
        },
        enabled: targetType === 'teachers',
    });

    // Filter by Search Query
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return studentData;
        const q = searchQuery.toLowerCase();
        return studentData.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.nisn.toLowerCase().includes(q) ||
            s.class_name.toLowerCase().includes(q)
        );
    }, [studentData, searchQuery]);

    const filteredStaff = useMemo(() => {
        if (!searchQuery) return staffData;
        const q = searchQuery.toLowerCase();
        return staffData.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.nip.toLowerCase().includes(q) ||
            (s.role_name && s.role_name.toLowerCase().includes(q))
        );
    }, [staffData, searchQuery]);

    // Overall Analytics Summary
    const summary = useMemo(() => {
        if (targetType === 'students') {
            const count = studentData.length;
            if (count === 0) return { count: 0, avgAttendance: 0, avgDiscipline: 0, zeroLateCount: 0 };
            const avgAttendance = studentData.reduce((acc, s) => acc + (s.attendance_percentage || 0), 0) / count;
            const avgDiscipline = studentData.reduce((acc, s) => acc + (s.discipline_score || 0), 0) / count;
            const zeroLateCount = studentData.filter(s => (s.total_late || 0) === 0 && (s.total_present || 0) > 0).length;
            return { count, avgAttendance, avgDiscipline, zeroLateCount };
        } else {
            const count = staffData.length;
            if (count === 0) return { count: 0, avgAttendance: 0, avgDiscipline: 0, zeroLateCount: 0, totalLateMin: 0, totalPenalty: 0 };
            const avgAttendance = staffData.reduce((acc, s) => acc + (s.attendance_percentage || 0), 0) / count;
            const avgDiscipline = staffData.reduce((acc, s) => acc + (s.discipline_score || 0), 0) / count;
            const zeroLateCount = staffData.filter(s => (s.total_late || 0) === 0 && (s.total_present || 0) > 0).length;
            const totalLateMin = staffData.reduce((acc, s) => acc + (s.total_late_minutes || 0), 0);
            const totalPenalty = staffData.reduce((acc, s) => acc + (s.total_penalty_amount || 0), 0);
            return { count, avgAttendance, avgDiscipline, zeroLateCount, totalLateMin, totalPenalty };
        }
    }, [targetType, studentData, staffData]);

    // Top 3 Leaderboard Champions
    const topThreeStudents = useMemo(() => studentData.slice(0, 3), [studentData]);
    const topThreeStaff = useMemo(() => staffData.slice(0, 3), [staffData]);

    // Excel Export
    const handleExportExcel = () => {
        const isStudent = targetType === 'students';
        const dataToExport = isStudent ? filteredStudents : filteredStaff;

        if (dataToExport.length === 0) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        const rows = dataToExport.map((item: any) => {
            if (isStudent) {
                return {
                    'Peringkat': `#${item.rank}`,
                    'Nama Siswa': item.name,
                    'NISN': item.nisn || '-',
                    'Kelas': item.class_name || '-',
                    'Hadir (Hari)': item.total_present || 0,
                    'Terlambat (Hari)': item.total_late || 0,
                    'Izin (Hari)': item.total_permission || 0,
                    'Sakit (Hari)': item.total_sick || 0,
                    'Alpa (Hari)': item.total_absent || 0,
                    'Total Hari Sekolah': item.total_days || 0,
                    'Tingkat Kehadiran (%)': `${item.attendance_percentage || 0}%`,
                    'Skor Disiplin (0-100)': item.discipline_score || 0,
                    'Predikat': item.predicate || '-',
                };
            } else {
                const checkoutRate = item.total_present > 0 ? Math.round(((item.total_checkout || 0) / item.total_present) * 100) : 0;
                return {
                    'Peringkat': `#${item.rank}`,
                    'Nama Guru / Staf': item.name,
                    'NIP': item.nip || '-',
                    'Jabatan': item.role_name || '-',
                    'Hadir (Hari)': item.total_present || 0,
                    'Terlambat (Hari)': item.total_late || 0,
                    'Total Telat (Menit)': item.total_late_minutes || 0,
                    'Total Denda Keterlambatan (Rp)': item.total_penalty_amount || 0,
                    'Presensi Pulang (Hari)': item.total_checkout || 0,
                    'Kepatuhan Pulang (%)': `${checkoutRate}%`,
                    'Total Hari Kerja': item.total_days || 0,
                    'Tingkat Kehadiran (%)': `${item.attendance_percentage || 0}%`,
                    'Skor Disiplin (0-100)': item.discipline_score || 0,
                    'Predikat': item.predicate || '-',
                };
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, isStudent ? 'Peringkat Siswa' : 'Peringkat Guru');

        // Filename
        const filename = `Leaderboard_Presensi_${isStudent ? 'Siswa' : 'Guru'}_${startDate}_sd_${endDate}.xlsx`;
        XLSX.writeFile(workbook, filename);
        toast.success(`Berhasil mengunduh ${filename}`);
    };

    // Print
    const handlePrint = () => {
        window.print();
    };

    const isLoading = targetType === 'students' ? isLoadingStudents : isLoadingStaff;
    const isFetching = targetType === 'students' ? isFetchingStudents : isFetchingStaff;

    return (
        <div className="space-y-6">
            {/* ─── Top Filter Header ─── */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-4 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <Trophy size={20} className="text-amber-600" />
                            </span>
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                                    Analitik & Leaderboard Presensi
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Peringkat kedisiplinan dan rekap presensi terajin selama 1 tahun ajaran
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Target Selector (Siswa / Guru) */}
                    <div className="flex items-center gap-2">
                        <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setTargetType('students')}
                                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    targetType === 'students'
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <GraduationCap size={14} /> Siswa
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('teachers')}
                                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    targetType === 'teachers'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Briefcase size={14} /> Guru & Staf
                            </button>
                        </div>

                        {/* Export & Print Buttons */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            title="Ekspor ke Excel"
                        >
                            <Download size={14} /> <span className="hidden sm:inline">Excel</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            title="Cetak Dokumen"
                        >
                            <Printer size={14} /> <span className="hidden sm:inline">Cetak</span>
                        </button>
                    </div>
                </div>

                {/* Second Row: Date Preset Pills + Class Filter + Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    {/* Date Presets */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Periode:</span>
                        <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                            <button
                                type="button"
                                onClick={() => handlePresetChange('1year')}
                                className={`py-1 px-3 rounded-xl font-bold transition ${
                                    preset === '1year'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                🌟 1 Tahun Ajaran
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('semester')}
                                className={`py-1 px-3 rounded-xl font-semibold transition ${
                                    preset === 'semester'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Semester Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('month')}
                                className={`py-1 px-3 rounded-xl font-semibold transition ${
                                    preset === 'month'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Bulan Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('custom')}
                                className={`py-1 px-3 rounded-xl font-semibold transition ${
                                    preset === 'custom'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Kustom
                            </button>
                        </div>

                        {/* Date Inputs if Custom or to refine */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setPreset('custom');
                                }}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 font-medium"
                            />
                            <span className="text-slate-400">s/d</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setPreset('custom');
                                }}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 font-medium"
                            />
                        </div>
                    </div>

                    {/* Right side: Class Filter (for student) & Search Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {targetType === 'students' && (
                            <select
                                value={selectedClassID}
                                onChange={(e) => setSelectedClassID(e.target.value)}
                                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        Kelas {c.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="relative min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Cari nama ${targetType === 'students' ? 'siswa' : 'guru'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => (targetType === 'students' ? refetchStudents() : refetchStaff())}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Segarkan Data"
                        >
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Printable Document Header (Only visible when printing) ─── */}
            <div className="hidden print:block p-4 border-b-2 border-slate-800 mb-6">
                <div className="text-center">
                    <h1 className="text-2xl font-black uppercase tracking-tight">LAPORAN REKAPITULASI & LEADERBOARD PRESENSI</h1>
                    <p className="text-sm font-semibold text-slate-700 mt-1">
                        Kategori: {targetType === 'students' ? 'Siswa / Murid' : 'Guru & Tenaga Kependidikan'}
                    </p>
                    <p className="text-xs text-slate-600">
                        Periode: {startDate} s/d {endDate} • Dicetak pada: {new Date().toLocaleDateString('id-ID')}
                    </p>
                </div>
            </div>

            {/* ─── KPI Summary Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Users size={16} className="text-emerald-600" />
                        <span className="text-xs font-semibold">Total {targetType === 'students' ? 'Siswa' : 'Guru'}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{summary.count}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Terdata dalam periode ini</p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <TrendingUp size={16} className="text-blue-600" />
                        <span className="text-xs font-semibold">Rata-rata Kehadiran</span>
                    </div>
                    <p className="text-2xl font-black text-blue-700">{summary.avgAttendance.toFixed(1)}%</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Persentase hadir efektif</p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Star size={16} className="text-amber-500" />
                        <span className="text-xs font-semibold">Rata-rata Skor Disiplin</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">{summary.avgDiscipline.toFixed(1)} / 100</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dihitung dari ketepatan waktu</p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <CheckCircle size={16} className="text-teal-600" />
                        <span className="text-xs font-semibold">100% Tepat Waktu</span>
                    </div>
                    <p className="text-2xl font-black text-teal-700">{summary.zeroLateCount} Orang</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">0 menit keterlambatan</p>
                </div>
            </div>

            {/* ─── Top 3 Podium Cards (Siswa & Guru Paling Teladan) ─── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Trophy size={16} className="text-amber-500" />
                        Podium 3 Teratas (Paling Rajin & Teladan)
                    </h3>
                    <span className="text-xs text-slate-500">Urutan #1 sampai #3 dengan nilai tertinggi</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Rank 2 (Perak / Silver) */}
                    {targetType === 'students' ? (
                        topThreeStudents[1] ? (
                            <PodiumStudentCard item={topThreeStudents[1]} rank={2} medal="🥈" color="silver" />
                        ) : null
                    ) : (
                        topThreeStaff[1] ? (
                            <PodiumStaffCard item={topThreeStaff[1]} rank={2} medal="🥈" color="silver" />
                        ) : null
                    )}

                    {/* Rank 1 (Emas / Gold - Central Prominent) */}
                    {targetType === 'students' ? (
                        topThreeStudents[0] ? (
                            <PodiumStudentCard item={topThreeStudents[0]} rank={1} medal="🥇" color="gold" prominent />
                        ) : (
                            <div className="md:col-span-3 text-center py-8 text-sm text-slate-400 bg-white/60 rounded-3xl border border-slate-200">
                                Belum ada data presensi siswa pada periode ini.
                            </div>
                        )
                    ) : (
                        topThreeStaff[0] ? (
                            <PodiumStaffCard item={topThreeStaff[0]} rank={1} medal="🥇" color="gold" prominent />
                        ) : (
                            <div className="md:col-span-3 text-center py-8 text-sm text-slate-400 bg-white/60 rounded-3xl border border-slate-200">
                                Belum ada data presensi guru/staf pada periode ini.
                            </div>
                        )
                    )}

                    {/* Rank 3 (Perunggu / Bronze) */}
                    {targetType === 'students' ? (
                        topThreeStudents[2] ? (
                            <PodiumStudentCard item={topThreeStudents[2]} rank={3} medal="🥉" color="bronze" />
                        ) : null
                    ) : (
                        topThreeStaff[2] ? (
                            <PodiumStaffCard item={topThreeStaff[2]} rank={3} medal="🥉" color="bronze" />
                        ) : null
                    )}
                </div>
            </div>

            {/* ─── Full Leaderboard Ranking Table ─── */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <Medal size={18} className="text-emerald-600" />
                            Rekapitulasi Lengkap Berdasarkan Urutan Presensi Terbaik
                        </h3>
                        <p className="text-xs text-slate-500">
                            Diurutkan otomatis dari yang paling rajin hadir, paling sedikit terlambat, dan skor kedisiplinan tertinggi.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        Total {targetType === 'students' ? filteredStudents.length : filteredStaff.length} Data
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="text-center py-16 space-y-2">
                            <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
                            <p className="text-xs text-slate-500 font-medium">Sedang menghitung analitik & peringkat...</p>
                        </div>
                    ) : (targetType === 'students' ? filteredStudents : filteredStaff).length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-xs">
                            Tidak ada data presensi yang sesuai dengan kriteria filter.
                        </div>
                    ) : targetType === 'students' ? (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                                    <th className="py-3 px-4 w-14 text-center">Rank</th>
                                    <th className="py-3 px-4">Nama Siswa</th>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                                    <th className="py-3 px-3 text-center text-amber-700">Telat</th>
                                    <th className="py-3 px-3 text-center text-blue-700">Izin</th>
                                    <th className="py-3 px-3 text-center text-purple-700">Sakit</th>
                                    <th className="py-3 px-3 text-center text-rose-700">Alpa</th>
                                    <th className="py-3 px-4 text-center">% Hadir</th>
                                    <th className="py-3 px-4 text-center">Skor Disiplin</th>
                                    <th className="py-3 px-4 text-center">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((s) => (
                                    <tr key={s.student_id} className="hover:bg-slate-50/60 transition font-medium">
                                        <td className="py-3 px-4 text-center">
                                            {s.rank === 1 ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs shadow-xs">
                                                    🥇
                                                </span>
                                            ) : s.rank === 2 ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-black text-xs shadow-xs">
                                                    🥈
                                                </span>
                                            ) : s.rank === 3 ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-900 font-black text-xs shadow-xs">
                                                    🥉
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 font-bold">#{s.rank}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-800">{s.name}</div>
                                            <div className="text-[11px] text-slate-400 font-mono">NISN: {s.nisn || '-'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60 text-[11px]">
                                                {s.class_name || '-'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center font-bold text-emerald-700">{s.total_present || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-amber-700">{s.total_late || 0}</td>
                                        <td className="py-3 px-3 text-center text-blue-700">{s.total_permission || 0}</td>
                                        <td className="py-3 px-3 text-center text-purple-700">{s.total_sick || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-rose-700">{s.total_absent || 0}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700">
                                                <span>{(s.attendance_percentage || 0).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                                (s.discipline_score || 0) >= 90
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : (s.discipline_score || 0) >= 75
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : (s.discipline_score || 0) >= 60
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                {(s.discipline_score || 0).toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-[11px] font-semibold text-slate-700">
                                                {s.predicate}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                                    <th className="py-3 px-4 w-14 text-center">Rank</th>
                                    <th className="py-3 px-4">Nama Guru & Staf</th>
                                    <th className="py-3 px-4">Jabatan</th>
                                    <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                                    <th className="py-3 px-3 text-center text-amber-700">Telat</th>
                                    <th className="py-3 px-3 text-center">Presensi Pulang</th>
                                    <th className="py-3 px-3 text-center">Total Telat</th>
                                    <th className="py-3 px-3 text-center text-rose-700">Potongan Denda</th>
                                    <th className="py-3 px-4 text-center">% Hadir</th>
                                    <th className="py-3 px-4 text-center">Skor Disiplin</th>
                                    <th className="py-3 px-4 text-center">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStaff.map((s) => (
                                    <tr key={s.user_id} className="hover:bg-slate-50/60 transition font-medium">
                                        <td className="py-3 px-4 text-center">
                                            {s.rank === 1 ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs shadow-xs">
                                                    🥇
                                                </span>
                                            ) : s.rank === 2 ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-black text-xs shadow-xs">
                                                    🥈
                                                </span>
                                            ) : s.rank === 3 ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-900 font-black text-xs shadow-xs">
                                                    🥉
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 font-bold">#{s.rank}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-800">{s.name}</div>
                                            <div className="text-[11px] text-slate-400 font-mono">
                                                {s.nip && s.nip !== '-' ? `NIP: ${s.nip}` : '-'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200/60 text-[11px]">
                                                {s.role_name || 'Guru'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center font-bold text-emerald-700">{s.total_present || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-amber-700">{s.total_late || 0}</td>
                                        <td className="py-3 px-3 text-center font-medium">
                                            <span>{s.total_checkout || 0}x</span>
                                            {s.total_present > 0 && (
                                                <span className="text-[10px] text-slate-400 ml-1">
                                                    ({Math.round(((s.total_checkout || 0) / s.total_present) * 100)}%)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center font-mono">
                                            {(s.total_late_minutes || 0) > 0 ? (
                                                <span className="text-amber-700 font-semibold">{s.total_late_minutes} mnt</span>
                                            ) : (
                                                <span className="text-slate-400">0 mnt</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                                            {(s.total_penalty_amount || 0) > 0 ? `Rp ${Number(s.total_penalty_amount).toLocaleString('id-ID')}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                                            {(s.attendance_percentage || 0).toFixed(1)}%
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                                (s.discipline_score || 0) >= 90
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : (s.discipline_score || 0) >= 75
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : (s.discipline_score || 0) >= 60
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                {(s.discipline_score || 0).toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-[11px] font-semibold text-slate-700">
                                                {s.predicate}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Subkomponen Kartu Podium Siswa ───
interface PodiumStudentProps {
    item: StudentLeaderboardItem;
    rank: number;
    medal: string;
    color: 'gold' | 'silver' | 'bronze';
    prominent?: boolean;
}

const PodiumStudentCard: React.FC<PodiumStudentProps> = ({ item, rank, medal, color, prominent }) => {
    const bgStyles =
        color === 'gold'
            ? 'bg-gradient-to-b from-amber-50 to-amber-100/40 border-amber-300 shadow-md ring-2 ring-amber-400/30'
            : color === 'silver'
            ? 'bg-gradient-to-b from-slate-50 to-slate-100/50 border-slate-300'
            : 'bg-gradient-to-b from-amber-900/5 to-amber-950/5 border-amber-700/20';

    return (
        <div className={`rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${bgStyles} ${prominent ? 'md:-translate-y-2' : ''}`}>
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{medal}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/80 shadow-xs border text-slate-700">
                    Peringkat #{rank}
                </span>
            </div>

            {/* Profile */}
            <div className="mb-4">
                <h4 className="font-extrabold text-base text-slate-900 line-clamp-1">{item.name}</h4>
                <p className="text-xs text-slate-500 font-medium">
                    Kelas {item.class_name} • NISN {item.nisn || '-'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <Star size={11} className="fill-emerald-600 text-emerald-600" />
                    <span>{item.predicate}</span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-white/70 rounded-2xl border border-white/80 text-center">
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Hadir</span>
                    <span className="text-xs font-black text-emerald-700">{item.total_present || 0} Hari</span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Telat</span>
                    <span className="text-xs font-black text-amber-700">{item.total_late || 0} Hari</span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Skor</span>
                    <span className="text-xs font-black text-blue-700">{(item.discipline_score || 0).toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Subkomponen Kartu Podium Guru / Staf ───
interface PodiumStaffProps {
    item: StaffLeaderboardItem;
    rank: number;
    medal: string;
    color: 'gold' | 'silver' | 'bronze';
    prominent?: boolean;
}

const PodiumStaffCard: React.FC<PodiumStaffProps> = ({ item, rank, medal, color, prominent }) => {
    const bgStyles =
        color === 'gold'
            ? 'bg-gradient-to-b from-amber-50 to-amber-100/40 border-amber-300 shadow-md ring-2 ring-amber-400/30'
            : color === 'silver'
            ? 'bg-gradient-to-b from-slate-50 to-slate-100/50 border-slate-300'
            : 'bg-gradient-to-b from-amber-900/5 to-amber-950/5 border-amber-700/20';

    return (
        <div className={`rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${bgStyles} ${prominent ? 'md:-translate-y-2' : ''}`}>
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{medal}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/80 shadow-xs border text-slate-700">
                    Peringkat #{rank}
                </span>
            </div>

            {/* Profile */}
            <div className="mb-4">
                <h4 className="font-extrabold text-base text-slate-900 line-clamp-1">{item.name}</h4>
                <p className="text-xs text-slate-500 font-medium">
                    {item.role_name || 'Guru'} • {item.nip && item.nip !== '-' ? `NIP ${item.nip}` : '-'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <Star size={11} className="fill-emerald-600 text-emerald-600" />
                    <span>{item.predicate}</span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-white/70 rounded-2xl border border-white/80 text-center">
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Hadir</span>
                    <span className="text-xs font-black text-emerald-700">{item.total_present || 0} Hari</span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Telat</span>
                    <span className="text-xs font-black text-amber-700">{item.total_late_minutes || 0} mnt</span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Skor</span>
                    <span className="text-xs font-black text-blue-700">{(item.discipline_score || 0).toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
};

export default AttendanceAnalyticsLeaderboard;
