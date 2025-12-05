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

    const getIcon = (type: string) => {
        switch (type) {
            case 'Bill': return <CreditCard className="text-yellow-400" size={20} />;
            case 'BK': return <AlertTriangle className="text-red-400" size={20} />;
            case 'Task': return <FileText className="text-blue-400" size={20} />;
            default: return <Info className="text-gray-400" size={20} />;
        }
    };

    if (isLoading) {
        return <div className="p-6 text-white">Loading notifications...</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Bell className="text-yellow-400" /> Notifikasi
                    </h1>
                    <p className="text-gray-400">Pemberitahuan terbaru untuk Anda</p>
                </div>
            </div>

            <div className="space-y-4">
                {notifications?.length === 0 ? (
                    <CardGlass className="p-8 text-center text-gray-400">
                        Tidak ada notifikasi saat ini.
                    </CardGlass>
                ) : (
                    notifications?.map((notif: any) => (
                        <CardGlass
                            key={notif.id}
                            className={`p-4 flex items-start gap-4 transition-all ${notif.is_read ? 'opacity-60' : 'border-l-4 border-l-green-500'}`}
                        >
                            <div className="p-2 bg-white/5 rounded-full">
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold text-lg ${notif.is_read ? 'text-gray-300' : 'text-white'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                        {new Date(notif.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <p className="text-gray-300 mt-1">{notif.message}</p>
                            </div>
                            {!notif.is_read && (
                                <ButtonGlass
                                    variant="secondary"
                                    onClick={() => markAsReadMutation.mutate(notif.id)}
                                    title="Tandai sudah dibaca"
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
