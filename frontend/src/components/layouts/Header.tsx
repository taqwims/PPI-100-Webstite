import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, Check, Info, AlertTriangle, FileText, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface HeaderProps {
    onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications/');
            return res.data;
        },
        // Refetch every minute to keep count updated
        refetchInterval: 60000,
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => api.put('/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins}m lalu`;
        if (diffHours < 24) return `${diffHours}j lalu`;
        if (diffDays < 7) return `${diffDays}h lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    const getIcon = (type: string) => {
        const t = type?.toLowerCase();
        switch (t) {
            case 'bill':
                return <CreditCard className="text-amber-500" size={16} />;
            case 'bk':
                return <AlertTriangle className="text-rose-500" size={16} />;
            case 'task':
                return <FileText className="text-blue-500" size={16} />;
            default:
                return <Info className="text-slate-400" size={16} />;
        }
    };

    return (
        <header className="sticky top-0 z-30 px-4 py-4 lg:px-8">
            <div className="glass-panel rounded-2xl px-4 py-3 flex justify-between items-center sm:px-6">
                {/* Mobile Menu Button (Visible only on small screens) */}
                <button 
                    onClick={onMenuClick}
                    className="lg:hidden text-slate-500 hover:text-slate-900 mr-2"
                >
                    <Menu size={24} />
                </button>

                {/* Search Bar */}
                <div className="hidden md:flex items-center gap-3 flex-1 max-w-md ml-4">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-white/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 ml-auto">
                    {/* Notification Dropdown Container */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100/50"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Header */}
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-sm">Notifikasi</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Tidak ada pesan baru'}
                                        </p>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={() => markAllAsReadMutation.mutate()}
                                            className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                                        >
                                            <Check size={14} /> Tandai dibaca semua
                                        </button>
                                    )}
                                </div>

                                {/* List */}
                                <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                                    {notifications && notifications.length > 0 ? (
                                        notifications.slice(0, 5).map((notif: any) => (
                                            <div
                                                key={notif.id}
                                                className={`p-4 hover:bg-slate-50/60 transition-colors flex items-start gap-3 cursor-pointer ${
                                                    !notif.is_read ? 'bg-green-50/10' : ''
                                                }`}
                                                onClick={() => {
                                                    if (!notif.is_read) {
                                                        markAsReadMutation.mutate(notif.id);
                                                    }
                                                }}
                                            >
                                                <div className="p-2 rounded-xl bg-slate-100 mt-0.5 shrink-0">
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`text-xs font-semibold truncate ${
                                                            !notif.is_read ? 'text-slate-900' : 'text-slate-600'
                                                        }`}>
                                                            {notif.title}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {formatRelativeTime(notif.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                                                        !notif.is_read ? 'text-slate-800' : 'text-slate-500'
                                                    }`}>
                                                        {notif.message}
                                                    </p>
                                                </div>
                                                {!notif.is_read && (
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0 mt-2"></span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center text-xs text-slate-400">
                                            Belum ada notifikasi baru
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        navigate('/dashboard/notifications');
                                    }}
                                    className="w-full py-3 border-t border-slate-100 text-center text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    Lihat semua notifikasi
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500">{user?.role_id === 1 ? 'Super Admin' : 'User'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/20">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
