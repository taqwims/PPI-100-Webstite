import React, { useState } from 'react';
import { User, School, Phone, CreditCard, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { motion, AnimatePresence } from 'framer-motion';

const PPDB: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        nisn: '',
        origin_school: '',
        parent_name: '',
        phone: '',
        unit_id: 1, // Default to MTS
    });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-20 pb-10 overflow-hidden">
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
                        <span className="text-sm font-medium text-slate-600 tracking-wide uppercase">Penerimaan Santri Baru</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl lg:text-7xl font-bold mb-6"
                    >
                        <span className="text-slate-900">Bergabunglah Menjadi</span> <br />
                        <span className="text-gradient-primary">Bagian Dari Kami</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                    >
                        Isi formulir di bawah ini untuk mendaftarkan putra-putri Anda di Pesantren Persis 100 Banjar­sari.
                    </motion.p>
                </div>
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
                                            <School className="absolute left-3 top-3 text-slate-300-400" size={18} />
                                            <select
                                                className="w-full glass-input pl-10 text-slate-300-900"
                                                value={formData.unit_id}
                                                onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                                                required
                                            >
                                                <option value={1}>MTS</option>
                                                <option value={2}>MA</option>
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
