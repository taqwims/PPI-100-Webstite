import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Teacher {
    id: number;
    name: string;
    position: string;
    photo_url: string;
    bio: string;
}

const PublicTeachers: React.FC = () => {
    const { data: teachers, isLoading } = useQuery({
        queryKey: ['public-teachers'],
        queryFn: async () => {
            const response = await api.get('/public/teachers');
            return response.data;
        }
    });

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-32 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 right-20 w-72 h-72 bg-green-600/10 rounded-full blur-[100px] animate-pulse" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl lg:text-7xl font-bold mb-6"
                    >
                        <span className="text-slate-900">Dewan</span> <br />
                        <span className="text-gradient-primary">Asatidz</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                    >
                        Mengenal lebih dekat para pengajar yang berdedikasi membimbing santri menuju kesuksesan dunia dan akhirat.
                    </motion.p>
                </div>
            </section>

            {/* Teachers Grid */}
            <section className="container mx-auto px-6">
                {isLoading ? (
                    <div className="text-center text-slate-600">Loading...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {teachers?.map((teacher: Teacher, idx: number) => (
                            <motion.div
                                key={teacher.id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                            >
                                <CardGlass
                                    className="group p-6 text-center h-full"
                                >
                                    <div className="w-32 h-32 mx-auto mb-6 rounded-full p-1 bg-gradient-to-br from-green-500 to-emerald-500 group-hover:scale-105 transition-transform duration-300">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                                            {teacher.photo_url ? (
                                                <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={48} className="text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">{teacher.name}</h3>
                                    <p className="text-green-600 text-sm font-medium mb-4">{teacher.position}</p>
                                    <p className="text-slate-600 text-sm leading-relaxed">{teacher.bio}</p>
                                </CardGlass>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PublicTeachers;
