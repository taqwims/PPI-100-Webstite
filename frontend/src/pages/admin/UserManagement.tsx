import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Trash2, User as UserIcon, Mail, Lock, Shield, School, Edit2, CreditCard, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import clsx from 'clsx';
import { ParentManagement } from '../../components/admin/UserManagement/ParentManagement';

interface User {
    id: string;
    name: string;
    email: string;
    role_id: number;
    unit_id: number;
    student?: {
        id: string;
        nisn: string;
        class_id: number;
        parent_id?: string;
    };
    parent?: {
        id: string;
    };
}

interface Class { id: number; name: string; }

interface StudentRecord {
    id: string;
    user_id: string;
    nisn: string;
    class_id: number;
    parent_id?: string;
    unit_id: number;
    user: { name: string; email: string };
    class?: { id: number; name: string };
}

const roleTabs = [
    { id: 0, label: 'Semua' },
    { id: 1, label: 'Super Admin' },
    { id: 4, label: 'Guru' },
    { id: 5, label: 'Wali Kelas' },
    { id: 6, label: 'Siswa' },
    { id: 7, label: 'Orang Tua' },
    { id: 9, label: 'Bendahara' },
    { id: 10, label: 'Teller Tabungan' },
    { id: 11, label: 'Teller Infaq' },
    { id: 8, label: 'Pimpinan' },
];

const getRoleName = (roleId: number) => {
    const m: Record<number, string> = {
        1: 'Super Admin', 2: 'Admin MTS', 3: 'Admin MA', 4: 'Guru',
        5: 'Wali Kelas', 6: 'Siswa', 7: 'Orang Tua', 8: 'Pimpinan',
        9: 'Bendahara', 10: 'Teller Tabungan', 11: 'Teller Infaq',
    };
    return m[roleId] || 'Unknown';
};

const roleColor = (roleId: number) => {
    const m: Record<number, string> = {
        1: 'bg-purple-100 text-purple-700', 4: 'bg-blue-100 text-blue-700',
        5: 'bg-cyan-100 text-cyan-700', 6: 'bg-green-100 text-green-700',
        7: 'bg-amber-100 text-amber-700', 8: 'bg-pink-100 text-pink-700',
        9: 'bg-indigo-100 text-indigo-700', 10: 'bg-teal-100 text-teal-700',
        11: 'bg-orange-100 text-orange-700',
    };
    return m[roleId] || 'bg-slate-100 text-slate-600';
};

// getUnitName is now provided by useUnits hook inside component

const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const { units: activeUnits, getUnitName, defaultUnitId } = useUnits();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingStudentRecord, setEditingStudentRecord] = useState<StudentRecord | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const initialUnitId = user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId;

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role_id: 6, unit_id: initialUnitId,
        nisn: '', class_id: 0, parent_id: '',
    });

    useEffect(() => {
        setFormData(prev => ({ ...prev, unit_id: initialUnitId }));
    }, [initialUnitId]);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await api.get('/users/')).data || [],
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes', formData.unit_id],
        queryFn: async () => (await api.get(`/academic/classes?unit_id=${formData.unit_id}`)).data || [],
        enabled: formData.role_id === 6 && isModalOpen,
    });

    const { data: allStudents } = useQuery({
        queryKey: ['all-students', formData.unit_id],
        queryFn: async () => (await api.get(`/students/?unit_id=${formData.unit_id}`)).data as StudentRecord[],
        enabled: isModalOpen && !!editingUser && editingUser.role_id === 6,
    });

    // For sorting students by class - always fetch classes
    const { data: allClasses = [] } = useQuery<Class[]>({
        queryKey: ['all-classes'], queryFn: async () => (await api.get('/academic/classes')).data || [],
    });

    const parentUsers = users.filter((u: User) => u.role_id === 7);

    // Helper: resolve Parent table ID -> User ID for the dropdown
    // Student.parent_id is a Parent table UUID, but dropdown uses User.id
    const resolveParentIdToUserId = (parentTableId: string): string => {
        if (!parentTableId) return '';
        const parentUser = parentUsers.find((u: User) => u.parent?.id === parentTableId);
        return parentUser?.id || '';
    };

    useEffect(() => {
        if (editingUser && editingUser.role_id === 6 && allStudents) {
            const studentRec = allStudents.find((s: StudentRecord) => s.user_id === editingUser.id);
            if (studentRec) {
                setEditingStudentRecord(studentRec);
                setFormData(prev => ({
                    ...prev,
                    nisn: studentRec.nisn || '',
                    class_id: studentRec.class_id || 0,
                    parent_id: resolveParentIdToUserId(studentRec.parent_id || ''),
                }));
            }
        }
    }, [editingUser, allStudents, parentUsers]);

    // Filter & sort
    const filteredUsers = users
        .filter((u: User) => {
            if (user?.role_id !== 1 && u.unit_id !== user?.unit_id) return false;
            if (activeTab !== 0 && u.role_id !== activeTab) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a: User, b: User) => {
            // Sort students by class name
            if (a.role_id === 6 && b.role_id === 6 && a.student && b.student) {
                const aClass = allClasses.find((c: Class) => c.id === a.student!.class_id);
                const bClass = allClasses.find((c: Class) => c.id === b.student!.class_id);
                return (aClass?.name || '').localeCompare(bClass?.name || '');
            }
            // Otherwise sort by role then name
            if (a.role_id !== b.role_id) return a.role_id - b.role_id;
            return a.name.localeCompare(b.name);
        });

    const roleCounts = users.reduce((acc: Record<number, number>, u: User) => {
        acc[u.role_id] = (acc[u.role_id] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    const createUserMutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (data.role_id === 6) {
                return api.post('/students/', {
                    name: data.name, email: data.email, password: data.password,
                    nisn: data.nisn, class_id: Number(data.class_id),
                    unit_id: Number(data.unit_id), parent_id: data.parent_id || undefined,
                });
            }
            return api.post('/users/', {
                name: data.name, email: data.email, password: data.password,
                role_id: Number(data.role_id), unit_id: Number(data.unit_id),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            handleCloseModal();
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Gagal membuat user'),
    });

    const updateUserMutation = useMutation({
        mutationFn: (data: any) => {
            if (editingUser?.role_id === 6 && editingStudentRecord) {
                return api.put(`/students/${editingStudentRecord.id}`, {
                    name: data.name, email: data.email,
                    nisn: data.nisn || editingStudentRecord.nisn,
                    class_id: Number(data.class_id) || editingStudentRecord.class_id,
                    unit_id: Number(data.unit_id) || editingStudentRecord.unit_id,
                    parent_id: data.parent_id || undefined,
                });
            }
            return api.put(`/users/${editingUser?.id}`, {
                name: data.name, email: data.email, password: data.password,
                role_id: Number(data.role_id), unit_id: Number(data.unit_id),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            handleCloseModal();
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Gagal mengupdate user'),
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
        },
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setEditingStudentRecord(null);
        setFormData({ name: '', email: '', password: '', role_id: 6, unit_id: initialUnitId, nisn: '', class_id: 0, parent_id: '' });
    };

    const handleEdit = (u: User) => {
        setEditingUser(u);
        setEditingStudentRecord(null);
        setFormData({
            name: u.name, email: u.email, password: '',
            role_id: u.role_id, unit_id: u.unit_id,
            nisn: u.student?.nisn || '', class_id: u.student?.class_id || 0,
            parent_id: resolveParentIdToUserId(u.student?.parent_id || ''),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            const payload = { ...formData };
            if (!payload.password) delete (payload as any).password;
            updateUserMutation.mutate(payload);
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Hapus user ini?')) deleteUserMutation.mutate(id);
    };

    const getRoleOptions = () => {
        const allRoles = [
            { id: 1, name: 'Super Admin' }, { id: 2, name: 'Admin MTS' }, { id: 3, name: 'Admin MA' },
            { id: 4, name: 'Guru' }, { id: 5, name: 'Wali Kelas' }, { id: 6, name: 'Siswa' },
            { id: 7, name: 'Orang Tua' }, { id: 8, name: 'Pimpinan' }, { id: 9, name: 'Bendahara' },
            { id: 10, name: 'Teller Tabungan' }, { id: 11, name: 'Teller Infaq' },
        ];
        if (user?.role_id === 1) return allRoles;
        return allRoles.filter(r => [4, 5, 6, 7, 8, 9, 10, 11].includes(r.id));
    };

    const getStudentClass = (u: User) => {
        if (u.role_id !== 6 || !u.student) return '-';
        const cls = allClasses.find((c: Class) => c.id === u.student!.class_id);
        return cls?.name || '-';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manajemen User</h1>
                    <p className="text-slate-500 mt-1">Kelola akun pengguna sistem — {users.length} total user</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition">
                    <Plus size={18} /> Tambah User
                </button>
            </div>

            {/* Role Tabs */}
            <div className="flex flex-wrap gap-2">
                {roleTabs.map(t => {
                    const count = t.id === 0 ? users.length : (roleCounts[t.id] || 0);
                    if (t.id !== 0 && count === 0) return null;
                    return (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={clsx(
                                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                                activeTab === t.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            )}>
                            {t.label}
                            <span className={clsx('ml-1.5 px-1.5 py-0.5 rounded-md text-xs',
                                activeTab === t.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeTab === 7 ? (
                <ParentManagement />
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Cari nama atau email..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="px-5 py-3 font-medium">Nama</th>
                                <th className="px-5 py-3 font-medium">Email</th>
                                <th className="px-5 py-3 font-medium">Role</th>
                                {(activeTab === 0 || activeTab === 6) && <th className="px-5 py-3 font-medium">Kelas</th>}
                                <th className="px-5 py-3 font-medium">Unit</th>
                                <th className="px-5 py-3 font-medium text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Memuat data...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Tidak ada user ditemukan</td></tr>
                            ) : filteredUsers.map((u: User) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', roleColor(u.role_id))}>
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-900">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 text-sm">{u.email}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColor(u.role_id)}`}>
                                            {getRoleName(u.role_id)}
                                        </span>
                                    </td>
                                    {(activeTab === 0 || activeTab === 6) && (
                                        <td className="px-5 py-3 text-sm text-slate-600">{getStudentClass(u)}</td>
                                    )}
                                    <td className="px-5 py-3 text-sm text-slate-500">{getUnitName(u.unit_id)}</td>
                                    <td className="px-5 py-3 text-center space-x-1">
                                        <button onClick={() => handleEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-slate-800">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="Nama lengkap" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="email@example.com" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{editingUser ? 'Password (kosongkan jika tidak diubah)' : 'Password'}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="••••••••"
                                        required={!editingUser} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: Number(e.target.value) })}
                                            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none"
                                            disabled={!!editingUser}>
                                            {getRoleOptions().map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                                    <div className="relative">
                                        <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        {user?.role_id === 1 ? (
                                            <select value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                                                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none">
                                                {activeUnits.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                                <option value={3}>Public</option>
                                            </select>
                                        ) : (
                                            <div className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500">{getUnitName(formData.unit_id)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Student Fields */}
                            {formData.role_id === 6 && (
                                <div className="space-y-4 pt-4 border-t border-slate-200">
                                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                                        <CreditCard size={16} className="text-blue-600" /> Data Siswa
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">NISN</label>
                                            <input type="text" value={formData.nisn} onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="NISN" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                                            <select value={formData.class_id} onChange={e => setFormData({ ...formData, class_id: Number(e.target.value) })}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                                                <option value={0}>Pilih Kelas</option>
                                                {classes?.map((cls: Class) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Orang Tua / Wali</label>
                                        <select value={formData.parent_id} onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                                            <option value="">-- Belum Ada Orang Tua --</option>
                                            {parentUsers.map((p: User) => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
                                        </select>
                                        {editingUser && !formData.parent_id && (
                                            <p className="text-xs text-amber-600 mt-1">⚠ Siswa belum terhubung dengan orang tua</p>
                                        )}
                                        {editingUser && formData.parent_id && (
                                            <p className="text-xs text-emerald-600 mt-1">✓ Terhubung dengan orang tua</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!editingUser && formData.role_id === 4 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                                    <strong>Catatan:</strong> Untuk melengkapi profil guru (NIP, Gelar, dll), gunakan menu "Dewan Asatidz" setelah akun dibuat.
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                <button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50">
                                    {(createUserMutation.isPending || updateUserMutation.isPending) ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
