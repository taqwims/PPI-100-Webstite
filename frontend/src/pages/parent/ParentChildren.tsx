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
                <h2 className="text-xl text-slate-900">Data Orang Tua tidak ditemukan.</h2>
                <p className="text-slate-600">Pastikan akun Anda terdaftar sebagai Orang Tua.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Data Anak</h1>
                <p className="text-slate-600">Informasi akademik putra-putri Anda</p>
            </div>

            {isLoading ? (
                <div className="text-slate-600">Loading...</div>
            ) : children?.length === 0 ? (
                <div className="text-slate-600">Tidak ada data anak yang terhubung.</div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {children?.map((child: Student) => (
                        <CardGlass key={child.id} className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                                    {child.user.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{child.user.name}</h3>
                                    <p className="text-slate-600">{child.nisn}</p>
                                    <span className="inline-block px-2 py-1 bg-blue-50 rounded text-xs text-blue-600 mt-1">
                                        Kelas {child.class.name}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                                <a href={`/dashboard/parent/children/${child.id}/attendance`} className="bg-white p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <Calendar size={14} /> Kehadiran
                                    </div>
                                    <p className="text-slate-900 font-semibold">Cek Absensi</p>
                                </a>
                                <a href={`/dashboard/parent/children/${child.id}/grades`} className="bg-white p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <BookOpen size={14} /> Nilai
                                    </div>
                                    <p className="text-slate-900 font-semibold">Lihat Nilai</p>
                                </a>
                                <a href={`/dashboard/parent/children/${child.id}/bills`} className="bg-white p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <AlertCircle size={14} /> Tagihan
                                    </div>
                                    <p className="text-slate-900 font-semibold">Cek Tagihan</p>
                                </a>
                                <a href={`/dashboard/parent/children/${child.id}/bk`} className="bg-white p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <AlertCircle size={14} /> BK
                                    </div>
                                    <p className="text-slate-900 font-semibold">Catatan BK</p>
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
