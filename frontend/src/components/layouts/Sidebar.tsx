import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Calendar, FileText,
    Settings, LogOut, Bell, Menu, X, GraduationCap,
    DollarSign, AlertTriangle, MessageSquare, CreditCard, Mail, Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { logout, user } = useAuth();

    // Define menus based on roles
    const getMenus = () => {
        const common = [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        ];

        const admin = [
            { icon: Users, label: 'Manajemen User', path: '/dashboard/users' },
            { icon: BookOpen, label: 'Akademik', path: '/dashboard/academic' },
            { icon: CreditCard, label: 'Keuangan', path: '/dashboard/finance' },
            { icon: AlertTriangle, label: 'BK', path: '/dashboard/bk' },
            { icon: Bell, label: 'Notifikasi', path: '/dashboard/notifications' },
            { icon: Send, label: 'Kelola Notifikasi', path: '/dashboard/admin/notifications' },
            { icon: Mail, label: 'Pesan Masuk', path: '/dashboard/admin/contacts' },
            { icon: Users, label: 'Data PPDB', path: '/dashboard/admin/ppdb' },
            { icon: GraduationCap, label: 'Data Alumni', path: '/dashboard/admin/alumni' },
            { icon: Users, label: 'Dewan Asatidz', path: '/dashboard/admin/teachers' },
            { icon: FileText, label: 'Pusat Unduhan', path: '/dashboard/admin/downloads' },
            { icon: AlertTriangle, label: 'Laporan BK', path: '/dashboard/admin/bk' },
        ];

        const teacher = [
            { icon: Calendar, label: 'Jadwal Mengajar', path: '/dashboard/teacher/schedule' },
            { icon: Users, label: 'Data Siswa', path: '/dashboard/teacher/students' },
            { icon: FileText, label: 'Input Nilai', path: '/dashboard/teacher/grades' },
            { icon: BookOpen, label: 'E-Learning', path: '/dashboard/elearning' },
            { icon: AlertTriangle, label: 'Lapor BK', path: '/dashboard/teacher/bk-report' },
        ];

        const student = [
            { icon: Calendar, label: 'Jadwal Pelajaran', path: '/dashboard/student/schedule' },
            { icon: GraduationCap, label: 'Nilai Akademik', path: '/dashboard/student/grades' },
            { icon: BookOpen, label: 'E-Learning', path: '/dashboard/student/elearning' },
            { icon: AlertTriangle, label: 'Catatan BK', path: '/dashboard/student/bk' },
            { icon: CreditCard, label: 'Tagihan', path: '/dashboard/bills' },
        ];

        const parent = [
            { icon: Users, label: 'Data Anak', path: '/dashboard/children' },
            { icon: CreditCard, label: 'Tagihan', path: '/dashboard/bills' },
            { icon: GraduationCap, label: 'Laporan Nilai', path: '/dashboard/grades' },
        ];

        // Role ID mapping: 1=Super Admin, 2=Admin MTS, 3=Admin MA, 4=Guru, 5=Wali Kelas, 6=Siswa, 7=Orang Tua
        switch (user?.role_id) {
            case 1: // Super Admin
            case 2: // Admin MTS
            case 3: // Admin MA
                return [...common, ...admin];
            case 4: // Guru
            case 5: // Wali Kelas
                return [...common, ...teacher];
            case 6: // Siswa
                return [...common, ...student];
            case 7: // Orang Tua
                return [...common, ...parent];
            default:
                return common;
        }
    };

    const menuItems = [...getMenus(), { icon: Settings, label: 'Pengaturan', path: '/dashboard/settings' }];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex flex-col shadow-xl shadow-slate-200/50",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 flex items-center justify-between border-b border-slate-200">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-500">SIS PPI 100</h1>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => {
                                    if (window.innerWidth < 1024) onClose();
                                }}
                                className={clsx(
                                    'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                                    isActive
                                        ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                )}
                            >
                                <Icon size={20} className={clsx(isActive ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600')} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <div className="mb-4 px-4">
                        <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role_id === 1 ? 'Super Admin' : user?.role_id === 4 ? 'Guru' : user?.role_id === 6 ? 'Siswa' : 'User'}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors duration-200"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
