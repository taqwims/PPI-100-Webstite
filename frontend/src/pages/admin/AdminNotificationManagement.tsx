import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Send, User, Bell, History, CheckCircle, Clock, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';

interface User {
    id: string;
    name: string;
    email: string;
    role_id: number;
}

interface Notification {
    id: string;
    user_id: string;
    user?: User;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const AdminNotificationManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
    const [selectedUser, setSelectedUser] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('Info');
    const queryClient = useQueryClient();

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users/');
            return res.data;
        },
    });

    const { data: notifications } = useQuery({
        queryKey: ['all_notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications/all');
            return res.data;
        },
        enabled: activeTab === 'history',
    });

    const sendNotificationMutation = useMutation({
        mutationFn: (data: { user_id: string, title: string, message: string, type: string }) =>
            api.post('/notifications/', data),
        onSuccess: () => {
            alert('Notifikasi berhasil dikirim!');
            setTitle('');
            setMessage('');
            setSelectedUser('');
            setType('Info');
            queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
        },
        onError: (err: any) => {
            alert('Gagal mengirim notifikasi: ' + err.response?.data?.error);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/notifications/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !title || !message) {
            alert('Mohon lengkapi semua field');
            return;
        }
        sendNotificationMutation.mutate({
            user_id: selectedUser,
            title,
            message,
            type
        });
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Notifikasi</h1>
                    <p className="text-slate-600">Kirim dan pantau notifikasi pengguna</p>
                </div>
            </div>

            <div className="flex space-x-4 border-b border-slate-200 pb-4">
                <button
                    onClick={() => setActiveTab('send')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'send' ? 'bg-blue-600 text-slate-900 shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <Send size={18} /> Kirim Notifikasi
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-slate-900 shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <History size={18} /> Riwayat
                </button>
            </div>

            {activeTab === 'send' ? (
                <CardGlass className="p-6 max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Penerima</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select
                                    className="w-full glass-input pl-10 text-slate-900 bg-white/50 border-slate-200 focus:border-purple-500"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="" className="bg-white">-- Pilih Pengguna --</option>
                                    {users?.map((u: User) => (
                                        <option key={u.id} value={u.id} className="bg-white">
                                            {u.name} ({u.role_id === 6 ? 'Siswa' : u.role_id === 4 ? 'Guru' : 'User'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <InputGlass
                            label="Judul Notifikasi"
                            placeholder="Contoh: Pengingat Pembayaran"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            icon={Bell}
                        />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Tipe</label>
                            <select
                                className="w-full glass-input text-slate-900 bg-white/50 border-slate-200 focus:border-purple-500"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="Info" className="bg-white">Info Umum</option>
                                <option value="Bill" className="bg-white">Tagihan</option>
                                <option value="Academic" className="bg-white">Akademik</option>
                                <option value="Warning" className="bg-white">Peringatan</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Pesan</label>
                            <textarea
                                className="w-full glass-input min-h-[120px] text-slate-900 p-3 bg-white/50 border-slate-200 focus:border-purple-500"
                                placeholder="Tulis pesan notifikasi di sini..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <ButtonGlass type="submit" className="flex items-center gap-2 px-8">
                                <Send size={18} /> Kirim Notifikasi
                            </ButtonGlass>
                        </div>
                    </form>
                </CardGlass>
            ) : (
                <CardGlass className="p-6">
                    <TableGlass>
                        <TableHeaderGlass>
                            <TableRowGlass>
                                <TableHeadGlass>Tanggal</TableHeadGlass>
                                <TableHeadGlass>Penerima</TableHeadGlass>
                                <TableHeadGlass>Judul</TableHeadGlass>
                                <TableHeadGlass>Pesan</TableHeadGlass>
                                <TableHeadGlass>Tipe</TableHeadGlass>
                                <TableHeadGlass>Status</TableHeadGlass>
                                <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                            </TableRowGlass>
                        </TableHeaderGlass>
                        <TableBodyGlass>
                            {notifications?.map((n: Notification) => (
                                <TableRowGlass key={n.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock size={14} />
                                            {new Date(n.created_at).toLocaleString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="font-medium text-slate-900">{n.user?.name || 'Unknown User'}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-900">{n.title}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600 text-sm truncate max-w-xs">{n.message}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${n.type === 'Warning' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {n.type}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {n.is_read ? (
                                            <span className="flex items-center gap-1 text-green-600 text-sm">
                                                <CheckCircle size={14} /> Dibaca
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-sm">Terkirim</span>
                                        )}
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <ButtonGlass
                                            variant="danger"
                                            onClick={() => handleDelete(n.id)}
                                            className="p-1"
                                        >
                                            <Trash2 size={14} />
                                        </ButtonGlass>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))}
                        </TableBodyGlass>
                    </TableGlass>
                </CardGlass>
            )}
        </div>
    );
};

export default AdminNotificationManagement;
