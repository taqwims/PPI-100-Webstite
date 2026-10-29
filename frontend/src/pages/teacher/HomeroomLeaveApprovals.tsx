import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CardGlass from '../../components/ui/glass/CardGlass';
import {
    CheckCircle, Clock, XCircle,
    Users, Eye, Check, X,
    Search, ShieldCheck, RefreshCw
} from 'lucide-react';

interface LeaveRequestItem {
    id: string;
    student_id: string;
    student: {
        id: string;
        nisn: string;
        user: { name: string; email: string };
        class?: { name: string };
    };
    applicant_role: 'Student' | 'Parent' | 'Admin';
    applicant_user: {
        name: string;
    };
    type: 'Sick' | 'Permission';
    start_date: string;
    end_date: string;
    total_days_requested: number;
    reason: string;
    attachment_url?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_days: number;
    approved_start_date?: string;
    approved_end_date?: string;
    approval_notes?: string;
    approver_teacher?: {
        user?: { name: string };
    };
    approved_at?: string;
    created_at: string;
}

export const HomeroomLeaveApprovals: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const isAdminOrPrincipal = !!user && (user.role_id <= 3 || user.role_id === 8);
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequestItem | null>(null);
    const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

    // Fetch classes for Admin/Principal
    const { data: classes } = useQuery<any[]>({
        queryKey: ['classes-list'],
        queryFn: async () => {
            const res = await api.get('/classes');
            return res.data || [];
        },
        enabled: isAdminOrPrincipal
    });

    // Approval Decision Modal State
    const [decisionModalOpen, setDecisionModalOpen] = useState(false);
    const [approvedDays, setApprovedDays] = useState<number>(1);
    const [approvedStartDate, setApprovedStartDate] = useState<string>('');
    const [approvedEndDate, setApprovedEndDate] = useState<string>('');
    const [approvalNotes, setApprovalNotes] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch Leave Requests (All for Admin/Principal, Homeroom for teacher)
    const { data: leaves, isLoading, refetch } = useQuery<LeaveRequestItem[]>({
        queryKey: ['student-leave-requests', isAdminOrPrincipal, selectedClassId],
        queryFn: async () => {
            const url = isAdminOrPrincipal
                ? `/academic/leave-requests/all${selectedClassId !== 'all' ? `?class_id=${selectedClassId}` : ''}`
                : '/academic/leave-requests/homeroom';
            const res = await api.get(url);
            return res.data || [];
        }
    });

    // Open Approval Modal
    const handleOpenDecisionModal = (leave: LeaveRequestItem) => {
        setSelectedLeave(leave);
        const reqDays = leave.total_days_requested || 1;
        setApprovedDays(reqDays);
        setApprovedStartDate(leave.start_date.split('T')[0]);
        setApprovedEndDate(leave.end_date.split('T')[0]);
        setApprovalNotes('');
        setDecisionModalOpen(true);
    };

    // Recalculate end date based on approved days
    const handleDaysChange = (days: number) => {
        setApprovedDays(days);
        if (approvedStartDate && days > 0) {
            const start = new Date(approvedStartDate);
            start.setDate(start.getDate() + (days - 1));
            setApprovedEndDate(start.toISOString().split('T')[0]);
        }
    };

    // Process Approval / Rejection
    const handleProcessDecision = async (action: 'Approved' | 'Rejected') => {
        if (!selectedLeave) return;

        if (action === 'Rejected' && !approvalNotes.trim()) {
            toast.error('Mohon cantumkan alasan penolakan pada kolom catatan');
            return;
        }

        setIsProcessing(true);
        try {
            await api.put(`/academic/leave-requests/${selectedLeave.id}/approval`, {
                action: action,
                approved_days: action === 'Approved' ? approvedDays : 0,
                approved_start_date: action === 'Approved' ? approvedStartDate : undefined,
                approved_end_date: action === 'Approved' ? approvedEndDate : undefined,
                approval_notes: approvalNotes.trim()
            });

            toast.success(
                action === 'Approved'
                    ? `Izin ${selectedLeave.student.user.name} berhasil disetujui selama ${approvedDays} hari! Presensi harian telah diperbarui.`
                    : `Pengajuan izin ${selectedLeave.student.user.name} berhasil ditolak.`
            );

            setDecisionModalOpen(false);
            setSelectedLeave(null);
            queryClient.invalidateQueries({ queryKey: ['student-leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['executive-daily-personnel-status'] });
        } catch (err: any) {
            console.error('Error approving leave:', err);
            toast.error(err.response?.data?.error || 'Gagal memproses persetujuan izin');
        } finally {
            setIsProcessing(false);
        }
    };

    const allLeaves = leaves || [];
    const pendingCount = allLeaves.filter(l => l.status === 'Pending').length;
    const approvedCount = allLeaves.filter(l => l.status === 'Approved').length;
    const rejectedCount = allLeaves.filter(l => l.status === 'Rejected').length;

    // Filtered List
    const filteredLeaves = allLeaves.filter(leave => {
        const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
        const matchesSearch =
            leave.student?.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            leave.student?.nisn.includes(searchQuery) ||
            leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white p-6 rounded-3xl shadow-lg">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
                            {isAdminOrPrincipal ? 'Panel Administrator & Pimpinan' : 'Pusat Persetujuan Wali Kelas'}
                        </span>
                        {pendingCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-xs font-bold animate-pulse">
                                {pendingCount} Perlu Ditindaklanjuti
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {isAdminOrPrincipal ? 'Persetujuan & Monitoring Izin Seluruh Siswa' : 'Persetujuan Izin & Sakit Siswa'}
                    </h1>
                    <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
                        {isAdminOrPrincipal
                            ? 'Pantau dan berikan persetujuan dispensasi/izin siswa lintas kelas secara terpusat. Sistem akan otomatis memperbarui buku presensi harian.'
                            : 'Tinjau permohonan ketidakhadiran siswa di kelas perwalian Anda. Tentukan jumlah hari yang disetujui, dan sistem akan langsung memperbarui buku presensi harian secara otomatis.'}
                    </p>
                </div>

                <button
                    onClick={() => refetch()}
                    className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                >
                    <RefreshCw size={14} /> Refresh Data
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CardGlass className="p-5 flex items-center justify-between border-l-4 border-l-amber-500">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Menunggu Persetujuan</p>
                        <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Membutuhkan tindakan Anda</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                        <Clock size={28} />
                    </div>
                </CardGlass>

                <CardGlass className="p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Telah Disetujui</p>
                        <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{approvedCount}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tercatat di presensi harian</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                        <CheckCircle size={28} />
                    </div>
                </CardGlass>

                <CardGlass className="p-5 flex items-center justify-between border-l-4 border-l-red-500">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Ditolak</p>
                        <h3 className="text-2xl font-extrabold text-red-600 mt-1">{rejectedCount}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Permohonan tidak diizinkan</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                        <XCircle size={28} />
                    </div>
                </CardGlass>
            </div>

            {/* Filter & Search Bar */}
            <CardGlass className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold overflow-x-auto">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3.5 py-1.5 rounded-xl transition ${
                            statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Semua ({allLeaves.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('Pending')}
                        className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                            statusFilter === 'Pending' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Menunggu ({pendingCount})
                        {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                    </button>
                    <button
                        onClick={() => setStatusFilter('Approved')}
                        className={`px-3.5 py-1.5 rounded-xl transition ${
                            statusFilter === 'Approved' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Disetujui ({approvedCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('Rejected')}
                        className={`px-3.5 py-1.5 rounded-xl transition ${
                            statusFilter === 'Rejected' ? 'bg-white text-red-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Ditolak ({rejectedCount})
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                    {isAdminOrPrincipal && classes && classes.length > 0 && (
                        <div className="w-full sm:w-48">
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="all">Semua Kelas</option>
                                {classes.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative w-full sm:w-64">
                        <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari siswa, NISN, alasan..."
                            className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </CardGlass>

            {/* List of Leave Requests */}
            {isLoading ? (
                <CardGlass className="p-12 text-center text-xs text-slate-400">
                    Memuat data permohonan izin siswa...
                </CardGlass>
            ) : filteredLeaves.length === 0 ? (
                <CardGlass className="p-12 text-center text-slate-400 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                        <Users size={32} />
                    </div>
                    <h4 className="text-base font-bold text-slate-700">Tidak Ada Permohonan Izin</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {statusFilter === 'Pending'
                            ? 'Alhamdulillah, tidak ada permohonan izin siswa yang sedang menunggu tindakan Anda.'
                            : 'Tidak ditemukan data pengajuan izin dengan filter pencarian ini.'}
                    </p>
                </CardGlass>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLeaves.map((leave) => {
                        const isPending = leave.status === 'Pending';
                        const isApproved = leave.status === 'Approved';
                        const isRejected = leave.status === 'Rejected';

                        return (
                            <CardGlass
                                key={leave.id}
                                className={`p-5 space-y-4 flex flex-col justify-between transition-all border-2 ${
                                    isPending
                                        ? 'border-amber-300 bg-amber-50/20 shadow-md'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="space-y-3">
                                    {/* Student Header & Status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                                                {leave.student?.user?.name?.charAt(0) || 'S'}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 truncate">
                                                    {leave.student?.user?.name}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    NISN: {leave.student?.nisn} • Kelas: {leave.student?.class?.name || 'Perwalian'}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 ${
                                            isApproved
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                : isRejected
                                                ? 'bg-red-100 text-red-800 border border-red-200'
                                                : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                        }`}>
                                            {isApproved && <CheckCircle size={13} />}
                                            {isRejected && <XCircle size={13} />}
                                            {isPending && <Clock size={13} />}
                                            {isApproved ? `Disetujui (${leave.approved_days} Hari)` : isRejected ? 'Ditolak' : 'Perlu Tindakan'}
                                        </span>
                                    </div>

                                    {/* Leave Type & Date Span Badge */}
                                    <div className="p-3 bg-white rounded-2xl border border-slate-100 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                                leave.type === 'Sick'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                            }`}>
                                                {leave.type === 'Sick' ? '🏥 Sakit' : '📝 Izin'}
                                            </span>

                                            <span className="text-[11px] text-slate-500">
                                                Diajukan oleh: <strong className="text-slate-700">{leave.applicant_role === 'Parent' ? 'Orang Tua' : 'Siswa Sendiri'}</strong>
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-700">
                                            <span>Rentang Permohonan:</span>
                                            <span className="font-bold text-slate-900">
                                                {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                <span className="text-emerald-700 ml-1">({leave.total_days_requested} Hari)</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Alasan Siswa:</span>
                                        <p className="leading-relaxed">{leave.reason}</p>
                                    </div>

                                    {/* Homeroom Approval Feedback Note if already approved/rejected */}
                                    {leave.approval_notes && (
                                        <div className={`p-3 rounded-2xl text-xs border ${
                                            isApproved ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                                        }`}>
                                            <span className="font-bold block text-[10px] uppercase mb-0.5">
                                                Keputusan & Catatan Anda:
                                            </span>
                                            <p>{leave.approval_notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Actions */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    {leave.attachment_url ? (
                                        <button
                                            onClick={() => setPreviewModalUrl(leave.attachment_url!)}
                                            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                                        >
                                            <Eye size={14} /> Surat Lampiran
                                        </button>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 italic">Tanpa surat lampiran</span>
                                    )}

                                    {isPending ? (
                                        <button
                                            onClick={() => handleOpenDecisionModal(leave)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center gap-1.5"
                                        >
                                            <ShieldCheck size={14} /> Tinjau & Beri Persetujuan
                                        </button>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            Diproses {leave.approved_at ? new Date(leave.approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                                        </span>
                                    )}
                                </div>
                            </CardGlass>
                        );
                    })}
                </div>
            )}

            {/* ─── MODAL KEPUTUSAN PERSETUJUAN WALI KELAS ─── */}
            {decisionModalOpen && selectedLeave && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-600" size={20} />
                                    Persetujuan Ketidakhadiran Siswa
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tentukan persetujuan dan jumlah hari izin yang disahkan
                                </p>
                            </div>
                            <button
                                onClick={() => setDecisionModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Student Brief */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{selectedLeave.student?.user?.name}</p>
                                <p className="text-slate-500">
                                    NISN {selectedLeave.student?.nisn} • Jenis: <strong className="text-slate-700">{selectedLeave.type === 'Sick' ? 'Sakit' : 'Izin'}</strong>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-500">Permohonan:</span>
                                <p className="font-bold text-emerald-700">{selectedLeave.total_days_requested} Hari</p>
                            </div>
                        </div>

                        {/* Reason Display */}
                        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs space-y-1">
                            <span className="font-bold text-amber-900 block text-[10px] uppercase">Alasan Siswa:</span>
                            <p className="text-amber-800 leading-relaxed">{selectedLeave.reason}</p>
                        </div>

                        {/* Approved Days Selection (FITUR UTAMA: PILIHAN BERAPA HARI YANG DIIZINKAN) */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Pilihan Jumlah Hari yang Diizinkan:
                            </label>
                            
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={approvedDays}
                                    onChange={(e) => handleDaysChange(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-24 px-3.5 py-2.5 bg-white border-2 border-emerald-500 rounded-xl text-center font-extrabold text-lg text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                />
                                <span className="text-xs font-semibold text-slate-700">Hari Disetujui</span>

                                {/* Quick Presets */}
                                <div className="flex gap-1.5 ml-auto">
                                    {[1, 2, 3].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleDaysChange(num)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                                approvedDays === num
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                            }`}
                                        >
                                            {num} Hari
                                        </button>
                                    ))}
                                    {selectedLeave.total_days_requested > 3 && (
                                        <button
                                            type="button"
                                            onClick={() => handleDaysChange(selectedLeave.total_days_requested)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                                approvedDays === selectedLeave.total_days_requested
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                            }`}
                                        >
                                            Semua ({selectedLeave.total_days_requested} Hari)
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Range Preview */}
                            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                📅 Tanggal Izin Berlaku: <strong className="text-slate-800">{new Date(approvedStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d {new Date(approvedEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                                <br />
                                <span className="text-emerald-700 font-medium">* Tanggal-tanggal ini otomatis tercatat dengan status {selectedLeave.type === 'Sick' ? 'Sakit' : 'Izin'} di presensi harian siswa.</span>
                            </p>
                        </div>

                        {/* Approval Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Catatan / Pesan untuk Siswa & Orang Tua (Opsional)
                            </label>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={2}
                                placeholder="Contoh: Semoga lekas sembuh, jangan lupa istirahat yang cukup ya."
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs resize-none"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleProcessDecision('Rejected')}
                                className="w-full sm:w-auto px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                <X size={15} /> Tolak Permohonan
                            </button>

                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleProcessDecision('Approved')}
                                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshCw size={15} className="animate-spin" />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        <span>Setujui Izin ({approvedDays} Hari)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Attachment Preview Modal */}
            {previewModalUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-800">Lampiran Dokumen Surat Izin Siswa</h3>
                            <button
                                onClick={() => setPreviewModalUrl(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-2 flex items-center justify-center">
                            {previewModalUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={previewModalUrl} title="Dokumen" className="w-full h-96 rounded-xl" />
                            ) : (
                                <img src={previewModalUrl} alt="Lampiran Surat" className="max-w-full max-h-[65vh] object-contain rounded-xl" />
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <a
                                href={previewModalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                            >
                                Buka di Tab Baru
                            </a>
                            <button
                                onClick={() => setPreviewModalUrl(null)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeroomLeaveApprovals;
