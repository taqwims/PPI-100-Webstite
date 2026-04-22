import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputGlass from '../components/ui/glass/InputGlass';
import ButtonGlass from '../components/ui/glass/ButtonGlass';
import { ArrowRight, Lock, Mail, ShieldCheck, GraduationCap, Building } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/login', { email, password });
            
            // Fetch user profile to populate the user object before navigating
            const profileRes = await api.get('/profile');
            useAuthStore.getState().setUser(profileRes.data);
            
            navigate('/dashboard');
        } catch (err) {
            setError('Email atau password tidak valid');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">
            {/* Left Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden bg-white">
                {/* Decorative blurs for the form side */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[100px]" />

                <div className="w-full max-w-md relative z-10">
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-8">
                            <img src="/images/logo.jpeg" alt="SDIT AN-NUR Logo" className="w-12 h-12 rounded-xl shadow-md" />
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">SDIT AN-NUR</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-3">Selamat Datang 👋</h1>
                        <p className="text-slate-500">Silakan masuk ke akun Anda untuk mengakses sistem manajemen keuangan sekolah.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                            <ShieldCheck size={18} className="text-red-500 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Alamat Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <InputGlass
                                        type="email"
                                        placeholder="user@sdit-annur.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-12 w-full bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-slate-900"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-700">Password</label>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <InputGlass
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-12 w-full bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-slate-900"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <ButtonGlass
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-base font-semibold group bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-lg shadow-emerald-500/30"
                        >
                            {isLoading ? 'Memproses...' : (
                                <span className="flex items-center justify-center">
                                    Masuk <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </ButtonGlass>
                    </form>

                    <div className="mt-10 text-center text-sm text-slate-500">
                        <p>Belum memiliki akun? <span className="font-medium text-emerald-600">Hubungi Administrator</span></p>
                    </div>
                </div>
            </div>

            {/* Right Side: Content / Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop"
                        alt="School Background"
                        className="w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/95 to-slate-900/95 mix-blend-multiply" />
                </div>

                {/* Decorative circles */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />

                {/* Content */}
                <div className="relative z-10 max-w-lg text-white">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-sm font-medium mb-8 backdrop-blur-md shadow-lg">
                        <Building size={16} /> Sistem Manajemen Keuangan Terpadu
                    </div>

                    <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
                        Kelola Keuangan Sekolah dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Lebih Cerdas & Transparan</span>
                    </h2>

                    <p className="text-slate-300 text-lg mb-12 leading-relaxed">
                        Platform digital SDIT AN-NUR dirancang untuk mempermudah administrasi keuangan, pembayaran SPP, pengelolaan tabungan, dan pelaporan secara real-time.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 border border-emerald-500/20">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Aman & Handal</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Data keuangan tersimpan dengan aman melalui sistem cloud terenkripsi.</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-5 border border-teal-500/20">
                                <GraduationCap size={24} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Fokus Akademik</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Administrasi efisien mendukung fokus pada kualitas pendidikan siswa.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
