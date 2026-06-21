import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Send, User, Bell, History, CheckCircle, Clock, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import clsx from 'clsx';

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

interface Class {
    id: number;
    name: string;
}

interface Student {
    id: string;
    user_id: string;
    class_id?: number;
    class?: { id: number; name: string };
    parent?: { user_id: string };
}

interface AdminNotificationManagementProps {
    isSubcomponent?: boolean;
}

const AdminNotificationManagement: React.FC<AdminNotificationManagementProps> = ({ isSubcomponent = false }) => {
    const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
    const [recipientType, setRecipientType] = useState<'single' | 'class'>('single');
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('Info');
    const [isSendingBulk, setIsSendingBulk] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users/');
            return res.data;
        },
    });

    const { data: classes = [] } = useQuery<Class[]>({
        queryKey: ['classes'],
        queryFn: async () => (await api.get('/academic/classes')).data || [],
    });

    const { data: students = [] } = useQuery<Student[]>({
        queryKey: ['students'],
        queryFn: async () => (await api.get('/students')).data || [],
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
            toast.success('Notifikasi berhasil dikirim!');
            setTitle('');
            setMessage('');
            setSelectedUser('');
            setType('Info');
            queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
        },
        onError: (err: any) => {
            toast.error('Gagal mengirim notifikasi: ' + err.response?.data?.error);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/notifications/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
            toast.success('Notifikasi berhasil dihapus');
        },
    });

    const handleDelete = (id: string) => {
        setConfirmDeleteId(id);
    };

    const handleSelectAllClasses = () => {
        if (selectedClassIds.length === classes.length) {
            setSelectedClassIds([]);
        } else {
            setSelectedClassIds(classes.map(c => c.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            toast.error('Mohon isi judul dan pesan notifikasi');
            return;
        }

        if (recipientType === 'single') {
            if (!selectedUser) {
                toast.error('Mohon pilih pengguna penerima');
                return;
            }
            sendNotificationMutation.mutate({
                user_id: selectedUser,
                title,
                message,
                type
            });
        } else {
            if (selectedClassIds.length === 0) {
                toast.error('Mohon pilih minimal satu kelas');
                return;
            }

            const targetUserIds = new Set<string>();
            students.forEach(s => {
                const sClassId = s.class?.id || s.class_id;
                if (sClassId && selectedClassIds.includes(sClassId)) {
                    if (s.user_id) targetUserIds.add(s.user_id);
                    if (s.parent?.user_id) targetUserIds.add(s.parent.user_id);
                }
            });

            if (targetUserIds.size === 0) {
                toast.error('Tidak ada siswa atau orang tua di kelas yang dipilih');
                return;
            }

            setIsSendingBulk(true);
            let successCount = 0;
            let failCount = 0;

            const uids = Array.from(targetUserIds);
            const promises = uids.map(async (uid) => {
                try {
                    await api.post('/notifications/', {
                        user_id: uid,
                        title,
                        message,
                        type
                    });
                    successCount++;
                } catch {
                    failCount++;
                }
            });

            await Promise.all(promises);
            setIsSendingBulk(false);
            
            toast.success(`Berhasil mengirim ${successCount} notifikasi. Gagal: ${failCount}`);
            setTitle('');
            setMessage('');
            setSelectedClassIds([]);
            queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
        }
    };

    return (
        <div className={clsx("space-y-6", !isSubcomponent && "p-6")}>
            {!isSubcomponent && (
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Manajemen Notifikasi</h1>
                        <p className="text-slate-600">Kirim dan pantau notifikasi pengguna</p>
                    </div>
                </div>
            )}

            <div className="flex space-x-4 border-b border-slate-200 pb-4">
                <button
                    onClick={() => setActiveTab('send')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'send' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <Send size={18} /> Kirim Notifikasi
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <History size={18} /> Riwayat
                </button>
            </div>

            {activeTab === 'send' ? (
                <CardGlass className={clsx("p-6 mx-auto w-full", isSubcomponent ? "max-w-4xl" : "max-w-2xl")}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Metode Pengiriman</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition ${recipientType === 'single' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    <input
                                        type="radio"
                                        name="recipientType"
                                        checked={recipientType === 'single'}
                                        onChange={() => setRecipientType('single')}
                                        className="sr-only"
                                    />
                                    <User size={16} /> Pengguna Tunggal
                                </label>
                                <label className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition ${recipientType === 'class' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    <input
                                        type="radio"
                                        name="recipientType"
                                        checked={recipientType === 'class'}
                                        onChange={() => setRecipientType('class')}
                                        className="sr-only"
                                    />
                                    <Send size={16} /> Bulk Per Kelas
                                </label>
                            </div>
                        </div>

                        {recipientType === 'single' ? (
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
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-700 ml-1">Pilih Kelas</label>
                                    <button
                                        type="button"
                                        onClick={handleSelectAllClasses}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        {selectedClassIds.length === classes.length ? 'Hapus Semua' : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-white/50">
                                    {classes.map(c => {
                                        const isChecked = selectedClassIds.includes(c.id);
                                        return (
                                            <label key={c.id} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition text-sm ${isChecked ? 'border-blue-500 bg-blue-50/50 text-blue-800' : 'border-slate-100 hover:bg-slate-50 text-slate-700'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedClassIds([...selectedClassIds, c.id]);
                                                        } else {
                                                            setSelectedClassIds(selectedClassIds.filter(id => id !== c.id));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                {c.name}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                            <ButtonGlass type="submit" disabled={isSendingBulk || sendNotificationMutation.isPending} className="flex items-center gap-2 px-8">
                                {(isSendingBulk || sendNotificationMutation.isPending) ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : <Send size={18} />}
                                {isSendingBulk ? 'Mengirim...' : 'Kirim Notifikasi'}
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
            <ConfirmDialog
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (confirmDeleteId) {
                        deleteMutation.mutate(confirmDeleteId);
                        setConfirmDeleteId(null);
                    }
                }}
                title="Hapus Notifikasi"
                message="Apakah Anda yakin ingin menghapus notifikasi ini? Tindakan ini tidak dapat dibatalkan."
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

export default AdminNotificationManagement;
