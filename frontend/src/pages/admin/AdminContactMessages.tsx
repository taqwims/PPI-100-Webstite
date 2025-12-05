import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { Mail, Clock, Trash2 } from 'lucide-react';

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
}

const AdminContactMessages: React.FC = () => {
    const queryClient = useQueryClient();
    const { data: messages, isLoading } = useQuery({
        queryKey: ['contact-messages'],
        queryFn: async () => {
            const res = await api.get('/admin/contacts');
            return res.data as ContactMessage[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/admin/contacts/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="text-purple-600" /> Pesan Masuk
                    </h1>
                    <p className="text-slate-600">Pesan dari formulir kontak website</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Tanggal</TableHeadGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>Email</TableHeadGlass>
                            <TableHeadGlass>Subjek</TableHeadGlass>
                            <TableHeadGlass>Pesan</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={6} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : messages?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={6} className="text-center py-8 text-slate-600">Belum ada pesan masuk.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            messages?.map((msg) => (
                                <TableRowGlass key={msg.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock size={14} />
                                            {new Date(msg.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="font-medium text-slate-900">{msg.name}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{msg.email}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-900">{msg.subject}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <p className="text-slate-600 line-clamp-2 hover:line-clamp-none transition-all cursor-pointer" title={msg.message}>
                                            {msg.message}
                                        </p>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <ButtonGlass
                                            variant="danger"
                                            onClick={() => handleDelete(msg.id)}
                                            className="py-1 px-3 text-xs"
                                        >
                                            <Trash2 size={14} />
                                        </ButtonGlass>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>
        </div>
    );
};

export default AdminContactMessages;
