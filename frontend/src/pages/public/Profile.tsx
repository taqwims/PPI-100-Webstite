import React from 'react';
import { Target, Compass, History, Award, Users, BookOpen } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';

const Profile: React.FC = () => {
    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-20 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-purple-500/5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="text-sm font-medium text-gray-300 tracking-wide uppercase">Tentang Kami</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        <span className="text-white">Mengenal Lebih Dekat</span> <br />
                        <span className="text-gradient-primary">Pesantren Persis 100</span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Lembaga pendidikan Islam yang berkomitmen mencetak generasi unggul, berakhlak mulia, dan siap menghadapi tantangan zaman.
                    </p>
                </div>
            </section>

            {/* Visi & Misi Section */}
            <section className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Visi */}
                    <CardGlass className="p-10 relative overflow-hidden group animate-in fade-in slide-in-from-left-8 duration-700 delay-300">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />

                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/5 flex items-center justify-center text-purple-400 mb-6 shadow-lg shadow-purple-500/10">
                            <Target size={32} />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-6">Visi</h2>
                        <p className="text-lg text-gray-300 leading-relaxed">
                            Terwujudnya Pesantren Persatuan Islam yang unggul dalam tafaqquh fiddin, sains, dan teknologi, serta melahirkan kader ulama dan zuama yang berakhlakul karimah.
                        </p>
                    </CardGlass>

                    {/* Misi */}
                    <CardGlass className="p-10 relative overflow-hidden group animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />

                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-white/5 flex items-center justify-center text-indigo-400 mb-6 shadow-lg shadow-indigo-500/10">
                            <Compass size={32} />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-6">Misi</h2>
                        <ul className="space-y-4">
                            {[
                                "Menyelenggarakan pendidikan kepesantrenan yang berkualitas.",
                                "Mengembangkan potensi santri dalam bidang sains dan teknologi.",
                                "Membina akhlak mulia melalui pembiasaan ibadah dan keteladanan.",
                                "Mempersiapkan kader pemimpin umat yang amanah dan profesional."
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-300">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span className="text-lg">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardGlass>
                </div>
            </section>

            {/* Sejarah Section */}
            <section className="container mx-auto px-6">
                <CardGlass className="p-10 lg:p-16 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                    <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />

                    <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 text-blue-400 font-semibold uppercase tracking-wider text-sm">
                                <History size={18} />
                                <span>Sejarah Perjalanan</span>
                            </div>
                            <h2 className="text-4xl font-bold text-white">Dedikasi Untuk Umat Sejak Awal Berdiri</h2>
                            <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
                                <p>
                                    Pesantren Persis 100 Banjar­sari didirikan dengan semangat untuk mencerdaskan kehidupan bangsa dan menegakkan syariat Islam.
                                </p>
                                <p>
                                    Sejak awal berdirinya, pesantren ini telah berkontribusi dalam melahirkan lulusan yang berkiprah di berbagai bidang, baik keagamaan maupun kemasyarakatan. Kami terus berkomitmen untuk menjaga tradisi keilmuan Islam sambil beradaptasi dengan perkembangan zaman.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 mt-8">
                                <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/5 transition-colors">
                                    <Users size={32} className="mx-auto text-purple-400 mb-3" />
                                    <h4 className="text-2xl font-bold text-white">1000+</h4>
                                    <p className="text-sm text-gray-500">Alumni</p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/5 transition-colors">
                                    <Award size={32} className="mx-auto text-yellow-400 mb-3" />
                                    <h4 className="text-2xl font-bold text-white">50+</h4>
                                    <p className="text-sm text-gray-500">Penghargaan</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/5 transition-colors">
                                    <BookOpen size={32} className="mx-auto text-green-400 mb-3" />
                                    <h4 className="text-2xl font-bold text-white">15+</h4>
                                    <p className="text-sm text-gray-500">Program Studi</p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl text-center hover:bg-white/5 transition-colors">
                                    <Users size={32} className="mx-auto text-blue-400 mb-3" />
                                    <h4 className="text-2xl font-bold text-white">50+</h4>
                                    <p className="text-sm text-gray-500">Tenaga Pendidik</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardGlass>
            </section>
        </div>
    );
};

export default Profile;
