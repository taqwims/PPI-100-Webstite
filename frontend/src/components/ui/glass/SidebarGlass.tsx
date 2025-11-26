import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Calendar,
    CreditCard,
    Settings,
    LogOut,
    AlertTriangle,
    Bell
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const SidebarGlass: React.FC = () => {
    const location = useLocation();
    const { logout } = useAuth();

    const links = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Siswa', path: '/dashboard/students' },
        { icon: BookOpen, label: 'Akademik', path: '/dashboard/academic' },
        { icon: BookOpen, label: 'E-Learning', path: '/dashboard/elearning' },
        { icon: Calendar, label: 'Absensi', path: '/dashboard/attendance' },
        { icon: CreditCard, label: 'Keuangan', path: '/dashboard/finance' },
        { icon: AlertTriangle, label: 'BK', path: '/dashboard/bk' },
        { icon: Bell, label: 'Notifikasi', path: '/dashboard/notifications' },
        { icon: Users, label: 'User Mgmt', path: '/dashboard/users' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-72 p-6 hidden lg:block z-40">
            <div className="h-full glass-panel rounded-3xl flex flex-col overflow-hidden">
                {/* Logo */}
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
                        P
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">PPI 100</span>
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
                                            ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-500/20'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon size={20} className={`transition-colors ${isActive ? 'text-white' : 'group-hover:text-purple-400'}`} />
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
