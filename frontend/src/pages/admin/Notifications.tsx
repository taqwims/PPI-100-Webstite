import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Bell, Check, Info, AlertTriangle, FileText, CreditCard, Send, Calendar } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AdminNotificationManagement from './AdminNotificationManagement';
import StudentBillSummary from '../finance/StudentBillSummary';
import WAScheduler from '../finance/WAScheduler';

const Notifications: React.FC = () => {
    const { user } = useAuth();
    const canManage = [1, 2, 3, 11].includes(user?.role_id || 0);
    const queryClient = useQueryClient();

    // Tabs state
    const [activeTab, setActiveTab] = useState<'inbox' | 'manage' | 'bills' | 'scheduler'>('inbox');

    // --- Inbox Queries ---
    const { data: userNotifications, isLoading: isLoadingInbox } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications/');
            return res.data;
        },
    });

    // --- Inbox Mutations ---
    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Pesan ditandai dibaca');
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => api.put('/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Semua notifikasi ditandai dibaca');
        },
    });

    const getIcon = (typeString: string) => {
        const t = typeString?.toLowerCase();
        switch (t) {
            case 'bill': 
                return <CreditCard className="text-amber-500" size={20} />;
            case 'payment': 
                return <CreditCard className="text-emerald-500" size={20} />;
            case 'bk': 
                return <AlertTriangle className="text-rose-500" size={20} />;
            case 'task': 
                return <FileText className="text-blue-500" size={20} />;
            default: 
                return <Info className="text-slate-400" size={20} />;
        }
    };

    const hasUnread = userNotifications?.some((n: any) => !n.is_read) || false;

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="text-yellow-500" /> Notifikasi
                    </h1>
                    <p className="text-slate-500">Pemberitahuan dan kelola notifikasi sistem</p>
                </div>
            </div>

            {/* Combined Tabs for Management Roles */}
            {canManage && (
                <div className="flex space-x-2 border-b border-slate-200 pb-2 flex-wrap gap-y-2">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                            activeTab === 'inbox' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <Bell size={16} /> Kotak Masuk
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                            activeTab === 'manage' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <Send size={16} /> Kelola Notifikasi
                    </button>
                    <button
                        onClick={() => setActiveTab('bills')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                            activeTab === 'bills' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <FileText size={16} /> Surat Tagihan
                    </button>
                    <button
                        onClick={() => setActiveTab('scheduler')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                            activeTab === 'scheduler' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <Calendar size={16} /> Jadwal Pengingat WA
                    </button>
                </div>
            )}

            {/* Tab Contents */}
            {(!canManage || activeTab === 'inbox') && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                        <span className="text-sm font-semibold text-slate-700">Daftar Pemberitahuan Anda</span>
                        {hasUnread && (
                            <ButtonGlass
                                variant="secondary"
                                onClick={() => markAllAsReadMutation.mutate()}
                                className="flex items-center gap-2 text-green-600 border border-green-200/50 hover:bg-green-50 text-xs px-3 py-1.5"
                            >
                                <Check size={14} /> Tandai dibaca semua
                            </ButtonGlass>
                        )}
                    </div>
                    {isLoadingInbox ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                        </div>
                    ) : userNotifications?.length === 0 ? (
                        <CardGlass className="p-8 text-center text-slate-400">
                            Tidak ada notifikasi saat ini.
                        </CardGlass>
                    ) : (
                        userNotifications?.map((notif: any) => (
                            <CardGlass
                                key={notif.id}
                                className={`p-4 flex items-start gap-4 transition-all ${notif.is_read ? 'opacity-65' : 'border-l-4 border-l-green-500'}`}
                            >
                                <div className="p-2 bg-white/5 rounded-full shrink-0">
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-semibold text-base ${notif.is_read ? 'text-slate-500' : 'text-slate-900'}`}>
                                            {notif.title}
                                        </h3>
                                        <span className="text-[11px] text-slate-400 shrink-0">
                                            {new Date(notif.created_at).toLocaleString('id-ID', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 mt-1 text-sm">{notif.message}</p>
                                </div>
                                {!notif.is_read && (
                                    <ButtonGlass
                                        variant="secondary"
                                        onClick={() => markAsReadMutation.mutate(notif.id)}
                                        title="Tandai sudah dibaca"
                                        className="shrink-0 p-1"
                                    >
                                        <Check size={14} />
                                    </ButtonGlass>
                                )}
                            </CardGlass>
                        ))
                    )}
                </div>
            )}

            {canManage && activeTab === 'manage' && (
                <AdminNotificationManagement isSubcomponent={true} />
            )}

            {canManage && activeTab === 'bills' && (
                <StudentBillSummary isSubcomponent={true} />
            )}

            {canManage && activeTab === 'scheduler' && (
                <WAScheduler isSubcomponent={true} />
            )}
        </div>
    );
};

export default Notifications;
