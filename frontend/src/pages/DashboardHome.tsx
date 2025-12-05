import React from 'react';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import { Users, BookOpen, DollarSign, Clock, AlertCircle, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';

const DashboardHome: React.FC = () => {
    const { user } = useAuth();

    // Role IDs: 1=Super Admin, 2=Admin MTS, 3=Admin MA, 4=Guru, 5=Wali Kelas, 6=Siswa, 7=Orang Tua

    if (!user) return null;

    if (user.role_id <= 3) {
        return <AdminDashboard />;
    } else if (user.role_id === 4 || user.role_id === 5) {
        return <TeacherDashboard />;
    } else if (user.role_id === 6) {
        return <StudentDashboard />;
    } else {
        return <div className="text-slate-900">Dashboard for role {user.role_id} is under construction.</div>;
    }
};

const AdminDashboard = () => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const [users, ppdb] = await Promise.all([
                api.get('/users/'),
                api.get('/ppdb/')
            ]);
            return {
                totalUsers: users.data.length,
                totalPPDB: ppdb.data.length,
            };
        }
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
                <p className="text-slate-600">Overview sistem akademik</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardGlass className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-full text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Total Pengguna</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? '...' : stats?.totalUsers || 0}</h3>
                    </div>
                </CardGlass>
                <CardGlass className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-full text-purple-600">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Pendaftar PPDB</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? '...' : stats?.totalPPDB || 0}</h3>
                    </div>
                </CardGlass>
                <CardGlass className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-full text-green-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Keuangan</p>
                        <h3 className="text-2xl font-bold text-slate-900">Active</h3>
                    </div>
                </CardGlass>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Aksi Cepat</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/dashboard/ppdb" className="p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-colors text-center shadow-sm border border-white/20">
                            <Users className="mx-auto mb-2 text-purple-600" />
                            <span className="text-sm text-slate-600">Cek PPDB</span>
                        </Link>
                        <Link to="/dashboard/admin/notifications" className="p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-colors text-center shadow-sm border border-white/20">
                            <AlertCircle className="mx-auto mb-2 text-yellow-600" />
                            <span className="text-sm text-slate-600">Kirim Notif</span>
                        </Link>
                    </div>
                </CardGlass>
            </div>
        </div>
    );
};

const TeacherDashboard = () => {
    const { user } = useAuth();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    // Fetch Teacher Profile
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const response = await api.get('/teachers/');
            return response.data;
        }
    });
    const currentTeacher = teachers?.find((t: any) => t.user.id === user?.id);

    // Fetch Schedule
    const { data: schedules } = useQuery({
        queryKey: ['teacher-schedule', currentTeacher?.id],
        queryFn: async () => {
            if (!currentTeacher?.id) return [];
            const response = await api.get(`/academic/schedules?teacher_id=${currentTeacher.id}`);
            return response.data;
        },
        enabled: !!currentTeacher?.id
    });

    const todaySchedule = schedules?.filter((s: any) => s.day === today)
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    const nextClass = todaySchedule && todaySchedule.length > 0 ? todaySchedule[0] : null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Selamat Datang, {user?.name}</h1>
                <p className="text-slate-600">Dashboard Guru</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="text-yellow-600" size={20} />
                        Jadwal Hari Ini
                    </h3>
                    <div className="text-center py-4 text-slate-600">
                        {nextClass ? (
                            <div className="text-left bg-white/40 p-4 rounded-xl shadow-sm border border-white/20">
                                <p className="text-slate-900 font-bold text-lg">{nextClass.subject.name}</p>
                                <p className="text-purple-600">{nextClass.class.name}</p>
                                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                    <Clock size={14} />
                                    {nextClass.start_time} - {nextClass.end_time}
                                </div>
                            </div>
                        ) : (
                            <p>Tidak ada jadwal mengajar hari ini.</p>
                        )}
                        <Link to="/dashboard/schedule" className="text-blue-600 hover:underline mt-4 inline-block text-sm">
                            Lihat Jadwal Lengkap
                        </Link>
                    </div>
                </CardGlass>

                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BookOpen className="text-purple-600" size={20} />
                        Aksi Cepat
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <Link to="/dashboard/grades" className="p-3 bg-white/40 rounded-lg hover:bg-white/60 transition-colors flex items-center gap-3 shadow-sm border border-white/20">
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-600">
                                <FileText size={18} />
                            </div>
                            <span className="text-slate-600 text-sm">Input Nilai</span>
                        </Link>
                        <Link to="/dashboard/elearning" className="p-3 bg-white/40 rounded-lg hover:bg-white/60 transition-colors flex items-center gap-3 shadow-sm border border-white/20">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-600">
                                <BookOpen size={18} />
                            </div>
                            <span className="text-slate-600 text-sm">Kelola E-Learning</span>
                        </Link>
                    </div>
                </CardGlass>

                {user?.role_id === 5 && (
                    <CardGlass className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Users className="text-green-600" size={20} />
                            Wali Kelas
                        </h3>
                        <div className="text-center py-8 text-slate-600">
                            <p>Kelola data siswa kelas Anda.</p>
                            <Link to="/dashboard/homeroom" className="text-blue-600 hover:underline mt-2 inline-block">
                                Buka Kelas Wali
                            </Link>
                        </div>
                    </CardGlass>
                )}
            </div>
        </div>
    );
};

const StudentDashboard = () => {
    const { user } = useAuth();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    // Fetch Student Profile
    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const res = await api.get('/students/');
            return res.data;
        }
    });
    const currentStudent = students?.find((s: any) => s.user.id === user?.id);

    // Fetch Schedule
    const { data: schedules } = useQuery({
        queryKey: ['student-schedule', currentStudent?.class_id],
        queryFn: async () => {
            if (!currentStudent?.class_id) return [];
            const response = await api.get(`/academic/schedules?class_id=${currentStudent.class_id}`);
            return response.data;
        },
        enabled: !!currentStudent?.class_id
    });

    const todaySchedule = schedules?.filter((s: any) => s.day === today)
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    // Fetch Tasks
    const { data: tasks } = useQuery({
        queryKey: ['student-tasks', currentStudent?.class_id],
        queryFn: async () => {
            if (!currentStudent?.class_id) return [];
            const response = await api.get(`/elearning/tasks?class_id=${currentStudent.class_id}`);
            return response.data;
        },
        enabled: !!currentStudent?.class_id
    });

    // Fetch Bills
    const { data: bills } = useQuery({
        queryKey: ['student-bills', currentStudent?.id],
        queryFn: async () => {
            if (!currentStudent?.id) return [];
            const response = await api.get(`/finance/bills?student_id=${currentStudent.id}`);
            return response.data.filter((b: any) => b.status === 'Unpaid');
        },
        enabled: !!currentStudent?.id
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Halo, {user?.name}</h1>
                <p className="text-slate-600">Semangat belajar hari ini!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="text-blue-600" size={20} />
                        Jadwal Hari Ini
                    </h3>
                    <div className="text-center py-4 text-slate-600">
                        {todaySchedule && todaySchedule.length > 0 ? (
                            <div className="space-y-3">
                                {todaySchedule.slice(0, 2).map((s: any) => (
                                    <div key={s.id} className="text-left bg-white/40 p-3 rounded-xl shadow-sm border border-white/20">
                                        <p className="text-slate-900 font-bold">{s.subject.name}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <Clock size={12} />
                                            {s.start_time} - {s.end_time}
                                        </div>
                                    </div>
                                ))}
                                {todaySchedule.length > 2 && <p className="text-xs text-slate-500">+{todaySchedule.length - 2} lainnya</p>}
                            </div>
                        ) : (
                            <p>Tidak ada jadwal pelajaran hari ini.</p>
                        )}
                        <Link to="/dashboard/student/schedule" className="text-blue-600 hover:underline mt-4 inline-block text-sm">
                            Lihat Jadwal
                        </Link>
                    </div>
                </CardGlass>

                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="text-red-600" size={20} />
                        Tugas & PR
                    </h3>
                    <div className="text-center py-4">
                        <h4 className="text-3xl font-bold text-slate-900 mb-2">{tasks?.length || 0}</h4>
                        <p className="text-slate-600 text-sm">Tugas di kelasmu</p>
                        <Link to="/dashboard/student/elearning" className="text-blue-600 hover:underline mt-4 inline-block text-sm">
                            Lihat Tugas
                        </Link>
                    </div>
                </CardGlass>

                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <DollarSign className="text-green-600" size={20} />
                        Tagihan Belum Lunas
                    </h3>
                    <div className="text-center py-4">
                        <h4 className="text-3xl font-bold text-slate-900 mb-2">{bills?.length || 0}</h4>
                        <p className="text-slate-600 text-sm">Tagihan pending</p>
                        <Link to="/dashboard/bills" className="text-blue-600 hover:underline mt-4 inline-block text-sm">
                            Lihat Tagihan
                        </Link>
                    </div>
                </CardGlass>
            </div>
        </div>
    );
};

export default DashboardHome;
