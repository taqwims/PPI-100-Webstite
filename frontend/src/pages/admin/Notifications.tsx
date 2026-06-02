import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Bell, Check, Info, AlertTriangle, FileText, CreditCard } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';

const Notifications: React.FC = () => {
    const queryClient = useQueryClient();

    // --- Data Fetching ---
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications/');
            return res.data;
        },
    });

    // --- Mutations ---
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

    const getIcon = (type: string) => {
        const t = type?.toLowerCase();
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

    if (isLoading) {
        return <div className="p-6 text-slate-900">Loading notifications...</div>;
    }

    const hasUnread = notifications?.some((n: any) => !n.is_read) || false;

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="text-yellow-400" /> Notifikasi
                    </h1>
                    <p className="text-slate-500">Pemberitahuan terbaru untuk Anda</p>
                </div>
                {hasUnread && (
                    <ButtonGlass
                        variant="secondary"
                        onClick={() => markAllAsReadMutation.mutate()}
                        className="flex items-center gap-2 text-green-600 border border-green-200/50 hover:bg-green-50"
                    >
                        <Check size={16} /> Tandai dibaca semua
                    </ButtonGlass>
                )}
            </div>

            <div className="space-y-4">
                {notifications?.length === 0 ? (
                    <CardGlass className="p-8 text-center text-slate-400">
                        Tidak ada notifikasi saat ini.
                    </CardGlass>
                ) : (
                    notifications?.map((notif: any) => (
                        <CardGlass
                            key={notif.id}
                            className={`p-4 flex items-start gap-4 transition-all ${notif.is_read ? 'opacity-65' : 'border-l-4 border-l-green-500'}`}
                        >
                            <div className="p-2 bg-white/5 rounded-full shrink-0">
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold text-lg ${notif.is_read ? 'text-slate-500' : 'text-slate-900'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-xs text-slate-400 shrink-0">
                                        {new Date(notif.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <p className="text-slate-600 mt-1">{notif.message}</p>
                            </div>
                            {!notif.is_read && (
                                <ButtonGlass
                                    variant="secondary"
                                    onClick={() => markAsReadMutation.mutate(notif.id)}
                                    title="Tandai sudah dibaca"
                                    className="shrink-0"
                                >
                                    <Check size={16} />
                                </ButtonGlass>
                            )}
                        </CardGlass>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
