import React, { useState } from 'react';
import { User, School, Phone, CreditCard, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';

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
                    <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-purple-500/5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="text-sm font-medium text-gray-300 tracking-wide uppercase">Penerimaan Santri Baru</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        <span className="text-white">Bergabunglah Menjadi</span> <br />
                        <span className="text-gradient-primary">Bagian Dari Kami</span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Isi formulir di bawah ini untuk mendaftarkan putra-putri Anda di Pesantren Persis 100 Banjar­sari.
                    </p>
                </div>
            </section>

            {/* Form Section */}
            <section className="container mx-auto px-6 max-w-3xl">
                <CardGlass className="p-8 lg:p-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />

                    {success ? (
                        <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">Pendaftaran Berhasil!</h3>
                                <p className="text-gray-400">Data Anda telah kami terima. Kami akan segera menghubungi Anda melalui nomor WhatsApp yang terdaftar.</p>
                            </div>
                            <ButtonGlass onClick={() => setSuccess(false)} variant="secondary">
                                Kembali ke Form
                            </ButtonGlass>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
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
                                <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Unit Tujuan</label>
                                <div className="relative">
                                    <School className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <select
                                        className="w-full glass-input pl-10 text-gray-900"
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
                        </form>
                    )}
                </CardGlass>
            </section>
        </div>
    );
};

export default PPDB;
