import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Student {
    id: string;
    user: {
        name: string;
        email: string;
    };
    nisn: string;
    class: {
        name: string;
    };
}

const ParentChildren: React.FC = () => {
    const { user } = useAuth();

    const { data: children, isLoading } = useQuery({
        queryKey: ['my-children'],
        queryFn: async () => {
            const response = await api.get(`/students/children`);
            return response.data;
        },
    });

    if (!user?.parent) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl text-white">Data Orang Tua tidak ditemukan.</h2>
                <p className="text-gray-400">Pastikan akun Anda terdaftar sebagai Orang Tua.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Data Anak</h1>
                <p className="text-gray-400">Informasi akademik putra-putri Anda</p>
            </div>

            {isLoading ? (
                <div className="text-white">Loading...</div>
            ) : children?.length === 0 ? (
                <div className="text-white">Tidak ada data anak yang terhubung.</div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {children?.map((child: Student) => (
                        <CardGlass key={child.id} className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                                    {child.user.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{child.user.name}</h3>
                                    <p className="text-gray-300">{child.nisn}</p>
                                    <span className="inline-block px-2 py-1 bg-white/10 rounded text-xs text-blue-300 mt-1">
                                        Kelas {child.class.name}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <a href={`/dashboard/parent/children/${child.id}/attendance`} className="bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <Calendar size={14} /> Kehadiran
                                    </div>
                                    <p className="text-white font-semibold">Cek Absensi</p>
                                </a>
                                <a href={`/dashboard/parent/children/${child.id}/grades`} className="bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <BookOpen size={14} /> Nilai
                                    </div>
                                    <p className="text-white font-semibold">Lihat Nilai</p>
                                </a>
                                <a href={`/dashboard/parent/children/${child.id}/bills`} className="bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <AlertCircle size={14} /> Tagihan
                                    </div>
                                    <p className="text-white font-semibold">Cek Tagihan</p>
                                </a>
                                <a href={`/dashboard/parent/children/${child.id}/bk`} className="bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <AlertCircle size={14} /> BK
                                    </div>
                                    <p className="text-white font-semibold">Catatan BK</p>
                                </a>
                            </div>
                        </CardGlass>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParentChildren;
