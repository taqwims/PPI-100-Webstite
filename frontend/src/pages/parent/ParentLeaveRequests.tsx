import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CardGlass from '../../components/ui/glass/CardGlass';
import {
    Calendar, CheckCircle, Clock, XCircle, FileText, Upload,
    AlertCircle, Stethoscope, Eye, Sparkles, RefreshCw
} from 'lucide-react';

interface ChildStudent {
    id: string;
    nisn: string;
    user: {
        name: string;
    };
    class?: {
        name: string;
    };
}

interface LeaveRequestItem {
    id: string;
    student_id: string;
    student: {
        user: { name: string };
        class?: { name: string };
    };
    applicant_role: string;
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
    created_at: string;
}

export const ParentLeaveRequests: React.FC = () => {
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
    const [selectedChildID, setSelectedChildID] = useState<string>('');
    const [leaveType, setLeaveType] = useState<'Sick' | 'Permission'>('Sick');
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

    // Fetch Parent's Children
    const { data: children, isLoading: loadingChildren } = useQuery<ChildStudent[]>({
        queryKey: ['parent-children-list'],
        queryFn: async () => {
            const res = await api.get('/students/children');
            const list = res.data || [];
            if (list.length > 0 && !selectedChildID) {
                setSelectedChildID(list[0].id);
            }
            return list;
        }
    });

    // Fetch Leave Requests for all children
    const { data: leaveRequests, isLoading: loadingLeaves } = useQuery<LeaveRequestItem[]>({
        queryKey: ['parent-children-leaves'],
        queryFn: async () => {
            const res = await api.get('/academic/leave-requests/children');
            return res.data || [];
        }
    });

    const calculateDays = () => {
        if (!startDate || !endDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 1;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 5MB');
            return;
        }

        setAttachmentFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => setAttachmentPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setAttachmentPreview(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChildID) {
            toast.error('Pilih anak yang diajukan izinnya terlebih dahulu');
            return;
        }
        if (!reason.trim()) {
            toast.error('Mohon isi alasan permohonan izin');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('student_id', selectedChildID);
        formData.append('type', leaveType);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);
        formData.append('reason', reason.trim());
        if (attachmentFile) {
            formData.append('attachment', attachmentFile);
        }

        try {
            await api.post('/academic/leave-requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Pengajuan izin ananda berhasil dikirim ke Wali Kelas!');
            setReason('');
            setAttachmentFile(null);
            setAttachmentPreview(null);
            queryClient.invalidateQueries({ queryKey: ['parent-children-leaves'] });
            setActiveTab('history');
        } catch (err: any) {
            console.error('Leave request error:', err);
            toast.error(err.response?.data?.error || 'Gagal mengirim pengajuan izin');
        } finally {
            setSubmitting(false);
        }
    };

    const requestedDays = calculateDays();

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 rounded-3xl shadow-lg">
                <div>
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider inline-block mb-2">
                        Portal Orang Tua / Wali
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Pengajuan Izin Ketidakhadiran Anak
                    </h1>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
                        Kirim surat permohonan izin atau surat sakit ananda langsung ke Wali Kelas dengan notifikasi otomatis.
                    </p>
                </div>

                <div className="flex bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 text-xs font-semibold self-start sm:self-center">
                    <button
                        onClick={() => setActiveTab('request')}
                        className={`px-4 py-2 rounded-xl transition-all ${
                            activeTab === 'request'
                                ? 'bg-white text-blue-900 shadow-md font-bold'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Formulir Pengajuan
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                            activeTab === 'history'
                                ? 'bg-white text-blue-900 shadow-md font-bold'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Status & Riwayat
                        {leaveRequests && leaveRequests.filter(l => l.status === 'Pending').length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: FORMULIR */}
            {activeTab === 'request' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7">
                        <CardGlass className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Permohonan Izin / Sakit Ananda</h3>
                                <p className="text-xs text-slate-500">Pilih ananda dan isi keterangan ketidakhadiran</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Child Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Pilih Ananda <span className="text-red-500">*</span>
                                    </label>
                                    {loadingChildren ? (
                                        <div className="text-xs text-slate-400 py-2">Memuat data anak...</div>
                                    ) : !children || children.length === 0 ? (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                                            Belum ada data anak yang terhubung ke akun Anda. Silakan hubungi admin sekolah.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {children.map((child) => {
                                                const isSelected = selectedChildID === child.id;
                                                return (
                                                    <div
                                                        key={child.id}
                                                        onClick={() => setSelectedChildID(child.id)}
                                                        className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center gap-3 ${
                                                            isSelected
                                                                ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                                                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                                        }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {child.user?.name?.charAt(0) || 'A'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold truncate">{child.user?.name}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {child.class?.name || 'Siswa'} • NISN: {child.nisn}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Type Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Jenis Izin
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setLeaveType('Sick')}
                                            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                                                leaveType === 'Sick'
                                                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl ${leaveType === 'Sick' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <Stethoscope size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-xs sm:text-sm">Sakit</p>
                                                <p className="text-[10px] text-slate-500">Demam, flu, medis, dll.</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setLeaveType('Permission')}
                                            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                                                leaveType === 'Permission'
                                                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl ${leaveType === 'Permission' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <FileText size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-xs sm:text-sm">Izin</p>
                                                <p className="text-[10px] text-slate-500">Urusan keluarga / penting</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => {
                                                setStartDate(e.target.value);
                                                if (e.target.value > endDate) setEndDate(e.target.value);
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Lama Izin yang Dimohon:</span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg font-bold">
                                        {requestedDays} Hari
                                    </span>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Alasan Ketidakhadiran <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={3}
                                        placeholder="Jelaskan alasan izin ananda..."
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs resize-none"
                                        required
                                    />
                                </div>

                                {/* File Attachment */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Surat Dokter / Surat Izin Tertulis (Opsional)
                                    </label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative bg-white">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                        {attachmentFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <FileText className="text-blue-600" size={24} />
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{attachmentFile.name}</p>
                                                    <p className="text-[10px] text-slate-500">{(attachmentFile.size / 1024).toFixed(0)} KB • Klik untuk ganti</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-2 text-slate-500">
                                                <Upload size={22} className="text-slate-400 mb-1" />
                                                <p className="text-xs font-medium text-slate-700">Unggah foto surat dokter atau surat permohonan</p>
                                                <p className="text-[10px] text-slate-400">JPG, PNG, atau PDF (Maks 5MB)</p>
                                            </div>
                                        )}
                                    </div>

                                    {attachmentPreview && (
                                        <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                                            <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !selectedChildID}
                                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            <span>Mengirimkan Permohonan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            <span>Kirim Surat Permohonan ke Wali Kelas</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </CardGlass>
                    </div>

                    <div className="lg:col-span-5 space-y-4">
                        <CardGlass className="p-5 space-y-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                            <div className="flex items-center gap-2 text-blue-400">
                                <AlertCircle size={18} />
                                <h4 className="font-bold text-sm">Informasi untuk Orang Tua</h4>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Permohonan izin yang Anda kirimkan akan langsung muncul pada aplikasi Wali Kelas masing-masing anak. Wali kelas akan memberikan keputusan persetujuan dan jumlah hari yang diizinkan.
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Anda akan menerima notifikasi otomatis ketika permohonan telah ditanggapi oleh Wali Kelas.
                            </p>
                        </CardGlass>
                    </div>
                </div>
            )}

            {/* TAB 2: RIWAYAT */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {loadingLeaves ? (
                        <CardGlass className="p-8 text-center text-xs text-slate-400">
                            Memuat data pengajuan...
                        </CardGlass>
                    ) : !leaveRequests || leaveRequests.length === 0 ? (
                        <CardGlass className="p-12 text-center text-slate-400 space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                                <Calendar size={32} />
                            </div>
                            <h4 className="text-base font-bold text-slate-700">Belum Ada Pengajuan Izin</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Belum ada permohonan izin atau sakit yang diajukan untuk ananda.
                            </p>
                        </CardGlass>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {leaveRequests.map((leave) => {
                                const isApproved = leave.status === 'Approved';
                                const isRejected = leave.status === 'Rejected';
                                const isPending = leave.status === 'Pending';

                                return (
                                    <CardGlass key={leave.id} className="p-5 space-y-3 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${
                                                        leave.type === 'Sick'
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                                                    }`}>
                                                        {leave.type === 'Sick' ? '🏥 Sakit' : '📝 Izin'}
                                                    </span>
                                                    <p className="text-xs font-bold text-slate-900 truncate">
                                                        {leave.student?.user?.name || 'Siswa'}
                                                    </p>
                                                </div>

                                                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 ${
                                                    isApproved
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : isRejected
                                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                                        : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                                }`}>
                                                    {isApproved && <CheckCircle size={13} />}
                                                    {isRejected && <XCircle size={13} />}
                                                    {isPending && <Clock size={13} />}
                                                    {isApproved ? `Disetujui (${leave.approved_days} Hari)` : isRejected ? 'Ditolak' : 'Menunggu Approval'}
                                                </span>
                                            </div>

                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-700 flex items-center justify-between">
                                                <span>Kelas: {leave.student?.class?.name || '-'}</span>
                                                <span className="font-bold text-slate-900">
                                                    {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-700 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                                                <span className="font-semibold text-slate-500 block text-[10px] uppercase">Alasan:</span>
                                                {leave.reason}
                                            </p>

                                            {leave.approval_notes && (
                                                <div className={`p-2.5 rounded-xl text-xs border ${
                                                    isApproved ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-200 text-red-900'
                                                }`}>
                                                    <span className="font-bold block text-[10px] uppercase mb-0.5">
                                                        Catatan Wali Kelas {leave.approver_teacher?.user?.name ? `(${leave.approver_teacher.user.name})` : ''}:
                                                    </span>
                                                    {leave.approval_notes}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                            {leave.attachment_url ? (
                                                <button
                                                    onClick={() => setPreviewModalUrl(leave.attachment_url!)}
                                                    className="text-blue-700 font-semibold hover:underline flex items-center gap-1"
                                                >
                                                    <Eye size={13} /> Lihat Lampiran
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 text-[11px] italic">Tanpa lampiran</span>
                                            )}

                                            <span className="text-[11px] text-slate-400">
                                                Diajukan {new Date(leave.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </CardGlass>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Attachment Preview Modal */}
            {previewModalUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-800">Dokumen Lampiran Surat Izin</h3>
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
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
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

export default ParentLeaveRequests;
