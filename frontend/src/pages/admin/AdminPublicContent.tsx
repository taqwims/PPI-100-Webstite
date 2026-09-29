import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Plus, Users, Download, GraduationCap, Edit, Trash2, Home,
    FileText, Phone, Building2, Save, Upload, RotateCcw,
    Image as ImageIcon, Sparkles, MessageCircle, Calendar,
    ExternalLink, RefreshCw
} from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useFeatureStore } from '../../store/featureStore';
import { compressImage } from '../../utils/imageCompressor';
import toast from 'react-hot-toast';

type ActiveTab = 'landing' | 'profile' | 'ppdb' | 'contact_footer' | 'teachers' | 'downloads' | 'alumni';

interface SchoolSetting {
    id: number;
    key: string;
    value: string;
    description: string;
    is_admin_edit: boolean;
}

const defaultSlideImages = [
    '/images/slider_1.png',
    '/images/slider_2.png',
    '/images/slider_3.png'
];

const AdminPublicContent: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();
    const fetchFeatures = useFeatureStore((s) => s.fetchFeatures);

    // --- Settings State ---
    const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
    const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
    const [uploadingItemPhoto, setUploadingItemPhoto] = useState(false);
    const [uploadingItemFile, setUploadingItemFile] = useState(false);

    // --- Forms State ---
    const [teacherForm, setTeacherForm] = useState({ id: '', name: '', position: '', photo_url: '', bio: '' });
    const [downloadForm, setDownloadForm] = useState({ id: '', title: '', category: 'Brosur', file_url: '' });
    const [alumniForm, setAlumniForm] = useState({ id: '', name: '', graduation_year: '', profession: '', testimony: '', photo_url: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- Fetch Settings ---
    const { data: settings } = useQuery<SchoolSetting[]>({
        queryKey: ['school-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        },
    });

    useEffect(() => {
        if (settings) {
            const f: Record<string, string> = {};
            settings.forEach(s => {
                if (s.is_admin_edit) {
                    f[s.key] = s.value;
                }
            });
            setSettingsForm(f);
        }
    }, [settings]);

    const updateSettingField = (key: string, value: string) => {
        setSettingsForm(prev => ({ ...prev, [key]: value }));
    };

    // Save Settings Mutation
    const saveSettingsMutation = useMutation({
        mutationFn: async () => {
            const updates = Object.entries(settingsForm).map(([key, value]) => ({ key, value }));
            return api.put('/admin/settings', { settings: updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-settings'] });
            fetchFeatures();
            toast.success('Pengaturan konten publik berhasil disimpan!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal menyimpan pengaturan konten');
        },
    });

    // --- Data Fetching for Teachers, Downloads, Alumni ---
    const { data: teachers, isLoading: isLoadingTeachers } = useQuery({
        queryKey: ['public_teachers'],
        queryFn: async () => {
            const res = await api.get('/public/teachers');
            return res.data;
        },
    });

    const { data: downloads, isLoading: isLoadingDownloads } = useQuery({
        queryKey: ['public_downloads'],
        queryFn: async () => {
            const res = await api.get('/public/downloads');
            return res.data;
        },
    });

    const { data: alumni, isLoading: isLoadingAlumni } = useQuery({
        queryKey: ['public_alumni'],
        queryFn: async () => {
            const res = await api.get('/public/alumni');
            return res.data;
        },
    });

    // --- Upload Handlers ---
    const handleUploadSlideImage = async (slideIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSlide(slideIndex);
        try {
            const compressed = await compressImage(file, 1920, 1080, 0.85);
            const formData = new FormData();
            formData.append('file', compressed);
            formData.append('folder', 'landing');

            const res = await api.post('/finance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const uploadedUrl = res.data?.url || res.data?.file_url;
            if (uploadedUrl) {
                updateSettingField(`landing_slide_${slideIndex}_image`, uploadedUrl);
                toast.success(`Gambar Slide ${slideIndex} berhasil diunggah!`);
            }
        } catch (err: any) {
            console.error('Upload slide image error:', err);
            toast.error(err.response?.data?.error || 'Gagal mengunggah gambar slide');
        } finally {
            setUploadingSlide(null);
        }
    };

    const handleUploadItemImage = async (e: React.ChangeEvent<HTMLInputElement>, target: 'teacher' | 'alumni') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingItemPhoto(true);
        try {
            const compressed = await compressImage(file, 800, 800, 0.85);
            const formData = new FormData();
            formData.append('file', compressed);
            formData.append('folder', target === 'teacher' ? 'teachers' : 'alumni');

            const res = await api.post('/finance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const uploadedUrl = res.data?.url || res.data?.file_url;
            if (uploadedUrl) {
                if (target === 'teacher') {
                    setTeacherForm(prev => ({ ...prev, photo_url: uploadedUrl }));
                } else {
                    setAlumniForm(prev => ({ ...prev, photo_url: uploadedUrl }));
                }
                toast.success('Foto berhasil diunggah!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal mengunggah foto');
        } finally {
            setUploadingItemPhoto(false);
        }
    };

    const handleUploadDocumentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingItemFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'downloads');

            const res = await api.post('/finance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const uploadedUrl = res.data?.url || res.data?.file_url;
            if (uploadedUrl) {
                setDownloadForm(prev => ({ ...prev, file_url: uploadedUrl }));
                toast.success('File dokumen berhasil diunggah!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal mengunggah file dokumen');
        } finally {
            setUploadingItemFile(false);
        }
    };

    // --- Teachers Mutations ---
    const createTeacherMutation = useMutation({
        mutationFn: (data: typeof teacherForm) => api.post('/public-content/teachers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_teachers'] });
            toast.success('Data guru berhasil ditambahkan');
            handleCloseModal();
        },
        onError: () => toast.error('Gagal menambahkan data guru'),
    });

    const updateTeacherMutation = useMutation({
        mutationFn: (data: typeof teacherForm) => api.put(`/public-content/teachers/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_teachers'] });
            toast.success('Data guru berhasil diperbarui');
            handleCloseModal();
        },
        onError: () => toast.error('Gagal memperbarui data guru'),
    });

    const deleteTeacherMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/public-content/teachers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_teachers'] });
            toast.success('Data guru berhasil dihapus');
        },
        onError: () => toast.error('Gagal menghapus data guru'),
    });

    // --- Downloads Mutations ---
    const createDownloadMutation = useMutation({
        mutationFn: (data: typeof downloadForm) => api.post('/public-content/downloads', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_downloads'] });
            toast.success('Dokumen berhasil ditambahkan');
            handleCloseModal();
        },
        onError: () => toast.error('Gagal menambahkan dokumen'),
    });

    const updateDownloadMutation = useMutation({
        mutationFn: (data: typeof downloadForm) => api.put(`/public-content/downloads/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_downloads'] });
            toast.success('Dokumen berhasil diperbarui');
            handleCloseModal();
        },
        onError: () => toast.error('Gagal memperbarui dokumen'),
    });

    const deleteDownloadMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/public-content/downloads/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_downloads'] });
            toast.success('Dokumen berhasil dihapus');
        },
        onError: () => toast.error('Gagal menghapus dokumen'),
    });

    // --- Alumni Mutations ---
    const createAlumniMutation = useMutation({
        mutationFn: (data: typeof alumniForm) => api.post('/public-content/alumni', {
            ...data,
            graduation_year: Number(data.graduation_year)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_alumni'] });
            toast.success('Data alumni berhasil ditambahkan');
            handleCloseModal();
        },
        onError: () => toast.error('Gagal menambahkan data alumni'),
    });

    const updateAlumniMutation = useMutation({
        mutationFn: (data: typeof alumniForm) => api.put(`/public-content/alumni/${data.id}`, {
            ...data,
            graduation_year: Number(data.graduation_year)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_alumni'] });
            toast.success('Data alumni berhasil diperbarui');
            handleCloseModal();
        },
        onError: () => toast.error('Gagal memperbarui data alumni'),
    });

    const deleteAlumniMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/public-content/alumni/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public_alumni'] });
            toast.success('Data alumni berhasil dihapus');
        },
        onError: () => toast.error('Gagal menghapus data alumni'),
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setTeacherForm({ id: '', name: '', position: '', photo_url: '', bio: '' });
        setDownloadForm({ id: '', title: '', category: 'Brosur', file_url: '' });
        setAlumniForm({ id: '', name: '', graduation_year: '', profession: '', testimony: '', photo_url: '' });
    };

    const handleOpenModal = (item?: any) => {
        if (item) {
            setEditingId(item.id);
            if (activeTab === 'teachers') {
                setTeacherForm({ id: item.id, name: item.name, position: item.position, photo_url: item.photo_url || '', bio: item.bio || '' });
            } else if (activeTab === 'downloads') {
                setDownloadForm({ id: item.id, title: item.title, category: item.category || 'Brosur', file_url: item.file_url || '' });
            } else if (activeTab === 'alumni') {
                setAlumniForm({ id: item.id, name: item.name, graduation_year: String(item.graduation_year), profession: item.profession || '', testimony: item.testimony || '', photo_url: item.photo_url || '' });
            }
        } else {
            setEditingId(null);
            setTeacherForm({ id: '', name: '', position: '', photo_url: '', bio: '' });
            setDownloadForm({ id: '', title: '', category: 'Brosur', file_url: '' });
            setAlumniForm({ id: '', name: '', graduation_year: '', profession: '', testimony: '', photo_url: '' });
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            if (activeTab === 'teachers') deleteTeacherMutation.mutate(id);
            if (activeTab === 'downloads') deleteDownloadMutation.mutate(id);
            if (activeTab === 'alumni') deleteAlumniMutation.mutate(id);
        }
    };

    const handleSubmitModal = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'teachers') {
            if (editingId) updateTeacherMutation.mutate(teacherForm);
            else createTeacherMutation.mutate(teacherForm);
        } else if (activeTab === 'downloads') {
            if (editingId) updateDownloadMutation.mutate(downloadForm);
            else createDownloadMutation.mutate(downloadForm);
        } else if (activeTab === 'alumni') {
            if (editingId) updateAlumniMutation.mutate(alumniForm);
            else createAlumniMutation.mutate(alumniForm);
        }
    };

    const slideConfigs = [
        {
            num: 1,
            defaultImg: defaultSlideImages[0],
            defaultTitle: 'Generasi Qur\'ani',
            defaultSubtitle: 'Mencetak kader ulama dan pemimpin masa depan yang berakhlak mulia, cerdas, dan berwawasan global.',
            defaultCta: 'Daftar Sekarang',
            defaultLink: '/ppdb'
        },
        {
            num: 2,
            defaultImg: defaultSlideImages[1],
            defaultTitle: 'Lingkungan Islami',
            defaultSubtitle: 'Suasana pesantren yang kondusif untuk ibadah dan belajar dengan fasilitas masjid yang megah.',
            defaultCta: 'Lihat Profil',
            defaultLink: '/profile'
        },
        {
            num: 3,
            defaultImg: defaultSlideImages[2],
            defaultTitle: 'Ekstrakurikuler Unggulan',
            defaultSubtitle: 'Mengembangkan minat dan bakat santri melalui berbagai kegiatan positif dan berprestasi.',
            defaultCta: 'Kegiatan Kami',
            defaultLink: '/profile'
        }
    ];

    const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { key: 'landing', label: 'Beranda / Landing Page', icon: <Home size={16} /> },
        { key: 'profile', label: 'Profil Sekolah', icon: <Building2 size={16} /> },
        { key: 'ppdb', label: 'Informasi PPDB', icon: <Calendar size={16} /> },
        { key: 'contact_footer', label: 'Kontak, Footer & Sosmed', icon: <Phone size={16} /> },
        { key: 'teachers', label: 'Dewan Guru', icon: <Users size={16} /> },
        { key: 'downloads', label: 'Pusat Unduhan', icon: <Download size={16} /> },
        { key: 'alumni', label: 'Kisah Alumni', icon: <GraduationCap size={16} /> },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="text-emerald-600" size={24} />
                        Manajemen Konten Publik
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Atur seluruh konten yang tampil pada website publik sekolah: gambar slide, teks landing page, profil, info PPDB, kontak, media sosial, guru, unduhan & alumni.
                    </p>
                </div>
                <div className="flex gap-2">
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
                    >
                        <ExternalLink size={14} /> Lihat Web Publik
                    </a>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1 bg-white/60 backdrop-blur-sm rounded-xl p-1.5 border border-slate-200 shadow-sm w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                            activeTab === tab.key
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab 1: Landing Page */}
            {activeTab === 'landing' && (
                <div className="space-y-6">
                    {/* Hero Slider Images */}
                    <CardGlass className="p-6 space-y-6">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <ImageIcon size={18} className="text-emerald-600" />
                                Kelola Slider Hero Beranda (3 Slide Gambar & Teks)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Unggah foto resolusi tinggi dan tentukan judul, subjudul, serta tombol aksi untuk masing-masing slide.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {slideConfigs.map((slide) => {
                                const currentImg = settingsForm[`landing_slide_${slide.num}_image`] || slide.defaultImg;
                                const currentTitle = settingsForm[`landing_slide_${slide.num}_title`] || (slide.num === 1 ? settingsForm.landing_hero_title : '') || slide.defaultTitle;
                                const currentSubtitle = settingsForm[`landing_slide_${slide.num}_subtitle`] || (slide.num === 1 ? settingsForm.landing_hero_subtitle : '') || slide.defaultSubtitle;
                                const currentCta = settingsForm[`landing_slide_${slide.num}_cta`] || slide.defaultCta;
                                const currentLink = settingsForm[`landing_slide_${slide.num}_link`] || slide.defaultLink;

                                return (
                                    <div key={slide.num} className="bg-white/80 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                    Slide {slide.num}
                                                </span>
                                                {settingsForm[`landing_slide_${slide.num}_image`] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSettingField(`landing_slide_${slide.num}_image`, '')}
                                                        className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 transition"
                                                        title="Kembalikan ke gambar bawaan"
                                                    >
                                                        <RotateCcw size={12} /> Reset Bawaan
                                                    </button>
                                                )}
                                            </div>

                                            {/* Preview Box */}
                                            <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group">
                                                <img
                                                    src={currentImg}
                                                    alt={`Preview Slide ${slide.num}`}
                                                    onError={(e) => { e.currentTarget.src = slide.defaultImg; }}
                                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                                                    <p className="text-white text-xs font-bold truncate drop-shadow">{currentTitle}</p>
                                                    <p className="text-slate-300 text-[10px] truncate drop-shadow">{currentSubtitle}</p>
                                                </div>

                                                {uploadingSlide === slide.num && (
                                                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-white text-xs font-semibold gap-2">
                                                        <RefreshCw size={16} className="animate-spin text-emerald-400" /> Mengunggah...
                                                    </div>
                                                )}
                                            </div>

                                            {/* Upload Button */}
                                            <div>
                                                <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition">
                                                    <Upload size={14} />
                                                    <span>Unggah Foto Slide {slide.num}</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleUploadSlideImage(slide.num, e)}
                                                        className="hidden"
                                                        disabled={uploadingSlide !== null}
                                                    />
                                                </label>
                                            </div>

                                            {/* Text Fields */}
                                            <div className="space-y-2.5 pt-2 border-t border-slate-100">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Judul Slide</label>
                                                    <input
                                                        type="text"
                                                        value={currentTitle}
                                                        onChange={(e) => {
                                                            updateSettingField(`landing_slide_${slide.num}_title`, e.target.value);
                                                            if (slide.num === 1) updateSettingField('landing_hero_title', e.target.value);
                                                        }}
                                                        placeholder={slide.defaultTitle}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Sub-Judul</label>
                                                    <textarea
                                                        rows={2}
                                                        value={currentSubtitle}
                                                        onChange={(e) => {
                                                            updateSettingField(`landing_slide_${slide.num}_subtitle`, e.target.value);
                                                            if (slide.num === 1) updateSettingField('landing_hero_subtitle', e.target.value);
                                                        }}
                                                        placeholder={slide.defaultSubtitle}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Teks Tombol</label>
                                                        <input
                                                            type="text"
                                                            value={currentCta}
                                                            onChange={(e) => updateSettingField(`landing_slide_${slide.num}_cta`, e.target.value)}
                                                            placeholder={slide.defaultCta}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Tautan (Link)</label>
                                                        <input
                                                            type="text"
                                                            value={currentLink}
                                                            onChange={(e) => updateSettingField(`landing_slide_${slide.num}_link`, e.target.value)}
                                                            placeholder={slide.defaultLink}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardGlass>

                    {/* Section Keunggulan / Features */}
                    <CardGlass className="p-6 space-y-5">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles size={18} className="text-emerald-600" />
                                Bagian Keunggulan Kami (3 Kartu Fitur)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Atur judul section, deskripsi pengantar, dan 3 kartu fitur keunggulan sekolah di halaman depan.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Utama Keunggulan</label>
                                <input
                                    type="text"
                                    value={settingsForm.landing_about_title || ''}
                                    onChange={(e) => updateSettingField('landing_about_title', e.target.value)}
                                    placeholder="Keunggulan Kami"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Deskripsi Pengantar Keunggulan</label>
                                <input
                                    type="text"
                                    value={settingsForm.landing_about_desc || ''}
                                    onChange={(e) => updateSettingField('landing_about_desc', e.target.value)}
                                    placeholder="Fasilitas modern dan kurikulum terintegrasi..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            {[1, 2, 3].map((num) => (
                                <div key={num} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
                                    <span className="text-xs font-bold text-emerald-700">Kartu Fitur #{num}</span>
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Judul Fitur</label>
                                        <input
                                            type="text"
                                            value={settingsForm[`landing_feature_${num}_title`] || ''}
                                            onChange={(e) => updateSettingField(`landing_feature_${num}_title`, e.target.value)}
                                            placeholder={`Fitur ${num}`}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Deskripsi Fitur</label>
                                        <textarea
                                            rows={3}
                                            value={settingsForm[`landing_feature_${num}_desc`] || ''}
                                            onChange={(e) => updateSettingField(`landing_feature_${num}_desc`, e.target.value)}
                                            placeholder="Penjelasan keunggulan fitur..."
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardGlass>

                    {/* Section Call to Action (CTA) */}
                    <CardGlass className="p-6 space-y-4">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <MessageCircle size={18} className="text-emerald-600" />
                                Bagian Ajakan Bergabung (Call to Action)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Banner ajakan di bagian bawah beranda dengan 2 tombol aksi utama.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Ajakan (CTA)</label>
                                <input
                                    type="text"
                                    value={settingsForm.landing_cta_title || ''}
                                    onChange={(e) => updateSettingField('landing_cta_title', e.target.value)}
                                    placeholder="Siap Bergabung Menjadi Bagian dari Keluarga Besar Kami?"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Deskripsi Ajakan (CTA)</label>
                                <input
                                    type="text"
                                    value={settingsForm.landing_cta_desc || ''}
                                    onChange={(e) => updateSettingField('landing_cta_desc', e.target.value)}
                                    placeholder="Pendaftaran Santri Baru Tahun Ajaran telah dibuka..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                <span className="text-xs font-bold text-emerald-700">Tombol Utama (Primary)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={settingsForm.landing_cta_btn1_text || ''}
                                        onChange={(e) => updateSettingField('landing_cta_btn1_text', e.target.value)}
                                        placeholder="Daftar Sekarang"
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                    <input
                                        type="text"
                                        value={settingsForm.landing_cta_btn1_link || ''}
                                        onChange={(e) => updateSettingField('landing_cta_btn1_link', e.target.value)}
                                        placeholder="/ppdb"
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                <span className="text-xs font-bold text-slate-700">Tombol Kedua (Secondary)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={settingsForm.landing_cta_btn2_text || ''}
                                        onChange={(e) => updateSettingField('landing_cta_btn2_text', e.target.value)}
                                        placeholder="Hubungi Kami"
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                    <input
                                        type="text"
                                        value={settingsForm.landing_cta_btn2_link || ''}
                                        onChange={(e) => updateSettingField('landing_cta_btn2_link', e.target.value)}
                                        placeholder="/contact"
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <ButtonGlass
                                onClick={() => saveSettingsMutation.mutate()}
                                disabled={saveSettingsMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition"
                            >
                                <Save size={16} />
                                {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Konten Beranda'}
                            </ButtonGlass>
                        </div>
                    </CardGlass>
                </div>
            )}

            {/* Tab 2: Profile Page */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <CardGlass className="p-6 space-y-6">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Building2 size={18} className="text-emerald-600" />
                                Header & Pengantar Halaman Profil (/profile)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Kustomisasi teks pembuka di halaman profil sekolah.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Badge Kategori</label>
                                <input
                                    type="text"
                                    value={settingsForm.profile_hero_badge || ''}
                                    onChange={(e) => updateSettingField('profile_hero_badge', e.target.value)}
                                    placeholder="Tentang Kami"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Baris 1</label>
                                <input
                                    type="text"
                                    value={settingsForm.profile_hero_title_1 || ''}
                                    onChange={(e) => updateSettingField('profile_hero_title_1', e.target.value)}
                                    placeholder="Mengenal Lebih Dekat"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Baris 2 (Highlight)</label>
                                <input
                                    type="text"
                                    value={settingsForm.profile_hero_title_2 || ''}
                                    onChange={(e) => updateSettingField('profile_hero_title_2', e.target.value)}
                                    placeholder="SDIT AN-NUR"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Deskripsi Pembuka Profil</label>
                            <textarea
                                rows={2}
                                value={settingsForm.profile_hero_desc || ''}
                                onChange={(e) => updateSettingField('profile_hero_desc', e.target.value)}
                                placeholder="Lembaga pendidikan Islam yang berkomitmen mencetak generasi unggul..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </CardGlass>

                    {/* Visi & Misi */}
                    <CardGlass className="p-6 space-y-6">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles size={18} className="text-purple-600" />
                                Visi & Misi Lembaga
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Masukkan visi sekolah dan poin-poin misi (masukkan 1 poin per baris).
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Visi</label>
                                    <input
                                        type="text"
                                        value={settingsForm.profile_visi_title || ''}
                                        onChange={(e) => updateSettingField('profile_visi_title', e.target.value)}
                                        placeholder="Visi"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">Teks Lengkap Visi</label>
                                    <textarea
                                        rows={6}
                                        value={settingsForm.profile_visi_text || ''}
                                        onChange={(e) => updateSettingField('profile_visi_text', e.target.value)}
                                        placeholder="Terwujudnya lembaga pendidikan Islam yang unggul..."
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Misi</label>
                                    <input
                                        type="text"
                                        value={settingsForm.profile_misi_title || ''}
                                        onChange={(e) => updateSettingField('profile_misi_title', e.target.value)}
                                        placeholder="Misi"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">Daftar Misi (1 baris per poin misi)</label>
                                    <textarea
                                        rows={6}
                                        value={settingsForm.profile_misi_points || ''}
                                        onChange={(e) => updateSettingField('profile_misi_points', e.target.value)}
                                        placeholder={"Menyelenggarakan pendidikan berkualitas.\nMembina akhlak mulia..."}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 font-sans"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardGlass>

                    {/* Sejarah & Statistik */}
                    <CardGlass className="p-6 space-y-6">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-blue-600" />
                                Sejarah Perjalanan & 4 Angka Statistik Capaian
                            </h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Badge Sejarah</label>
                                <input
                                    type="text"
                                    value={settingsForm.profile_sejarah_badge || ''}
                                    onChange={(e) => updateSettingField('profile_sejarah_badge', e.target.value)}
                                    placeholder="Sejarah Perjalanan"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Sejarah</label>
                                <input
                                    type="text"
                                    value={settingsForm.profile_sejarah_title || ''}
                                    onChange={(e) => updateSettingField('profile_sejarah_title', e.target.value)}
                                    placeholder="Dedikasi Untuk Umat Sejak Awal Berdiri"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Paragraf 1 Sejarah</label>
                                <textarea
                                    rows={4}
                                    value={settingsForm.profile_sejarah_p1 || ''}
                                    onChange={(e) => updateSettingField('profile_sejarah_p1', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Paragraf 2 Sejarah</label>
                                <textarea
                                    rows={4}
                                    value={settingsForm.profile_sejarah_p2 || ''}
                                    onChange={(e) => updateSettingField('profile_sejarah_p2', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <span className="text-xs font-bold text-slate-700 block mb-2">4 Kotak Statistik Profil:</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map((num) => (
                                    <div key={num} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Statistik #{num}</label>
                                        <input
                                            type="text"
                                            value={settingsForm[`profile_stat_${num}_val`] || ''}
                                            onChange={(e) => updateSettingField(`profile_stat_${num}_val`, e.target.value)}
                                            placeholder="Nilai (e.g. 1000+)"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                                        />
                                        <input
                                            type="text"
                                            value={settingsForm[`profile_stat_${num}_label`] || ''}
                                            onChange={(e) => updateSettingField(`profile_stat_${num}_label`, e.target.value)}
                                            placeholder="Label (e.g. Alumni)"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <ButtonGlass
                                onClick={() => saveSettingsMutation.mutate()}
                                disabled={saveSettingsMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition"
                            >
                                <Save size={16} />
                                {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Konten Profil'}
                            </ButtonGlass>
                        </div>
                    </CardGlass>
                </div>
            )}

            {/* Tab 3: PPDB Info */}
            {activeTab === 'ppdb' && (
                <CardGlass className="p-6 space-y-6">
                    <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Calendar size={18} className="text-emerald-600" />
                            Pengaturan Konten Halaman PPDB (/ppdb)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Atur judul header, informasi gelombang pendaftaran, syarat berkas pendaftaran, dan nomor WhatsApp panitia penerimaan santri.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Badge Header</label>
                            <input
                                type="text"
                                value={settingsForm.ppdb_hero_badge || ''}
                                onChange={(e) => updateSettingField('ppdb_hero_badge', e.target.value)}
                                placeholder="Penerimaan Santri Baru"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Baris 1</label>
                            <input
                                type="text"
                                value={settingsForm.ppdb_hero_title_1 || ''}
                                onChange={(e) => updateSettingField('ppdb_hero_title_1', e.target.value)}
                                placeholder="Bergabunglah Menjadi"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Baris 2</label>
                            <input
                                type="text"
                                value={settingsForm.ppdb_hero_title_2 || ''}
                                onChange={(e) => updateSettingField('ppdb_hero_title_2', e.target.value)}
                                placeholder="Bagian Dari Kami"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Deskripsi Header PPDB</label>
                        <input
                            type="text"
                            value={settingsForm.ppdb_hero_desc || ''}
                            onChange={(e) => updateSettingField('ppdb_hero_desc', e.target.value)}
                            placeholder="Isi formulir di bawah ini untuk mendaftarkan putra-putri Anda..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Informasi Gelombang & Jadwal Pendaftaran</label>
                            <textarea
                                rows={5}
                                value={settingsForm.ppdb_schedule_info || ''}
                                onChange={(e) => updateSettingField('ppdb_schedule_info', e.target.value)}
                                placeholder="Gelombang 1: 1 Januari - 31 Maret..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-sans"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Persyaratan Berkas Pendaftaran</label>
                            <textarea
                                rows={5}
                                value={settingsForm.ppdb_requirements_info || ''}
                                onChange={(e) => updateSettingField('ppdb_requirements_info', e.target.value)}
                                placeholder="1. Mengisi Formulir Online&#10;2. Fotokopi Akta & KK..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-sans"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor WhatsApp Panitia / Helpdesk PPDB</label>
                        <input
                            type="text"
                            value={settingsForm.ppdb_contact_wa || ''}
                            onChange={(e) => updateSettingField('ppdb_contact_wa', e.target.value)}
                            placeholder="Contoh: +62 812-3456-7890 / 081234567890"
                            className="w-full md:w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Pengunjung halaman PPDB dapat mengklik tombol bantuan untuk langsung chat WA dengan nomor ini.</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <ButtonGlass
                            onClick={() => saveSettingsMutation.mutate()}
                            disabled={saveSettingsMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition"
                        >
                            <Save size={16} />
                            {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Informasi PPDB'}
                        </ButtonGlass>
                    </div>
                </CardGlass>
            )}

            {/* Tab 4: Contact, Footer & Social Media */}
            {activeTab === 'contact_footer' && (
                <div className="space-y-6">
                    <CardGlass className="p-6 space-y-6">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Phone size={18} className="text-emerald-600" />
                                Informasi Halaman Kontak (/contact)
                            </h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Baris 1</label>
                                <input
                                    type="text"
                                    value={settingsForm.contact_hero_title_1 || ''}
                                    onChange={(e) => updateSettingField('contact_hero_title_1', e.target.value)}
                                    placeholder="Hubungi"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Judul Baris 2</label>
                                <input
                                    type="text"
                                    value={settingsForm.contact_hero_title_2 || ''}
                                    onChange={(e) => updateSettingField('contact_hero_title_2', e.target.value)}
                                    placeholder="Kami"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Deskripsi Header Kontak</label>
                            <input
                                type="text"
                                value={settingsForm.contact_hero_desc || ''}
                                onChange={(e) => updateSettingField('contact_hero_desc', e.target.value)}
                                placeholder="Kami siap membantu menjawab pertanyaan Anda..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Telepon / WhatsApp Sekolah</label>
                                <input
                                    type="text"
                                    value={settingsForm.school_phone || ''}
                                    onChange={(e) => updateSettingField('school_phone', e.target.value)}
                                    placeholder="+62 812-3456-7890"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Resmi Sekolah</label>
                                <input
                                    type="email"
                                    value={settingsForm.school_email || ''}
                                    onChange={(e) => updateSettingField('school_email', e.target.value)}
                                    placeholder="info@sekolah.sch.id"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Jam Operasional</label>
                                <input
                                    type="text"
                                    value={settingsForm.contact_working_hours || ''}
                                    onChange={(e) => updateSettingField('contact_working_hours', e.target.value)}
                                    placeholder="Sabtu - Kamis: 07.00 - 16.00 WIB"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Alamat Lengkap Sekolah</label>
                            <textarea
                                rows={2}
                                value={settingsForm.school_address || ''}
                                onChange={(e) => updateSettingField('school_address', e.target.value)}
                                placeholder="Jl. Raya Banjarsari No. 100, Kec. Banjarsari..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">URL Embed Google Maps</label>
                            <input
                                type="text"
                                value={settingsForm.contact_maps_embed || ''}
                                onChange={(e) => updateSettingField('contact_maps_embed', e.target.value)}
                                placeholder="https://www.google.com/maps/embed?pb=..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Masukkan URL dari Google Maps Embed (atribut src pada kode iframe embed).</p>
                        </div>
                    </CardGlass>

                    {/* Social Media & Footer */}
                    <CardGlass className="p-6 space-y-6">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles size={18} className="text-emerald-600" />
                                Tautan Media Sosial & Footer Website
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Ikon dan tautan media sosial otomatis muncul di footer website jika diisi.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Instagram URL</label>
                                <input
                                    type="text"
                                    value={settingsForm.social_instagram || ''}
                                    onChange={(e) => updateSettingField('social_instagram', e.target.value)}
                                    placeholder="https://www.instagram.com/akunsekolah"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Facebook URL</label>
                                <input
                                    type="text"
                                    value={settingsForm.social_facebook || ''}
                                    onChange={(e) => updateSettingField('social_facebook', e.target.value)}
                                    placeholder="https://www.facebook.com/akunsekolah"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">YouTube URL</label>
                                <input
                                    type="text"
                                    value={settingsForm.social_youtube || ''}
                                    onChange={(e) => updateSettingField('social_youtube', e.target.value)}
                                    placeholder="https://www.youtube.com/@channelsekolah"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">TikTok URL</label>
                                <input
                                    type="text"
                                    value={settingsForm.social_tiktok || ''}
                                    onChange={(e) => updateSettingField('social_tiktok', e.target.value)}
                                    placeholder="https://www.tiktok.com/@akunsekolah"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Teks Copyright Footer</label>
                            <input
                                type="text"
                                value={settingsForm.footer_copyright || ''}
                                onChange={(e) => updateSettingField('footer_copyright', e.target.value)}
                                placeholder="© 2026 SDIT An-Nur Banjarsari. All rights reserved."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <ButtonGlass
                                onClick={() => saveSettingsMutation.mutate()}
                                disabled={saveSettingsMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition"
                            >
                                <Save size={16} />
                                {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Kontak & Footer'}
                            </ButtonGlass>
                        </div>
                    </CardGlass>
                </div>
            )}

            {/* Tab 5: Dewan Guru */}
            {activeTab === 'teachers' && (
                <div className="space-y-6">
                    {/* Header text editor */}
                    <CardGlass className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex-1 grid md:grid-cols-2 gap-3 w-full">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Judul Halaman Guru (/teachers)</label>
                                    <input
                                        type="text"
                                        value={settingsForm.teachers_page_title || ''}
                                        onChange={(e) => updateSettingField('teachers_page_title', e.target.value)}
                                        placeholder="Dewan Asatidz & Guru"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Deskripsi Halaman Guru</label>
                                    <input
                                        type="text"
                                        value={settingsForm.teachers_page_desc || ''}
                                        onChange={(e) => updateSettingField('teachers_page_desc', e.target.value)}
                                        placeholder="Mengenal lebih dekat para pengajar..."
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                            </div>
                            <ButtonGlass
                                onClick={() => saveSettingsMutation.mutate()}
                                disabled={saveSettingsMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shrink-0"
                            >
                                <Save size={14} className="mr-1 inline" /> Simpan Judul
                            </ButtonGlass>
                        </div>
                    </CardGlass>

                    {/* Teacher List */}
                    <CardGlass className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Daftar Dewan Asatidz / Guru</h3>
                                <p className="text-xs text-slate-500">Kelola daftar profil guru yang ditampilkan pada publik</p>
                            </div>
                            <ButtonGlass onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow">
                                <Plus size={16} /> Tambah Guru
                            </ButtonGlass>
                        </div>

                        {isLoadingTeachers ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Memuat data guru...</div>
                        ) : teachers?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">Belum ada data guru. Klik tombol Tambah Guru untuk menambahkan.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teachers?.map((t: any) => (
                                    <div key={t.id} className="bg-white/80 border border-slate-200 rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:shadow-md transition">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-emerald-200">
                                            {t.photo_url ? (
                                                <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                                    {t.name?.[0] || 'G'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 text-sm truncate">{t.name}</h4>
                                            <p className="text-emerald-600 text-xs font-medium truncate">{t.position}</p>
                                            <p className="text-slate-500 text-xs line-clamp-2 mt-1">{t.bio || '-'}</p>
                                            <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                                                <button onClick={() => handleOpenModal(t)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                                                    <Edit size={12} /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(t.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 ml-auto">
                                                    <Trash2 size={12} /> Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardGlass>
                </div>
            )}

            {/* Tab 6: Pusat Unduhan */}
            {activeTab === 'downloads' && (
                <div className="space-y-6">
                    <CardGlass className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex-1 grid md:grid-cols-2 gap-3 w-full">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Judul Halaman Unduhan (/downloads)</label>
                                    <input
                                        type="text"
                                        value={settingsForm.downloads_page_title || ''}
                                        onChange={(e) => updateSettingField('downloads_page_title', e.target.value)}
                                        placeholder="Pusat Unduhan"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Deskripsi Halaman Unduhan</label>
                                    <input
                                        type="text"
                                        value={settingsForm.downloads_page_desc || ''}
                                        onChange={(e) => updateSettingField('downloads_page_desc', e.target.value)}
                                        placeholder="Akses berbagai dokumen penting..."
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                            </div>
                            <ButtonGlass
                                onClick={() => saveSettingsMutation.mutate()}
                                disabled={saveSettingsMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shrink-0"
                            >
                                <Save size={14} className="mr-1 inline" /> Simpan Judul
                            </ButtonGlass>
                        </div>
                    </CardGlass>

                    <CardGlass className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Daftar Dokumen & Berkas Unduhan</h3>
                                <p className="text-xs text-slate-500">Kelola file brosur PPDB, kalender pendidikan, dan dokumen resmi</p>
                            </div>
                            <ButtonGlass onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow">
                                <Plus size={16} /> Tambah Dokumen
                            </ButtonGlass>
                        </div>

                        {isLoadingDownloads ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Memuat data unduhan...</div>
                        ) : downloads?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">Belum ada file unduhan. Klik tombol Tambah Dokumen.</div>
                        ) : (
                            <TableGlass>
                                <TableHeaderGlass>
                                    <TableRowGlass>
                                        <TableHeadGlass>Judul Dokumen</TableHeadGlass>
                                        <TableHeadGlass>Kategori</TableHeadGlass>
                                        <TableHeadGlass>File URL</TableHeadGlass>
                                        <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                                    </TableRowGlass>
                                </TableHeaderGlass>
                                <TableBodyGlass>
                                    {downloads?.map((d: any) => (
                                        <TableRowGlass key={d.id}>
                                            <TableCellGlass><span className="font-semibold text-slate-800">{d.title}</span></TableCellGlass>
                                            <TableCellGlass>
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {d.category}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                                    <ExternalLink size={12} /> Buka File
                                                </a>
                                            </TableCellGlass>
                                            <TableCellGlass className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(d)} className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-600 transition">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-red-500 transition">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </TableCellGlass>
                                        </TableRowGlass>
                                    ))}
                                </TableBodyGlass>
                            </TableGlass>
                        )}
                    </CardGlass>
                </div>
            )}

            {/* Tab 7: Kisah Alumni */}
            {activeTab === 'alumni' && (
                <div className="space-y-6">
                    <CardGlass className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex-1 grid md:grid-cols-2 gap-3 w-full">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Judul Halaman Alumni (/alumni)</label>
                                    <input
                                        type="text"
                                        value={settingsForm.alumni_page_title || ''}
                                        onChange={(e) => updateSettingField('alumni_page_title', e.target.value)}
                                        placeholder="Kisah Alumni"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Deskripsi Halaman Alumni</label>
                                    <input
                                        type="text"
                                        value={settingsForm.alumni_page_desc || ''}
                                        onChange={(e) => updateSettingField('alumni_page_desc', e.target.value)}
                                        placeholder="Inspirasi dari para alumni yang telah berkiprah..."
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                            </div>
                            <ButtonGlass
                                onClick={() => saveSettingsMutation.mutate()}
                                disabled={saveSettingsMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shrink-0"
                            >
                                <Save size={14} className="mr-1 inline" /> Simpan Judul
                            </ButtonGlass>
                        </div>
                    </CardGlass>

                    <CardGlass className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Daftar Testimoni & Kisah Alumni</h3>
                                <p className="text-xs text-slate-500">Kelola testimoni alumni dan profil lulusan berprestasi</p>
                            </div>
                            <ButtonGlass onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow">
                                <Plus size={16} /> Tambah Alumni
                            </ButtonGlass>
                        </div>

                        {isLoadingAlumni ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Memuat data alumni...</div>
                        ) : alumni?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">Belum ada testimoni alumni. Klik tombol Tambah Alumni.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {alumni?.map((a: any) => (
                                    <div key={a.id} className="bg-white/80 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition space-y-3">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-emerald-200">
                                                {a.photo_url ? (
                                                    <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-base">
                                                        {a.name?.[0] || 'A'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{a.name}</h4>
                                                <p className="text-emerald-600 text-xs font-semibold">Angkatan {a.graduation_year}</p>
                                                <p className="text-slate-500 text-[11px]">{a.profession}</p>
                                            </div>
                                        </div>
                                        <p className="text-slate-600 text-xs italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            "{a.testimony}"
                                        </p>
                                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                                            <button onClick={() => handleOpenModal(a)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                                                <Edit size={12} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 ml-auto">
                                                <Trash2 size={12} /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardGlass>
                </div>
            )}

            {/* Modal for Teacher / Download / Alumni */}
            <ModalGlass
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={`${editingId ? 'Edit' : 'Tambah'} ${activeTab === 'teachers' ? 'Guru' : activeTab === 'downloads' ? 'Dokumen' : 'Alumni'}`}
            >
                <form onSubmit={handleSubmitModal} className="space-y-4">
                    {activeTab === 'teachers' && (
                        <>
                            <InputGlass
                                label="Nama Lengkap & Gelar"
                                placeholder="Contoh: Ustadz Ahmad, S.Pd.I"
                                value={teacherForm.name}
                                onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                                required
                            />
                            <InputGlass
                                label="Jabatan / Bidang Studi"
                                placeholder="Contoh: Pengampu Tahfidz & Bahasa Arab"
                                value={teacherForm.position}
                                onChange={(e) => setTeacherForm({ ...teacherForm, position: e.target.value })}
                                required
                            />
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Foto Guru</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={teacherForm.photo_url}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, photo_url: e.target.value })}
                                        placeholder="URL Foto atau unggah dari perangkat"
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                                    />
                                    <label className="cursor-pointer px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shrink-0">
                                        <Upload size={14} className="inline mr-1" />
                                        {uploadingItemPhoto ? 'Mengunggah...' : 'Unggah Foto'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleUploadItemImage(e, 'teacher')}
                                            className="hidden"
                                            disabled={uploadingItemPhoto}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Bio / Keterangan Singkat</label>
                                <textarea
                                    rows={3}
                                    value={teacherForm.bio}
                                    onChange={(e) => setTeacherForm({ ...teacherForm, bio: e.target.value })}
                                    placeholder="Lulusan Universitas..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'downloads' && (
                        <>
                            <InputGlass
                                label="Judul Dokumen"
                                placeholder="Contoh: Brosur PPDB Tahun Ajaran Baru"
                                value={downloadForm.title}
                                onChange={(e) => setDownloadForm({ ...downloadForm, title: e.target.value })}
                                required
                            />
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori Dokumen</label>
                                <select
                                    value={downloadForm.category}
                                    onChange={(e) => setDownloadForm({ ...downloadForm, category: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                                >
                                    <option value="Brosur">Brosur</option>
                                    <option value="Kalender">Kalender Pendidikan</option>
                                    <option value="Panduan">Buku Panduan & Tata Tertib</option>
                                    <option value="Formulir">Formulir</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">File Dokumen (PDF / Dokumen)</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={downloadForm.file_url}
                                        onChange={(e) => setDownloadForm({ ...downloadForm, file_url: e.target.value })}
                                        placeholder="URL Berkas atau unggah dari perangkat"
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                                        required
                                    />
                                    <label className="cursor-pointer px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shrink-0">
                                        <Upload size={14} className="inline mr-1" />
                                        {uploadingItemFile ? 'Mengunggah...' : 'Unggah File'}
                                        <input
                                            type="file"
                                            onChange={handleUploadDocumentFile}
                                            className="hidden"
                                            disabled={uploadingItemFile}
                                        />
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'alumni' && (
                        <>
                            <InputGlass
                                label="Nama Alumni"
                                placeholder="Contoh: Fulan bin Fulan"
                                value={alumniForm.name}
                                onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <InputGlass
                                    label="Tahun Kelulusan"
                                    type="number"
                                    placeholder="2022"
                                    value={alumniForm.graduation_year}
                                    onChange={(e) => setAlumniForm({ ...alumniForm, graduation_year: e.target.value })}
                                    required
                                />
                                <InputGlass
                                    label="Profesi / Studi Lanjutan"
                                    placeholder="Contoh: Mahasiswa Al-Azhar"
                                    value={alumniForm.profession}
                                    onChange={(e) => setAlumniForm({ ...alumniForm, profession: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Foto Alumni (Opsional)</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={alumniForm.photo_url}
                                        onChange={(e) => setAlumniForm({ ...alumniForm, photo_url: e.target.value })}
                                        placeholder="URL Foto atau unggah dari perangkat"
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                                    />
                                    <label className="cursor-pointer px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shrink-0">
                                        <Upload size={14} className="inline mr-1" />
                                        {uploadingItemPhoto ? 'Mengunggah...' : 'Unggah Foto'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleUploadItemImage(e, 'alumni')}
                                            className="hidden"
                                            disabled={uploadingItemPhoto}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Testimoni / Kesan & Pesan</label>
                                <textarea
                                    rows={3}
                                    value={alumniForm.testimony}
                                    onChange={(e) => setAlumniForm({ ...alumniForm, testimony: e.target.value })}
                                    placeholder="Belajar di sini memberikan pondasi akhlak dan ilmu yang sangat berharga..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <ButtonGlass type="button" variant="secondary" onClick={handleCloseModal}>
                            Batal
                        </ButtonGlass>
                        <ButtonGlass type="submit" className="bg-emerald-600 text-white font-bold px-5">
                            {editingId ? 'Simpan Perubahan' : 'Tambah'}
                        </ButtonGlass>
                    </div>
                </form>
            </ModalGlass>
        </div>
    );
};

export default AdminPublicContent;
