import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CardGlass from '../../components/ui/glass/CardGlass';
import {
    Calendar, CheckCircle, Clock, XCircle, FileText, Upload,
    AlertCircle, Stethoscope, ChevronRight, Eye, Sparkles, RefreshCw
} from 'lucide-react';

interface LeaveRequestItem {
    id: string;
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

export const StudentLeaveRequests: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'request' | 'history' | 'attendance'>('request');
    
    // Form States
    const [leaveType, setLeaveType] = useState<'Sick' | 'Permission'>('Sick');
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

    // Fetch student's leave requests
    const { data: leaveRequests, isLoading: loadingLeaves } = useQuery<LeaveRequestItem[]>({
        queryKey: ['my-leave-requests'],
        queryFn: async () => {
            const res = await api.get('/academic/leave-requests/my');
            return res.data;
        }
    });

    // Fetch student's attendance history
    const { data: attendances, isLoading: loadingAttendance } = useQuery({
        queryKey: ['my-attendance', user?.student?.id],
        queryFn: async () => {
            if (!user?.student?.id) return [];
            const res = await api.get(`/students/attendance?student_id=${user.student.id}`);
            return res.data;
        },
        enabled: !!user?.student?.id
    });

    // Handle File Change
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

    // Submit Request
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error('Mohon isi alasan / keterangan izin');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
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

            toast.success('Pengajuan berhasil dikirim! Notifikasi telah diteruskan ke Wali Kelas Anda.');
            setReason('');
            setAttachmentFile(null);
            setAttachmentPreview(null);
            queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-900/10">
                <div>
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider inline-block mb-2">
                        Portal Ketidakhadiran Siswa
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Pengajuan Izin & Sakit
                    </h1>
                    <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
                        Ajukan izin tidak masuk sekolah langsung ke Wali Kelas Anda. Notifikasi otomatis diteruskan secara real-time.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 text-xs font-semibold self-start sm:self-center">
                    <button
                        onClick={() => setActiveTab('request')}
                        className={`px-3.5 py-2 rounded-xl transition-all ${
                            activeTab === 'request'
                                ? 'bg-white text-emerald-800 shadow-md font-bold'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Formulir Izin
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                            activeTab === 'history'
                                ? 'bg-white text-emerald-800 shadow-md font-bold'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Riwayat Pengajuan
                        {leaveRequests && leaveRequests.filter(l => l.status === 'Pending').length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-3.5 py-2 rounded-xl transition-all ${
                            activeTab === 'attendance'
                                ? 'bg-white text-emerald-800 shadow-md font-bold'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Riwayat Presensi
                    </button>
                </div>
            </div>

            {/* TAB 1: FORM PENGAJUAN */}
            {activeTab === 'request' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Form (7 Cols) */}
                    <div className="lg:col-span-7">
                        <CardGlass className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Formulir Pengajuan Ketidakhadiran</h3>
                                <p className="text-xs text-slate-500">Lengkapi data berikut untuk mengirim surat permohonan ke wali kelas</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Type Selector: Sakit vs Izin */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Jenis Ketidakhadiran
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setLeaveType('Sick')}
                                            className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                                                leaveType === 'Sick'
                                                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                            }`}
                                        >
                                            <div className={`p-2.5 rounded-xl ${leaveType === 'Sick' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <Stethoscope size={22} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Sakit</p>
                                                <p className="text-[11px] text-slate-500">Kondisi medis / istirahat</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setLeaveType('Permission')}
                                            className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                                                leaveType === 'Permission'
                                                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                            }`}
                                        >
                                            <div className={`p-2.5 rounded-xl ${leaveType === 'Permission' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <FileText size={22} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Izin</p>
                                                <p className="text-[11px] text-slate-500">Keperluan keluarga / penting</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Date Range Picker */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Tanggal Mulai
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => {
                                                setStartDate(e.target.value);
                                                if (e.target.value > endDate) {
                                                    setEndDate(e.target.value);
                                                }
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Tanggal Selesai
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Calculation Badge */}
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Lama Waktu yang Diajukan:</span>
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                                        {requestedDays} Hari Kalender
                                    </span>
                                </div>

                                {/* Reason / Description */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Alasan / Keterangan Lengkap <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={3}
                                        placeholder={leaveType === 'Sick' ? 'Contoh: Mengalami demam tinggi dan flu sejak semalam, disarankan dokter istirahat total.' : 'Contoh: Menghadiri acara pernikahan saudara kandung di luar kota.'}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs resize-none"
                                        required
                                    />
                                </div>

                                {/* Attachment Upload */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Lampiran Surat Dokter / Surat Izin Ortu (Opsional / Dianjurkan)
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
                                                <FileText className="text-emerald-600" size={24} />
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{attachmentFile.name}</p>
                                                    <p className="text-[10px] text-slate-500">{(attachmentFile.size / 1024).toFixed(0)} KB • Klik untuk ganti file</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-2 text-slate-500">
                                                <Upload size={24} className="text-slate-400 mb-1" />
                                                <p className="text-xs font-medium text-slate-700">Pilih atau Seret Foto / Dokumen ke sini</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Format JPG, PNG, atau PDF (Maks. 5MB)</p>
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
                                    disabled={submitting}
                                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            <span>Mengirim Pengajuan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            <span>Kirim Pengajuan ke Wali Kelas</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </CardGlass>
                    </div>

                    {/* Right Info Cards (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <CardGlass className="p-5 space-y-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <AlertCircle size={18} />
                                <h4 className="font-bold text-sm">Alur Persetujuan Ketidakhadiran</h4>
                            </div>
                            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                                <li>Anda atau orang tua mengirimkan formulir permohonan izin/sakit.</li>
                                <li>Wali Kelas menerima <strong>notifikasi real-time</strong> di dashboard perwalian.</li>
                                <li>Wali Kelas meninjau alasan, lampiran, dan <strong>menentukan jumlah hari yang disetujui</strong>.</li>
                                <li>Setelah disetujui, kehadiran Anda otomatis tercatat sebagai <strong>Izin / Sakit</strong> di buku presensi harian sekolah.</li>
                            </ol>
                        </CardGlass>

                        {/* Quick Status of Latest Request */}
                        {leaveRequests && leaveRequests.length > 0 && (
                            <CardGlass className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pengajuan Terakhir</h4>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-0.5"
                                    >
                                        Semua <ChevronRight size={13} />
                                    </button>
                                </div>

                                {(() => {
                                    const latest = leaveRequests[0];
                                    return (
                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    latest.type === 'Sick' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {latest.type === 'Sick' ? 'Sakit' : 'Izin'}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    latest.status === 'Approved'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : latest.status === 'Rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-amber-100 text-amber-800 animate-pulse'
                                                }`}>
                                                    {latest.status === 'Approved' ? 'Disetujui' : latest.status === 'Rejected' ? 'Ditolak' : 'Menunggu Wali Kelas'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-800 truncate">{latest.reason}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">
                                                {new Date(latest.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d {new Date(latest.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ({latest.total_days_requested} hari)
                                            </p>
                                        </div>
                                    );
                                })()}
                            </CardGlass>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: RIWAYAT PENGAJUAN */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {loadingLeaves ? (
                        <CardGlass className="p-8 text-center text-xs text-slate-400">
                            Memuat riwayat pengajuan izin...
                        </CardGlass>
                    ) : !leaveRequests || leaveRequests.length === 0 ? (
                        <CardGlass className="p-12 text-center text-slate-400 space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                                <Calendar size={32} />
                            </div>
                            <h4 className="text-base font-bold text-slate-700">Belum Ada Pengajuan Izin</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Anda belum pernah mengajukan izin atau sakit sebelumnya. Gunakan formulir izin jika Anda berhalangan hadir ke sekolah.
                            </p>
                            <button
                                onClick={() => setActiveTab('request')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                            >
                                Buat Pengajuan Baru
                            </button>
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
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                                        leave.type === 'Sick'
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                                                    }`}>
                                                        {leave.type === 'Sick' ? '🏥 Sakit' : '📝 Izin'}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-slate-400">
                                                        Diajukan {new Date(leave.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>

                                                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
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

                                            {/* Date Span */}
                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-700 flex items-center justify-between">
                                                <span>Rentang Tanggal:</span>
                                                <span className="font-bold text-slate-900">
                                                    {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    <span className="text-slate-400 font-normal ml-1">({leave.total_days_requested} hari diminta)</span>
                                                </span>
                                            </div>

                                            {/* Reason */}
                                            <p className="text-xs text-slate-700 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-slate-100">
                                                <span className="font-semibold text-slate-500 block text-[10px] uppercase">Alasan:</span>
                                                {leave.reason}
                                            </p>

                                            {/* Homeroom Approval Feedback Note */}
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

                                        {/* Bottom Action / Attachment */}
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                            {leave.attachment_url ? (
                                                <button
                                                    onClick={() => setPreviewModalUrl(leave.attachment_url!)}
                                                    className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                                                >
                                                    <Eye size={13} /> Lihat Bukti Lampiran
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 text-[11px] italic">Tanpa lampiran dokumen</span>
                                            )}

                                            {isApproved && (
                                                <span className="text-[11px] font-semibold text-emerald-700">
                                                    ✓ Otomatis Masuk Presensi
                                                </span>
                                            )}
                                        </div>
                                    </CardGlass>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: RIWAYAT PRESENSI HARIAN */}
            {activeTab === 'attendance' && (
                <CardGlass className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Catatan Kehadiran Saya</h3>
                            <p className="text-xs text-slate-500">Rekap status presensi harian di sekolah</p>
                        </div>
                        <span className="text-xs text-slate-500">{attendances?.length || 0} Catatan</span>
                    </div>

                    {loadingAttendance ? (
                        <div className="text-center py-8 text-xs text-slate-400">Memuat catatan presensi...</div>
                    ) : !attendances || attendances.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">Belum ada riwayat presensi</div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {attendances.map((att: any) => (
                                <div key={att.id} className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            att.status === 'Present'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : att.status === 'Late'
                                                ? 'bg-amber-100 text-amber-800'
                                                : att.status === 'Sick'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {att.status === 'Present' ? 'H' : att.status === 'Late' ? 'T' : att.status === 'Sick' ? 'S' : 'I'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">
                                                {new Date(att.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Metode: {att.method} {att.notes ? `• ${att.notes}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                        att.status === 'Present'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : att.status === 'Late'
                                            ? 'bg-amber-100 text-amber-800'
                                            : att.status === 'Sick'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {att.status === 'Present' ? 'Hadir' : att.status === 'Late' ? 'Terlambat' : att.status === 'Sick' ? 'Sakit' : 'Izin'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardGlass>
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

export default StudentLeaveRequests;
