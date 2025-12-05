import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { Quote, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Alumni {
    id: number;
    name: string;
    graduation_year: number;
    profession: string;
    testimony: string;
    photo_url: string;
}

const PublicAlumni: React.FC = () => {
    const { data: alumni, isLoading } = useQuery({
        queryKey: ['public-alumni'],
        queryFn: async () => {
            const response = await api.get('/public/alumni');
            return response.data;
        }
    });

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-32 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl lg:text-7xl font-bold mb-6"
                    >
                        <span className="text-slate-900">Kisah</span> <br />
                        <span className="text-gradient-primary">Alumni</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                    >
                        Inspirasi dari para alumni yang telah berkiprah di berbagai bidang, membawa nilai-nilai pesantren ke masyarakat luas.
                    </motion.p>
                </div>
            </section>

            {/* Alumni Grid */}
            <section className="container mx-auto px-6">
                {isLoading ? (
                    <div className="text-center text-slate-600">Loading...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {alumni?.map((item: Alumni, idx: number) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                            >
                                <CardGlass
                                    className="p-8 relative h-full"
                                >
                                    <Quote className="absolute top-6 right-6 text-slate-200" size={48} />

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-0.5">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                                                {item.photo_url ? (
                                                    <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={24} className="text-slate-400" />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">{item.name}</h3>
                                            <p className="text-green-600 text-sm">Angkatan {item.graduation_year}</p>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 italic leading-relaxed mb-4">"{item.testimony}"</p>

                                    <div className="pt-4 border-t border-slate-200">
                                        <p className="text-sm text-slate-500 font-medium">{item.profession}</p>
                                    </div>
                                </CardGlass>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PublicAlumni;
