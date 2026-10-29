import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
    Calendar, Users, GraduationCap, Printer,
    FileSpreadsheet, FileText, Search, RefreshCw, CheckCircle,
    Clock, AlertCircle, Coffee, XCircle, ArrowLeft, Filter, Trash2, ShieldCheck
} from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';

export interface AttendanceExportPanelProps {
    onBack?: () => void;
    initialTarget?: 'student' | 'teacher';
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    Present: { label: 'Hadir', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
    Late: { label: 'Terlambat', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: Clock },
    Permission: { label: 'Izin', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', icon: AlertCircle },
    Sick: { label: 'Sakit', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', icon: Coffee },
    Absent: { label: 'Alpa / Absen', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', icon: XCircle },
};

const AttendanceExportPanel: React.FC<AttendanceExportPanelProps> = ({ onBack, initialTarget = 'student' }) => {
    const { user } = useAuth();
    const { defaultUnitId } = useUnits();
    const unitID = user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId;

    // Filter Type: 'student' | 'teacher'
    const [targetType, setTargetType] = useState<'student' | 'teacher'>(initialTarget);

    // Student Filter Scope: 'class' | 'student'
    const [studentScope, setStudentScope] = useState<'class' | 'student'>('class');

    // Filter values
    const [selectedClassID, setSelectedClassID] = useState<string>('');
    const [selectedStudentID, setSelectedStudentID] = useState<string>('');
    const [selectedTeacherID, setSelectedTeacherID] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    // Quick Date Range Setup
    const getToday = () => new Date().toISOString().split('T')[0];
    const getMonthStart = () => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState<string>(getMonthStart());
    const [endDate, setEndDate] = useState<string>(getToday());
    const [previewSearch, setPreviewSearch] = useState<string>('');

    // State Hapus / Waive Potongan Keterlambatan Guru
    const [waiveModalOpen, setWaiveModalOpen] = useState(false);
    const [selectedWaiveRecord, setSelectedWaiveRecord] = useState<any>(null);
    const [waiveReason, setWaiveReason] = useState('');
    const [isSubmittingWaive, setIsSubmittingWaive] = useState(false);

    const handleOpenWaiveModal = (rec: any) => {
        setSelectedWaiveRecord(rec);
        setWaiveReason('');
        setWaiveModalOpen(true);
    };

    const handleConfirmWaive = async () => {
        if (!selectedWaiveRecord) return;
        setIsSubmittingWaive(true);
        try {
            await api.post(`/staff-attendance/${selectedWaiveRecord.id}/waive-penalty`, {
                reason: waiveReason.trim() || 'Dispensasi Administrator'
            });
            toast.success(`Potongan denda keterlambatan untuk ${selectedWaiveRecord.user?.name || 'Guru'} berhasil dihapus!`);
            setWaiveModalOpen(false);
            setSelectedWaiveRecord(null);
            refetch();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal menghapus potongan denda');
        } finally {
            setIsSubmittingWaive(false);
        }
    };

    // Fetch Classes
    const { data: classes = [] } = useQuery({
        queryKey: ['export-classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    // Fetch Students (all or by class)
    const { data: students = [] } = useQuery({
        queryKey: ['export-students', unitID, selectedClassID],
        queryFn: async () => {
            let url = `/students/?unit_id=${unitID}`;
            const res = await api.get(url);
            const list = res.data || [];
            if (selectedClassID) {
                return list.filter((s: any) => String(s.class_id) === String(selectedClassID));
            }
            return list;
        },
    });

    // Fetch Teachers
    const { data: teachers = [] } = useQuery({
        queryKey: ['export-teachers', unitID],
        queryFn: async () => {
            const res = await api.get('/teachers/');
            const list = res.data || [];
            if (unitID) {
                return list.filter((t: any) => !t.unit_id || t.unit_id === unitID || t.user?.unit_id === unitID);
            }
            return list;
        },
    });

    // Fetch Attendance Data
    const { data: attendanceData = [], isLoading, isFetching, refetch } = useQuery({
        queryKey: ['attendance-export-data', targetType, startDate, endDate, selectedClassID, selectedStudentID, selectedTeacherID, selectedStatus, unitID],
        queryFn: async () => {
            if (targetType === 'student') {
                const params = new URLSearchParams();
                params.append('unit_id', String(unitID || 0));
                params.append('start_date', startDate);
                params.append('end_date', endDate);
                if (studentScope === 'class' && selectedClassID) {
                    params.append('class_id', selectedClassID);
                }
                if (studentScope === 'student' && selectedStudentID) {
                    params.append('student_id', selectedStudentID);
                }
                if (selectedStatus && selectedStatus !== 'all') {
                    params.append('status', selectedStatus);
                }
                const res = await api.get(`/students/attendance/export?${params.toString()}`);
                return res.data || [];
            } else {
                const params = new URLSearchParams();
                params.append('unit_id', String(unitID || 0));
                params.append('start_date', startDate);
                params.append('end_date', endDate);
                if (selectedTeacherID) {
                    params.append('user_id', selectedTeacherID);
                }
                if (selectedStatus && selectedStatus !== 'all') {
                    params.append('status', selectedStatus);
                }
                const res = await api.get(`/staff-attendance/export?${params.toString()}`);
                return res.data?.data || res.data || [];
            }
        },
    });

    // Apply quick date presets
    const handlePreset = (type: 'today' | 'last7' | 'month' | 'lastMonth') => {
        const now = new Date();
        if (type === 'today') {
            const today = now.toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
        } else if (type === 'last7') {
            const past = new Date();
            past.setDate(past.getDate() - 6);
            setStartDate(past.toISOString().split('T')[0]);
            setEndDate(now.toISOString().split('T')[0]);
        } else if (type === 'month') {
            setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
            setEndDate(now.toISOString().split('T')[0]);
        } else if (type === 'lastMonth') {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            setStartDate(firstDay);
            setEndDate(lastDay);
        }
    };

    // Filter preview locally by search
    const filteredRecords = useMemo(() => {
        if (!previewSearch.trim()) return attendanceData;
        const q = previewSearch.toLowerCase();
        if (targetType === 'student') {
            return attendanceData.filter((r: any) =>
                r.student?.user?.name?.toLowerCase().includes(q) ||
                r.student?.nisn?.toLowerCase().includes(q) ||
                r.student?.class?.name?.toLowerCase().includes(q) ||
                r.status?.toLowerCase().includes(q) ||
                r.method?.toLowerCase().includes(q)
            );
        } else {
            return attendanceData.filter((r: any) =>
                r.user?.name?.toLowerCase().includes(q) ||
                r.user?.teacher?.nip?.toLowerCase().includes(q) ||
                r.status?.toLowerCase().includes(q) ||
                r.method?.toLowerCase().includes(q)
            );
        }
    }, [attendanceData, previewSearch, targetType]);

    // Statistics Calculations
    const stats = useMemo(() => {
        const total = attendanceData.length;
        const present = attendanceData.filter((r: any) => r.status === 'Present').length;
        const late = attendanceData.filter((r: any) => r.status === 'Late').length;
        const permission = attendanceData.filter((r: any) => r.status === 'Permission').length;
        const sick = attendanceData.filter((r: any) => r.status === 'Sick').length;
        const absent = attendanceData.filter((r: any) => r.status === 'Absent').length;
        const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return { total, present, late, permission, sick, absent, attendanceRate };
    }, [attendanceData]);

    // Get Active Filter Labels for titles
    const getFilterLabel = () => {
        if (targetType === 'student') {
            if (studentScope === 'student' && selectedStudentID) {
                const s = students.find((x: any) => String(x.id) === String(selectedStudentID));
                return s ? `Siswa: ${s.user?.name || s.name} (${s.class?.name || 'Kelas -'})` : 'Siswa Tertentu';
            }
            if (studentScope === 'class' && selectedClassID) {
                const c = classes.find((x: any) => String(x.id) === String(selectedClassID));
                return c ? `Kelas: ${c.name}` : 'Kelas Tertentu';
            }
            return 'Semua Kelas Siswa';
        } else {
            if (selectedTeacherID) {
                const t = teachers.find((x: any) => String(x.user?.id) === String(selectedTeacherID));
                return t ? `Guru: ${t.user?.name || t.name}` : 'Guru Tertentu';
            }
            return 'Semua Dewan Guru & Staff';
        }
    };

    // Format Date ID
    const formatDateIndo = (dStr: string) => {
        try {
            const d = new Date(dStr);
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dStr;
        }
    };

    // Format Time ID
    const formatTimeIndo = (tStr: string | null | undefined) => {
        if (!tStr) return '-';
        try {
            const d = new Date(tStr);
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        } catch {
            return tStr;
        }
    };

    // Export to Excel (.xlsx)
    const handleExportExcel = () => {
        if (attendanceData.length === 0) {
            toast.error('Tidak ada data presensi untuk diekspor!');
            return;
        }

        const wb = XLSX.utils.book_new();
        const rows: any[][] = [];

        // Title Block
        rows.push([`LAPORAN REKAPITULASI PRESENSI ${targetType === 'student' ? 'SISWA' : 'DEWAN GURU & STAFF'}`]);
        rows.push([`Filter: ${getFilterLabel()}`]);
        rows.push([`Periode: ${formatDateIndo(startDate)} s.d. ${formatDateIndo(endDate)}`]);
        rows.push([`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`]);
        rows.push([]);

        // Statistics Block
        rows.push(['RINGKASAN KEHADIRAN']);
        rows.push(['Total Catatan', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa', 'Tingkat Kehadiran']);
        rows.push([
            stats.total,
            stats.present,
            stats.late,
            stats.permission,
            stats.sick,
            stats.absent,
            `${stats.attendanceRate}%`
        ]);
        rows.push([]);

        // Data Table
        if (targetType === 'student') {
            rows.push(['No', 'Tanggal', 'Jam Presensi', 'Nama Siswa', 'NISN', 'Kelas', 'Tipe Presensi', 'Status', 'Metode Scan', 'Catatan / Alasan']);
            attendanceData.forEach((att: any, idx: number) => {
                rows.push([
                    idx + 1,
                    formatDateIndo(att.timestamp),
                    formatTimeIndo(att.timestamp),
                    att.student?.user?.name || '-',
                    att.student?.nisn || '-',
                    att.student?.class?.name || '-',
                    att.type || 'CheckIn',
                    statusConfig[att.status]?.label || att.status,
                    att.method || 'Manual',
                    att.notes || '-'
                ]);
            });
        } else {
            rows.push(['No', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Nama Guru / Staff', 'NIP / NUPTK', 'Status', 'Keterlambatan', 'Metode Scan', 'Catatan']);
            attendanceData.forEach((att: any, idx: number) => {
                rows.push([
                    idx + 1,
                    formatDateIndo(att.date || att.check_in_time),
                    formatTimeIndo(att.check_in_time),
                    formatTimeIndo(att.check_out_time),
                    att.user?.name || '-',
                    att.user?.teacher?.nip || '-',
                    statusConfig[att.status]?.label || att.status,
                    att.late_minutes ? `${att.late_minutes} menit` : '-',
                    att.method || 'Face',
                    att.notes || '-'
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Auto width
        const colWidths = rows.reduce((acc: number[], row: any[]) => {
            row.forEach((cell, colIdx) => {
                const len = cell ? String(cell).length : 5;
                acc[colIdx] = Math.max(acc[colIdx] || 10, len + 3);
            });
            return acc;
        }, []);
        ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 40) }));

        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi');
        const filename = `Rekap_Presensi_${targetType}_${startDate}_sd_${endDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        toast.success(`Berhasil mengunduh Excel: ${filename}`);
    };

    // Export to CSV (.csv)
    const handleExportCSV = () => {
        if (attendanceData.length === 0) {
            toast.error('Tidak ada data presensi untuk diekspor!');
            return;
        }

        const rows: string[][] = [];
        rows.push([`"LAPORAN REKAPITULASI PRESENSI ${targetType === 'student' ? 'SISWA' : 'GURU & STAFF'}"`]);
        rows.push([`"Filter: ${getFilterLabel()}"`]);
        rows.push([`"Periode: ${formatDateIndo(startDate)} s.d. ${formatDateIndo(endDate)}"`]);
        rows.push([]);

        if (targetType === 'student') {
            rows.push(['No', 'Tanggal', 'Waktu', 'Nama Siswa', 'NISN', 'Kelas', 'Tipe', 'Status', 'Metode', 'Keterangan']);
            attendanceData.forEach((att: any, idx: number) => {
                rows.push([
                    String(idx + 1),
                    `"${formatDateIndo(att.timestamp)}"`,
                    `"${formatTimeIndo(att.timestamp)}"`,
                    `"${att.student?.user?.name || '-'}"`,
                    `"${att.student?.nisn || '-'}"`,
                    `"${att.student?.class?.name || '-'}"`,
                    `"${att.type || 'CheckIn'}"`,
                    `"${statusConfig[att.status]?.label || att.status}"`,
                    `"${att.method || 'Manual'}"`,
                    `"${att.notes || '-'}"`
                ]);
            });
        } else {
            rows.push(['No', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Nama Guru', 'NIP', 'Status', 'Terlambat', 'Metode', 'Catatan']);
            attendanceData.forEach((att: any, idx: number) => {
                rows.push([
                    String(idx + 1),
                    `"${formatDateIndo(att.date || att.check_in_time)}"`,
                    `"${formatTimeIndo(att.check_in_time)}"`,
                    `"${formatTimeIndo(att.check_out_time)}"`,
                    `"${att.user?.name || '-'}"`,
                    `"${att.user?.teacher?.nip || '-'}"`,
                    `"${statusConfig[att.status]?.label || att.status}"`,
                    `"${att.late_minutes ? `${att.late_minutes} menit` : '-'}"`,
                    `"${att.method || 'Face'}"`,
                    `"${att.notes || '-'}"`
                ]);
            });
        }

        const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rekap_Presensi_${targetType}_${startDate}_sd_${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Berhasil mengunduh file CSV');
    };

    // Print / PDF View
    const handlePrint = () => {
        if (attendanceData.length === 0) {
            toast.error('Tidak ada data presensi untuk dicetak!');
            return;
        }
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Header Title with Back Action (hidden on print) */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            type="button"
                            className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-sm active:scale-95"
                            title="Kembali ke Presensi"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Export & Rekap Data Presensi
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Filter fleksibel per kelas, per siswa, atau dewan guru dengan format Excel, CSV & Cetak PDF
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={isLoading || attendanceData.length === 0}
                        className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <FileText size={16} className="text-blue-600" />
                        <span>CSV</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={isLoading || attendanceData.length === 0}
                        className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        <FileSpreadsheet size={16} />
                        <span>Unduh Excel</span>
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={isLoading || attendanceData.length === 0}
                        className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <Printer size={16} />
                        <span>Cetak / PDF</span>
                    </button>
                </div>
            </div>

            {/* Print Only Header (Visible only when printing) */}
            <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                        REKAPITULASI PRESENSI & KEHADIRAN
                    </h2>
                    <p className="text-sm font-semibold text-slate-700 mt-1">
                        {targetType === 'student' ? 'Presensi Siswa' : 'Presensi Dewan Guru & Staff Tenaga Pendidik'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-300">
                        <span><strong>Filter Subjek:</strong> {getFilterLabel()}</span>
                        <span><strong>Periode:</strong> {formatDateIndo(startDate)} s.d. {formatDateIndo(endDate)}</span>
                        <span><strong>Dicetak pada:</strong> {new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            </div>

            {/* Filter Section (Glass Card - hidden on print) */}
            <CardGlass className="p-6 print:hidden space-y-6">
                {/* 1. Target Selector (Siswa vs Guru) */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Filter size={14} className="text-emerald-600" />
                        Pilih Kategori Subjek
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                        <button
                            type="button"
                            onClick={() => {
                                setTargetType('student');
                                setSelectedTeacherID('');
                            }}
                            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${
                                targetType === 'student'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                        >
                            <Users size={16} />
                            Presensi Siswa
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTargetType('teacher');
                                setSelectedClassID('');
                                setSelectedStudentID('');
                            }}
                            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${
                                targetType === 'teacher'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                        >
                            <GraduationCap size={16} />
                            Guru & Staff
                        </button>
                    </div>
                </div>

                {/* 2. Specific Scope Filters */}
                {targetType === 'student' ? (
                    <div className="space-y-4 pt-2 border-t border-slate-200/60">
                        {/* Scope Toggle: Per Kelas vs Per Siswa */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-600">Metode Filter Siswa:</span>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStudentScope('class');
                                        setSelectedStudentID('');
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                        studentScope === 'class'
                                            ? 'bg-white text-emerald-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Per Kelas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStudentScope('student')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                        studentScope === 'student'
                                            ? 'bg-white text-emerald-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Per Siswa Spesifik
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Pilih Kelas
                                </label>
                                <select
                                    value={selectedClassID}
                                    onChange={(e) => {
                                        setSelectedClassID(e.target.value);
                                        setSelectedStudentID('');
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                                >
                                    <option value="">Semua Kelas</option>
                                    {classes.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {studentScope === 'student' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Pilih Siswa
                                    </label>
                                    <select
                                        value={selectedStudentID}
                                        onChange={(e) => setSelectedStudentID(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                                    >
                                        <option value="">Pilih Siswa...</option>
                                        {students.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                {s.user?.name || s.name} ({s.nisn || 'NISN -'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Filter Status Kehadiran
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="Present">Hadir</option>
                                    <option value="Late">Terlambat</option>
                                    <option value="Permission">Izin</option>
                                    <option value="Sick">Sakit</option>
                                    <option value="Absent">Alpa / Absen</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Pilih Guru / Staff
                            </label>
                            <select
                                value={selectedTeacherID}
                                onChange={(e) => setSelectedTeacherID(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                            >
                                <option value="">Semua Guru & Staff</option>
                                {teachers.map((t: any) => (
                                    <option key={t.id} value={t.user?.id}>
                                        {t.user?.name || t.name} {t.nip ? `(NIP: ${t.nip})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Filter Status Kehadiran
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                            >
                                <option value="all">Semua Status</option>
                                <option value="Present">Hadir</option>
                                <option value="Late">Terlambat</option>
                                <option value="Permission">Izin</option>
                                <option value="Sick">Sakit</option>
                                <option value="Absent">Alpa / Absen</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* 3. Date Range and Preset Pills */}
                <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={14} className="text-emerald-600" />
                            Rentang Tanggal (Periode)
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handlePreset('today')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePreset('last7')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                7 Hari Terakhir
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePreset('month')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                Bulan Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePreset('lastMonth')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                Bulan Lalu
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="block text-xs font-medium text-slate-500 mb-1">Dari Tanggal:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-slate-500 mb-1">Sampai Tanggal:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>
                    </div>
                </div>
            </CardGlass>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <CardGlass className="p-3.5 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase">Total Record</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 block">{stats.total}</span>
                    <span className="text-[10px] text-slate-400">Presensi</span>
                </CardGlass>
                <CardGlass className="p-3.5 text-center border-l-4 border-l-emerald-500">
                    <span className="text-[11px] font-semibold text-emerald-700 block uppercase">Hadir Tepat</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 block">{stats.present}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Tepat Waktu</span>
                </CardGlass>
                <CardGlass className="p-3.5 text-center border-l-4 border-l-amber-500">
                    <span className="text-[11px] font-semibold text-amber-700 block uppercase">Terlambat</span>
                    <span className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5 block">{stats.late}</span>
                    <span className="text-[10px] text-amber-600 font-medium">Late check-in</span>
                </CardGlass>
                <CardGlass className="p-3.5 text-center border-l-4 border-l-blue-500">
                    <span className="text-[11px] font-semibold text-blue-700 block uppercase">Izin</span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-700 mt-0.5 block">{stats.permission}</span>
                    <span className="text-[10px] text-blue-600 font-medium">Permit</span>
                </CardGlass>
                <CardGlass className="p-3.5 text-center border-l-4 border-l-purple-500">
                    <span className="text-[11px] font-semibold text-purple-700 block uppercase">Sakit</span>
                    <span className="text-xl sm:text-2xl font-bold text-purple-700 mt-0.5 block">{stats.sick}</span>
                    <span className="text-[10px] text-purple-600 font-medium">Surat dokter</span>
                </CardGlass>
                <CardGlass className="p-3.5 text-center border-l-4 border-l-rose-500">
                    <span className="text-[11px] font-semibold text-rose-700 block uppercase">Alpa / Absen</span>
                    <span className="text-xl sm:text-2xl font-bold text-rose-700 mt-0.5 block">{stats.absent}</span>
                    <span className="text-[10px] text-rose-600 font-medium">Tanpa keterangan</span>
                </CardGlass>
            </div>

            {/* Preview Table Card */}
            <CardGlass className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">
                            Pratinjau Data ({filteredRecords.length} dari {attendanceData.length})
                        </h2>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                            title="Segarkan Data"
                        >
                            <RefreshCw size={13} className={isFetching ? 'animate-spin text-emerald-600' : ''} />
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            value={previewSearch}
                            onChange={(e) => setPreviewSearch(e.target.value)}
                            placeholder="Cari dalam pratinjau..."
                            className="w-full px-3 py-1.5 pl-8 text-xs bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                        />
                        <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-slate-400 text-xs">Memuat data rekap presensi...</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                        Tidak ada data presensi yang sesuai dengan filter yang dipilih.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <TableGlass>
                            <TableHeaderGlass>
                                <TableRowGlass>
                                    <TableHeadGlass className="w-12">No</TableHeadGlass>
                                    <TableHeadGlass>Tanggal</TableHeadGlass>
                                    <TableHeadGlass>{targetType === 'student' ? 'Waktu' : 'Jam Masuk / Pulang'}</TableHeadGlass>
                                    <TableHeadGlass>{targetType === 'student' ? 'Nama Siswa' : 'Nama Guru / Staff'}</TableHeadGlass>
                                    <TableHeadGlass>{targetType === 'student' ? 'NISN & Kelas' : 'NIP / Jabatan'}</TableHeadGlass>
                                    <TableHeadGlass>Status</TableHeadGlass>
                                    <TableHeadGlass>Metode Scan</TableHeadGlass>
                                    {targetType === 'teacher' && <TableHeadGlass>Potongan Denda</TableHeadGlass>}
                                    <TableHeadGlass>Keterangan</TableHeadGlass>
                                    {targetType === 'teacher' && <TableHeadGlass className="print:hidden text-center">Aksi</TableHeadGlass>}
                                </TableRowGlass>
                            </TableHeaderGlass>
                            <TableBodyGlass>
                                {filteredRecords.map((att: any, idx: number) => {
                                    const conf = statusConfig[att.status] || {
                                        label: att.status,
                                        bg: 'bg-slate-100 text-slate-700 border-slate-200',
                                        icon: CheckCircle
                                    };
                                    const Icon = conf.icon;

                                    return (
                                        <TableRowGlass key={att.id || idx}>
                                            <TableCellGlass className="text-slate-500 font-mono text-xs">
                                                {idx + 1}
                                            </TableCellGlass>
                                            <TableCellGlass className="text-xs font-medium text-slate-800 whitespace-nowrap">
                                                {formatDateIndo(att.timestamp || att.date || att.check_in_time)}
                                            </TableCellGlass>
                                            <TableCellGlass className="font-mono text-xs text-slate-600 whitespace-nowrap">
                                                {targetType === 'student' ? (
                                                    <span>{formatTimeIndo(att.timestamp)}</span>
                                                ) : (
                                                    <span>
                                                        {formatTimeIndo(att.check_in_time)}
                                                        {att.check_out_time && ` - ${formatTimeIndo(att.check_out_time)}`}
                                                    </span>
                                                )}
                                            </TableCellGlass>
                                            <TableCellGlass className="font-bold text-slate-900 text-xs">
                                                {targetType === 'student'
                                                    ? att.student?.user?.name || '-'
                                                    : att.user?.name || '-'}
                                            </TableCellGlass>
                                            <TableCellGlass className="text-xs text-slate-600">
                                                {targetType === 'student' ? (
                                                    <div>
                                                        <span className="font-mono text-[11px] text-slate-500 block">
                                                             {att.student?.nisn || '-'}
                                                        </span>
                                                        <span className="font-medium text-emerald-800">
                                                            {att.student?.class?.name || 'Tanpa Kelas'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="font-mono text-[11px] text-slate-500 block">
                                                            {att.user?.teacher?.nip || 'Guru / Tenaga Pendidik'}
                                                        </span>
                                                    </div>
                                                )}
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${conf.bg}`}>
                                                    <Icon size={12} />
                                                    {conf.label}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass className="text-xs text-slate-500 font-mono">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                                    {att.method || (targetType === 'student' ? 'Manual' : 'Face')}
                                                </span>
                                            </TableCellGlass>
                                            {targetType === 'teacher' && (
                                                <TableCellGlass className="text-xs font-mono">
                                                    {att.is_penalty_waived ? (
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                <ShieldCheck size={11} /> Dihapus
                                                            </span>
                                                            {att.original_penalty > 0 && (
                                                                <span className="text-[10px] text-slate-400 line-through block">
                                                                    Rp {Number(att.original_penalty).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                            {att.penalty_waived_reason && (
                                                                <span className="text-[10px] text-slate-500 block italic max-w-xs truncate" title={att.penalty_waived_reason}>
                                                                    Ket: {att.penalty_waived_reason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : att.penalty_amount > 0 ? (
                                                        <div className="space-y-0.5">
                                                            <span className="font-bold text-rose-700 block">
                                                                Rp {Number(att.penalty_amount).toLocaleString('id-ID')}
                                                            </span>
                                                            {att.late_minutes > 0 && (
                                                                <span className="text-[10px] text-amber-700 block">
                                                                    ({att.late_minutes} menit)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </TableCellGlass>
                                            )}
                                            <TableCellGlass className="text-xs text-slate-500 max-w-xs truncate">
                                                {att.notes || (att.late_minutes ? `Terlambat ${att.late_minutes} menit` : '-')}
                                            </TableCellGlass>
                                            {targetType === 'teacher' && (
                                                <TableCellGlass className="print:hidden text-center">
                                                    {att.penalty_amount > 0 && (user?.role_id === 1 || user?.role_id === 8 || user?.role_id === 9) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenWaiveModal(att)}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition shadow-xs flex items-center gap-1 active:scale-95 mx-auto"
                                                            title="Hapus denda keterlambatan ini"
                                                        >
                                                            <Trash2 size={12} />
                                                            <span>Hapus Potongan</span>
                                                        </button>
                                                    )}
                                                </TableCellGlass>
                                            )}
                                        </TableRowGlass>
                                    );
                                })}
                            </TableBodyGlass>
                        </TableGlass>
                    </div>
                )}
            </CardGlass>

            {/* Print Signature Section (Visible ONLY on print) */}
            <div className="hidden print:grid grid-cols-2 gap-12 mt-12 pt-8 text-center text-xs">
                <div>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="font-bold text-slate-800 mt-0.5">Kepala Sekolah / Wali Kelas</p>
                    <div className="h-20"></div>
                    <p className="font-bold text-slate-900 underline">( ............................................ )</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">NIP: .......................................</p>
                </div>
                <div>
                    <p className="text-slate-500">
                        Dicetak pada tanggal: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="font-bold text-slate-800 mt-0.5">Petugas Tata Usaha / Operator</p>
                    <div className="h-20"></div>
                    <p className="font-bold text-slate-900 underline">( {user?.name || 'Administrator'} )</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sistem Informasi Manajemen Presensi</p>
                </div>
            </div>

            {/* ─── Modal Dialog: Hapus / Waive Potongan Denda Keterlambatan Guru ─── */}
            {waiveModalOpen && selectedWaiveRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-rose-100 text-rose-700">
                                <Trash2 size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    Hapus Potongan Denda Guru
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Dispensasi atau pembatalan denda keterlambatan
                                </p>
                            </div>
                        </div>

                        {/* Rincian Record */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nama Guru / Staf:</span>
                                <span className="font-bold text-slate-800">{selectedWaiveRecord.user?.name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tanggal Presensi:</span>
                                <span className="font-medium text-slate-700">{formatDateIndo(selectedWaiveRecord.date || selectedWaiveRecord.check_in_time)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Keterlambatan:</span>
                                <span className="font-bold text-amber-700">{selectedWaiveRecord.late_minutes} Menit</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1.5">
                                <span className="text-slate-700 font-semibold">Nominal Potongan Denda:</span>
                                <span className="font-extrabold text-rose-700 text-sm">
                                    Rp {Number(selectedWaiveRecord.penalty_amount || 0).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        {/* Input Alasan Penghapusan */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Alasan / Keterangan Penghapusan Potongan: <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={waiveReason}
                                onChange={(e) => setWaiveReason(e.target.value)}
                                placeholder="Contoh: Tugas luar sekolah / izin darurat / force majeure..."
                                rows={3}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Catatan ini akan dicatat ke dalam riwayat audit presensi dan slip gaji guru.
                            </p>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setWaiveModalOpen(false);
                                    setSelectedWaiveRecord(null);
                                }}
                                disabled={isSubmittingWaive}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmWaive}
                                disabled={isSubmittingWaive}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 size={13} />
                                {isSubmittingWaive ? 'Menghapus...' : 'Hapus Potongan Denda'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceExportPanel;
