import React, { useState } from 'react';
import { User, School, Phone, CreditCard, Send, CheckCircle2, AlertCircle, Calendar, FileCheck, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeatureStore } from '../../store/featureStore';

const PPDB: React.FC = () => {
    const { school } = useFeatureStore();
    const [formData, setFormData] = useState({
        name: '',
        nisn: '',
        origin_school: '',
        parent_name: '',
        phone: '',
        unit_id: 0,
    });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const heroBadge = school.ppdb_hero_badge || 'Penerimaan Santri Baru';
    const heroTitle1 = school.ppdb_hero_title_1 || 'Bergabunglah Menjadi';
    const heroTitle2 = school.ppdb_hero_title_2 || 'Bagian Dari Kami';
    const heroDesc = school.ppdb_hero_desc || `Isi formulir di bawah ini untuk mendaftarkan putra-putri Anda di ${school.name || 'lembaga pendidikan kami'}.`;

    const scheduleInfo = school.ppdb_schedule_info || "Gelombang 1: 1 Januari - 31 Maret\nGelombang 2: 1 April - 30 Juni\nTes Seleksi & Wawancara: Setiap Hari Sabtu";
    const requirementsInfo = school.ppdb_requirements_info || "1. Mengisi Formulir Pendaftaran Online\n2. Fotokopi Akta Kelahiran & Kartu Keluarga (KK)\n3. Pas Foto Berwarna 3x4 (2 lembar)\n4. Surat Keterangan Lulus / Ijazah dari sekolah sebelumnya";
    const contactWA = school.ppdb_contact_wa || school.phone || '+62 812-3456-7890';

    // Fetch units dynamically
    const { data: units } = useQuery({
        queryKey: ['public_units'],
        queryFn: async () => {
            const res = await api.get('/public/units');
            return res.data;
        },
        staleTime: 1000 * 60 * 30,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/public/ppdb', formData);
            setSuccess(true);
            setFormData({ name: '', nisn: '', origin_school: '', parent_name: '', phone: '', unit_id: 1 });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal mendaftar. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const cleanWANumber = (num: string) => {
        const cleaned = num.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) return '62' + cleaned.substring(1);
        return cleaned;
    };

    return (
        <div className="space-y-16 pb-24">
            {/* Hero Section */}
            <section className="relative pt-20 pb-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 border border-slate-200 backdrop-blur-md shadow-sm mb-8"
                    >
                        <span className="text-sm font-medium text-slate-600 tracking-wide uppercase">{heroBadge}</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl lg:text-7xl font-bold mb-6"
                    >
                        <span className="text-slate-900">{heroTitle1}</span> <br />
                        <span className="text-gradient-primary">{heroTitle2}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                    >
                        {heroDesc}
                    </motion.p>
                </div>
            </section>

            {/* Information Cards (Jadwal & Syarat) */}
            <section className="container mx-auto px-6 max-w-5xl">
                <div className="grid md:grid-cols-2 gap-6">
                    <CardGlass className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-emerald-600">
                            <Calendar size={24} />
                            <h3 className="text-lg font-bold text-slate-800">Gelombang & Jadwal Pendaftaran</h3>
                        </div>
                        <div className="text-sm text-slate-600 space-y-2 whitespace-pre-line leading-relaxed">
                            {scheduleInfo}
                        </div>
                    </CardGlass>

                    <CardGlass className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-purple-600">
                            <FileCheck size={24} />
                            <h3 className="text-lg font-bold text-slate-800">Persyaratan Pendaftaran</h3>
                        </div>
                        <div className="text-sm text-slate-600 space-y-2 whitespace-pre-line leading-relaxed">
                            {requirementsInfo}
                        </div>
                    </CardGlass>
                </div>

                {contactWA && (
                    <div className="mt-6 text-center">
                        <a
                            href={`https://wa.me/${cleanWANumber(contactWA)}?text=Halo%20Admin%20PPDB,%20saya%20ingin%20bertanya%20seputar%20pendaftaran.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition shadow-sm"
                        >
                            <MessageCircle size={18} />
                            <span>Butuh Bantuan? Chat Panitia PPDB via WhatsApp ({contactWA})</span>
                        </a>
                    </div>
                )}
            </section>

            {/* Form Section */}
            <section className="container mx-auto px-6 max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <CardGlass className="p-8 lg:p-12 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />

                        <AnimatePresence mode="wait">
                            {success ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="text-center py-12 space-y-6"
                                >
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-slate-900">Pendaftaran Berhasil!</h3>
                                        <p className="text-slate-600">Data Anda telah kami terima. Kami akan segera menghubungi Anda melalui nomor WhatsApp yang terdaftar.</p>
                                    </div>
                                    <ButtonGlass onClick={() => setSuccess(false)} variant="secondary">
                                        Kembali ke Form
                                    </ButtonGlass>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-8"
                                >
                                    <div className="border-b border-slate-200 pb-3">
                                        <h3 className="text-xl font-bold text-slate-800">Formulir Pendaftaran Online</h3>
                                        <p className="text-xs text-slate-500">Lengkapi data calon santri / peserta didik baru dengan benar</p>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400">
                                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                            <p>{error}</p>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <InputGlass
                                            label="Nama Lengkap"
                                            icon={User}
                                            placeholder="Masukkan nama lengkap"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                        <InputGlass
                                            label="NISN"
                                            icon={CreditCard}
                                            placeholder="Nomor Induk Siswa Nasional"
                                            value={formData.nisn}
                                            onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Unit Tujuan</label>
                                        <div className="relative">
                                            <School className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <select
                                                className="w-full glass-input pl-10 text-slate-900"
                                                value={formData.unit_id}
                                                onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                                                required
                                            >
                                                <option value={0}>Pilih Unit Tujuan</option>
                                                {units?.map((unit: any) => (
                                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <InputGlass
                                        label="Asal Sekolah"
                                        icon={School}
                                        placeholder="Nama sekolah sebelumnya"
                                        value={formData.origin_school}
                                        onChange={(e) => setFormData({ ...formData, origin_school: e.target.value })}
                                        required
                                    />

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <InputGlass
                                            label="Nama Orang Tua"
                                            icon={User}
                                            placeholder="Nama Ayah/Ibu"
                                            value={formData.parent_name}
                                            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                            required
                                        />
                                        <InputGlass
                                            label="Nomor Telepon / WA"
                                            icon={Phone}
                                            placeholder="Contoh: 08123456789"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <ButtonGlass
                                            type="submit"
                                            className="w-full py-4 text-lg"
                                            disabled={loading}
                                            icon={loading ? undefined : Send}
                                        >
                                            {loading ? 'Sedang Mengirim...' : 'Daftar Sekarang'}
                                        </ButtonGlass>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </CardGlass>
                </motion.div>
            </section>
        </div>
    );
};

export default PPDB;
