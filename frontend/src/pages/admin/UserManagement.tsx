import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Trash2, User as UserIcon, Mail, Lock, Shield, School, Edit2, CreditCard, BookOpen } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useAuth } from '../../context/AuthContext';

interface User {
    id: string;
    name: string;
    email: string;
    role_id: number;
    unit_id: number;
}

interface Class {
    id: number;
    name: string;
}

const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Initialize unit_id based on user role
    const initialUnitId = user?.role_id === 1 ? 1 : user?.unit_id || 1;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role_id: 6, // Default to Siswa
        unit_id: initialUnitId,
        nisn: '',
        class_id: 0,
        parent_id: '',
    });

    // Update formData.unit_id when modal opens or user changes
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, unit_id: initialUnitId }));
    }, [initialUnitId]);

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users/');
            return res.data;
        },
    });

    // Fetch classes if role is Siswa (6)
    const { data: classes } = useQuery({
        queryKey: ['classes', formData.unit_id],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${formData.unit_id}`);
            return res.data;
        },
        enabled: formData.role_id === 6 && isModalOpen
    });

    // Filter users based on role
    const filteredUsers = users?.filter((u: User) => {
        if (user?.role_id === 1) return true; // Super Admin sees all
        return u.unit_id === user?.unit_id; // Others see only their unit
    });

    const createUserMutation = useMutation({
        mutationFn: (data: typeof formData) => {
            // If role is Siswa (6), use /students/ endpoint
            if (data.role_id === 6) {
                return api.post('/students/', {
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    nisn: data.nisn,
                    class_id: Number(data.class_id),
                    unit_id: Number(data.unit_id),
                    parent_id: data.parent_id || undefined
                });
            }
            // Otherwise use standard /users/ endpoint
            return api.post('/users/', {
                name: data.name,
                email: data.email,
                password: data.password,
                role_id: Number(data.role_id),
                unit_id: Number(data.unit_id),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            // Also invalidate students if we created one
            if (formData.role_id === 6) {
                queryClient.invalidateQueries({ queryKey: ['students'] });
            }
            handleCloseModal();
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || 'Gagal membuat user');
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: (data: any) => api.put(`/users/${editingUser?.id}`, {
            name: data.name,
            email: data.email,
            password: data.password,
            role_id: Number(data.role_id),
            unit_id: Number(data.unit_id),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseModal();
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || 'Gagal mengupdate user');
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role_id: 6,
            unit_id: initialUnitId,
            nisn: '',
            class_id: 0,
            parent_id: ''
        });
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Leave empty to keep unchanged
            role_id: user.role_id,
            unit_id: user.unit_id,
            nisn: '', // Reset student specific fields as we only edit User details here
            class_id: 0,
            parent_id: ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (editingUser) {
            const payload = { ...formData };
            if (!payload.password) delete (payload as any).password;
            updateUserMutation.mutate(payload);
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
            deleteUserMutation.mutate(id);
        }
    };

    const getRoleName = (roleId: number) => {
        switch (roleId) {
            case 1: return 'Super Admin';
            case 2: return 'Admin MTS';
            case 3: return 'Admin MA';
            case 4: return 'Guru';
            case 5: return 'Wali Kelas';
            case 6: return 'Siswa';
            case 7: return 'Orang Tua';
            default: return 'Unknown';
        }
    };

    const getUnitName = (unitId: number) => {
        switch (unitId) {
            case 1: return 'MTS';
            case 2: return 'MA';
            case 3: return 'Public';
            default: return 'Unknown';
        }
    };

    // Role Options Logic
    const getRoleOptions = () => {
        const allRoles = [
            { id: 1, name: 'Super Admin' },
            { id: 2, name: 'Admin MTS' },
            { id: 3, name: 'Admin MA' },
            { id: 4, name: 'Guru' },
            { id: 5, name: 'Wali Kelas' },
            { id: 6, name: 'Siswa' },
            { id: 7, name: 'Orang Tua' },
        ];

        if (user?.role_id === 1) return allRoles;

        // Admin MTS/MA can only create operational roles
        return allRoles.filter(r => [4, 5, 6, 7].includes(r.id));
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen User</h1>
                    <p className="text-slate-400">Kelola akun pengguna sistem</p>
                </div>
                <ButtonGlass onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={18} /> Tambah User
                </ButtonGlass>
            </div>

            <CardGlass className="p-6">
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
                        ) : (
                            filteredUsers?.map((user: User) => (
                                <TableRowGlass key={user.id}>
                                    <TableCellGlass>
                                        <span className="font-medium text-slate-900">{user.name}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-500">{user.email}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                            ${user.role_id === 1 ? 'bg-purple-500/20 text-purple-600' :
                                                user.role_id === 4 ? 'bg-blue-500/20 text-blue-600' :
                                                    user.role_id === 6 ? 'bg-green-500/20 text-green-600' :
                                                        'bg-gray-500/20 text-slate-600'
                                            }`}>
                                            {getRoleName(user.role_id)}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-500">{getUnitName(user.unit_id)}</span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ButtonGlass
                                                variant="secondary"
                                                onClick={() => handleEdit(user)}
                                                className="p-2"
                                            >
                                                <Edit2 size={16} />
                                            </ButtonGlass>
                                            <ButtonGlass
                                                variant="danger"
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2"
                                            >
                                                <Trash2 size={16} />
                                            </ButtonGlass>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>

            <ModalGlass
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingUser ? "Edit User" : "Tambah User Baru"}
            >
                <div className="space-y-4">
                    <InputGlass
                        label="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        icon={UserIcon}
                    />
                    <InputGlass
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        icon={Mail}
                    />
                    <InputGlass
                        label={editingUser ? "Password (Kosongkan jika tidak diubah)" : "Password"}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        icon={Lock}
                    />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-3 text-slate-400" size={18} />
                            <select
                                className="w-full glass-input pl-10 text-slate-900"
                                value={formData.role_id}
                                onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                                disabled={!!editingUser} // Disable role change on edit to prevent data inconsistency
                            >
                                {getRoleOptions().map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Unit</label>
                        <div className="relative">
                            <School className="absolute left-3 top-3 text-slate-400" size={18} />
                            {user?.role_id === 1 ? (
                                <select
                                    className="w-full glass-input pl-10 text-slate-900"
                                    value={formData.unit_id}
                                    onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                                >
                                    <option value={1}>MTS</option>
                                    <option value={2}>MA</option>
                                    <option value={3}>Public</option>
                                </select>
                            ) : (
                                <div className="w-full glass-input pl-10 text-slate-500 flex items-center">
                                    {getUnitName(formData.unit_id)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Student Specific Fields */}
                    {!editingUser && formData.role_id === 6 && (
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <h4 className="font-semibold text-slate-900">Data Siswa</h4>
                            <InputGlass
                                label="NISN"
                                value={formData.nisn}
                                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                                icon={CreditCard}
                                placeholder="Nomor Induk Siswa Nasional"
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Kelas</label>
                                <div className="relative">
                                    <BookOpen className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <select
                                        className="w-full glass-input pl-10 text-slate-900"
                                        value={formData.class_id}
                                        onChange={(e) => setFormData({ ...formData, class_id: Number(e.target.value) })}
                                    >
                                        <option value={0}>Pilih Kelas</option>
                                        {classes?.map((cls: Class) => (
                                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Teacher Warning */}
                    {!editingUser && formData.role_id === 4 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
                            <p><strong>Catatan:</strong> Akun guru akan dibuat. Untuk melengkapi data profil guru (NIP, Gelar, dll), silakan gunakan menu "Dewan Asatidz" setelah akun dibuat.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={handleCloseModal}>Batal</ButtonGlass>
                        <ButtonGlass onClick={handleSubmit} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                            {createUserMutation.isPending || updateUserMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                        </ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default UserManagement;
