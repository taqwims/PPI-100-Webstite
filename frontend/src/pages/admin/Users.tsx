import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { Plus, Search, Edit, Trash2, User, Mail, Shield, Building } from 'lucide-react';

interface UserData {
    ID: string;
    Name: string;
    Email: string;
    RoleID: number;
    UnitID: number;
}

const UsersPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // --- Data Fetching ---
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users/');
            return response.data;
        }
    });

    // --- Mutations ---
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role_id: '6', unit_id: '1' });

    const createUserMutation = useMutation({
        mutationFn: (data: typeof newUser) => api.post('/users/', {
            ...data,
            role_id: Number(data.role_id),
            unit_id: Number(data.unit_id)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsCreateModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role_id: '6', unit_id: '1' });
            alert('User berhasil dibuat!');
        },
        onError: (error: any) => {
            alert('Gagal membuat user: ' + (error.response?.data?.error || error.message));
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            alert('User berhasil dihapus!');
        },
        onError: (error: any) => {
            alert('Gagal menghapus user: ' + (error.response?.data?.error || error.message));
        }
    });

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus user "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
            deleteUserMutation.mutate(id);
        }
    };

    // --- Filtering ---
    const filteredUsers = users?.filter((user: UserData) => {
        const matchesSearch = user.Name.toLowerCase().includes(search.toLowerCase()) || user.Email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.RoleID === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleName = (roleId: number) => {
        switch (roleId) {
            case 1: return 'Super Admin';
            case 2: return 'Admin MTS';
            case 3: return 'Admin MA';
            case 4: return 'Guru';
            case 5: return 'Wali Kelas';
            case 6: return 'Siswa';
            case 7: return 'Orang Tua';
            default: return 'User';
        }
    };

    const getUnitName = (unitId: number) => {
        switch (unitId) {
            case 1: return 'MTS';
            case 2: return 'MA';
            case 3: return 'Public';
            default: return '-';
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manajemen User</h1>
                    <p className="text-gray-400">Kelola data pengguna sistem</p>
                </div>
                <ButtonGlass className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} /> Tambah User
                </ButtonGlass>
            </div>

            <CardGlass className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <InputGlass
                            placeholder="Cari nama atau email..."
                            icon={Search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="glass-input bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all" className="bg-gray-900">Semua Role</option>
                            <option value={1} className="bg-gray-900">Super Admin</option>
                            <option value={4} className="bg-gray-900">Guru</option>
                            <option value={6} className="bg-gray-900">Siswa</option>
                            <option value={7} className="bg-gray-900">Orang Tua</option>
                        </select>
                    </div>
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>Email</TableHeadGlass>
                            <TableHeadGlass>Role</TableHeadGlass>
                            <TableHeadGlass>Unit</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredUsers?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Tidak ada data user</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredUsers?.map((user: UserData) => (
                                <TableRowGlass key={user.ID}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-purple-400">
                                                <User size={14} />
                                            </div>
                                            <span className="font-medium text-white">{user.Name}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Mail size={14} /> {user.Email}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.RoleID === 1 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            user.RoleID === 4 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                user.RoleID === 6 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                            <Shield size={10} />
                                            {getRoleName(user.RoleID)}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Building size={14} /> {getUnitName(user.UnitID)}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Edit button placeholder - Backend update logic not yet implemented */}
                                            <button className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors opacity-50 cursor-not-allowed" title="Edit belum tersedia">
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                                                onClick={() => handleDelete(user.ID, user.Name)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>

            {/* Modal Create User */}
            <ModalGlass
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Tambah User Baru"
            >
                <div className="space-y-4">
                    <InputGlass
                        label="Nama Lengkap"
                        placeholder="Contoh: Ahmad Dahlan"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                    <InputGlass
                        label="Email"
                        type="email"
                        placeholder="email@sekolah.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                    <InputGlass
                        label="Password"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Role</label>
                            <select
                                className="w-full glass-input text-gray-900"
                                value={newUser.role_id}
                                onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}
                            >
                                <option value="1">Super Admin</option>
                                <option value="2">Admin MTS</option>
                                <option value="3">Admin MA</option>
                                <option value="4">Guru</option>
                                <option value="5">Wali Kelas</option>
                                <option value="6">Siswa</option>
                                <option value="7">Orang Tua</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Unit</label>
                            <select
                                className="w-full glass-input text-gray-900"
                                value={newUser.unit_id}
                                onChange={(e) => setNewUser({ ...newUser, unit_id: e.target.value })}
                            >
                                <option value="1">MTS</option>
                                <option value="2">MA</option>
                                <option value="3">Public</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => createUserMutation.mutate(newUser)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default UsersPage;
