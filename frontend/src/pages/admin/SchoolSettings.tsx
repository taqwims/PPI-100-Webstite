import React, { useState } from 'react';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import {
    Building2, MapPin, Phone, Mail, Hash, Save, Camera,
    Database, Download, Trash2, RotateCcw, Clock, CheckCircle2,
    XCircle, AlertTriangle, Info, Shield, HardDrive, FileText, CreditCard,
    Copy, Eye, EyeOff, Zap, Radio, Key, BellRing, RefreshCw, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFeatureStore } from '../../store/featureStore';
import SchoolBankAccounts from '../finance/SchoolBankAccounts';
import toast from 'react-hot-toast';

// ─── Types ───
interface SchoolSetting {
    id: number;
    key: string;
    value: string;
    description: string;
    is_admin_edit: boolean;
}

interface UnitData {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    foundation?: {
        id: number;
        name: string;
        address: string;
        phone: string;
        email: string;
    };
}

interface FoundationData {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
}

interface BackupData {
    id: string;
    filename: string;
    file_size_bytes: number;
    label: string;
    notes: string;
    status: string;
    created_by: { name: string };
    restored_at: string | null;
    created_at: string;
}

type TabKey = 'profile' | 'units' | 'bank_accounts' | 'payment_gateway' | 'finance_policy' | 'landing_page' | 'rfid_attendance' | 'backup';

// ─── Helpers ───
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} menit lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    const days = Math.floor(hrs / 24);
    return `${days} hari lalu`;
}

// ─── Status Badge ───
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        Success: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={12} /> },
        Failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={12} /> },
        Restoring: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <RotateCcw size={12} className="animate-spin" /> },
        Restored: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircle2 size={12} /> },
    };
    const s = map[status] || map.Success;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
            {s.icon} {status}
        </span>
    );
};

// ═══════════════════════════════════════════
// ─── Main Component ───
// ═══════════════════════════════════════════
const SchoolSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('profile');
    const fetchFeatures = useFeatureStore((s) => s.fetchFeatures);
    const isEnabled = useFeatureStore((s) => s.isEnabled);
    const isRFIDFeatureEnabled = isEnabled('rfid_attendance');

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'profile', label: 'Profil Sekolah', icon: <Building2 size={16} /> },
        { key: 'units', label: 'Unit Sekolah', icon: <Shield size={16} /> },
        { key: 'bank_accounts', label: 'Rekening Bank', icon: <CreditCard size={16} /> },
        { key: 'payment_gateway', label: 'Payment Gateway', icon: <Zap size={16} /> },
        { key: 'finance_policy', label: 'Kebijakan Keuangan', icon: <ShieldAlert size={16} /> },
        ...(isRFIDFeatureEnabled ? [{ key: 'rfid_attendance' as TabKey, label: 'Presensi & RFID', icon: <Radio size={16} /> }] : []),
        { key: 'landing_page', label: 'Landing Page', icon: <FileText size={16} /> },
        { key: 'backup', label: 'Backup & Restore', icon: <Database size={16} /> },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Sekolah</h1>
                <p className="text-sm text-slate-500 mt-1">Kelola profil sekolah, unit, presensi RFID & NFC, payment gateway, serta backup & restore database</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 bg-white/50 backdrop-blur-sm rounded-xl p-1 border border-slate-200 shadow-sm w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeTab === tab.key
                                ? 'bg-white text-green-700 shadow-sm border border-green-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && <ProfileTab onSaved={fetchFeatures} />}
            {activeTab === 'units' && <UnitsTab />}
            {activeTab === 'backup' && <BackupTab />}
            {activeTab === 'bank_accounts' && (
                <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200">
                    <SchoolBankAccounts />
                </div>
            )}
            {activeTab === 'payment_gateway' && <PaymentGatewayTab onSaved={fetchFeatures} />}
            {activeTab === 'finance_policy' && <FinancePolicyTab onSaved={fetchFeatures} />}
            {activeTab === 'rfid_attendance' && <RFIDAttendanceTab onSaved={fetchFeatures} />}
            {activeTab === 'landing_page' && <LandingPageTab onSaved={fetchFeatures} />}
        </div>
    );
};

// ═══════════════════════════════════════════
// ─── Tab 1: Profil Sekolah ───
// ═══════════════════════════════════════════
const ProfileTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery<SchoolSetting[]>({
        queryKey: ['school-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        },
    });

    const getVal = (key: string) => settings?.find(s => s.key === key)?.value || '';

    const [form, setForm] = useState<Record<string, string>>({});

    // Initialize form when settings load
    React.useEffect(() => {
        if (settings && Object.keys(form).length === 0) {
            const f: Record<string, string> = {};
            settings.forEach(s => { if (s.is_admin_edit) f[s.key] = s.value; });
            setForm(f);
        }
    }, [settings]);

    const updateField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const updates = Object.entries(form).map(([key, value]) => ({ key, value }));
            return api.put('/admin/settings', { settings: updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            onSaved(); // Refresh featureStore for sidebar
            alert('Pengaturan berhasil disimpan!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal menyimpan');
        },
    });

    const logoMutation = useMutation({
        mutationFn: async (file: File) => {
            const fd = new FormData();
            fd.append('file', file);
            return api.post('/admin/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            onSaved();
            setForm(prev => ({ ...prev, school_logo_url: res.data.logo_url }));
            alert('Logo berhasil diupload!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal upload logo');
        },
    });

    if (isLoading) {
        return <CardGlass className="p-8 text-center text-slate-500">Memuat pengaturan...</CardGlass>;
    }

    const logoUrl = form.school_logo_url || getVal('school_logo_url');

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Logo Card */}
            <CardGlass className="p-6 text-center space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Logo Sekolah</h3>
                <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 border-2 border-dashed border-green-300 flex items-center justify-center overflow-hidden mx-auto">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Building2 size={48} className="text-green-300" />
                        )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 p-2 bg-white/80 hover:bg-white backdrop-blur-md rounded-full border border-green-200 transition-colors cursor-pointer shadow-md">
                        <Camera size={16} className="text-green-600" />
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 3 * 1024 * 1024) {
                                        alert("Maksimal ukuran file adalah 3MB");
                                        e.target.value = '';
                                        return;
                                    }
                                    logoMutation.mutate(file);
                                }
                            }}
                        />
                    </label>
                </div>
                <p className="text-xs text-slate-400">Klik ikon kamera untuk upload logo baru</p>

                {/* Developer-only fields info */}
                {settings?.filter(s => !s.is_admin_edit).map(s => (
                    <div key={s.key} className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-600 font-medium">{s.description}</p>
                        <p className="text-sm text-amber-800 font-bold mt-1">{s.value || '—'}</p>
                        <p className="text-[10px] text-amber-500 mt-1">🔒 Hanya developer yang bisa mengubah</p>
                    </div>
                ))}
            </CardGlass>

            {/* Form */}
            <CardGlass className="lg:col-span-2 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Building2 size={20} className="text-green-600" />
                    Informasi Sekolah
                </h3>

                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-sm text-slate-600 font-medium">Nama Sekolah</label>
                            <InputGlass
                                value={form.school_name || ''}
                                onChange={(e) => updateField('school_name', e.target.value)}
                                icon={Building2}
                                placeholder="SDIT Al-Ikhlas"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm text-slate-600 font-medium">NPSN</label>
                            <InputGlass
                                value={form.school_npsn || ''}
                                onChange={(e) => updateField('school_npsn', e.target.value)}
                                icon={Hash}
                                placeholder="12345678"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Alamat</label>
                        <InputGlass
                            value={form.school_address || ''}
                            onChange={(e) => updateField('school_address', e.target.value)}
                            icon={MapPin}
                            placeholder="Jl. Pendidikan No.1, Kota ..."
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-sm text-slate-600 font-medium">Telepon</label>
                            <InputGlass
                                value={form.school_phone || ''}
                                onChange={(e) => updateField('school_phone', e.target.value)}
                                icon={Phone}
                                placeholder="021-1234567"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm text-slate-600 font-medium">Email</label>
                            <InputGlass
                                value={form.school_email || ''}
                                onChange={(e) => updateField('school_email', e.target.value)}
                                icon={Mail}
                                placeholder="info@sekolah.sch.id"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <ButtonGlass type="submit" className="flex items-center gap-2" disabled={saveMutation.isPending}>
                            <Save size={18} />
                            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </ButtonGlass>
                    </div>
                </form>
            </CardGlass>
        </div>
    );
};

// ═══════════════════════════════════════════
// ─── Tab: Landing Page ───
// ═══════════════════════════════════════════
const LandingPageTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery<SchoolSetting[]>({
        queryKey: ['school-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        },
    });

    const [form, setForm] = useState<Record<string, string>>({});

    React.useEffect(() => {
        if (settings && Object.keys(form).length === 0) {
            const f: Record<string, string> = {};
            settings.forEach(s => { 
                if (s.key.startsWith('landing_') && s.is_admin_edit) {
                    f[s.key] = s.value;
                }
            });
            setForm(f);
        }
    }, [settings]);

    const updateField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const updates = Object.entries(form).map(([key, value]) => ({ key, value }));
            return api.put('/admin/settings', { settings: updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            onSaved();
            alert('Pengaturan Landing Page berhasil disimpan!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal menyimpan');
        },
    });

    if (isLoading) {
        return <CardGlass className="p-8 text-center text-slate-500">Memuat pengaturan...</CardGlass>;
    }

    return (
        <CardGlass className="p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-green-600" />
                Konten Teks Landing Page
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Judul Hero (Slider)</label>
                        <InputGlass
                            value={form.landing_hero_title || ''}
                            onChange={(e) => updateField('landing_hero_title', e.target.value)}
                            placeholder="Masa Depan Cerah Dimulai dari Sini"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Sub-Judul Hero</label>
                        <InputGlass
                            value={form.landing_hero_subtitle || ''}
                            onChange={(e) => updateField('landing_hero_subtitle', e.target.value)}
                            placeholder="Mendidik generasi unggul dengan akhlak islami"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm text-slate-600 font-medium">Judul Tentang Kami</label>
                    <InputGlass
                        value={form.landing_about_title || ''}
                        onChange={(e) => updateField('landing_about_title', e.target.value)}
                        placeholder="Keunggulan Kami"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm text-slate-600 font-medium">Deskripsi Tentang Kami</label>
                    <textarea
                        value={form.landing_about_desc || ''}
                        onChange={(e) => updateField('landing_about_desc', e.target.value)}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        rows={3}
                        placeholder="Fasilitas modern dan kurikulum terintegrasi..."
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Judul Ajakan (CTA)</label>
                        <InputGlass
                            value={form.landing_cta_title || ''}
                            onChange={(e) => updateField('landing_cta_title', e.target.value)}
                            placeholder="Siap Bergabung Bersama Kami?"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Deskripsi Ajakan (CTA)</label>
                        <InputGlass
                            value={form.landing_cta_desc || ''}
                            onChange={(e) => updateField('landing_cta_desc', e.target.value)}
                            placeholder="Pendaftaran Santri Baru Tahun Ajaran..."
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <ButtonGlass type="submit" className="flex items-center gap-2" disabled={saveMutation.isPending}>
                        <Save size={18} />
                        {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Konten'}
                    </ButtonGlass>
                </div>
            </form>
        </CardGlass>
    );
};

// ═══════════════════════════════════════════
// ─── Tab 2: Unit Sekolah (View Only) ───
// ═══════════════════════════════════════════
const UnitsTab: React.FC = () => {
    const { data, isLoading } = useQuery<{ units: UnitData[]; foundations: FoundationData[] }>({
        queryKey: ['school-units'],
        queryFn: async () => {
            const res = await api.get('/admin/units');
            return res.data;
        },
    });

    if (isLoading) {
        return <CardGlass className="p-8 text-center text-slate-500">Memuat data unit...</CardGlass>;
    }

    const units = data?.units || [];
    const foundations = data?.foundations || [];

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-blue-800">Unit Sekolah dikelola oleh Developer</p>
                    <p className="text-xs text-blue-600 mt-1">
                        Untuk keamanan arsitektur SaaS, unit sekolah dan yayasan hanya bisa ditambah atau diubah oleh tim developer.
                        Hubungi developer jika perlu perubahan.
                    </p>
                </div>
            </div>

            {/* Foundation Card */}
            {foundations.length > 0 && (
                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-purple-600" />
                        Yayasan
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {foundations.map(f => (
                            <div key={f.id} className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <h4 className="text-sm font-bold text-purple-800">{f.name}</h4>
                                {f.address && <p className="text-xs text-purple-600 mt-1">📍 {f.address}</p>}
                                {f.phone && <p className="text-xs text-purple-600">📞 {f.phone}</p>}
                                {f.email && <p className="text-xs text-purple-600">✉️ {f.email}</p>}
                            </div>
                        ))}
                    </div>
                </CardGlass>
            )}

            {/* Units List */}
            <CardGlass className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Building2 size={20} className="text-green-600" />
                    Daftar Unit
                </h3>

                {units.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">Belum ada unit terdaftar.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Nama Unit</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Kode</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Yayasan</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map(u => (
                                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="py-3 px-4 text-slate-400 font-mono">{u.id}</td>
                                        <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                                        <td className="py-3 px-4">
                                            {u.code ? (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-xs">{u.code}</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{u.foundation?.name || '—'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {u.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardGlass>
        </div>
    );
};

// ═══════════════════════════════════════════
// ─── Tab 3: Backup & Restore (Timeline) ───
// ═══════════════════════════════════════════
const BackupTab: React.FC = () => {
    const queryClient = useQueryClient();
    const [label, setLabel] = useState('');
    const [notes, setNotes] = useState('');
    const [restoreId, setRestoreId] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState('');

    const { data: backups = [], isLoading } = useQuery<BackupData[]>({
        queryKey: ['backups'],
        queryFn: async () => {
            const res = await api.get('/admin/backups');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            return api.post('/admin/backups', { label, notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setLabel('');
            setNotes('');
            alert('Backup berhasil dibuat!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal membuat backup');
        },
    });

    const restoreMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.post(`/admin/backups/${id}/restore`, { confirmation: 'RESTORE' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setRestoreId(null);
            setConfirmation('');
            alert('Database berhasil di-restore!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal restore database');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/admin/backups/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
        },
    });

    const handleDownload = async (id: string, filename: string) => {
        try {
            const res = await api.get(`/admin/backups/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Gagal download backup');
        }
    };

    return (
        <div className="space-y-6">
            {/* Create Backup Card */}
            <CardGlass className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <HardDrive size={20} className="text-green-600" />
                    Buat Backup Baru
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Label (opsional)</label>
                        <InputGlass
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            icon={FileText}
                            placeholder="Mis: Sebelum Migrasi Data"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-600 font-medium">Catatan (opsional)</label>
                        <InputGlass
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            icon={FileText}
                            placeholder="Catatan tambahan..."
                        />
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Backup menggunakan PostgreSQL pg_dump (format custom)</p>
                    <ButtonGlass
                        onClick={() => createMutation.mutate()}
                        disabled={createMutation.isPending}
                        className="flex items-center gap-2"
                    >
                        <Database size={16} />
                        {createMutation.isPending ? 'Membuat backup...' : 'Buat Backup Sekarang'}
                    </ButtonGlass>
                </div>
            </CardGlass>

            {/* Timeline */}
            <CardGlass className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    Timeline Backup
                    <span className="ml-auto text-xs text-slate-400 font-normal">{backups.length} backup</span>
                </h3>

                {isLoading ? (
                    <p className="text-center text-slate-500 py-8">Memuat timeline...</p>
                ) : backups.length === 0 ? (
                    <div className="text-center py-12">
                        <Database size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500">Belum ada backup. Buat backup pertama Anda!</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Vertical timeline line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-300 via-blue-300 to-slate-200" />

                        <div className="space-y-4">
                            {backups.map((backup, idx) => (
                                <div key={backup.id} className="relative pl-12">
                                    {/* Timeline dot */}
                                    <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-white shadow-md ${
                                        idx === 0 ? 'bg-green-500' :
                                        backup.restored_at ? 'bg-blue-500' :
                                        backup.status === 'Failed' ? 'bg-red-400' :
                                        'bg-slate-300'
                                    }`} />

                                    {/* Backup Card */}
                                    <div className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                                        idx === 0
                                            ? 'bg-green-50/50 border-green-200 shadow-sm'
                                            : 'bg-white/60 border-slate-200 hover:bg-white/80'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">
                                                        {backup.label || backup.filename}
                                                    </h4>
                                                    <StatusBadge status={backup.status} />
                                                    {idx === 0 && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-green-200 text-green-800 rounded font-semibold uppercase">
                                                            Terbaru
                                                        </span>
                                                    )}
                                                    {backup.restored_at && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded font-semibold">
                                                            Pernah di-restore
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={11} /> {formatDate(backup.created_at)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{timeAgo(backup.created_at)}</span>
                                                    <span>•</span>
                                                    <span>{formatBytes(backup.file_size_bytes)}</span>
                                                    <span>•</span>
                                                    <span>oleh {backup.created_by?.name || '—'}</span>
                                                </div>
                                                {backup.notes && (
                                                    <p className="text-xs text-slate-400 mt-1 italic">📝 {backup.notes}</p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleDownload(backup.id, backup.filename)}
                                                    className="p-2 rounded-lg bg-white/60 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-600 transition-all"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setRestoreId(backup.id); setConfirmation(''); }}
                                                    className="p-2 rounded-lg bg-white/60 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-500 hover:text-amber-600 transition-all"
                                                    title="Restore"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Hapus backup ini?')) deleteMutation.mutate(backup.id);
                                                    }}
                                                    className="p-2 rounded-lg bg-white/60 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-500 hover:text-red-600 transition-all"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardGlass>

            {/* Restore Confirmation Modal */}
            {restoreId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-600">
                            <AlertTriangle size={28} />
                            <h3 className="text-lg font-bold">Konfirmasi Restore</h3>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                            <p className="text-sm text-red-700 font-medium">⚠️ Peringatan!</p>
                            <p className="text-xs text-red-600 mt-1">
                                Restore akan <strong>menghapus SEMUA data saat ini</strong> dan menggantinya dengan data dari backup.
                                Tindakan ini tidak bisa dibatalkan!
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm text-slate-600 font-medium">
                                Ketik <code className="px-1.5 py-0.5 bg-slate-100 rounded text-red-600 font-bold">RESTORE</code> untuk konfirmasi:
                            </label>
                            <input
                                type="text"
                                value={confirmation}
                                onChange={(e) => setConfirmation(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-red-400 focus:ring-2 focus:ring-red-200 text-sm font-mono"
                                placeholder="RESTORE"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { setRestoreId(null); setConfirmation(''); }}
                                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmation === 'RESTORE') {
                                        restoreMutation.mutate(restoreId);
                                    } else {
                                        alert('Anda harus mengetik RESTORE untuk melanjutkan');
                                    }
                                }}
                                disabled={confirmation !== 'RESTORE' || restoreMutation.isPending}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    confirmation === 'RESTORE'
                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {restoreMutation.isPending ? 'Restoring...' : 'Restore Database'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════
// ─── Tab: Payment Gateway ───
// ═══════════════════════════════════════════
const PaymentGatewayTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const queryClient = useQueryClient();
    const [showMidtransSecret, setShowMidtransSecret] = useState(false);
    const [showXenditSecret, setShowXenditSecret] = useState(false);
    const [showXenditToken, setShowXenditToken] = useState(false);
    const [showMayarSecret, setShowMayarSecret] = useState(false);
    const [showMayarToken, setShowMayarToken] = useState(false);

    const { data: settings, isLoading } = useQuery<SchoolSetting[]>({
        queryKey: ['school-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        },
    });

    const [form, setForm] = useState<Record<string, string>>({});

    React.useEffect(() => {
        if (settings && Object.keys(form).length === 0) {
            const f: Record<string, string> = {
                active_payment_gateway: 'midtrans',
                midtrans_server_key: '',
                midtrans_client_key: '',
                midtrans_is_production: 'false',
                xendit_secret_key: '',
                xendit_public_key: '',
                xendit_webhook_token: '',
                xendit_is_production: 'false',
                mayar_api_key: '',
                mayar_webhook_token: '',
                mayar_is_production: 'false',
            };
            settings.forEach(s => {
                if (s.is_admin_edit) f[s.key] = s.value;
            });
            setForm(f);
        }
    }, [settings]);

    const updateField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const updates = Object.entries(form).map(([key, value]) => ({ key, value }));
            return api.put('/admin/settings', { settings: updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            useFeatureStore.getState().fetchFeatures();
            onSaved();
            toast.success('Pengaturan Payment Gateway berhasil disimpan!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal menyimpan pengaturan');
        },
    });

    if (isLoading) {
        return <CardGlass className="p-8 text-center text-slate-500">Memuat pengaturan Payment Gateway...</CardGlass>;
    }

    const xenditWebhookUrl = `${window.location.origin}/api/xendit/notification`;
    const midtransWebhookUrl = `${window.location.origin}/api/midtrans/notification`;
    const mayarWebhookUrl = `${window.location.origin}/api/mayar/notification`;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} berhasil disalin!`);
    };

    return (
        <div className="space-y-6">
            <CardGlass className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Pilih Payment Gateway Aktif</h2>
                        <p className="text-xs text-slate-500">Tentukan gateway mana yang digunakan untuk pembayaran tagihan online siswa & wali murid</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Midtrans Option */}
                    <div
                        onClick={() => updateField('active_payment_gateway', 'midtrans')}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                            form.active_payment_gateway === 'midtrans'
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200'
                                : 'border-slate-200 hover:border-slate-300 bg-white/60'
                        }`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg">Midtrans</span>
                                <input
                                    type="radio"
                                    name="active_gateway"
                                    checked={form.active_payment_gateway === 'midtrans'}
                                    onChange={() => updateField('active_payment_gateway', 'midtrans')}
                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                />
                            </div>
                            <p className="font-semibold text-slate-800 text-sm">Snap Payment</p>
                            <p className="text-xs text-slate-500 mt-1">Pop-up checkout mendukung QRIS, Bank Transfer (VA), GoPay, ShopeePay, dll.</p>
                        </div>
                    </div>

                    {/* Xendit Option */}
                    <div
                        onClick={() => updateField('active_payment_gateway', 'xendit')}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                            form.active_payment_gateway === 'xendit'
                                ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                                : 'border-slate-200 hover:border-slate-300 bg-white/60'
                        }`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2.5 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg">Xendit</span>
                                <input
                                    type="radio"
                                    name="active_gateway"
                                    checked={form.active_payment_gateway === 'xendit'}
                                    onChange={() => updateField('active_payment_gateway', 'xendit')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                            </div>
                            <p className="font-semibold text-slate-800 text-sm">Xendit Invoice</p>
                            <p className="text-xs text-slate-500 mt-1">Halaman checkout mendukung QRIS, Virtual Account, Retail, E-Wallet.</p>
                        </div>
                    </div>

                    {/* Mayar.id Option */}
                    <div
                        onClick={() => updateField('active_payment_gateway', 'mayar')}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                            form.active_payment_gateway === 'mayar'
                                ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-200'
                                : 'border-slate-200 hover:border-slate-300 bg-white/60'
                        }`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2.5 py-1 bg-purple-600 text-white font-bold text-xs rounded-lg">Mayar.id</span>
                                <input
                                    type="radio"
                                    name="active_gateway"
                                    checked={form.active_payment_gateway === 'mayar'}
                                    onChange={() => updateField('active_payment_gateway', 'mayar')}
                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                />
                            </div>
                            <p className="font-semibold text-slate-800 text-sm">Mayar Invoice</p>
                            <p className="text-xs text-slate-500 mt-1">Payment link instan mendukung QRIS, Virtual Account bank, E-Wallet & Retail.</p>
                        </div>
                    </div>

                    {/* Disabled Option */}
                    <div
                        onClick={() => updateField('active_payment_gateway', 'none')}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                            form.active_payment_gateway === 'none'
                                ? 'border-slate-600 bg-slate-100 shadow-md ring-2 ring-slate-200'
                                : 'border-slate-200 hover:border-slate-300 bg-white/60'
                        }`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2.5 py-1 bg-slate-600 text-white font-bold text-xs rounded-lg">Nonaktif</span>
                                <input
                                    type="radio"
                                    name="active_gateway"
                                    checked={form.active_payment_gateway === 'none'}
                                    onChange={() => updateField('active_payment_gateway', 'none')}
                                    className="w-4 h-4 text-slate-600 focus:ring-slate-500"
                                />
                            </div>
                            <p className="font-semibold text-slate-800 text-sm">Manual Only</p>
                            <p className="text-xs text-slate-500 mt-1">Sembunyikan pembayaran online. Hanya transfer bank manual & upload bukti.</p>
                        </div>
                    </div>
                </div>
            </CardGlass>

            {/* Midtrans Config Card */}
            <CardGlass className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                        <h3 className="font-bold text-slate-800 text-md">Konfigurasi Midtrans</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Mode:</span>
                        <select
                            value={form.midtrans_is_production || 'false'}
                            onChange={(e) => updateField('midtrans_is_production', e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="false">Sandbox (Pengujian)</option>
                            <option value="true">Production (Live)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Midtrans Server Key</label>
                        <div className="relative">
                            <input
                                type={showMidtransSecret ? 'text' : 'password'}
                                value={form.midtrans_server_key || ''}
                                onChange={(e) => updateField('midtrans_server_key', e.target.value)}
                                placeholder="SB-Mid-server-..."
                                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowMidtransSecret(!showMidtransSecret)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showMidtransSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Midtrans Client Key</label>
                        <input
                            type="text"
                            value={form.midtrans_client_key || ''}
                            onChange={(e) => updateField('midtrans_client_key', e.target.value)}
                            placeholder="SB-Mid-client-..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600">Webhook URL: <code className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{midtransWebhookUrl}</code></span>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(midtransWebhookUrl, 'Midtrans Webhook URL')}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        <Copy size={12} /> Salin
                    </button>
                </div>
            </CardGlass>

            {/* Xendit Config Card */}
            <CardGlass className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                        <h3 className="font-bold text-slate-800 text-md">Konfigurasi Xendit</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Mode:</span>
                        <select
                            value={form.xendit_is_production || 'false'}
                            onChange={(e) => updateField('xendit_is_production', e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="false">Development / Sandbox</option>
                            <option value="true">Production (Live)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Xendit Secret Key</label>
                        <div className="relative">
                            <input
                                type={showXenditSecret ? 'text' : 'password'}
                                value={form.xendit_secret_key || ''}
                                onChange={(e) => updateField('xendit_secret_key', e.target.value)}
                                placeholder="xnd_development_..."
                                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowXenditSecret(!showXenditSecret)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showXenditSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Xendit Public Key (Opsional)</label>
                        <input
                            type="text"
                            value={form.xendit_public_key || ''}
                            onChange={(e) => updateField('xendit_public_key', e.target.value)}
                            placeholder="xnd_public_development_..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Webhook Verification Token (x-callback-token)</label>
                        <div className="relative">
                            <input
                                type={showXenditToken ? 'text' : 'password'}
                                value={form.xendit_webhook_token || ''}
                                onChange={(e) => updateField('xendit_webhook_token', e.target.value)}
                                placeholder="Token verifikasi callback Xendit..."
                                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowXenditToken(!showXenditToken)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showXenditToken ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Dapatkan Verification Token ini dari dashboard Xendit (Settings &gt; Webhooks &gt; Verification Token).</p>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600">Webhook URL: <code className="font-mono text-blue-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{xenditWebhookUrl}</code></span>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(xenditWebhookUrl, 'Xendit Webhook URL')}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                        <Copy size={12} /> Salin
                    </button>
                </div>
            </CardGlass>

            {/* Mayar Config Card */}
            <CardGlass className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                        <h3 className="font-bold text-slate-800 text-md">Konfigurasi Mayar.id</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Mode:</span>
                        <select
                            value={form.mayar_is_production || 'false'}
                            onChange={(e) => updateField('mayar_is_production', e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="false">Sandbox (api.mayar.io)</option>
                            <option value="true">Production (api.mayar.id)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Mayar API Key (Secret Key)</label>
                        <div className="relative">
                            <input
                                type={showMayarSecret ? 'text' : 'password'}
                                value={form.mayar_api_key || ''}
                                onChange={(e) => updateField('mayar_api_key', e.target.value)}
                                placeholder="eyJhbGciOi..."
                                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowMayarSecret(!showMayarSecret)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showMayarSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Dapatkan API Key dari Dashboard Mayar (Integration &gt; API Keys).</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Webhook Token / Secret (Opsional)</label>
                        <div className="relative">
                            <input
                                type={showMayarToken ? 'text' : 'password'}
                                value={form.mayar_webhook_token || ''}
                                onChange={(e) => updateField('mayar_webhook_token', e.target.value)}
                                placeholder="Token verifikasi webhook Mayar..."
                                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowMayarToken(!showMayarToken)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showMayarToken ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Opsional untuk memverifikasi request callback Mayar.</p>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600">Webhook URL: <code className="font-mono text-purple-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{mayarWebhookUrl}</code></span>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(mayarWebhookUrl, 'Mayar Webhook URL')}
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium"
                    >
                        <Copy size={12} /> Salin
                    </button>
                </div>
            </CardGlass>

            {/* Save Button */}
            <div className="flex justify-end">
                <ButtonGlass
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition"
                >
                    <Save size={16} />
                    {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Gateway'}
                </ButtonGlass>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════
// ─── Tab: Presensi & RFID / NFC ───
// ═══════════════════════════════════════════
const RFIDAttendanceTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const queryClient = useQueryClient();

    const { data: settings } = useQuery<SchoolSetting[]>({
        queryKey: ['school-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        },
    });

    const [form, setForm] = useState<Record<string, string>>({
        enable_rfid_attendance: 'true',
        enable_attendance_wa_notif: 'true',
        attendance_entry_start: '06:00',
        attendance_late_threshold: '07:15',
        attendance_exit_start: '14:00',
        attendance_cooldown_minutes: '3',
        rfid_device_api_key: '',
        wa_notif_attendance_in: '',
        wa_notif_attendance_out: '',
    });

    React.useEffect(() => {
        if (settings) {
            const f: Record<string, string> = { ...form };
            settings.forEach((s) => {
                if (s.is_admin_edit) {
                    f[s.key] = s.value;
                }
            });
            setForm(f);
        }
    }, [settings]);

    const updateField = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const generateRandomApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let res = 'rfid_key_';
        for (let i = 0; i < 24; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        updateField('rfid_device_api_key', res);
        toast.success('API Key acak berhasil dibuat');
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} disalin ke clipboard`);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const updates = Object.entries(form).map(([key, value]) => ({ key, value }));
            return api.put('/admin/settings', { settings: updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            onSaved();
            toast.success('Pengaturan Presensi & RFID berhasil disimpan!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal menyimpan pengaturan');
        },
    });

    const isEnabled = form.enable_rfid_attendance === 'true';
    const isWAEnabled = form.enable_attendance_wa_notif === 'true';

    const tapApiUrl = `${window.location.origin}/api/public/attendance/rfid-tap`;

    return (
        <div className="space-y-6">
            {/* Header Alert */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Radio size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Kontrol Presensi Siswa Berbasis RFID & NFC</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                        Atur status aktif fitur, batas toleransi jam hadir/terlambat, cooldown double-tap, integrasi scanner alat ESP32/IoT, serta notifikasi WhatsApp otomatis ke wali siswa.
                    </p>
                </div>
            </div>

            {/* 1. Master Toggle & WA Notification */}
            <CardGlass className="p-6">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Radio size={18} className="text-emerald-600" />
                    Status Fitur & Notifikasi
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Master Switch */}
                    <div className={`p-4 rounded-2xl border transition-all ${isEnabled ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-800">Fitur Presensi RFID & NFC</span>
                            <button
                                type="button"
                                onClick={() => updateField('enable_rfid_attendance', isEnabled ? 'false' : 'true')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            {isEnabled
                                ? '🟢 Fitur Aktif: Scanner NFC HP, USB Reader, dan IoT Device dapat mencatat kehadiran.'
                                : '🔴 Fitur Nonaktif: Semua permintaan tap RFID/NFC akan ditolak sementara.'}
                        </p>
                    </div>

                    {/* WA Toggle */}
                    <div className={`p-4 rounded-2xl border transition-all ${isWAEnabled ? 'bg-teal-50/60 border-teal-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-800">Notifikasi WA ke Orang Tua</span>
                            <button
                                type="button"
                                onClick={() => updateField('enable_attendance_wa_notif', isWAEnabled ? 'false' : 'true')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isWAEnabled ? 'bg-teal-600' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isWAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            {isWAEnabled
                                ? '🟢 Aktif: Orang tua/wali akan menerima pesan WhatsApp langsung saat siswa tap kartu.'
                                : '⚪ Nonaktif: Presensi dicatat ke sistem tanpa mengirim pesan WA.'}
                        </p>
                    </div>
                </div>
            </CardGlass>

            {/* 2. Jam Sekolah & Toleransi */}
            <CardGlass className="p-6">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-purple-600" />
                    Jadwal Waktu Presensi & Toleransi Keterlambatan
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Jam Mulai Presensi Masuk
                        </label>
                        <input
                            type="time"
                            value={form.attendance_entry_start || '06:00'}
                            onChange={(e) => updateField('attendance_entry_start', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-purple-500 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Mulai buka scanner masuk pagi</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Batas Waktu Hadir Tepat Waktu
                        </label>
                        <input
                            type="time"
                            value={form.attendance_late_threshold || '07:15'}
                            onChange={(e) => updateField('attendance_late_threshold', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Tap lewat jam ini = <strong className="text-amber-600">Terlambat</strong></p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Jam Mulai Presensi Pulang
                        </label>
                        <input
                            type="time"
                            value={form.attendance_exit_start || '14:00'}
                            onChange={(e) => updateField('attendance_exit_start', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Waktu mulai buka absensi pulang</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Jeda Anti Double-Tap (Menit)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={form.attendance_cooldown_minutes || '3'}
                            onChange={(e) => updateField('attendance_cooldown_minutes', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Cegah kartu tertempel tak sengaja</p>
                    </div>
                </div>
            </CardGlass>

            {/* 3. Integrasi Alat Scanner IoT (ESP32 / Gate) */}
            <CardGlass className="p-6">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Key size={18} className="text-indigo-600" />
                    Integrasi Alat Scanner IoT / Gerbang Mandiri (ESP32)
                </h2>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                                API Key Perangkat Scanner (Opsional)
                            </label>
                            <button
                                type="button"
                                onClick={generateRandomApiKey}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                                <RefreshCw size={12} /> Buat Key Acak
                            </button>
                        </div>
                        <input
                            type="text"
                            value={form.rfid_device_api_key || ''}
                            onChange={(e) => updateField('rfid_device_api_key', e.target.value)}
                            placeholder="Contoh: rfid_key_9A8B7C6D5E4F..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Kosongkan jika hanya menggunakan scanner via Web Browser / HP NFC.</p>
                    </div>

                    <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono space-y-2">
                        <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
                            <span>HTTP POST Request Endpoint untuk ESP32 / IoT:</span>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(`curl -X POST "${tapApiUrl}" -H "Content-Type: application/json" -d '{"rfid": "04A1B2C3", "type": "Auto", "method": "RFID"}'`, 'cURL command')}
                                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                            >
                                <Copy size={12} /> Salin cURL
                            </button>
                        </div>
                        <div className="overflow-x-auto text-emerald-400">
                            POST {tapApiUrl}
                        </div>
                        <div className="text-slate-400">
                            {JSON.stringify({ rfid: "04A1B2C3", type: "Auto", method: "RFID", device_id: "Gate-1" }, null, 2)}
                        </div>
                    </div>
                </div>
            </CardGlass>

            {/* 4. Format Pesan WhatsApp */}
            <CardGlass className="p-6">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BellRing size={18} className="text-teal-600" />
                    Kustomisasi Template Pesan WhatsApp Presensi
                </h2>

                <div className="mb-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-200">
                    <span className="font-semibold text-slate-700">Variabel tag yang dapat digunakan:</span>
                    <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[11px]">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-teal-700">{`{nama_siswa}`}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-teal-700">{`{nisn}`}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-teal-700">{`{kelas}`}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-teal-700">{`{waktu}`}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-teal-700">{`{tanggal}`}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-teal-700">{`{status}`}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Pesan WA Presensi Masuk (Check-In)
                        </label>
                        <textarea
                            rows={6}
                            value={form.wa_notif_attendance_in || ''}
                            onChange={(e) => updateField('wa_notif_attendance_in', e.target.value)}
                            placeholder="Assalamu'alaikum Wr. Wb. Diberitahukan bahwa ananda *{nama_siswa}* ({kelas}) telah hadir di sekolah pada pukul *{waktu}* WIB. Status: *{status}*."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Pesan WA Presensi Pulang (Check-Out)
                        </label>
                        <textarea
                            rows={6}
                            value={form.wa_notif_attendance_out || ''}
                            onChange={(e) => updateField('wa_notif_attendance_out', e.target.value)}
                            placeholder="Assalamu'alaikum Wr. Wb. Diberitahukan bahwa ananda *{nama_siswa}* ({kelas}) telah selesai KBM dan melakukan presensi pulang pada pukul *{waktu}* WIB."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                    </div>
                </div>
            </CardGlass>

            {/* Save Button */}
            <div className="flex justify-end">
                <ButtonGlass
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition"
                >
                    <Save size={16} />
                    {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Presensi & RFID'}
                </ButtonGlass>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════
// ─── Tab: Kebijakan Keuangan (Financial Feature Policy) ───
// ═══════════════════════════════════════════
const FinancePolicyTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery<SchoolSetting[]>({
        queryKey: ['school-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        },
    });

    const isForceDeleteEnabled = settings?.find(s => s.key === 'allow_delete_paid_obligations')?.value === 'true';

    const saveSettingMutation = useMutation({
        mutationFn: async (newValue: string) => {
            return api.put('/admin/settings', {
                settings: [{ key: 'allow_delete_paid_obligations', value: newValue }]
            });
        },
        onSuccess: (_, newValue) => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            onSaved();
            if (newValue === 'true') {
                toast.success('Mode Koreksi Aktif: Anda sekarang dapat menghapus tanggungan yang sudah terbayar');
            } else {
                toast.success('Mode Aman Aktif: Tanggungan terbayar kini terkunci dan aman dari penghapusan');
            }
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal mengubah pengaturan');
        },
    });

    const handleToggle = () => {
        const nextState = isForceDeleteEnabled ? 'false' : 'true';
        if (nextState === 'true') {
            const confirmed = window.confirm(
                '⚠️ PERINGATAN KEAMANAN TRANSAKSI:\n\n' +
                'Mengaktifkan fitur ini memungkinkan Admin menghapus tanggungan siswa yang sudah lunas/terbayar.\n' +
                'Penghapusan akan secara otomatis membatalkan dan menghapus:\n' +
                '1. Tagihan siswa (Bill)\n' +
                '2. Riwayat transaksi pembayaran (Payment)\n' +
                '3. Pencatatan kas pemasukan di Buku Kas Umum (BKU)\n' +
                '4. Realisasi anggaran di RKAS\n\n' +
                'Disarankan untuk menonaktifkan kembali fitur ini setelah selesai melakukan perbaikan salah input di produksi.\n\n' +
                'Apakah Anda yakin ingin mengaktifkan Mode Koreksi ini?'
            );
            if (!confirmed) return;
        }
        saveSettingMutation.mutate(nextState);
    };

    if (isLoading) {
        return <CardGlass className="p-8 text-center text-slate-500">Memuat pengaturan kebijakan keuangan...</CardGlass>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header Card */}
            <CardGlass className="p-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${isForceDeleteEnabled ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isForceDeleteEnabled ? <AlertTriangle size={28} /> : <Shield size={28} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Kebijakan Pembatalan & Koreksi Transaksi</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isForceDeleteEnabled 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                                {isForceDeleteEnabled ? '⚠️ Mode Koreksi Aktif' : '🛡️ Mode Aman (Terkunci)'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                            Atur izin penghapusan data tanggungan yang sudah memiliki riwayat pembayaran di sistem. 
                            Fitur ini berguna saat terjadi kesalahan input data/orang di production.
                        </p>
                    </div>
                </div>
            </CardGlass>

            {/* Main Toggle Card */}
            <CardGlass className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 text-base">Izinkan Hapus Tanggungan Terbayar (Force Delete)</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Jika diaktifkan, Admin dapat menghapus tanggungan siswa yang sudah memiliki riwayat pembayaran (lunas maupun sebagian), sekaligus menghapus invoice, membatalkan transaksi pembayaran, menghapus pencatatan kas BKU, dan mengurangi realisasi anggaran RKAS.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={saveSettingMutation.isPending}
                            onClick={handleToggle}
                            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isForceDeleteEnabled ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isForceDeleteEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Explanation of cascading effects */}
                <div className="mt-6 pt-6 border-t border-slate-200/60 grid sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                            <Info size={16} className="text-blue-500" />
                            Dampak Terhadap Data & Laporan
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                            <li><strong>Tagihan (Bill)</strong>: Invoice tagihan terkait akan terhapus.</li>
                            <li><strong>Pembayaran (Payment)</strong>: Riwayat transaksi pembayaran terhapus.</li>
                            <li><strong>Buku Kas Umum (BKU)</strong>: Catatan pemasukan kas umum yang dibuat otomatis dari pembayaran akan ditarik/dihapus.</li>
                            <li><strong>Realisasi RKAS</strong>: Realisasi anggaran yang sudah bertambah akan dikurangi kembali secara otomatis.</li>
                            <li><strong>Dashboard & Analitik</strong>: Grafik SPP dan penerimaan kas akan langsung kembali seimbang.</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-2 ${
                        isForceDeleteEnabled 
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    }`}>
                        <span className="font-bold flex items-center gap-1.5 text-sm">
                            {isForceDeleteEnabled ? <AlertTriangle size={16} className="text-amber-600" /> : <Shield size={16} className="text-emerald-600" />}
                            Petunjuk Penggunaan Aman
                        </span>
                        <p className="leading-relaxed">
                            {isForceDeleteEnabled ? (
                                <>
                                    <strong>PERHATIAN:</strong> Mode Koreksi sedang <strong>AKTIF</strong>. Anda dapat menghapus tanggungan yang salah input di menu <strong>Tanggungan Siswa</strong> atau <strong>Jenis Pembayaran</strong>. Jangan lupa mematikan toggle ini kembali setelah selesai perbaikan.
                                </>
                            ) : (
                                <>
                                    Sistem saat ini berada dalam <strong>Mode Aman</strong>. Menghapus tanggungan yang sudah memiliki riwayat pembayaran akan ditolak demi menjaga integritas data keuangan.
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </CardGlass>
        </div>
    );
};

export default SchoolSettings;
