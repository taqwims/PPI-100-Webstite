import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Tag, Table2, ClipboardList, BarChart2, LucideIcon, Heart, MessageCircle, Upload, Package, ShieldCheck,
    LayoutDashboard, Users, BookOpen, AlertTriangle, Bell, Send, Mail, GraduationCap, FileText, CreditCard,
    Activity, Inbox, Wallet, Calendar, Settings, PieChart, X, LogOut, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useFeatureStore } from '../../store/featureStore';
import clsx from 'clsx';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MenuItem {
    icon: LucideIcon;
    label: string;
    path: string;
    feature?: string; // Feature flag key — item hidden if feature is disabled
}

interface MenuGroup {
    title?: string; // undefined = no header (e.g. Dashboard)
    items: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { logout, user } = useAuth();
    const { academicYears, selectedYear, setSelectedYear } = useAcademicYear();
    const isEnabled = useFeatureStore((s) => s.isEnabled);
    const school = useFeatureStore((s) => s.school);

    const getMenuGroups = (): MenuGroup[] => {
        // ── Common (always first) ──
        const dashboardGroup: MenuGroup = {
            items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }]
        };

        // ── Admin groups ──
        const adminManagement: MenuGroup = {
            title: 'Manajemen',
            items: [
                { icon: Users, label: 'Manajemen User', path: '/dashboard/users' },
                { icon: Upload, label: 'Bulk Import Akun', path: '/dashboard/admin/bulk-import' },
                { icon: BookOpen, label: 'Akademik', path: '/dashboard/academic' },
                { icon: AlertTriangle, label: 'BK', path: '/dashboard/bk', feature: 'bk' },
                { icon: Package, label: 'Aset Sekolah', path: '/dashboard/admin/assets', feature: 'assets' },
                { icon: Building2, label: 'Pengaturan Sekolah', path: '/dashboard/admin/school-settings' },
            ]
        };
        const adminContent: MenuGroup = {
            title: 'Konten & Komunikasi',
            items: [
                { icon: Bell, label: 'Notifikasi', path: '/dashboard/notifications' },
                { icon: Send, label: 'Kelola Notifikasi', path: '/dashboard/admin/notifications' },
                { icon: Mail, label: 'Pesan Masuk', path: '/dashboard/admin/contacts' },
            ]
        };
        const adminData: MenuGroup = {
            title: 'Data Publik',
            items: [
                { icon: Users, label: 'Data PPDB', path: '/dashboard/admin/ppdb', feature: 'ppdb' },
                { icon: GraduationCap, label: 'Data Alumni', path: '/dashboard/admin/alumni', feature: 'public_website' },
                { icon: Users, label: 'Dewan Asatidz', path: '/dashboard/admin/teachers', feature: 'public_website' },
                { icon: FileText, label: 'Pusat Unduhan', path: '/dashboard/admin/downloads', feature: 'public_website' },
                { icon: AlertTriangle, label: 'Laporan BK', path: '/dashboard/admin/bk', feature: 'bk' },
            ]
        };
        const adminFinance: MenuGroup = {
            title: 'Keuangan',
            items: [
                { icon: CreditCard, label: 'SPP & Tagihan', path: '/dashboard/finance', feature: 'billing' },
                { icon: ShieldCheck, label: 'Verifikasi Pembayaran', path: '/dashboard/finance/payments/verify', feature: 'billing' },
            ]
        };

        // ── Bendahara groups ──
        const finTransaksi: MenuGroup = {
            title: 'Transaksi',
            items: [
                { icon: CreditCard, label: 'SPP & Tagihan', path: '/dashboard/finance', feature: 'billing' },
                { icon: ShieldCheck, label: 'Verifikasi Pembayaran', path: '/dashboard/finance/payments/verify', feature: 'billing' },
                { icon: Activity, label: 'Kegiatan Siswa', path: '/dashboard/finance/activities', feature: 'activities' },
                { icon: Users, label: 'Tanggungan Siswa', path: '/dashboard/finance/student-obligations', feature: 'student_obligations' },
                { icon: Send, label: 'Surat Tagihan', path: '/dashboard/finance/student-bill-summary', feature: 'billing' },
                { icon: Inbox, label: 'Buku Kas Umum', path: '/dashboard/finance/cash-ledger', feature: 'cash_ledger' },
                { icon: Activity, label: 'Infaq Harian', path: '/dashboard/finance/daily-infaq', feature: 'infaq' },
                { icon: FileText, label: 'Penggajian', path: '/dashboard/finance/payroll', feature: 'payroll' },
                { icon: AlertTriangle, label: 'Catatan Hutang', path: '/dashboard/finance/debts', feature: 'external_debts' },
            ]
        };
        const finAnggaran: MenuGroup = {
            title: 'Anggaran & Analisis',
            items: [
                { icon: ClipboardList, label: 'RAB / RKAS', path: '/dashboard/finance/rkas', feature: 'rkas' },
                { icon: BarChart2, label: 'Dashboard Eksekutif', path: '/dashboard/finance/executive-dashboard' },
            ]
        };
        const finPengaturan: MenuGroup = {
            title: 'Pengaturan Keuangan',
            items: [
                { icon: Tag, label: 'Kode Transaksi', path: '/dashboard/finance/transaction-codes' },
                { icon: CreditCard, label: 'Jenis Pembayaran', path: '/dashboard/finance/payment-types', feature: 'student_obligations' },
                { icon: Heart, label: 'Jenis Infaq', path: '/dashboard/finance/infaq-types', feature: 'infaq' },
                { icon: MessageCircle, label: 'Template WA', path: '/dashboard/finance/wa-templates', feature: 'wa_gateway' },
                { icon: Wallet, label: 'Kelola Tabungan', path: '/dashboard/finance/savings', feature: 'savings' },
                { icon: Calendar, label: 'Tahun Ajaran', path: '/dashboard/finance/academic-years' },
                { icon: Settings, label: 'Kuitansi & TTD', path: '/dashboard/finance/invoice-config' },
                { icon: FileText, label: 'Riwayat Kuitansi', path: '/dashboard/finance/invoices' },
                { icon: FileText, label: 'Laporan', path: '/dashboard/finance/reports' },
                { icon: Building2, label: 'Rekening Bank', path: '/dashboard/finance/bank-accounts' },
            ]
        };

        // ── Teacher ──
        const teacherGroup: MenuGroup = {
            title: 'Pengajaran',
            items: [
                { icon: Calendar, label: 'Jadwal Mengajar', path: '/dashboard/teacher/schedule' },
                { icon: Users, label: 'Data Siswa', path: '/dashboard/teacher/students' },
                { icon: FileText, label: 'Input Nilai', path: '/dashboard/teacher/grades' },
                { icon: BookOpen, label: 'E-Learning', path: '/dashboard/elearning', feature: 'elearning' },
                { icon: AlertTriangle, label: 'Lapor BK', path: '/dashboard/teacher/bk-report', feature: 'bk' },
                { icon: FileText, label: 'Riwayat Kuitansi', path: '/dashboard/finance/invoices' },
                { icon: Wallet, label: 'Gajian', path: '/dashboard/finance/payroll', feature: 'payroll' },
            ]
        };

        // ── Student ──
        const studentGroup: MenuGroup = {
            title: 'Akademik & Keuangan',
            items: [
                { icon: Calendar, label: 'Jadwal Pelajaran', path: '/dashboard/student/schedule' },
                { icon: GraduationCap, label: 'Nilai Akademik', path: '/dashboard/student/grades' },
                { icon: BookOpen, label: 'E-Learning', path: '/dashboard/student/elearning', feature: 'elearning' },
                { icon: AlertTriangle, label: 'Catatan BK', path: '/dashboard/student/bk', feature: 'bk' },
                { icon: CreditCard, label: 'Tagihan', path: '/dashboard/bills', feature: 'billing' },
                { icon: FileText, label: 'Riwayat Kuitansi', path: '/dashboard/finance/invoices' },
                { icon: Wallet, label: 'Tabungan', path: '/dashboard/student/savings', feature: 'savings' },
            ]
        };

        // ── Parent ──
        const parentGroup: MenuGroup = {
            title: 'Anak Saya',
            items: [
                { icon: Users, label: 'Data Anak', path: '/dashboard/children' },
                { icon: CreditCard, label: 'Tagihan', path: '/dashboard/bills', feature: 'billing' },
                { icon: FileText, label: 'Riwayat Kuitansi', path: '/dashboard/finance/invoices' },
                { icon: Wallet, label: 'Tabungan Anak', path: '/dashboard/parent/savings', feature: 'savings' },
                { icon: GraduationCap, label: 'Laporan Nilai', path: '/dashboard/grades' },
            ]
        };

        // ── Principal ──
        const principalOverview: MenuGroup = {
            title: 'Overview',
            items: [
                { icon: PieChart, label: 'Rekap Finansial', path: '/dashboard/principal/finance-summary' },
                { icon: BarChart2, label: 'Dashboard Eksekutif', path: '/dashboard/finance/executive-dashboard' },
            ]
        };
        const principalDetail: MenuGroup = {
            title: 'Detail Keuangan',
            items: [
                { icon: Wallet, label: 'Tabungan', path: '/dashboard/finance/savings', feature: 'savings' },
                { icon: Inbox, label: 'Kas Umum', path: '/dashboard/finance/cash-ledger', feature: 'cash_ledger' },
                { icon: ClipboardList, label: 'RAB / RKAS', path: '/dashboard/finance/rkas', feature: 'rkas' },
                { icon: Table2, label: 'Transaksi Global', path: '/dashboard/finance/global-transactions' },
                { icon: FileText, label: 'Laporan', path: '/dashboard/finance/reports' },
            ]
        };

        // ── Teller ──
        const tellerTabungan: MenuGroup = {
            title: 'Tabungan',
            items: [{ icon: Wallet, label: 'Kelola Tabungan', path: '/dashboard/finance/savings' }]
        };
        const tellerInfaq: MenuGroup = {
            title: 'Infaq',
            items: [
                { icon: Activity, label: 'Infaq Harian', path: '/dashboard/finance/daily-infaq' },
                { icon: Inbox, label: 'Kas Infaq', path: '/dashboard/finance/cash-ledger' },
            ]
        };

        // Role ID mapping: 1=Super Admin, 2=Admin MTS, 3=Admin MA, 4=Guru, 5=Wali Kelas, 6=Siswa, 7=Orang Tua, 8=Pimpinan, 9=Bendahara Umum, 10=Teller Tabungan, 11=Teller Infaq
        switch (user?.role_id) {
            case 1: // Super Admin
                return [dashboardGroup, adminManagement, adminContent, adminData, finTransaksi, finAnggaran, finPengaturan];
            case 2: // Admin MTS
            case 3: // Admin MA
                return [dashboardGroup, adminManagement, adminContent, adminData, adminFinance];
            case 4: // Guru
            case 5: // Wali Kelas
                return [dashboardGroup, teacherGroup];
            case 6: // Siswa
                return [dashboardGroup, studentGroup];
            case 7: // Orang Tua
                return [dashboardGroup, parentGroup];
            case 8: // Pimpinan
                return [dashboardGroup, principalOverview, principalDetail];
            case 9: // Bendahara Umum
                return [dashboardGroup, finTransaksi, finAnggaran, finPengaturan];
            case 10: // Teller Tabungan
                return [dashboardGroup, tellerTabungan];
            case 11: // Teller Infaq
                return [dashboardGroup, tellerInfaq];
            default:
                return [dashboardGroup];
        }
    };

    const getRoleName = (roleId?: number) => {
        const roles: Record<number, string> = {
            1: 'Super Admin', 2: 'Admin MTS', 3: 'Admin MA', 4: 'Guru',
            5: 'Wali Kelas', 6: 'Siswa', 7: 'Orang Tua', 8: 'Pimpinan',
            9: 'Bendahara Umum', 10: 'Teller Tabungan', 11: 'Teller Infaq'
        };
        return roleId && roles[roleId] ? roles[roleId] : 'User';
    };

    const menuGroups = getMenuGroups();

    // Settings always at the end
    const settingsItem: MenuItem = { icon: Settings, label: 'Pengaturan', path: '/dashboard/settings' };

    // Track unique paths to avoid duplicates (e.g for Super Admin)
    const seenPaths = new Set<string>();

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
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-500">{school.name || 'SDIT Management'}</h1>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {/* Global Academic Year Selector */}
                    {[1, 8, 9].includes(user?.role_id || 0) && academicYears.length > 0 && (
                        <div className="mb-3 px-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 block mb-1">Tahun Ajaran</label>
                            <select
                                value={selectedYear?.id || ''}
                                onChange={(e) => {
                                    const yr = academicYears.find(y => y.id === Number(e.target.value));
                                    setSelectedYear(yr || null);
                                }}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-green-200 bg-green-50 text-green-800 font-medium focus:ring-2 focus:ring-green-400"
                            >
                                {academicYears.map(y => (
                                    <option key={y.id} value={y.id}>{y.name} {y.is_active ? '✓' : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {menuGroups.map((group, gi) => {
                        const groupItems = group.items.filter(item => {
                            // Skip items for disabled features
                            if (item.feature && !isEnabled(item.feature)) return false;
                            if (seenPaths.has(item.path)) return false;
                            seenPaths.add(item.path);
                            return true;
                        });
                        if (groupItems.length === 0) return null;

                        return (
                            <div key={gi}>
                                {group.title && (
                                    <div className={clsx("px-3 pt-4 pb-1.5", gi > 0 && "mt-2 border-t border-slate-100")}>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.title}</span>
                                    </div>
                                )}
                                {groupItems.map(item => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname.startsWith(item.path) && (item.path !== '/dashboard' || location.pathname === '/dashboard');
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                            className={clsx(
                                                'flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group',
                                                isActive
                                                    ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm'
                                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                            )}
                                        >
                                            <Icon size={18} className={clsx(isActive ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600')} />
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Settings */}
                    {!seenPaths.has(settingsItem.path) && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                            <Link
                                to={settingsItem.path}
                                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                className={clsx(
                                    'flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group',
                                    location.pathname.startsWith(settingsItem.path)
                                        ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                )}
                            >
                                <Settings size={18} className={clsx(location.pathname.startsWith(settingsItem.path) ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600')} />
                                <span className="text-sm font-medium">{settingsItem.label}</span>
                            </Link>
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <div className="mb-4 px-4">
                        <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{getRoleName(user?.role_id)}</p>
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
