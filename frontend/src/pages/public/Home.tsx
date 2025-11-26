import React from 'react';
import { ArrowRight, BookOpen, Users, Trophy, Calendar, Star, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';

const Home: React.FC = () => {
    return (
        <div className="space-y-32 pb-24">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center pt-20">
                {/* Background Blobs */}
                <div className="absolute top-20 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] -z-10 animate-pulse delay-1000" />

                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-purple-500/5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-medium text-gray-300 tracking-wide uppercase text-[10px]">Penerimaan Santri Baru 2025</span>
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-6xl lg:text-8xl font-bold leading-tight tracking-tight">
                                    <span className="text-gradient">Generasi</span> <br />
                                    <span className="text-gradient-primary">Qur'ani</span>
                                </h1>
                                <p className="text-xl text-gray-400 max-w-lg leading-relaxed font-light">
                                    Mencetak kader ulama dan pemimpin masa depan yang berakhlak mulia, cerdas, dan berwawasan global di Pesantren Persis 100 Banjar­sari.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-5">
                                <Link to="/ppdb">
                                    <button className="glass-button-primary flex items-center gap-3 group">
                                        Daftar Sekarang
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link to="/profile">
                                    <button className="glass-button px-8 py-3 text-lg hover:bg-white/10">
                                        Tentang Kami
                                    </button>
                                </Link>
                            </div>

                            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/5">
                                <div>
                                    <h4 className="text-3xl font-bold text-white mb-1">1000+</h4>
                                    <p className="text-sm text-gray-500 uppercase tracking-wider">Santri</p>
                                </div>
                                <div>
                                    <h4 className="text-3xl font-bold text-white mb-1">50+</h4>
                                    <p className="text-sm text-gray-500 uppercase tracking-wider">Guru</p>
                                </div>
                                <div>
                                    <h4 className="text-3xl font-bold text-white mb-1">100%</h4>
                                    <p className="text-sm text-gray-500 uppercase tracking-wider">Lulus</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 lg:h-[600px] flex items-center justify-center">
                            <div className="relative z-10 w-full max-w-md aspect-[4/5] glass-panel rounded-[3rem] p-3 rotate-3 hover:rotate-0 transition-all duration-700 hover:scale-[1.02] group">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem] opacity-50 group-hover:opacity-100 transition-opacity" />
                                <img
                                    src="https://ichef.bbci.co.uk/ace/standard/3840/cpsprodpb/33b5/live/78d8d060-21ce-11f0-89a9-cb5ed9bbefd9.jpg"
                                    alt="Santri Belajar"
                                    className="rounded-[2.5rem] w-full h-full object-cover shadow-2xl"
                                />

                                <div className="absolute -bottom-10 -left-10 glass-panel p-6 rounded-3xl max-w-xs animate-bounce-slow backdrop-blur-2xl bg-black/40 border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                            <Trophy size={24} />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-white text-lg">Juara Umum</h5>
                                            <p className="text-xs text-gray-400">MHQ Nasional 2024</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <h2 className="text-4xl lg:text-5xl font-bold text-white">Keunggulan <span className="text-gradient-primary">Kami</span></h2>
                    <p className="text-gray-400 text-lg">Fasilitas modern dan kurikulum terintegrasi untuk mendukung perkembangan santri secara holistik.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: BookOpen, title: "Kurikulum Terpadu", desc: "Memadukan kurikulum nasional (Kemendikbud) dan kepesantrenan untuk keseimbangan ilmu dunia dan akhirat." },
                        { icon: Users, title: "Pembinaan Karakter", desc: "Program pembinaan akhlak, adab, dan kepemimpinan yang intensif 24 jam dalam lingkungan asrama." },
                        { icon: Calendar, title: "Ekstrakurikuler", desc: "Beragam kegiatan untuk mengembangkan minat dan bakat santri, mulai dari olahraga, seni, hingga teknologi." }
                    ].map((feature, idx) => (
                        <CardGlass key={idx} className="group p-8 glass-card-hover relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/5 flex items-center justify-center text-purple-400 mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/10">
                                <feature.icon size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                        </CardGlass>
                    ))}
                </div>
            </section>

            {/* Stats / CTA Section */}
            <section className="container mx-auto px-6 py-20">
                <div className="glass-panel rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 -z-10" />
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

                    <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                        <h2 className="text-4xl lg:text-6xl font-bold text-white tracking-tight">Siap Bergabung Menjadi Bagian dari Keluarga Besar Kami?</h2>
                        <p className="text-xl text-gray-300">Pendaftaran Santri Baru Tahun Ajaran 2025/2026 telah dibuka. Segera daftarkan putra-putri Anda.</p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                            <Link to="/ppdb">
                                <button className="glass-button-primary w-full sm:w-auto text-lg px-10 py-4">
                                    Daftar Sekarang
                                </button>
                            </Link>
                            <Link to="/contact">
                                <button className="glass-button w-full sm:w-auto text-lg px-10 py-4">
                                    Hubungi Kami
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
