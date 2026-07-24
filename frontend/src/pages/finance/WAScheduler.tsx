import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, X, Calendar, Clock, AlertCircle, FileText, CheckCircle2, XCircle, Eye, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAcademicYear } from '../../context/AcademicYearContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface WATemplate {
    id: number;
    name: string;
    body_template: string;
    is_default: boolean;
}

interface Class {
    id: number;
    name: string;
}

interface WAScheduleRecipient {
    id: number;
    student: {
        full_name?: string;
        nis?: string;
        nisn?: string;
        user?: { name?: string };
        class?: { name: string };
    };
    phone: string;
    status: string; // pending, sent, failed
    error_msg?: string;
    sent_at?: string;
}

interface WASchedule {
	id: number;
	send_at: string;
	status: string; // pending, processing, completed, failed, cancelled
	wa_template_id: number;
	wa_template: WATemplate;
	min_delay: number;
	max_delay: number;
	recipients?: WAScheduleRecipient[];
	created_at: string;
}

interface WASchedulerProps {
    isSubcomponent?: boolean;
}

const WAScheduler: React.FC<WASchedulerProps> = ({ isSubcomponent = false }) => {
    const queryClient = useQueryClient();
    const { selectedYear, academicYears } = useAcademicYear();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<WASchedule | null>(null);

    // Form states
    const [sendAtDate, setSendAtDate] = useState('');
    const [sendAtTime, setSendAtTime] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [minDelay, setMinDelay] = useState(10);
    const [maxDelay, setMaxDelay] = useState(30);
    const [targetClassIds, setTargetClassIds] = useState<number[]>([]);
    const [cancelScheduleId, setCancelScheduleId] = useState<number | null>(null);

    // Queries
    const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<WASchedule[]>({
        queryKey: ['wa-schedules'],
        queryFn: async () => (await api.get('/finance/wa-schedules')).data || [],
    });

    const { data: templates = [] } = useQuery<WATemplate[]>({
        queryKey: ['wa-templates'],
        queryFn: async () => (await api.get('/finance/wa-templates')).data || [],
    });

    const { data: classes = [] } = useQuery<Class[]>({
        queryKey: ['classes'],
        queryFn: async () => (await api.get('/academic/classes')).data || [],
    });

    const { data: yearsList = [] } = useQuery<any[]>({
        queryKey: ['academic-years-wascheduler'],
        queryFn: async () => (await api.get('/finance/academic-years')).data || [],
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (newSchedule: any) => api.post('/finance/wa-schedules', newSchedule),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-schedules'] });
            setShowCreateModal(false);
            toast.success('Jadwal pengingat berhasil dibuat');
            resetForm();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal membuat jadwal pengingat');
        }
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => api.put(`/finance/wa-schedules/${id}/cancel`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-schedules'] });
            toast.success('Pengiriman berhasil dibatalkan');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal membatalkan pengiriman');
        }
    });

    const resetForm = () => {
        setSendAtDate('');
        setSendAtTime('');
        setTemplateId(templates.find(t => t.is_default)?.id.toString() || '');
        setMinDelay(10);
        setMaxDelay(30);
        setTargetClassIds([]);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sendAtDate || !sendAtTime) {
            toast.error('Tanggal dan waktu kirim wajib diisi');
            return;
        }
        if (!templateId) {
            toast.error('Template pesan wajib dipilih');
            return;
        }

        // Determine active academic year ID (selectedYear, fetched yearsList, or fallback)
        const targetYearId = selectedYear?.id 
            || academicYears.find(y => y.is_active)?.id 
            || yearsList.find((y: any) => y.is_active)?.id 
            || yearsList[0]?.id 
            || 0;

        // Format: YYYY-MM-DD HH:MM:SS in Asia/Jakarta
        const sendAtStr = `${sendAtDate} ${sendAtTime}:00`;

        createMutation.mutate({
            send_at: sendAtStr,
            wa_template_id: parseInt(templateId),
            min_delay: minDelay,
            max_delay: maxDelay,
            academic_year_id: targetYearId,
            class_ids: targetClassIds,
        });
    };

    const handleViewDetails = async (schedule: WASchedule) => {
        try {
            const res = await api.get(`/finance/wa-schedules/${schedule.id}`);
            setSelectedSchedule(res.data);
        } catch (err: any) {
            toast.error('Gagal mengambil rincian penerima');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Menunggu</span>;
            case 'processing':
                return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 animate-pulse">Mengirim...</span>;
            case 'completed':
                return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Selesai</span>;
            case 'cancelled':
                return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">Dibatalkan</span>;
            case 'failed':
                return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Gagal</span>;
            default:
                return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
        }
    };

    const getProgress = (schedule: WASchedule) => {
        if (!schedule.recipients) return { sent: 0, failed: 0, total: 0, percent: 0 };
        const total = schedule.recipients.length;
        const sent = schedule.recipients.filter(r => r.status === 'sent').length;
        const failed = schedule.recipients.filter(r => r.status === 'failed').length;
        const percent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
        return { sent, failed, total, percent };
    };

    return (
        <div className="space-y-6">
            {isSubcomponent ? (
                <div className="flex justify-end">
                    <button
                        onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 font-semibold text-sm transition-all"
                    >
                        <Plus size={18} /> Buat Jadwal Baru
                    </button>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Penjadwalan Pengingat WA</h1>
                        <p className="text-slate-500 mt-1">Jadwalkan pesan tagihan otomatis dengan interval jeda acak untuk mencegah pemblokiran nomor (anti-spam).</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 font-semibold text-sm transition-all"
                    >
                        <Plus size={18} /> Buat Jadwal Baru
                    </button>
                </div>
            )}

            {/* Warning Message Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={24} />
                <div>
                    <h4 className="font-bold text-amber-800 text-sm">Pemberitahuan Penting untuk Menghindari Blokir</h4>
                    <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                        Sistem ini menggunakan **jeda interval acak** dan **spintax salam pembuka acak** secara otomatis untuk meniru pola pengiriman manusia.
                        Untuk keamanan tambahan, disarankan menetapkan interval minimal **10-15 detik** di antara setiap pesan dan tidak mengirimkan lebih dari 200 pesan dalam sehari dari satu nomor.
                    </p>
                </div>
            </div>

            {/* Schedule List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Riwayat & Antrean Jadwal</h3>
                </div>

                {isLoadingSchedules ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-medium">Belum ada antrean jadwal pengingat</p>
                        <p className="text-sm text-slate-400 mt-1">Buat jadwal baru untuk mengirim pengingat ke orang tua siswa yang belum lunas.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Tanggal Kirim</th>
                                    <th className="p-4">Template</th>
                                    <th className="p-4 text-center">Jeda Antar Pesan</th>
                                    <th className="p-4 text-center">Progress Kirim</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {schedules.map((schedule) => {
                                    const progress = getProgress(schedule);
                                    return (
                                        <tr key={schedule.id} className="hover:bg-slate-50/50 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 font-medium text-slate-950">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(schedule.send_at).toLocaleString('id-ID', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                                <span className="text-[10px] text-slate-400 block mt-0.5">Dibuat: {new Date(schedule.created_at).toLocaleDateString('id-ID')}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold text-slate-800">{schedule.wa_template?.name || 'Template Dihapus'}</div>
                                            </td>
                                            <td className="p-4 text-center text-slate-600">
                                                {schedule.min_delay} - {schedule.max_delay} detik
                                            </td>
                                            <td className="p-4">
                                                <div className="w-full max-w-[150px] mx-auto space-y-1">
                                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                                        <span>{progress.percent}%</span>
                                                        <span>{progress.sent + progress.failed} / {progress.total}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                schedule.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'
                                                            }`}
                                                            style={{ width: `${progress.percent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {getStatusBadge(schedule.status)}
                                            </td>
                                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleViewDetails(schedule)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                                    title="Lihat Log"
                                                >
                                                    <Eye size={12} /> Log
                                                </button>
                                                {schedule.status === 'pending' && (
                                                    <button
                                                        onClick={() => setCancelScheduleId(schedule.id)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                                    >
                                                        Batal
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Schedule Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
                            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                <Calendar size={18} /> Buat Jadwal Pengingat WA
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Template WA</label>
                                <select
                                    value={templateId}
                                    onChange={(e) => setTemplateId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                    required
                                >
                                    <option value="">-- Pilih Template --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Default)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Kirim</label>
                                    <input
                                        type="date"
                                        value={sendAtDate}
                                        onChange={(e) => setSendAtDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Waktu Kirim</label>
                                    <input
                                        type="time"
                                        value={sendAtTime}
                                        onChange={(e) => setSendAtTime(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jeda Min (Detik)</label>
                                    <input
                                        type="number"
                                        value={minDelay}
                                        onChange={(e) => setMinDelay(parseInt(e.target.value) || 5)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                        min={5}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jeda Max (Detik)</label>
                                    <input
                                        type="number"
                                        value={maxDelay}
                                        onChange={(e) => setMaxDelay(parseInt(e.target.value) || 10)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                        min={10}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter Kelas (Opsional - Kosongkan untuk Semua Kelas)</label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                                    {classes.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-emerald-600">
                                            <input
                                                type="checkbox"
                                                checked={targetClassIds.includes(c.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setTargetClassIds([...targetClassIds, c.id]);
                                                    } else {
                                                        setTargetClassIds(targetClassIds.filter(id => id !== c.id));
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1">Sistem hanya akan mengirim ke siswa yang memiliki tunggakan/belum lunas di tahun ajaran aktif.</span>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2">
                                    {createMutation.isPending ? 'Menyimpan...' : 'Jadwalkan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Log Modal */}
            {selectedSchedule && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <FileText size={18} className="text-slate-500" /> Log Pengiriman Penerima
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Jadwal Kirim: {new Date(selectedSchedule.send_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedSchedule(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {!selectedSchedule.recipients || selectedSchedule.recipients.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">Tidak ada penerima terdaftar.</div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedSchedule.recipients.map((recipient) => (
                                        <div key={recipient.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{recipient.student?.full_name || recipient.student?.user?.name || 'Siswa'}</h4>
                                                <p className="text-xs text-slate-500">NIS/NISN: {recipient.student?.nisn || recipient.student?.nis || '-'} • Kelas: {recipient.student?.class?.name || '-'}</p>
                                                <p className="text-xs font-mono text-slate-600 mt-1">Telp Wali: {recipient.phone}</p>
                                                {recipient.error_msg && (
                                                    <span className="text-[10px] text-red-600 font-semibold block mt-1 bg-red-50 p-1.5 rounded border border-red-100">
                                                        Error: {recipient.error_msg}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {recipient.status === 'sent' && (
                                                    <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                                                        <CheckCircle2 size={12} /> Terkirim
                                                    </span>
                                                )}
                                                {recipient.status === 'failed' && (
                                                    <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                                                        <XCircle size={12} /> Gagal
                                                    </span>
                                                )}
                                                {recipient.status === 'pending' && (
                                                    <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                                                        <Clock size={12} /> Antrean
                                                    </span>
                                                )}
                                                {recipient.sent_at && (
                                                    <span className="text-[10px] text-slate-400">{new Date(recipient.sent_at).toLocaleTimeString('id-ID')}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog
                isOpen={!!cancelScheduleId}
                onClose={() => setCancelScheduleId(null)}
                onConfirm={() => {
                    if (cancelScheduleId) {
                        cancelMutation.mutate(cancelScheduleId);
                        setCancelScheduleId(null);
                    }
                }}
                title="Batalkan Pengiriman WA"
                message="Apakah Anda yakin ingin membatalkan jadwal pengiriman WhatsApp ini? Antrean pesan yang belum terkirim akan dibatalkan."
                confirmText="Batalkan Pengiriman"
                cancelText="Kembali"
                variant="danger"
                isLoading={cancelMutation.isPending}
            />
        </div>
    );
};

export default WAScheduler;
