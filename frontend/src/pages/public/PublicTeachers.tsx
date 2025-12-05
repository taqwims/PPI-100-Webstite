import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { User } from 'lucide-react';

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
                    <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <span className="text-white">Dewan</span> <br />
                        <span className="text-gradient-primary">Asatidz</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Mengenal lebih dekat para pengajar yang berdedikasi membimbing santri menuju kesuksesan dunia dan akhirat.
                    </p>
                </div>
            </section>

            {/* Teachers Grid */}
            <section className="container mx-auto px-6">
                {isLoading ? (
                    <div className="text-center text-white">Loading...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {teachers?.map((teacher: Teacher, idx: number) => (
                            <CardGlass
                                key={teacher.id}
                                className="group p-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-700"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="w-32 h-32 mx-auto mb-6 rounded-full p-1 bg-gradient-to-br from-purple-500 to-indigo-500 group-hover:scale-105 transition-transform duration-300">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                                        {teacher.photo_url ? (
                                            <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={48} className="text-gray-400" />
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{teacher.name}</h3>
                                <p className="text-purple-400 text-sm font-medium mb-4">{teacher.position}</p>
                                <p className="text-gray-400 text-sm leading-relaxed">{teacher.bio}</p>
                            </CardGlass>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PublicTeachers;
