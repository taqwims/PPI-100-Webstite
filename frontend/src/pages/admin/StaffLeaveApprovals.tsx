import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CardGlass from '../../components/ui/glass/CardGlass';
import {
    CheckCircle, XCircle, Eye, Check, X,
    Search, ShieldCheck, RefreshCw, Briefcase, Stethoscope,
    Calendar, ShieldAlert, FileText
} from 'lucide-react';

interface StaffLeaveItem {
    id: string;
    user_id: string;
    user: {
        id: string;
        name: string;
        email: string;
        teacher?: {
            nip?: string;
        };
    };
    unit_id: number;
    type: 'Duty' | 'Sick' | 'Permission' | 'Dispensation' | 'Leave';
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
    approver_user?: {
        name: string;
    };
    approved_at?: string;
    created_at: string;
}

export const StaffLeaveApprovals: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLeave, setSelectedLeave] = useState<StaffLeaveItem | null>(null);
    const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

    // Approval Decision Modal State
    const [decisionModalOpen, setDecisionModalOpen] = useState(false);
    const [approvedDays, setApprovedDays] = useState<number>(1);
    const [approvedStartDate, setApprovedStartDate] = useState<string>('');
    const [approvedEndDate, setApprovedEndDate] = useState<string>('');
    const [approvalNotes, setApprovalNotes] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch All Staff Leave Requests
    const { data: leaves, isLoading, refetch } = useQuery<StaffLeaveItem[]>({
        queryKey: ['all-staff-leave-requests'],
        queryFn: async () => {
            const res = await api.get('/staff/leave-requests');
            return res.data || [];
        }
    });

    const handleOpenDecisionModal = (leave: StaffLeaveItem) => {
        setSelectedLeave(leave);
        const reqDays = leave.total_days_requested || 1;
        setApprovedDays(reqDays);
        setApprovedStartDate(leave.start_date.split('T')[0]);
        setApprovedEndDate(leave.end_date.split('T')[0]);
        setApprovalNotes('');
        setDecisionModalOpen(true);
    };

    const handleDaysChange = (days: number) => {
        setApprovedDays(days);
        if (approvedStartDate && days > 0) {
            const start = new Date(approvedStartDate);
            const end = new Date(start);
            end.setDate(start.getDate() + days - 1);
            setApprovedEndDate(end.toISOString().split('T')[0]);
        }
    };

    const handleProcessDecision = async (action: 'Approved' | 'Rejected') => {
        if (!selectedLeave) return;

        if (action === 'Rejected' && !approvalNotes.trim()) {
            toast.error('Mohon isi alasan penolakan pada kolom catatan');
            return;
        }

        try {
            setIsProcessing(true);
            await api.put(`/staff/leave-requests/${selectedLeave.id}/approval`, {
                action,
                approved_days: approvedDays,
                approved_start_date: approvedStartDate,
                approved_end_date: approvedEndDate,
                approval_notes: approvalNotes.trim()
            });

            toast.success(
                action === 'Approved'
                    ? 'Permohonan berhasil disetujui & presensi guru telah dimutakhirkan (bebas denda)'
                    : 'Permohonan berhasil ditolak'
            );

            setDecisionModalOpen(false);
            setSelectedLeave(null);
            queryClient.invalidateQueries({ queryKey: ['all-staff-leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['executive-daily-personnel-status'] });
        } catch (err: any) {
            console.error('Error approving staff leave:', err);
            toast.error(err.response?.data?.error || 'Gagal memproses persetujuan. Coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    const getTypeMeta = (type: string) => {
        switch (type) {
            case 'Duty':
                return {
                    label: 'Tugas Luar / Dinas',
                    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    icon: Briefcase
                };
            case 'Sick':
                return {
                    label: 'Sakit',
                    badge: 'bg-rose-100 text-rose-800 border-rose-200',
                    icon: Stethoscope
                };
            case 'Permission':
                return {
                    label: 'Izin Pribadi',
                    badge: 'bg-amber-100 text-amber-800 border-amber-200',
                    icon: Calendar
                };
            case 'Dispensation':
                return {
                    label: 'Dispensasi Khusus',
                    badge: 'bg-violet-100 text-violet-800 border-violet-200',
                    icon: ShieldAlert
                };
            case 'Leave':
                return {
                    label: 'Cuti',
                    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    icon: Check
                };
            default:
                return {
                    label: type,
                    badge: 'bg-slate-100 text-slate-800 border-slate-200',
                    icon: Calendar
                };
        }
    };

    const allLeaves = leaves || [];
    const pendingList = allLeaves.filter(l => l.status === 'Pending');
    const approvedList = allLeaves.filter(l => l.status === 'Approved');
    const rejectedList = allLeaves.filter(l => l.status === 'Rejected');

    const filteredLeaves = allLeaves.filter(leave => {
        const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
        const matchesSearch =
            leave.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {!isEmbedded && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <ShieldCheck className="text-emerald-600" size={28} />
                            Persetujuan Izin & Tugas Luar Guru / Staf
                        </h1>
                        <p className="text-sm text-slate-500">
                            Persetujuan izin sakit, dinas luar kota/sekolah, dispensasi dan cuti oleh Pimpinan & Admin.
                        </p>
                    </div>

                    <button
                        onClick={() => refetch()}
                        className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition flex items-center gap-2 text-xs font-semibold self-start shadow-sm"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh Data
                    </button>
                </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div
                    onClick={() => setStatusFilter('all')}
                    className={`cursor-pointer p-4 rounded-2xl border transition ${
                        statusFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-white/80 hover:bg-white border-slate-200'
                    }`}
                >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Semua Pengajuan
                    </p>
                    <h3 className="text-2xl font-black mt-1">{allLeaves.length}</h3>
                </div>

                <div
                    onClick={() => setStatusFilter('Pending')}
                    className={`cursor-pointer p-4 rounded-2xl border transition ${
                        statusFilter === 'Pending'
                            ? 'bg-amber-600 text-white shadow-lg'
                            : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Pending' ? 'text-amber-200' : 'text-amber-700'}`}>
                        Menunggu Tindakan
                    </p>
                    <h3 className="text-2xl font-black mt-1">{pendingList.length}</h3>
                </div>

                <div
                    onClick={() => setStatusFilter('Approved')}
                    className={`cursor-pointer p-4 rounded-2xl border transition ${
                        statusFilter === 'Approved'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Approved' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                        Disetujui
                    </p>
                    <h3 className="text-2xl font-black mt-1">{approvedList.length}</h3>
                </div>

                <div
                    onClick={() => setStatusFilter('Rejected')}
                    className={`cursor-pointer p-4 rounded-2xl border transition ${
                        statusFilter === 'Rejected'
                            ? 'bg-rose-600 text-white shadow-lg'
                            : 'bg-rose-50/50 hover:bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Rejected' ? 'text-rose-200' : 'text-rose-700'}`}>
                        Ditolak
                    </p>
                    <h3 className="text-2xl font-black mt-1">{rejectedList.length}</h3>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Cari nama guru atau alasan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                </div>

                <div className="flex items-center gap-2 self-end text-xs text-slate-500">
                    Menampilkan <strong className="text-slate-800">{filteredLeaves.length}</strong> pengajuan
                </div>
            </div>

            {/* List Table / Cards */}
            {isLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    Memuat daftar pengajuan izin guru...
                </div>
            ) : filteredLeaves.length === 0 ? (
                <CardGlass className="p-12 text-center">
                    <ShieldCheck size={48} className="mx-auto mb-3 text-slate-300" />
                    <h3 className="text-base font-bold text-slate-700 mb-1">Tidak Ada Permohonan Ditemukan</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Tidak ada pengajuan izin guru dengan kriteria filter saat ini.
                    </p>
                </CardGlass>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredLeaves.map((leave) => {
                        const meta = getTypeMeta(leave.type);
                        const isPending = leave.status === 'Pending';
                        const isApproved = leave.status === 'Approved';
                        const isRejected = leave.status === 'Rejected';

                        return (
                            <CardGlass key={leave.id} className="p-5 hover:shadow-md transition">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                                            {leave.user?.name?.charAt(0) || 'G'}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">
                                                {leave.user?.name}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                {leave.user?.teacher?.nip ? `NIP: ${leave.user.teacher.nip}` : 'Tenaga Pendidik / Guru'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action or Status Badge */}
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badge}`}>
                                            {meta.label}
                                        </span>

                                        {isPending && (
                                            <button
                                                onClick={() => handleOpenDecisionModal(leave)}
                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                            >
                                                <ShieldCheck size={14} />
                                                Proses Keputusan
                                            </button>
                                        )}
                                        {isApproved && (
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1">
                                                <CheckCircle size={12} />
                                                Disetujui ({leave.approved_days} Hari)
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold flex items-center gap-1">
                                                <XCircle size={12} />
                                                Ditolak
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 mb-3">
                                    <div>
                                        <span className="font-bold text-slate-700 block mb-0.5">Rentang Tanggal Penugasan / Izin:</span>
                                        <p className="font-medium text-slate-800">
                                            📅 {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            <span className="text-emerald-700 font-bold ml-1.5">({leave.total_days_requested} Hari Kerja)</span>
                                        </p>
                                    </div>

                                    <div>
                                        <span className="font-bold text-slate-700 block mb-0.5">Diajukan Pada:</span>
                                        <p>
                                            {new Date(leave.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-xs bg-slate-50/80 p-3 rounded-xl mb-3 leading-relaxed">
                                    <span className="font-bold text-slate-700 block mb-0.5">Alasan / Rincian Penugasan:</span>
                                    <p className="text-slate-800">{leave.reason}</p>
                                </div>

                                {leave.approval_notes && (
                                    <div className="text-xs bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl mb-3 leading-relaxed">
                                        <span className="font-bold text-emerald-950 block mb-0.5">Catatan Pimpinan:</span>
                                        <p className="text-slate-700">{leave.approval_notes}</p>
                                    </div>
                                )}

                                {/* Footer info & attachment */}
                                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 pt-1 border-t border-slate-100">
                                    <span>
                                        {leave.approver_user && `Disetujui oleh: ${leave.approver_user.name}`}
                                    </span>

                                    {leave.attachment_url && (
                                        <button
                                            onClick={() => setPreviewModalUrl(leave.attachment_url!)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition"
                                        >
                                            <Eye size={12} className="text-emerald-600" />
                                            Lihat Surat Tugas / Keterangan
                                        </button>
                                    )}
                                </div>
                            </CardGlass>
                        );
                    })}
                </div>
            )}

            {/* MODAL KEPUTUSAN APPROVAL */}
            {decisionModalOpen && selectedLeave && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl p-6 sm:p-8 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="text-emerald-600" size={20} />
                                Keputusan Permohonan Izin Guru
                            </h3>
                            <button
                                onClick={() => setDecisionModalOpen(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Applicant */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nama Guru:</span>
                                <strong className="text-slate-800">{selectedLeave.user?.name}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Jenis Permohonan:</span>
                                <span className="font-bold text-indigo-700">{selectedLeave.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Permintaan:</span>
                                <span>{selectedLeave.total_days_requested} Hari ({selectedLeave.start_date.split('T')[0]} s/d {selectedLeave.end_date.split('T')[0]})</span>
                            </div>
                            <div className="pt-1 text-slate-600">
                                <span className="text-slate-500 font-bold">Alasan: </span>
                                {selectedLeave.reason}
                            </div>
                        </div>

                        {/* Approval Inputs */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Jumlah Hari yang Disetujui
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={approvedDays}
                                        onChange={(e) => handleDaysChange(parseInt(e.target.value) || 1)}
                                        className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-center"
                                    />
                                    <span className="text-xs text-slate-500">Hari Kerja Bebas Denda</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={approvedStartDate}
                                        onChange={(e) => setApprovedStartDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal Selesai
                                    </label>
                                    <input
                                        type="date"
                                        value={approvedEndDate}
                                        onChange={(e) => setApprovedEndDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Catatan / Disposisi Pimpinan
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Tuliskan catatan dispensasi atau alasan jika menolak..."
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleProcessDecision('Rejected')}
                                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition border border-rose-200 disabled:opacity-50"
                            >
                                Tolak Permohonan
                            </button>

                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleProcessDecision('Approved')}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <Check size={14} />
                                Setujui & Bebaskan Presensi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Preview Attachment */}
            {previewModalUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={16} className="text-emerald-600" />
                                Dokumen Surat Tugas / Keterangan
                            </h4>
                            <button
                                onClick={() => setPreviewModalUrl(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100/50">
                            {previewModalUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={previewModalUrl}
                                    title="Dokumen PDF"
                                    className="w-full h-96 rounded-xl border border-slate-200"
                                />
                            ) : (
                                <img
                                    src={previewModalUrl}
                                    alt="Lampiran"
                                    className="max-h-96 max-w-full object-contain rounded-xl shadow-sm"
                                />
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
                            <a
                                href={previewModalUrl}
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

export default StaffLeaveApprovals;
