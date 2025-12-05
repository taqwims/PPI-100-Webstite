import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { Quote, User } from 'lucide-react';

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
                    <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <span className="text-white">Kisah</span> <br />
                        <span className="text-gradient-primary">Alumni</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Inspirasi dari para alumni yang telah berkiprah di berbagai bidang, membawa nilai-nilai pesantren ke masyarakat luas.
                    </p>
                </div>
            </section>

            {/* Alumni Grid */}
            <section className="container mx-auto px-6">
                {isLoading ? (
                    <div className="text-center text-white">Loading...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {alumni?.map((item: Alumni, idx: number) => (
                            <CardGlass
                                key={item.id}
                                className="p-8 relative animate-in fade-in slide-in-from-bottom-8 duration-700"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <Quote className="absolute top-6 right-6 text-white/5" size={48} />

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 p-0.5">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                                            {item.photo_url ? (
                                                <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={24} className="text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{item.name}</h3>
                                        <p className="text-purple-400 text-sm">Angkatan {item.graduation_year}</p>
                                    </div>
                                </div>

                                <p className="text-gray-300 italic leading-relaxed mb-4">"{item.testimony}"</p>

                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-sm text-gray-400 font-medium">{item.profession}</p>
                                </div>
                            </CardGlass>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PublicAlumni;
