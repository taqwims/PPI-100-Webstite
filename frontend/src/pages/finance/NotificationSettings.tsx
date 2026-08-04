import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Pencil, Trash2, X, AlertCircle, MessageCircle, Star, Save, Sliders, Bell, Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

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

const PLACEHOLDER_VARS_WA = ['{nama_siswa}', '{nis}', '{kelas}', '{total_tagihan}', '{rincian}', '{tanggal}'];
const PLACEHOLDER_VARS_WA_PAYMENT = ['{nama_siswa}', '{nama_tagihan}', '{jumlah_bayar}', '{tanggal_bayar}', '{metode_pembayaran}', '{nama_sekolah}'];
const PLACEHOLDER_VARS_APP = ['{nama_siswa}', '{nama_tagihan}', '{nominal}'];

const NotificationSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'general' | 'wa' | 'app'>('general');
    
    // --- WhatsApp Templates States (legacy WATemplates) ---
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<WATemplate | null>(null);
    const [form, setForm] = useState({ name: '', body_template: '', is_default: false });
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    // --- General Settings & In-App Templates States ---
    const [generalForm, setGeneralForm] = useState<Record<string, string>>({});
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

    // Sync settings query results to state
    useEffect(() => {
        if (settings.length > 0) {
            const formMap: Record<string, string> = {};
            settings.forEach(s => {
                formMap[s.key] = s.value;
            });
            setGeneralForm(formMap);
        }
    }, [settings]);

    // --- Mutations ---
    const updateSettingsMutation = useMutation({
        mutationFn: (updates: SchoolSetting[]) => api.put('/finance/notification-settings', { settings: updates }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
            toast.success('Pengaturan berhasil diperbarui');
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
            toast.success('Template berhasil ditambahkan');
        },
    });

    const updateWAMutation = useMutation({
        mutationFn: (d: any) => api.put(`/finance/wa-templates/${d.id}`, d),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
            setShowModal(false);
            setEditItem(null);
            toast.success('Berhasil diperbarui');
        },
    });

    const deleteWAMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/wa-templates/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-templates'] });
            setConfirmDelete(null);
            toast.success('Berhasil dihapus');
        },
    });

    // --- Handlers ---
    const handleSaveSettings = (keys: string[]) => {
        const updates = keys.map(k => ({
            key: k,
            value: generalForm[k] || '',
            description: settings.find(s => s.key === k)?.description || ''
        }));
        updateSettingsMutation.mutate(updates);
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
            body_template: `Assalamu'alaikum Wr. Wb.\n\nKepada Orang Tua/Wali dari:\nNama: {nama_siswa}\nNIS: {nis}\nKelas: {kelas}\n\nBerikut rincian tagihan yang belum dibayarkan:\n{rincian}\n\nTotal Tagihan: {total_tagihan}\n\nMohon segera melakukan pembayaran. Terima kasih.\n\nTanggal: {tanggal}\nBagian Keuangan SDIT`,
            is_default: false,
        });
        setShowModal(true);
    };

    const insertPlaceholderWA = (varName: string) => {
        setForm(prev => ({ ...prev, body_template: prev.body_template + varName }));
    };

    const insertPlaceholderApp = (key: string, varName: string) => {
        setGeneralForm(prev => ({
            ...prev,
            [key]: (prev[key] || '') + varName
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pengaturan Notifikasi</h1>
                <p className="text-slate-500 mt-1">Konfigurasi pesan WhatsApp, Fonnte API token, dan template notifikasi aplikasi (in-app).</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
                        activeTab === 'general'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Sliders size={16} /> Pengaturan Umum
                </button>
                <button
                    onClick={() => setActiveTab('wa')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
                        activeTab === 'wa'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <MessageCircle size={16} /> Template WhatsApp
                </button>
                <button
                    onClick={() => setActiveTab('app')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
                        activeTab === 'app'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Bell size={16} /> Template Aplikasi
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'general' && (
                <div className="max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    {isLoadingSettings ? (
                        <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
                    ) : (
                        <>
                            {/* WA Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <h3 className="font-semibold text-slate-900">Aktifkan Notifikasi WhatsApp</h3>
                                    <p className="text-xs text-slate-500 mt-1">Mengaktifkan/menonaktifkan pengiriman otomatis tagihan dan bukti pembayaran via Fonnte.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={generalForm['enable_wa_notifications'] === 'true'}
                                        onChange={e => setGeneralForm(prev => ({ ...prev, enable_wa_notifications: e.target.checked ? 'true' : 'false' }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            {/* Fonnte Token */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Token API Fonnte</label>
                                <p className="text-xs text-slate-500">Gunakan token autentikasi device WhatsApp Fonnte Anda.</p>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type={showFonnteToken ? 'text' : 'password'}
                                        value={generalForm['fonnte_token'] || ''}
                                        onChange={e => setGeneralForm(prev => ({ ...prev, fonnte_token: e.target.value }))}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm bg-white"
                                        placeholder="Masukkan token Fonnte Anda..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowFonnteToken(!showFonnteToken)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showFonnteToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* WA Payment Receipt Format */}
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <label className="block text-sm font-semibold text-slate-700">Format Pesan WA Bukti Pembayaran Berhasil</label>
                                <p className="text-xs text-slate-500">Pesan WhatsApp ini dikirimkan otomatis ke siswa/orang tua saat pembayaran terverifikasi berhasil.</p>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {PLACEHOLDER_VARS_WA_PAYMENT.map(v => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setGeneralForm(prev => ({ ...prev, wa_notif_payment_body: (prev['wa_notif_payment_body'] || '') + v }))}
                                            className="px-2 py-1 text-xs font-mono bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition border border-emerald-200"
                                        >
                                            + {v}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    rows={6}
                                    value={generalForm['wa_notif_payment_body'] || "*BUKTI PEMBAYARAN - {nama_sekolah}*\n\nTerima kasih, pembayaran sebesar *{jumlah_bayar}* untuk tagihan *{nama_tagihan}* an. *{nama_siswa}* telah kami terima dan diverifikasi.\n\nTanggal Pembayaran: {tanggal_bayar}\nMetode: {metode_pembayaran}\n\nSemoga berkah."}
                                    onChange={e => setGeneralForm(prev => ({ ...prev, wa_notif_payment_body: e.target.value }))}
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                                    placeholder="Format pesan bukti pembayaran WA..."
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => handleSaveSettings(['enable_wa_notifications', 'fonnte_token', 'wa_notif_payment_body'])}
                                    disabled={updateSettingsMutation.isPending}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-md disabled:opacity-50"
                                >
                                    <Save size={16} /> {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'wa' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Daftar Template WhatsApp</h2>
                            <p className="text-slate-500 text-sm">Gunakan editor di bawah untuk menyesuaikan isi pesan WhatsApp.</p>
                        </div>
                        <button onClick={openCreateWA} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 text-sm font-medium">
                            <Plus size={16} /> Tambah Template
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {isLoadingTemplates ? (
                            <div className="col-span-2 p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
                        ) : templates.length === 0 ? (
                            <div className="col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                                <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="font-medium">Belum ada template</p>
                                <p className="text-sm mt-1">Buat template pesan WA untuk dikirim ke orang tua siswa</p>
                            </div>
                        ) : templates.map(t => (
                            <div key={t.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-50">
                                            <MessageCircle size={18} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                {t.name}
                                                {t.is_default && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                                        <Star size={10} /> Default
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEditWA(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={16} /></button>
                                        <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-48 overflow-y-auto font-sans">
                                        {t.body_template}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'app' && (
                <div className="max-w-4xl bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6">
                    {isLoadingSettings ? (
                        <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
                    ) : (
                        <div className="space-y-8">
                            <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-bold text-slate-900">Template Notifikasi In-App</h2>
                                <p className="text-slate-500 text-sm">Sesuaikan konten notifikasi popup yang tampil di dasbor siswa dan wali murid.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* SECTION: NEW BILL */}
                                <div className="space-y-5">
                                    <h3 className="font-bold text-slate-800 border-l-4 border-l-amber-500 pl-3">1. Notifikasi Tagihan Baru</h3>
                                    
                                    {/* Student Bill */}
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Untuk Siswa</h4>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Notifikasi</label>
                                            <input
                                                type="text"
                                                value={generalForm['app_notif_bill_student_title'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_student_title: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Konten Notifikasi</label>
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {PLACEHOLDER_VARS_APP.map(v => (
                                                    <button key={v} type="button" onClick={() => insertPlaceholderApp('app_notif_bill_student_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded text-slate-600 hover:bg-slate-50">{v}</button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={generalForm['app_notif_bill_student_body'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_student_body: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono"
                                                rows={3}
                                            />
                                        </div>
                                    </div>

                                    {/* Parent Bill */}
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Untuk Wali Murid</h4>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Notifikasi</label>
                                            <input
                                                type="text"
                                                value={generalForm['app_notif_bill_parent_title'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_parent_title: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Konten Notifikasi</label>
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {PLACEHOLDER_VARS_APP.map(v => (
                                                    <button key={v} type="button" onClick={() => insertPlaceholderApp('app_notif_bill_parent_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded text-slate-600 hover:bg-slate-50">{v}</button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={generalForm['app_notif_bill_parent_body'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_bill_parent_body: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION: PAYMENT SUCCESS */}
                                <div className="space-y-5">
                                    <h3 className="font-bold text-slate-800 border-l-4 border-l-emerald-500 pl-3">2. Notifikasi Pembayaran Berhasil</h3>
                                    
                                    {/* Student Payment */}
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Untuk Siswa</h4>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Notifikasi</label>
                                            <input
                                                type="text"
                                                value={generalForm['app_notif_payment_student_title'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_student_title: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Konten Notifikasi</label>
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {PLACEHOLDER_VARS_APP.map(v => (
                                                    <button key={v} type="button" onClick={() => insertPlaceholderApp('app_notif_payment_student_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded text-slate-600 hover:bg-slate-50">{v}</button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={generalForm['app_notif_payment_student_body'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_student_body: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono"
                                                rows={3}
                                            />
                                        </div>
                                    </div>

                                    {/* Parent Payment */}
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Untuk Wali Murid</h4>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Notifikasi</label>
                                            <input
                                                type="text"
                                                value={generalForm['app_notif_payment_parent_title'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_parent_title: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Konten Notifikasi</label>
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {PLACEHOLDER_VARS_APP.map(v => (
                                                    <button key={v} type="button" onClick={() => insertPlaceholderApp('app_notif_payment_parent_body', v)} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded text-slate-600 hover:bg-slate-50">{v}</button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={generalForm['app_notif_payment_parent_body'] || ''}
                                                onChange={e => setGeneralForm(prev => ({ ...prev, app_notif_payment_parent_body: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
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
                                    ])}
                                    disabled={updateSettingsMutation.isPending}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-md disabled:opacity-50"
                                >
                                    <Save size={16} /> {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Template Aplikasi'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* WA Template Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
                            <h2 className="text-lg font-bold text-emerald-800">{editItem ? 'Edit Template' : 'Tambah Template WA'}</h2>
                            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleWAFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Template</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" placeholder="Template Tagihan Bulanan" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Isi Template</label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {PLACEHOLDER_VARS_WA.map(v => (
                                        <button key={v} type="button" onClick={() => insertPlaceholderWA(v)}
                                            className="px-2 py-1 text-xs font-mono bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition border border-emerald-100">
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={form.body_template}
                                    onChange={e => setForm({ ...form, body_template: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                                    rows={10}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_default" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                <label htmlFor="is_default" className="text-sm text-slate-700 flex items-center gap-1"><Star size={14} className="text-amber-500" /> Jadikan Default</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title="Hapus Template"
                message="Apakah Anda yakin ingin menghapus template ini?"
                onConfirm={() => confirmDelete && deleteWAMutation.mutate(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
            />
        </div>
    );
};

export default NotificationSettings;
