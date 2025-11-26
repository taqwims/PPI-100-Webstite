import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Trash2, Edit } from 'lucide-react';

interface User {
    ID: string;
    Name: string;
    Email: string;
    RoleID: number;
    UnitID: number;
}

const UserManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users/');
            return res.data;
        },
    });

    const createUserMutation = useMutation({
        mutationFn: (data: any) => api.post('/users/', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowForm(false);
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role_id: 1, // Default to Admin
        unit_id: 1, // Default to MTS
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createUserMutation.mutate({
            ...formData,
            role_id: Number(formData.role_id),
            unit_id: Number(formData.unit_id),
        });
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Manajemen User</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={20} />
                    Tambah User
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-lg font-bold mb-4">Tambah User Baru</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2"
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={formData.role_id}
                                onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value={1}>Super Admin</option>
                                <option value={2}>Admin MTS</option>
                                <option value={3}>Admin MA</option>
                                <option value={4}>Guru</option>
                                <option value={5}>Wali Kelas</option>
                                <option value={6}>Siswa</option>
                                <option value={7}>Orang Tua</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select
                                value={formData.unit_id}
                                onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value={1}>MTS</option>
                                <option value={2}>MA</option>
                                <option value={3}>Public</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                            ) : (
                                users?.map((user: User) => (
                                    <tr key={user.ID}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.Name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.Email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getRoleName(user.RoleID)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getUnitName(user.UnitID)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                                            <button
                                                onClick={() => handleDelete(user.ID)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
