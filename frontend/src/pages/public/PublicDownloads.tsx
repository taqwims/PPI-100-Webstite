import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { Download, FileText, Calendar } from 'lucide-react';

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
            case 'brosur': return <FileText size={24} className="text-blue-400" />;
            case 'kalender': return <Calendar size={24} className="text-green-400" />;
            default: return <FileText size={24} className="text-gray-400" />;
        }
    };

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-32 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <span className="text-white">Pusat</span> <br />
                        <span className="text-gradient-primary">Unduhan</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Akses berbagai dokumen penting, brosur, dan kalender akademik Pesantren Persis 100 Banjar­sari.
                    </p>
                </div>
            </section>

            {/* Downloads List */}
            <section className="container mx-auto px-6 max-w-4xl">
                {isLoading ? (
                    <div className="text-center text-white">Loading...</div>
                ) : (
                    <div className="space-y-4">
                        {downloads?.map((item: DownloadItem, idx: number) => (
                            <CardGlass
                                key={item.id}
                                className="p-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl">
                                        {getIcon(item.category)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-xs uppercase tracking-wider">{item.category}</span>
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
                        ))}

                        {downloads?.length === 0 && (
                            <div className="text-center text-gray-400 py-12">
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
