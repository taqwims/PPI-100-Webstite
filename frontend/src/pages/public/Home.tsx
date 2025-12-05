import React from 'react';
import { BookOpen, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CardGlass from '../../components/ui/glass/CardGlass';
import HeroSlider from '../../components/public/HeroSlider';

const Home: React.FC = () => {
    return (
        <div className="space-y-0 pb-24">
            {/* Hero Section with Slider */}
            <HeroSlider />

            {/* Features Section */}
            <section className="container mx-auto px-6 py-24">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-3xl mx-auto mb-20 space-y-4"
                >
                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">Keunggulan <span className="text-gradient-primary">Kami</span></h2>
                    <p className="text-slate-600 text-lg">Fasilitas modern dan kurikulum terintegrasi untuk mendukung perkembangan santri secara holistik.</p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: BookOpen, title: "Kurikulum Terpadu", desc: "Memadukan kurikulum nasional (Kemendikbud) dan kepesantrenan untuk keseimbangan ilmu dunia dan akhirat." },
                        { icon: Users, title: "Pembinaan Karakter", desc: "Program pembinaan akhlak, adab, dan kepemimpinan yang intensif 24 jam dalam lingkungan asrama." },
                        { icon: Calendar, title: "Ekstrakurikuler", desc: "Beragam kegiatan untuk mengembangkan minat dan bakat santri, mulai dari olahraga, seni, hingga teknologi." }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.2 }}
                        >
                            <CardGlass className="group p-8 glass-card-hover relative overflow-hidden h-full">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-transparent rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />

                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/10 flex items-center justify-center text-green-600 mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-green-500/10">
                                    <feature.icon size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-green-600 transition-colors">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </CardGlass>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Stats / CTA Section */}
            <section className="container mx-auto px-6 py-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="glass-panel rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-center"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-emerald-50/50 -z-10" />
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />

                    <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                        <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 tracking-tight">Siap Bergabung Menjadi Bagian dari Keluarga Besar Kami?</h2>
                        <p className="text-xl text-slate-600">Pendaftaran Santri Baru Tahun Ajaran 2025/2026 telah dibuka. Segera daftarkan putra-putri Anda.</p>

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
                </motion.div>
            </section>
        </div>
    );
};

export default Home;
