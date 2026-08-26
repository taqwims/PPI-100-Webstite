import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Pencil, Trash2, X, AlertCircle, MessageCircle, Star, Save, Bell, Eye, EyeOff, Lock, CheckCircle2, ShieldCheck, FileText, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import clsx from 'clsx';

interface SchoolSetting {
    key: string;
    value: string;
    description: string;
}

interface WATemplate {
    id: number;
    name: string;
    body_template: string;
    is_default: boolean;
    created_at: string;
}

const PLACEHOLDER_VARS_WA_PAYMENT = ['{nama_siswa}', '{nama_tagihan}', '{jumlah_bayar}', '{tanggal_bayar}', '{metode_pembayaran}', '{nama_sekolah}'];
const PLACEHOLDER_VARS_WA_BILL = ['{nama_siswa}', '{nis}', '{kelas}', '{total_tagihan}', '{rincian}', '{tanggal}'];
const PLACEHOLDER_VARS_APP = ['{nama_siswa}', '{nama_tagihan}', '{nominal}'];

const DEFAULT_SETTINGS_MAP: Record<string, string> = {
    wa_notif_payment_body: "*BUKTI PEMBAYARAN - {nama_sekolah}*\n\nTerima kasih, pembayaran sebesar *{jumlah_bayar}* untuk tagihan *{nama_tagihan}* an. *{nama_siswa}* telah kami terima dan diverifikasi.\n\nTanggal Pembayaran: {tanggal_bayar}\nMetode: {metode_pembayaran}\n\nSemoga berkah.",
    app_notif_bill_student_title: "Tagihan Baru Diterbitkan",
    app_notif_bill_student_body: "Hai {nama_siswa}, tagihan {nama_tagihan} sebesar {nominal} telah diterbitkan.",
    app_notif_bill_parent_title: "Tagihan Baru untuk Anak Anda",
    app_notif_bill_parent_body: "Tagihan baru untuk {nama_siswa}: {nama_tagihan} sebesar {nominal} telah diterbitkan.",
    app_notif_payment_student_title: "Pembayaran Berhasil",
    app_notif_payment_student_body: "Pembayaran {nama_tagihan} sebesar {nominal} telah diverifikasi.",
    app_notif_payment_parent_title: "Pembayaran Tagihan Anak Berhasil",
    app_notif_payment_parent_body: "Pembayaran {nama_tagihan} untuk {nama_siswa} sebesar {nominal} telah diverifikasi.",
};

const NotificationSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'inapp'>('whatsapp');
    
    // --- WhatsApp Custom Templates Modal States ---
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<WATemplate | null>(null);
    const [form, setForm] = useState({ name: '', body_template: '', is_default: false });
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    // --- General Settings Form State ---
    const [generalForm, setGeneralForm] = useState<Record<string, string>>(DEFAULT_SETTINGS_MAP);
    const [showFonnteToken, setShowFonnteToken] = useState(false);

    // --- Queries ---
    const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<WATemplate[]>({
        queryKey: ['wa-templates'],
        queryFn: async () => (await api.get('/finance/wa-templates')).data || [],
    });

    const { data: settings = [], isLoading: isLoadingSettings } = useQuery<SchoolSetting[]>({
        queryKey: ['notification-settings'],
        queryFn: async () => (await api.get('/finance/notification-settings')).data || [],
    });

    // Sync DB settings into state
    useEffect(() => {
        const formMap: Record<string, string> = { ...DEFAULT_SETTINGS_MAP };
        settings.forEach(s => {
            if (s.value && s.value.trim() !== '') {
                formMap[s.key] = s.value;
            }
        });
        setGeneralForm(formMap);
    }, [settings]);

    // --- Mutations ---
    const updateSettingsMutation = useMutation({
        mutationFn: (updates: SchoolSetting[]) => api.put('/finance/notification-settings', { settings: updates }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
            toast.success('Pengaturan berhasil disimpan');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal menyimpan pengaturan');
        }
    });

    const createWAMutation = useMutation({
        mutationFn: (d: any) => api.post('/finance/wa-templates', d),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
            setShowModal(false);
            toast.success('Template WA berhasil ditambahkan');
        },
    });

    const updateWAMutation = useMutation({
        mutationFn: (d: any) => api.put(`/finance/wa-templates/${d.id}`, d),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
            setShowModal(false);
            setEditItem(null);
            toast.success('Template WA berhasil diperbarui');
        },
    });

    const deleteWAMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/wa-templates/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
            setConfirmDelete(null);
            toast.success('Template WA berhasil dihapus');
        },
    });

    // --- Handlers ---
    const handleSaveSettings = (keys: string[], successMsg = 'Pengaturan berhasil disimpan') => {
        const updates = keys.map(k => ({
            key: k,
            value: generalForm[k] !== undefined ? generalForm[k] : (DEFAULT_SETTINGS_MAP[k] || ''),
            description: settings.find(s => s.key === k)?.description || ''
        }));
        updateSettingsMutation.mutate(updates, {
            onSuccess: () => toast.success(successMsg)
        });
    };

    const handleWAFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editItem) updateWAMutation.mutate({ ...form, id: editItem.id });
        else createWAMutation.mutate(form);
    };

    const openEditWA = (item: WATemplate) => {
        setEditItem(item);
        setForm({ name: item.name, body_template: item.body_template, is_default: item.is_default });
        setShowModal(true);
    };

    const openCreateWA = () => {
        setEditItem(null);
        setForm({
            name: '',
            body_template: `Assalamu'alaikum Wr. Wb.\n\nKepada Yth. Orang Tua/Wali dari:\nNama: {nama_siswa}\nNIS: {nis}\nKelas: {kelas}\n\nBerikut rincian tagihan yang perlu diselesaikan:\n{rincian}\n\nTotal Tagihan: {total_tagihan}\n\nMohon segera melakukan pembayaran. Terima kasih.\n\nTanggal: {tanggal}`,
            is_default: false,
        });
        setShowModal(true);
    };

    const insertPlaceholder = (key: string, varName: string) => {
        setGeneralForm(prev => {
            const currentVal = prev[key] !== undefined && prev[key] !== ''
                ? prev[key]
                : (DEFAULT_SETTINGS_MAP[key] || '');
            return {
                ...prev,
                [key]: currentVal + varName
            };
        });
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                                <Sparkles size={13} /> Pusat Notifikasi Otomatis
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Pengaturan Notifikasi</h1>
                        <p className="text-slate-300 text-sm mt-1 max-w-xl">
                            Kelola pesan otomatis WhatsApp (Fonnte Gateway) dan notifikasi in-app untuk siswa serta wali murid secara terpusat.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-medium shrink-0">
                        <ShieldCheck size={18} className="text-emerald-400" />
                        <span>Fonnte WA Gateway: <strong className={generalForm['enable_wa_notifications'] === 'true' ? "text-emerald-300 font-bold" : "text-amber-300"}>{generalForm['enable_wa_notifications'] === 'true' ? 'AKTIF' : 'NON-AKTIF'}</strong></span>
                    </div>
                </div>
            </div>

            {/* 2 Main Navigation Tabs */}
            <div className="flex p-1.5 bg-slate-100/80 rounded-2xl gap-1 max-w-md border border-slate-200 shadow-inner">
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === 'whatsapp'
                            ? "bg-white text-emerald-700 shadow-md border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <MessageCircle size={18} className={clsx(activeTab === 'whatsapp' ? "text-emerald-600" : "text-slate-400")} />
                    Notifikasi WhatsApp
                </button>
                <button
                    onClick={() => setActiveTab('inapp')}
                    className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === 'inapp'
                            ? "bg-white text-indigo-700 shadow-md border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <Bell size={18} className={clsx(activeTab === 'inapp' ? "text-indigo-600" : "text-slate-400")} />
                    Notifikasi Aplikasi In-App
                </button>
            </div>

            {/* ============================================================= */}
            {/* TAB 1: NOTIFIKASI WHATSAPP */}
            {/* ============================================================= */}
            {activeTab === 'whatsapp' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {isLoadingSettings ? (
                        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
                            <p className="text-xs text-slate-500 mt-3 font-medium">Memuat konfigurasi WhatsApp...</p>
                        </div>
                    ) : (
                        <>
                            {/* CARD 1: Konfigurasi Gateway Fonnte */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                            <Send size={20} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 text-base">Koneksi Gateway WhatsApp (Fonnte API)</h2>
                                            <p className="text-xs text-slate-500">Atur status pengaktifan dan token API device Fonnte Anda.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-slate-600">Status Gateway:</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={generalForm['enable_wa_notifications'] === 'true'}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, enable_wa_notifications: e.target.checked ? 'true' : 'false' }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                                        </label>
                                    </div>
                                </div>

                                <div className="p-5 sm:p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Token API Fonnte</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type={showFonnteToken ? 'text' : 'password'}
                                                value={generalForm['fonnte_token'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, fonnte_token: e.target.value }))}
                                                className="w-full pl-10 pr-12 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm bg-slate-50/50"
                                                placeholder="Masukkan token Fonnte..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowFonnteToken(!showFonnteToken)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                            >
                                                {showFonnteToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400">💡 Dapatkan token device pada dashboard resmi Fonnte (https://fonnte.com).</p>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => handleSaveSettings(['enable_wa_notifications', 'fonnte_token'], 'Koneksi Fonnte berhasil disimpan')}
                                            disabled={updateSettingsMutation.isPending}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
                                        >
                                            <Save size={14} /> Simpan Koneksi WA
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 2: Template Pesan WA Bukti Pembayaran Lunas */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 text-base">Template WA Bukti Pembayaran Berhasil</h2>
                                            <p className="text-xs text-slate-500">Dikirim otomatis ke WhatsApp siswa/wali murid saat transaksi diverifikasi lunas.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 sm:p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sisipkan Variabel Pesan:</label>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {PLACEHOLDER_VARS_WA_PAYMENT.map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => insertPlaceholder('wa_notif_payment_body', v)}
                                                    className="px-2.5 py-1 text-xs font-mono bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition border border-indigo-200 font-semibold"
                                                >
                                                    + {v}
                                                </button>
                                            ))}
                                        </div>

                                        <textarea
                                            rows={6}
                                            value={generalForm['wa_notif_payment_body'] || "*BUKTI PEMBAYARAN - {nama_sekolah}*\n\nTerima kasih, pembayaran sebesar *{jumlah_bayar}* untuk tagihan *{nama_tagihan}* an. *{nama_siswa}* telah kami terima dan diverifikasi.\n\nTanggal Pembayaran: {tanggal_bayar}\nMetode: {metode_pembayaran}\n\nSemoga berkah."}
                                            onChange={e => setGeneralForm(prev => ({ ...prev, wa_notif_payment_body: e.target.value }))}
                                            className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono bg-slate-50/50 leading-relaxed"
                                            placeholder="Format pesan bukti pembayaran WA..."
                                        />
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => handleSaveSettings(['wa_notif_payment_body'], 'Template WA Bukti Pembayaran berhasil disimpan')}
                                            disabled={updateSettingsMutation.isPending}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                                        >
                                            <Save size={14} /> Simpan Template Pembayaran WA
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 3: Custom WA Broadcast Templates (Daftar Template WA) */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 text-base">Daftar Template Pesan Tagihan WA</h2>
                                            <p className="text-xs text-slate-500">Template yang dipakai untuk pesan pengingat tagihan dan broadcast WA.</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={openCreateWA}
                                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
                                    >
                                        <Plus size={16} /> Tambah Template Custom
                                    </button>
                                </div>

                                <div className="p-5 sm:p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {isLoadingTemplates ? (
                                            <div className="col-span-2 py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" /></div>
                                        ) : templates.length === 0 ? (
                                            <div className="col-span-2 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                                                <AlertCircle size={36} className="mx-auto text-slate-300 mb-2" />
                                                <p className="font-semibold text-sm">Belum ada template khusus</p>
                                                <p className="text-xs text-slate-400 mt-1">Sistem otomatis menggunakan template bawaan jika belum membuat template khusus.</p>
                                            </div>
                                        ) : templates.map(t => (
                                            <div key={t.id} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
                                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                                        {t.name}
                                                        {t.is_default && (
                                                            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1 border border-amber-200">
                                                                <Star size={10} className="fill-amber-500 text-amber-500" /> Default
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openEditWA(t)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"><Pencil size={15} /></button>
                                                        <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"><Trash2 size={15} /></button>
                                                    </div>
                                                </div>
                                                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-white p-3 rounded-xl border border-slate-200/60 max-h-36 overflow-y-auto leading-relaxed">
                                                    {t.body_template}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: NOTIFIKASI APLIKASI (IN-APP) */}
            {/* ============================================================= */}
            {activeTab === 'inapp' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {isLoadingSettings ? (
                        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                            <p className="text-xs text-slate-500 mt-3 font-medium">Memuat konfigurasi notifikasi aplikasi...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 text-base">Template Notifikasi In-App</h2>
                                        <p className="text-xs text-slate-500">Sesuaikan judul dan konten notifikasi pop-up yang tampil di akun Siswa dan Wali Murid.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 sm:p-6 space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* SECTION 1: TAGIHAN BARU */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                                            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">1. Notifikasi Tagihan Baru</h3>
                                        </div>

                                        {/* Untuk Siswa */}
                                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-md uppercase tracking-wider">Untuk Siswa</span>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Notifikasi</label>
                                                <input
                                                    type="text"
                                                    value={generalForm['app_notif_bill_student_title'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_student_title: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="Tagihan Baru Diterbitkan"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Notifikasi</label>
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {PLACEHOLDER_VARS_APP.map(v => (
                                                        <button key={v} type="button" onClick={() => insertPlaceholder('app_notif_bill_student_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100 font-semibold">{v}</button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={generalForm['app_notif_bill_student_body'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_student_body: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Untuk Wali Murid */}
                                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-md uppercase tracking-wider">Untuk Wali Murid</span>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Notifikasi</label>
                                                <input
                                                    type="text"
                                                    value={generalForm['app_notif_bill_parent_title'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_parent_title: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="Tagihan Baru untuk Anak Anda"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Notifikasi</label>
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {PLACEHOLDER_VARS_APP.map(v => (
                                                        <button key={v} type="button" onClick={() => insertPlaceholder('app_notif_bill_parent_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100 font-semibold">{v}</button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={generalForm['app_notif_bill_parent_body'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_parent_body: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 2: PEMBAYARAN BERHASIL */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">2. Notifikasi Pembayaran Berhasil</h3>
                                        </div>

                                        {/* Untuk Siswa */}
                                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">Untuk Siswa</span>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Notifikasi</label>
                                                <input
                                                    type="text"
                                                    value={generalForm['app_notif_payment_student_title'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_student_title: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="Pembayaran Berhasil"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Notifikasi</label>
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {PLACEHOLDER_VARS_APP.map(v => (
                                                        <button key={v} type="button" onClick={() => insertPlaceholder('app_notif_payment_student_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100 font-semibold">{v}</button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={generalForm['app_notif_payment_student_body'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_student_body: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Untuk Wali Murid */}
                                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">Untuk Wali Murid</span>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Notifikasi</label>
                                                <input
                                                    type="text"
                                                    value={generalForm['app_notif_payment_parent_title'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_parent_title: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="Pembayaran Tagihan Anak Berhasil"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Notifikasi</label>
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {PLACEHOLDER_VARS_APP.map(v => (
                                                        <button key={v} type="button" onClick={() => insertPlaceholder('app_notif_payment_parent_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100 font-semibold">{v}</button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={generalForm['app_notif_payment_parent_body'] || ''}
                                                    onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_parent_body: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => handleSaveSettings([
                                            'app_notif_bill_student_title',
                                            'app_notif_bill_student_body',
                                            'app_notif_bill_parent_title',
                                            'app_notif_bill_parent_body',
                                            'app_notif_payment_student_title',
                                            'app_notif_payment_student_body',
                                            'app_notif_payment_parent_title',
                                            'app_notif_payment_parent_body'
                                        ], 'Template Notifikasi Aplikasi berhasil disimpan')}
                                        disabled={updateSettingsMutation.isPending}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                                    >
                                        <Save size={16} /> Simpan Seluruh Template Aplikasi
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* WA Template Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/70 shrink-0">
                            <h2 className="text-lg font-bold text-emerald-900">{editItem ? 'Edit Template WA' : 'Tambah Template WA Custom'}</h2>
                            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleWAFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nama Template</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm font-medium" placeholder="Template Pengingat SPP Bulanan" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Isi Template WA</label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {PLACEHOLDER_VARS_WA_BILL.map(v => (
                                        <button key={v} type="button" onClick={() => setForm(prev => ({ ...prev, body_template: prev.body_template + v }))}
                                            className="px-2 py-1 text-xs font-mono bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition border border-emerald-200 font-semibold">
                                            + {v}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={form.body_template}
                                    onChange={e => setForm({ ...form, body_template: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm leading-relaxed"
                                    rows={8}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <input type="checkbox" id="is_default" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                <label htmlFor="is_default" className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Star size={14} className="text-amber-500 fill-amber-500" /> Jadikan Default untuk Tagihan</label>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition">Simpan Template</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title="Hapus Template WA"
                message="Apakah Anda yakin ingin menghapus template ini?"
                onConfirm={() => confirmDelete && deleteWAMutation.mutate(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
            />
        </div>
    );
};

export default NotificationSettings;
