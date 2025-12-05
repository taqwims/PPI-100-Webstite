import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle, XCircle, Search, Phone, School, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { useAuth } from '../../context/AuthContext';

interface PPDBRegistration {
    id: string;
    name: string;
    nisn: string;
    origin_school: string;
    parent_name: string;
    phone: string;
    status: string;
    created_at: string;
}

const AdminPPDB: React.FC = () => {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: registrations, isLoading } = useQuery({
        queryKey: ['ppdb_registrations', user?.unit_id],
        queryFn: async () => {
            const params = user?.role_id === 1 ? {} : { unit_id: user?.unit_id };
            const res = await api.get('/ppdb/', { params });
            return res.data;
        },
        enabled: !!user,
    });

    const updateStatusMutation = useMutation({
        mutationFn: (data: { id: string, status: string }) => api.put(`/ppdb/${data.id}/status`, { status: data.status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ppdb_registrations'] });
        },
    });

    const handleStatusUpdate = (id: string, status: string) => {
        if (confirm(`Apakah Anda yakin ingin mengubah status menjadi ${status}?`)) {
            updateStatusMutation.mutate({ id, status });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/ppdb/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ppdb_registrations'] });
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus data pendaftaran ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredRegistrations = registrations?.filter((reg: PPDBRegistration) =>
        reg.name.toLowerCase().includes(search.toLowerCase()) ||
        reg.nisn.includes(search)
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manajemen PPDB</h1>
                    <p className="text-gray-400">Kelola pendaftaran peserta didik baru</p>
                </div>
            </div>

            <CardGlass className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <InputGlass
                            placeholder="Cari nama atau NISN..."
                            icon={Search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Tanggal</TableHeadGlass>
                            <TableHeadGlass>Calon Siswa</TableHeadGlass>
                            <TableHeadGlass>Asal Sekolah</TableHeadGlass>
                            <TableHeadGlass>Orang Tua / Wali</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={6} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredRegistrations?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={6} className="text-center py-8">Tidak ada data pendaftaran</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredRegistrations?.map((reg: PPDBRegistration) => (
                                <TableRowGlass key={reg.id}>
                                    <TableCellGlass>
                                        <span className="text-gray-400 text-sm">
                                            {new Date(reg.created_at).toLocaleDateString('id-ID')}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{reg.name}</span>
                                            <span className="text-xs text-gray-400 font-mono">{reg.nisn}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <School size={14} />
                                            <span>{reg.origin_school}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex flex-col">
                                            <span className="text-white">{reg.parent_name}</span>
                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                <Phone size={10} /> {reg.phone}
                                            </div>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                            ${reg.status === 'Accepted' ? 'bg-green-500/20 text-green-400' :
                                                reg.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'}`}>
                                            {reg.status === 'Accepted' ? 'Diterima' :
                                                reg.status === 'Rejected' ? 'Ditolak' : 'Menunggu'}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {reg.status === 'Pending' && (
                                                <>
                                                    <ButtonGlass
                                                        variant="primary"
                                                        onClick={() => handleStatusUpdate(reg.id, 'Accepted')}
                                                        className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle size={14} /> Terima
                                                    </ButtonGlass>
                                                    <ButtonGlass
                                                        variant="danger"
                                                        onClick={() => handleStatusUpdate(reg.id, 'Rejected')}
                                                        className="py-1 px-3 text-xs"
                                                    >
                                                        <XCircle size={14} /> Tolak
                                                    </ButtonGlass>
                                                </>
                                            )}
                                            {reg.status !== 'Pending' && (
                                                <span className="text-gray-500 text-xs italic">Selesai</span>
                                            )}
                                            <ButtonGlass
                                                variant="danger"
                                                onClick={() => handleDelete(reg.id)}
                                                className="py-1 px-3 text-xs"
                                            >
                                                <Trash2 size={14} />
                                            </ButtonGlass>
                                        </div>
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

export default AdminPPDB;
