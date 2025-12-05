import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { Users, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Student {
    id: string;
    user: {
        name: string;
        email: string;
    };
    nisn: string;
    parent?: {
        phone: string;
    };
}



const HomeroomClass: React.FC = () => {
    const { user } = useAuth();

    // Fetch Homeroom Class
    const { data: myClass, isLoading: isLoadingClass } = useQuery({
        queryKey: ['homeroom-class', user?.teacher?.id],
        queryFn: async () => {
            if (!user?.teacher?.id) return null;
            const res = await api.get(`/academic/classes/homeroom?teacher_id=${user.teacher.id}`);
            return res.data;
        },
        enabled: !!user?.teacher?.id
    });

    // Fetch Students in Class
    const { data: students, isLoading: isLoadingStudents } = useQuery({
        queryKey: ['class-students', myClass?.id],
        queryFn: async () => {
            if (!myClass?.id) return [];
            // We need an endpoint to get students by class. 
            // Assuming GET /students?class_id=X works or we filter client side from all students (less efficient)
            // Let's check if we have GET /students?class_id=...
            // Based on previous work, StudentHandler.GetAllStudents takes unit_id.
            // We might need to filter by class_id in the backend or frontend.
            // For now, let's assume we can filter by class_id if we add it to GetAllStudents or use a new endpoint.
            // Actually, let's use the existing GetAllStudents and filter client-side for MVP if needed, 
            // OR better, update GetAllStudents to accept class_id.
            // Let's try passing class_id param.
            const res = await api.get(`/students/?unit_id=${myClass.unit_id}`);
            return res.data.filter((s: any) => s.class_id === myClass.id);
        },
        enabled: !!myClass?.id
    });

    if (!user?.teacher) {
        return <div className="text-slate-900 p-6">Data Guru tidak ditemukan.</div>;
    }

    if (isLoadingClass) {
        return <div className="text-slate-900 p-6">Loading data kelas...</div>;
    }

    if (!myClass) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl text-slate-900">Anda belum ditugaskan sebagai Wali Kelas.</h2>
                <p className="text-slate-300-400">Hubungi admin jika ini kesalahan.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Kelas Saya: {myClass.name}</h1>
                <p className="text-slate-600">Daftar siswa di kelas perwalian Anda</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardGlass className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-600 text-sm">Total Siswa</p>
                        <p className="text-2xl font-bold text-slate-900">{students?.length || 0}</p>
                    </div>
                </CardGlass>
                {/* Add more stats here if needed */}
            </div>

            <CardGlass className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Daftar Siswa</h3>
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama Siswa</TableHeadGlass>
                            <TableHeadGlass>NISN</TableHeadGlass>
                            <TableHeadGlass>Email</TableHeadGlass>
                            <TableHeadGlass>Kontak Ortu</TableHeadGlass>
                            <TableHeadGlass>Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoadingStudents ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : students?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8 text-slate-600">Belum ada siswa di kelas ini.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            students?.map((student: Student) => (
                                <TableRowGlass key={student.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                {student.user.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-slate-900">{student.user.name}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{student.nisn}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{student.user.email}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone size={14} />
                                            {student.parent?.phone || '-'}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <a
                                            href={`/dashboard/homeroom/report-card/${student.id}`}
                                            className="px-3 py-1 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Lihat Rapor
                                        </a>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>
        </div>
    );
};

export default HomeroomClass;
