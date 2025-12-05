import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Calendar,
    CreditCard,
    LogOut,
    AlertTriangle,
    Bell
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const SidebarGlass: React.FC = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const roleId = user?.role_id || 0;

    // Define links based on role
    let links = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ];

    if (roleId <= 3) { // Admin
        links = [
            ...links,
            { icon: Users, label: 'Siswa', path: '/dashboard/students' },
            { icon: BookOpen, label: 'Akademik', path: '/dashboard/academic' },
            { icon: BookOpen, label: 'E-Learning', path: '/dashboard/elearning' },
            { icon: Calendar, label: 'Absensi', path: '/dashboard/attendance' },
            { icon: CreditCard, label: 'Keuangan', path: '/dashboard/finance' },
            { icon: AlertTriangle, label: 'BK', path: '/dashboard/bk' },
            { icon: Bell, label: 'Notifikasi', path: '/dashboard/notifications' },
            { icon: Users, label: 'User Mgmt', path: '/dashboard/users' },
            { icon: Users, label: 'PPDB', path: '/dashboard/ppdb' },
            { icon: BookOpen, label: 'Konten Publik', path: '/dashboard/public-content' },
            { icon: Bell, label: 'Kirim Notif', path: '/dashboard/admin/notifications' },
        ];
    } else if (roleId === 4) { // Guru
        links = [
            ...links,
            { icon: Calendar, label: 'Jadwal Mengajar', path: '/dashboard/schedule' },
            { icon: BookOpen, label: 'Penilaian', path: '/dashboard/grades' },
            // { icon: Calendar, label: 'Absensi', path: '/dashboard/attendance' }, // Linked from schedule
        ];
    } else if (roleId === 5) { // Wali Kelas
        links = [
            ...links,
            { icon: Calendar, label: 'Jadwal Mengajar', path: '/dashboard/schedule' },
            { icon: BookOpen, label: 'Penilaian', path: '/dashboard/grades' },
            { icon: Users, label: 'Kelas Wali', path: '/dashboard/homeroom' },
        ];
    } else if (roleId === 6) { // Siswa
        links = [
            ...links,
            { icon: Calendar, label: 'Jadwal', path: '/dashboard/student/schedule' },
            { icon: BookOpen, label: 'E-Learning', path: '/dashboard/student/elearning' },
            { icon: BookOpen, label: 'Nilai', path: '/dashboard/student/grades' },
            { icon: CreditCard, label: 'Tagihan', path: '/dashboard/bills' },
            { icon: AlertTriangle, label: 'Laporan BK', path: '/dashboard/bk-report' },
        ];
    } else if (roleId === 7) { // Orang Tua
        links = [
            ...links,
            { icon: Users, label: 'Anak Saya', path: '/dashboard/children' },
        ];
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-72 p-6 hidden lg:block z-40">
            <div className="h-full glass-panel rounded-3xl flex flex-col overflow-hidden">
                {/* Logo */}
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-slate-900 font-bold text-xl shadow-lg shadow-green-500/30">
                        <img src="/logo.jpeg" alt="PPI" className="w-6 h-6 object-contain" onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerText = 'P';
                        }} />
                    </div>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">PPI 100</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname === link.path;

                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                        ? 'bg-gradient-to-r from-green-600/90 to-emerald-600/90 text-slate-900 shadow-lg shadow-green-500/20'
                                        : 'text-slate-500 hover:bg-green-50 hover:text-green-700'
                                        }`}
                                >
                                    <Icon size={20} className={`transition-colors ${isActive ? 'text-slate-900' : 'group-hover:text-green-600'}`} />
                                    <span className="font-medium">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default SidebarGlass;
