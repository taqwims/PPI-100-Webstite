import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CardGlass from '../../components/ui/glass/CardGlass';
import {
    Calendar, CheckCircle, Clock, XCircle, FileText, Upload,
    Stethoscope, Eye, Briefcase,
    ShieldAlert, RefreshCw, Send, Check
} from 'lucide-react';

interface StaffLeaveItem {
    id: string;
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

export const StaffLeaveRequests: React.FC = () => {
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

    // Form States
    const [leaveType, setLeaveType] = useState<'Duty' | 'Sick' | 'Permission' | 'Dispensation' | 'Leave'>('Duty');
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

    // Calculate requested days
    const calculateDays = () => {
        if (!startDate || !endDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 1;
    };

    // Fetch user's staff leave requests
    const { data: leaveRequests, isLoading: loadingLeaves, refetch } = useQuery<StaffLeaveItem[]>({
        queryKey: ['my-staff-leave-requests'],
        queryFn: async () => {
            const res = await api.get('/staff/leave-requests/my');
            return res.data || [];
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAttachmentFile(file);
            if (file.type.startsWith('image/')) {
                setAttachmentPreview(URL.createObjectURL(file));
            } else {
                setAttachmentPreview(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            toast.error('Mohon isi alasan atau rincian penugasan dengan jelas');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai');
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('type', leaveType);
            formData.append('start_date', startDate);
            formData.append('end_date', endDate);
            formData.append('reason', reason.trim());

            if (attachmentFile) {
                formData.append('attachment', attachmentFile);
            }

            await api.post('/staff/leave-requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Pengajuan izin/tugas luar berhasil dikirim ke Pimpinan & Admin!');
            setReason('');
            setAttachmentFile(null);
            setAttachmentPreview(null);
            queryClient.invalidateQueries({ queryKey: ['my-staff-leave-requests'] });
            setActiveTab('history');
        } catch (err: any) {
            console.error('Error submitting leave:', err);
            toast.error(err.response?.data?.error || 'Gagal mengirim pengajuan. Coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeMeta = (type: string) => {
        switch (type) {
            case 'Duty':
                return {
                    label: 'Tugas Luar Sekolah / Dinas',
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    badge: 'bg-indigo-100 text-indigo-800',
                    icon: Briefcase
                };
            case 'Sick':
                return {
                    label: 'Sakit',
                    color: 'bg-rose-50 text-rose-700 border-rose-200',
                    badge: 'bg-rose-100 text-rose-800',
                    icon: Stethoscope
                };
            case 'Permission':
                return {
                    label: 'Izin Keperluan Pribadi',
                    color: 'bg-amber-50 text-amber-700 border-amber-200',
                    badge: 'bg-amber-100 text-amber-800',
                    icon: Calendar
                };
            case 'Dispensation':
                return {
                    label: 'Dispensasi Khusus',
                    color: 'bg-violet-50 text-violet-700 border-violet-200',
                    badge: 'bg-violet-100 text-violet-800',
                    icon: ShieldAlert
                };
            case 'Leave':
                return {
                    label: 'Cuti Resmi',
                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    badge: 'bg-emerald-100 text-emerald-800',
                    icon: Calendar
                };
            default:
                return {
                    label: type,
                    color: 'bg-slate-50 text-slate-700 border-slate-200',
                    badge: 'bg-slate-100 text-slate-800',
                    icon: Calendar
                };
        }
    };

    const pendingCount = leaveRequests?.filter(l => l.status === 'Pending').length || 0;
    const approvedCount = leaveRequests?.filter(l => l.status === 'Approved').length || 0;
    const rejectedCount = leaveRequests?.filter(l => l.status === 'Rejected').length || 0;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Briefcase className="text-emerald-600" size={28} />
                        Pengajuan Izin, Tugas Luar & Cuti Guru
                    </h1>
                    <p className="text-sm text-slate-500">
                        Ajukan izin tidak hadir, tugas luar dinas (MGMP/lomba), dispensasi, atau cuti langsung ke Pimpinan & Admin.
                    </p>
                </div>

                <button
                    onClick={() => refetch()}
                    className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition flex items-center gap-2 text-xs font-semibold self-start shadow-sm"
                >
                    <RefreshCw size={14} className={loadingLeaves ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CardGlass className="p-4 border-l-4 border-amber-500 bg-amber-50/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Menunggu Persetujuan</p>
                            <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</h3>
                        </div>
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                            <Clock size={20} />
                        </div>
                    </div>
                </CardGlass>

                <CardGlass className="p-4 border-l-4 border-emerald-500 bg-emerald-50/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disetujui Pimpinan</p>
                            <h3 className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</h3>
                        </div>
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </CardGlass>

                <CardGlass className="p-4 border-l-4 border-rose-500 bg-rose-50/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ditolak / Perlu Revisi</p>
                            <h3 className="text-2xl font-black text-rose-600 mt-1">{rejectedCount}</h3>
                        </div>
                        <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                            <XCircle size={20} />
                        </div>
                    </div>
                </CardGlass>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('request')}
                    className={`pb-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                        activeTab === 'request'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Send size={16} />
                    Ajukan Permohonan Baru
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                        activeTab === 'history'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Clock size={16} />
                    Riwayat Pengajuan ({leaveRequests?.length || 0})
                </button>
            </div>

            {/* TAB 1: FORM PENGAJUAN */}
            {activeTab === 'request' && (
                <CardGlass className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Pilihan Jenis */}
                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                Jenis Pengajuan <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {[
                                    { id: 'Duty', label: 'Tugas Luar / Dinas', icon: Briefcase, color: 'text-indigo-600' },
                                    { id: 'Sick', label: 'Sakit', icon: Stethoscope, color: 'text-rose-600' },
                                    { id: 'Permission', label: 'Izin Pribadi', icon: Calendar, color: 'text-amber-600' },
                                    { id: 'Dispensation', label: 'Dispensasi', icon: ShieldAlert, color: 'text-violet-600' },
                                    { id: 'Leave', label: 'Cuti Resmi', icon: Check, color: 'text-emerald-600' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    const isSelected = leaveType === item.id;
                                    return (
                                        <button
                                            type="button"
                                            key={item.id}
                                            onClick={() => setLeaveType(item.id as any)}
                                            className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                                                isSelected
                                                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white/60'
                                            }`}
                                        >
                                            <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 ' + item.color}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-700'}`}>
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Rentang Tanggal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                    Tanggal Mulai <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                    Tanggal Selesai <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                                    required
                                />
                            </div>
                        </div>

                        {/* Total Durasi Notification */}
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-emerald-600" />
                                Durasi yang diajukan:
                            </span>
                            <span className="font-bold bg-emerald-200/60 px-2.5 py-1 rounded-lg">
                                {calculateDays()} Hari Kerja
                            </span>
                        </div>

                        {/* Alasan / Uraian Tugas Dinas */}
                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Alasan & Rincian Penugasan / Keperluan <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                                placeholder="Jelaskan alasan izin secara rinci, contoh: Menghadiri Rapat Koordinasi MKKS di Kantor Dinas Pendidikan / Sakit demam bedrest sesuai saran dokter..."
                                className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm leading-relaxed"
                                required
                            />
                        </div>

                        {/* Lampiran Bukti / Surat Tugas / Surat Dokter */}
                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Unggah Dokumen Pendukung (Surat Tugas / Surat Dokter)
                            </label>
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 transition bg-white/40">
                                <input
                                    type="file"
                                    id="fileUpload"
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf"
                                    className="hidden"
                                />
                                <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                                        <Upload size={24} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">
                                        {attachmentFile ? attachmentFile.name : 'Klik untuk memilih dokumen / foto'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Format PDF, JPG, PNG (Maks. 5 MB)
                                    </span>
                                </label>

                                {attachmentPreview && (
                                    <div className="mt-4 inline-block relative border rounded-xl overflow-hidden shadow-sm">
                                        <img src={attachmentPreview} alt="Preview" className="h-32 object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachmentFile(null);
                                                setAttachmentPreview(null);
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Mengirim Pengajuan...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Kirim Pengajuan ke Pimpinan & Admin
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </CardGlass>
            )}

            {/* TAB 2: RIWAYAT PERMOHONAN */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {loadingLeaves ? (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                            Memuat riwayat pengajuan izin...
                        </div>
                    ) : !leaveRequests || leaveRequests.length === 0 ? (
                        <CardGlass className="p-12 text-center">
                            <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
                            <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Pengajuan</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                                Anda belum pernah membuat pengajuan izin atau tugas luar dinas.
                            </p>
                            <button
                                onClick={() => setActiveTab('request')}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
                            >
                                Buat Pengajuan Sekarang
                            </button>
                        </CardGlass>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {leaveRequests.map((leave) => {
                                const meta = getTypeMeta(leave.type);
                                const Icon = meta.icon;
                                const isPending = leave.status === 'Pending';
                                const isApproved = leave.status === 'Approved';
                                const isRejected = leave.status === 'Rejected';

                                return (
                                    <CardGlass key={leave.id} className="p-5 hover:shadow-md transition">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl ${meta.color} border`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.badge}`}>
                                                        {meta.label}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                                                        {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        <span className="text-slate-400 font-normal ml-2">({leave.total_days_requested} Hari)</span>
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div>
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                                                        <Clock size={12} />
                                                        Menunggu Approval Pimpinan
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                                                        <CheckCircle size={12} />
                                                        Disetujui ({leave.approved_days} Hari)
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                                                        <XCircle size={12} />
                                                        Ditolak
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reason & Notes */}
                                        <div className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl mb-3 leading-relaxed">
                                            <span className="font-bold text-slate-700 block mb-1">Rincian / Alasan:</span>
                                            {leave.reason}
                                        </div>

                                        {/* Approver Notes if any */}
                                        {leave.approval_notes && (
                                            <div className="text-xs text-slate-700 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl mb-3 leading-relaxed">
                                                <span className="font-bold text-emerald-900 block mb-0.5">Catatan Pimpinan / Approver:</span>
                                                {leave.approval_notes}
                                            </div>
                                        )}

                                        {/* Footer meta */}
                                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 pt-1">
                                            <span>
                                                Diajukan pada: {new Date(leave.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                {leave.approver_user && (
                                                    <span className="ml-2 font-medium text-slate-600">
                                                        • Diproses oleh: {leave.approver_user.name}
                                                    </span>
                                                )}
                                            </span>

                                            {leave.attachment_url && (
                                                <button
                                                    onClick={() => setPreviewModalUrl(leave.attachment_url!)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs shadow-xs transition"
                                                >
                                                    <Eye size={12} className="text-emerald-600" />
                                                    Lihat Lampiran
                                                </button>
                                            )}
                                        </div>
                                    </CardGlass>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Preview Attachment */}
            {previewModalUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={16} className="text-emerald-600" />
                                Dokumen Surat / Lampiran Pendukung
                            </h4>
                            <button
                                onClick={() => setPreviewModalUrl(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                            >
                                <XCircle size={20} />
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

export default StaffLeaveRequests;
