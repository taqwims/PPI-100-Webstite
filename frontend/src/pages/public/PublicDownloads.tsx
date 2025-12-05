import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { Download, FileText, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface DownloadItem {
    id: number;
    title: string;
    category: string;
    file_url: string;
    created_at: string;
}

const PublicDownloads: React.FC = () => {
    const { data: downloads, isLoading } = useQuery({
        queryKey: ['public-downloads'],
        queryFn: async () => {
            const response = await api.get('/public/downloads');
            return response.data;
        }
    });

    const getIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'brosur': return <FileText size={24} className="text-blue-500" />;
            case 'kalender': return <Calendar size={24} className="text-green-500" />;
            default: return <FileText size={24} className="text-slate-400" />;
        }
    };

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-32 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl lg:text-7xl font-bold mb-6"
                    >
                        <span className="text-slate-900">Pusat</span> <br />
                        <span className="text-gradient-primary">Unduhan</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                    >
                        Akses berbagai dokumen penting, brosur, dan kalender akademik Pesantren Persis 100 Banjar­sari.
                    </motion.p>
                </div>
            </section>

            {/* Downloads List */}
            <section className="container mx-auto px-6 max-w-4xl">
                {isLoading ? (
                    <div className="text-center text-slate-600">Loading...</div>
                ) : (
                    <div className="space-y-4">
                        {downloads?.map((item: DownloadItem, idx: number) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                            >
                                <CardGlass
                                    className="p-6 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-100 rounded-xl">
                                            {getIcon(item.category)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-xs uppercase tracking-wider">{item.category}</span>
                                                <span>•</span>
                                                <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                                        <ButtonGlass variant="secondary" className="flex items-center gap-2">
                                            <Download size={18} />
                                            <span className="hidden sm:inline">Unduh</span>
                                        </ButtonGlass>
                                    </a>
                                </CardGlass>
                            </motion.div>
                        ))}

                        {downloads?.length === 0 && (
                            <div className="text-center text-slate-500 py-12">
                                Belum ada file yang tersedia untuk diunduh.
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PublicDownloads;
