import React from 'react';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import { 
    Users, BookOpen, DollarSign, Clock, AlertCircle, FileText, 
    CreditCard, Activity, Inbox, Wallet, ShieldCheck, TrendingDown,
    LayoutDashboard
} from 'lucide-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';
import PrincipalDashboard from './finance/PrincipalDashboard';
import ExecutiveDashboard from './finance/ExecutiveDashboard';

const DashboardHome: React.FC = () => {
    const { user } = useAuth();

    // Role IDs: 1=Super Admin, 2=Admin MTS, 3=Admin MA, 4=Guru, 5=Wali Kelas, 6=Siswa, 7=Orang Tua, 8=Pimpinan, 9=Bendahara, 10=Teller Tabungan, 11=Teller Transaksional

    if (!user) return null;

    if (user.role_id <= 3) {
        return <AdminDashboard />;
    } else if (user.role_id === 4 || user.role_id === 5) {
        return <TeacherDashboard />;
    } else if (user.role_id === 6) {
        return <StudentDashboard />;
    } else if (user.role_id === 7) {
        return <ParentDashboard />;
    } else if (user.role_id === 8) {
        return <PrincipalDashboard />;
    } else if (user.role_id === 9) {
        return <ExecutiveDashboard />;
    } else if (user.role_id === 10) {
        return <TellerTabunganDashboard />;
    } else if (user.role_id === 11) {
        return <TellerTransactionalDashboard />;
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

const ParentDashboard = () => {
    const { user } = useAuth();

    const { data: childrenData } = useQuery({
        queryKey: ['parent-children'],
        queryFn: async () => {
            const res = await api.get('/students/children');
            return res.data;
        }
    });
    
    const children = childrenData || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Halo, {user?.name}</h1>
                <p className="text-slate-600">Pantau perkembangan ananda hari ini.</p>
            </div>

            {children.length === 0 ? (
                <CardGlass className="p-6 text-center text-slate-500">
                    Belum ada data anak yang dihubungkan dengan akun Anda.
                </CardGlass>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children.map((child: any) => (
                        <CardGlass key={child.id} className="p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users size={64} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{child.user?.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{child.class?.name || 'Belum ada kelas'} • NISN: {child.nisn}</p>
                            
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <Link to="/dashboard/children" className="p-3 bg-blue-50/50 hover:bg-blue-50 rounded-xl text-center border border-blue-100 transition">
                                    <BookOpen className="mx-auto mb-1 text-blue-600" size={20} />
                                    <span className="text-xs font-medium text-slate-700">Akademik</span>
                                </Link>
                                <Link to={`/dashboard/parent/children/${child.id}/bills`} className="p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl text-center border border-emerald-100 transition">
                                    <DollarSign className="mx-auto mb-1 text-emerald-600" size={20} />
                                    <span className="text-xs font-medium text-slate-700">Keuangan</span>
                                </Link>
                            </div>
                        </CardGlass>
                    ))}
                </div>
            )}
        </div>
    );
};

const TellerTabunganDashboard = () => {
    const { user } = useAuth();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Halo, {user?.name}</h1>
                <p className="text-slate-600">Dashboard Teller Tabungan</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CardGlass className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <DollarSign className="text-blue-600" size={20} />
                        Kelola Tabungan
                    </h3>
                    <p className="text-slate-600 mb-4 text-sm">Akses menu tabungan untuk melakukan setoran dan penarikan tabungan siswa.</p>
                    <Link to="/dashboard/finance/savings" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        Buka Menu Tabungan
                    </Link>
                </CardGlass>
            </div>
        </div>
    );
};

const TellerTransactionalDashboard = () => {
    const { user } = useAuth();
    const today = new Date().toISOString().split('T')[0];

    const { data: stats, isLoading } = useQuery({
        queryKey: ['teller-dashboard-stats'],
        queryFn: async () => {
            const [txns, pool, pending] = await Promise.all([
                api.get(`/finance/global-transactions?start_date=${today}&end_date=${today}`),
                api.get('/finance/savings/operational/summary'),
                api.get('/finance/payments/pending')
            ]);

            const todayTxns = txns.data || [];
            return {
                income: todayTxns.filter((t: any) => t.type === 'Income').reduce((s: number, t: any) => s + t.amount, 0),
                expense: todayTxns.filter((t: any) => t.type === 'Expense').reduce((s: number, t: any) => s + t.amount, 0),
                poolBalance: pool.data?.available_balance || 0,
                pendingPayments: pending.data?.length || 0
            };
        }
    });

    const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    const actions = [
        { label: 'SPP & Tagihan', path: '/dashboard/finance', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Kegiatan Siswa', path: '/dashboard/finance/activities', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Tanggungan Siswa', path: '/dashboard/finance/student-obligations', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Buku Kas Umum', path: '/dashboard/finance/cash-ledger', icon: Inbox, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Infaq Harian', path: '/dashboard/finance/daily-infaq', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Kelola Tabungan', path: '/dashboard/finance/savings', icon: Wallet, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Halo, {user?.name} 👋</h1>
                    <p className="text-slate-500 font-medium">Dashboard Teller Transaksional • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                {stats?.pendingPayments && stats.pendingPayments > 0 ? (
                    <Link to="/dashboard/finance/payments/verify" className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-200 animate-pulse">
                        <AlertCircle size={18} />
                        <span className="text-sm font-bold">{stats.pendingPayments} Pembayaran Menunggu Verifikasi</span>
                    </Link>
                ) : null}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label="Pemasukan Hari Ini" 
                    value={formatCurrency(stats?.income || 0)} 
                    icon={<DollarSign size={24} />} 
                    color="emerald" 
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Pengeluaran Hari Ini" 
                    value={formatCurrency(stats?.expense || 0)} 
                    icon={<TrendingDown size={24} />} 
                    color="rose" 
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Saldo Tabungan Tersedia" 
                    value={formatCurrency(stats?.poolBalance || 0)} 
                    icon={<Wallet size={24} />} 
                    color="blue" 
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Verifikasi Pending" 
                    value={String(stats?.pendingPayments || 0)} 
                    icon={<ShieldCheck size={24} />} 
                    color="amber" 
                    isLoading={isLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <CardGlass className="lg:col-span-2 p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <LayoutDashboard className="text-slate-400" size={22} />
                        Aksi Cepat Transaksi
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {actions.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <Link 
                                    key={i} 
                                    to={action.path} 
                                    className="flex flex-col items-center p-6 bg-white/50 rounded-3xl border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                                >
                                    <div className={clsx("p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300", action.bg, action.color)}>
                                        <Icon size={28} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 text-center">{action.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </CardGlass>

                {/* Helpful Info / Summary Card */}
                <CardGlass className="p-8 flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-xl shadow-indigo-200">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Pusat Bantuan</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed">Gunakan menu di samping atau aksi cepat di kiri untuk mencatat setiap transaksi keuangan sekolah.</p>
                    </div>
                    <div className="mt-8 space-y-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">Tips Hari Ini</p>
                            <p className="text-sm font-medium">Jangan lupa verifikasi bukti transfer siswa secara berkala untuk menjaga akurasi data.</p>
                        </div>
                        <Link to="/dashboard/settings" className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm text-center block hover:bg-indigo-50 transition-colors">
                            Buka Pengaturan Akun
                        </Link>
                    </div>
                </CardGlass>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color, isLoading }: { label: string; value: string; icon: React.ReactNode; color: string; isLoading: boolean }) => {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <CardGlass className={clsx("p-6 border-l-4", colors[color])}>
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                <div className={clsx("p-2 rounded-lg", colors[color].split(' ')[0])}>
                    {icon}
                </div>
            </div>
            {isLoading ? (
                <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg"></div>
            ) : (
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
            )}
        </CardGlass>
    );
};

export default DashboardHome;
