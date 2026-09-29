import React from 'react';
import { Target, Compass, History, Award, Users, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import CardGlass from '../../components/ui/glass/CardGlass';
import { useFeatureStore } from '../../store/featureStore';

const Profile: React.FC = () => {
    const { school } = useFeatureStore();

    const heroBadge = school.profile_hero_badge || 'Tentang Kami';
    const heroTitle1 = school.profile_hero_title_1 || 'Mengenal Lebih Dekat';
    const heroTitle2 = school.profile_hero_title_2 || school.name || 'SDIT AN-NUR';
    const heroDesc = school.profile_hero_desc || 'Lembaga pendidikan Islam yang berkomitmen mencetak generasi unggul, berakhlak mulia, dan siap menghadapi tantangan zaman.';

    const visiTitle = school.profile_visi_title || 'Visi';
    const visiText = school.profile_visi_text || 'Terwujudnya Pesantren Persatuan Islam yang unggul dalam tafaqquh fiddin, sains, dan teknologi, serta melahirkan kader ulama dan zuama yang berakhlakul karimah.';

    const misiTitle = school.profile_misi_title || 'Misi';
    const defaultMisi = [
        "Menyelenggarakan pendidikan kepesantrenan yang berkualitas.",
        "Mengembangkan potensi santri dalam bidang sains dan teknologi.",
        "Membina akhlak mulia melalui pembiasaan ibadah dan keteladanan.",
        "Mempersiapkan kader pemimpin umat yang amanah dan profesional."
    ];
    const misiList = school.profile_misi_points
        ? school.profile_misi_points.split('\n').map(s => s.trim()).filter(Boolean)
        : defaultMisi;

    const sejarahBadge = school.profile_sejarah_badge || 'Sejarah Perjalanan';
    const sejarahTitle = school.profile_sejarah_title || 'Dedikasi Untuk Umat Sejak Awal Berdiri';
    const sejarahP1 = school.profile_sejarah_p1 || `${school.name || 'SDIT An-Nur'} didirikan dengan semangat untuk mencerdaskan kehidupan bangsa dan menegakkan syariat Islam.`;
    const sejarahP2 = school.profile_sejarah_p2 || 'Sejak awal berdirinya, pesantren ini telah berkontribusi dalam melahirkan lulusan yang berkiprah di berbagai bidang, baik keagamaan maupun kemasyarakatan. Kami terus berkomitmen untuk menjaga tradisi keilmuan Islam sambil beradaptasi dengan perkembangan zaman.';

    const stat1Val = school.profile_stat_1_val || '1000+';
    const stat1Label = school.profile_stat_1_label || 'Alumni';
    const stat2Val = school.profile_stat_2_val || '50+';
    const stat2Label = school.profile_stat_2_label || 'Penghargaan';
    const stat3Val = school.profile_stat_3_val || '15+';
    const stat3Label = school.profile_stat_3_label || 'Program Studi';
    const stat4Val = school.profile_stat_4_val || '50+';
    const stat4Label = school.profile_stat_4_label || 'Tenaga Pendidik';

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-20 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
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

            {/* Visi & Misi Section */}
            <section className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Visi */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <CardGlass className="p-10 relative overflow-hidden group h-full">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/5 flex items-center justify-center text-purple-400 mb-6 shadow-lg shadow-purple-500/10">
                                <Target size={32} />
                            </div>

                            <h2 className="text-3xl font-bold text-slate-900 mb-6">{visiTitle}</h2>
                            <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-line">
                                {visiText}
                            </p>
                        </CardGlass>
                    </motion.div>

                    {/* Misi */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <CardGlass className="p-10 relative overflow-hidden group h-full">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-white/5 flex items-center justify-center text-indigo-400 mb-6 shadow-lg shadow-indigo-500/10">
                                <Compass size={32} />
                            </div>

                            <h2 className="text-3xl font-bold text-slate-900 mb-6">{misiTitle}</h2>
                            <ul className="space-y-4">
                                {misiList.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-slate-600">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <span className="text-lg">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardGlass>
                    </motion.div>
                </div>
            </section>

            {/* Sejarah Section */}
            <section className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <CardGlass className="p-10 lg:p-16 relative overflow-hidden">
                        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />

                        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 text-blue-400 font-semibold uppercase tracking-wider text-sm">
                                    <History size={18} />
                                    <span>{sejarahBadge}</span>
                                </div>
                                <h2 className="text-4xl font-bold text-slate-900">{sejarahTitle}</h2>
                                <div className="space-y-4 text-slate-600 text-lg leading-relaxed">
                                    <p className="whitespace-pre-line">{sejarahP1}</p>
                                    <p className="whitespace-pre-line">{sejarahP2}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4 mt-8">
                                    <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/40 transition-colors">
                                        <Users size={32} className="mx-auto text-purple-600 mb-3" />
                                        <h4 className="text-2xl font-bold text-slate-800">{stat1Val}</h4>
                                        <p className="text-sm text-slate-500">{stat1Label}</p>
                                    </div>
                                    <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/40 transition-colors">
                                        <Award size={32} className="mx-auto text-yellow-500 mb-3" />
                                        <h4 className="text-2xl font-bold text-slate-800">{stat2Val}</h4>
                                        <p className="text-sm text-slate-500">{stat2Label}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/40 transition-colors">
                                        <BookOpen size={32} className="mx-auto text-green-600 mb-3" />
                                        <h4 className="text-2xl font-bold text-slate-800">{stat3Val}</h4>
                                        <p className="text-sm text-slate-500">{stat3Label}</p>
                                    </div>
                                    <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/40 transition-colors">
                                        <Users size={32} className="mx-auto text-blue-600 mb-3" />
                                        <h4 className="text-2xl font-bold text-slate-800">{stat4Val}</h4>
                                        <p className="text-sm text-slate-500">{stat4Label}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardGlass>
                </motion.div>
            </section>
        </div>
    );
};

export default Profile;
