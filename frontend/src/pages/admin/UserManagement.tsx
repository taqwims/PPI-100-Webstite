import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Trash2, User as UserIcon, Mail, Lock, Shield, School, Edit2, CreditCard, Search, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import clsx from 'clsx';
import { ParentManagement } from '../../components/admin/UserManagement/ParentManagement';
import toast from 'react-hot-toast';

interface ParentRecord {
    id: string;      // Parent Table ID
    user_id: string; // User ID
    phone?: string;
    address?: string;
    occupation?: string;
    relation?: string;
    user?: {
        id: string;
        name: string;
        email: string;
        unit_id: number;
    };
    children?: any[];
}

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role_id: number;
    unit_id: number;
    student?: {
        id: string;
        nisn: string;
        class_id: number;
        parent_id?: string;
        parent?: {
            id: string;
            user_id: string;
            phone?: string;
            relation?: string;
            user?: {
                id: string;
                name: string;
                email: string;
            };
        };
    };
    parent?: {
        id: string;
        phone?: string;
    };
}

interface Class { id: number; name: string; unit_id: number; }

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
    { id: 11, label: 'Teller Transaksional' },
    { id: 8, label: 'Pimpinan' },
];

const getRoleName = (roleId: number) => {
    const m: Record<number, string> = {
        1: 'Super Admin', 2: 'Admin MTS', 3: 'Admin MA', 4: 'Guru',
        5: 'Wali Kelas', 6: 'Siswa', 7: 'Orang Tua', 8: 'Pimpinan',
        9: 'Bendahara', 10: 'Teller Tabungan', 11: 'Teller Transaksional',
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

const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const { units: activeUnits, getUnitName, defaultUnitId } = useUnits();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingStudentRecord, setEditingStudentRecord] = useState<StudentRecord | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<number>(0);

    const initialUnitId = user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId;

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role_id: 6, unit_id: initialUnitId,
        nisn: '', class_id: 0, parent_id: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setFormData(prev => ({ ...prev, unit_id: initialUnitId }));
    }, [initialUnitId]);

    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: async () => (await api.get('/users/')).data || [],
    });

    const { data: parentsList = [] } = useQuery<ParentRecord[]>({
        queryKey: ['parents'],
        queryFn: async () => (await api.get('/parents/')).data || [],
    });

    const { data: classes = [] } = useQuery<Class[]>({
        queryKey: ['classes', formData.unit_id],
        queryFn: async () => (await api.get(`/academic/classes?unit_id=${formData.unit_id}`)).data || [],
        enabled: formData.role_id === 6 && isModalOpen,
    });

    const { data: allStudents } = useQuery<StudentRecord[]>({
        queryKey: ['all-students', formData.unit_id],
        queryFn: async () => (await api.get(`/students/?unit_id=${formData.unit_id}`)).data as StudentRecord[],
        enabled: isModalOpen && !!editingUser && editingUser.role_id === 6,
    });

    // For sorting students by class - always fetch classes
    const { data: allClasses = [] } = useQuery<Class[]>({
        queryKey: ['all-classes'], 
        queryFn: async () => (await api.get('/academic/classes')).data || [],
    });

    // Combined, deduplicated parent options for the dropdown
    const allParentOptions = useMemo(() => {
        const map = new Map<string, { userId: string; name: string; email?: string; phone?: string; parentTableId?: string }>();

        // 1. From parentsList (/parents/)
        parentsList.forEach(p => {
            const uid = p.user?.id || p.user_id;
            if (uid) {
                map.set(uid, {
                    userId: uid,
                    parentTableId: p.id,
                    name: p.user?.name || 'Orang Tua',
                    email: p.user?.email,
                    phone: p.phone,
                });
            }
        });

        // 2. From users with role_id === 7 (Orang Tua)
        users.filter(u => u.role_id === 7).forEach(u => {
            if (!map.has(u.id)) {
                map.set(u.id, {
                    userId: u.id,
                    parentTableId: u.parent?.id,
                    name: u.name,
                    email: u.email,
                    phone: u.phone,
                });
            } else if (u.parent?.id) {
                const existing = map.get(u.id)!;
                if (!existing.parentTableId) {
                    existing.parentTableId = u.parent.id;
                }
            }
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [parentsList, users]);

    // Helper: resolve Parent table ID (or User ID) -> User ID for dropdown value
    const resolveParentIdToUserId = (parentIdentifier?: string): string => {
        if (!parentIdentifier) return '';

        // Match by parentTableId (Parent.id)
        const matchByTableId = allParentOptions.find(p => p.parentTableId && p.parentTableId === parentIdentifier);
        if (matchByTableId) return matchByTableId.userId;

        // Match by userId (User.id)
        const matchByUserId = allParentOptions.find(p => p.userId === parentIdentifier);
        if (matchByUserId) return matchByUserId.userId;

        // Match directly in parentsList
        const p1 = parentsList.find(p => p.id === parentIdentifier || p.user_id === parentIdentifier || p.user?.id === parentIdentifier);
        if (p1) return p1.user?.id || p1.user_id || '';

        // Match in users (role 7)
        const u1 = users.find(u => u.role_id === 7 && (u.parent?.id === parentIdentifier || u.id === parentIdentifier));
        if (u1) return u1.id;

        return parentIdentifier;
    };

    // Helper: get display name for a student's parent
    const getStudentParentName = (u: User): string => {
        if (u.role_id !== 6 || !u.student) return '-';
        if (u.student.parent?.user?.name) {
            return u.student.parent.user.name;
        }
        const parentId = u.student.parent_id;
        if (!parentId) return '-';

        const opt = allParentOptions.find(p => p.parentTableId === parentId || p.userId === parentId);
        if (opt?.name) return opt.name;

        const p = parentsList.find(item => item.id === parentId || item.user_id === parentId || item.user?.id === parentId);
        if (p?.user?.name) return p.user.name;

        const parentUser = users.find(usr => usr.role_id === 7 && (usr.parent?.id === parentId || usr.id === parentId));
        if (parentUser) return parentUser.name;

        return '-';
    };

    // Filter & sort
    const filteredUsers = users
        .filter((u: User) => {
            if (user?.role_id !== 1 && u.unit_id !== user?.unit_id) return false;
            if (activeTab !== 0 && u.role_id !== activeTab) return false;
            
            // Class filter (only for students or in "Semua" tab)
            if (selectedClassId !== 0) {
                if (u.role_id !== 6 || u.student?.class_id !== selectedClassId) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a: User, b: User) => {
            // If filtering by class or in Siswa tab, prioritize name (abjad)
            if (activeTab === 6 || selectedClassId !== 0) {
                return a.name.localeCompare(b.name);
            }

            // Sort students by class name first if in "Semua" tab
            if (a.role_id === 6 && b.role_id === 6 && a.student && b.student) {
                const aClass = allClasses.find((c: Class) => c.id === a.student!.class_id);
                const bClass = allClasses.find((c: Class) => c.id === b.student!.class_id);
                const classCompare = (aClass?.name || '').localeCompare(bClass?.name || '');
                if (classCompare !== 0) return classCompare;
                return a.name.localeCompare(b.name);
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
                    name: data.name, 
                    email: data.email, 
                    password: data.password,
                    nisn: data.nisn, 
                    class_id: Number(data.class_id),
                    unit_id: Number(data.unit_id), 
                    parent_id: data.parent_id || undefined,
                });
            }
            return api.post('/users/', {
                name: data.name, 
                email: data.email, 
                password: data.password,
                role_id: Number(data.role_id), 
                unit_id: Number(data.unit_id),
            });
        },
        onSuccess: () => {
            toast.success('User berhasil ditambahkan');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['all-students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['parent-users'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['all-classes'] });
            handleCloseModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal membuat user'),
    });

    const updateUserMutation = useMutation({
        mutationFn: (data: any) => {
            const studentId = editingUser?.student?.id || editingStudentRecord?.id;
            if (editingUser?.role_id === 6 && studentId) {
                return api.put(`/students/${studentId}`, {
                    name: data.name,
                    email: data.email,
                    password: data.password || undefined,
                    nisn: data.nisn || editingUser?.student?.nisn || '',
                    class_id: Number(data.class_id),
                    unit_id: Number(data.unit_id) || editingUser?.unit_id || 1,
                    parent_id: data.parent_id || '',
                });
            }
            return api.put(`/users/${editingUser?.id}`, {
                name: data.name,
                email: data.email,
                password: data.password || undefined,
                role_id: Number(data.role_id),
                unit_id: Number(data.unit_id),
            });
        },
        onSuccess: () => {
            toast.success('User berhasil diperbarui');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['all-students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['parent-users'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['all-classes'] });
            handleCloseModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal mengupdate user'),
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            toast.success('User berhasil dihapus');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['parent-users'] });
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal menghapus user'),
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setEditingStudentRecord(null);
        setFormData({ name: '', email: '', password: '', role_id: 6, unit_id: initialUnitId, nisn: '', class_id: 0, parent_id: '' });
    };

    const handleEdit = (u: User) => {
        setEditingUser(u);
        const studentRec = allStudents?.find((s: StudentRecord) => s.user_id === u.id);
        if (studentRec) {
            setEditingStudentRecord(studentRec);
        } else {
            setEditingStudentRecord(null);
        }

        const rawParentId = u.student?.parent?.user?.id 
            || u.student?.parent?.user_id 
            || u.student?.parent_id 
            || studentRec?.parent_id 
            || '';

        const resolvedParentUserId = resolveParentIdToUserId(rawParentId);

        setFormData({
            name: u.name,
            email: u.email,
            password: '',
            role_id: u.role_id,
            unit_id: u.unit_id,
            nisn: u.student?.nisn || studentRec?.nisn || '',
            class_id: u.student?.class_id || studentRec?.class_id || 0,
            parent_id: resolvedParentUserId,
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
            { id: 10, name: 'Teller Tabungan' }, { id: 11, name: 'Teller Transaksional' },
        ];
        if (user?.role_id === 1) return allRoles;
        return allRoles.filter(r => [4, 5, 6, 7, 8, 9, 10, 11].includes(r.id));
    };

    const getStudentClass = (u: User) => {
        if (u.role_id !== 6 || !u.student) return '-';
        const cls = allClasses.find((c: Class) => c.id === u.student!.class_id);
        return cls?.name || '-';
    };

    const selectedParentName = useMemo(() => {
        if (!formData.parent_id) return '';
        const found = allParentOptions.find(p => p.userId === formData.parent_id);
        return found?.name || 'Orang Tua Terpilih';
    }, [formData.parent_id, allParentOptions]);

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
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Cari nama atau email..." value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm" />
                        </div>
                        
                        {(activeTab === 0 || activeTab === 6) && (
                            <div className="relative w-full md:w-48">
                                <select 
                                    value={selectedClassId} 
                                    onChange={e => setSelectedClassId(Number(e.target.value))}
                                    className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm appearance-none bg-white"
                                >
                                    <option value={0}>Semua Kelas</option>
                                    {allClasses
                                        .filter((cls: Class) => user?.role_id === 1 || cls.unit_id === user?.unit_id)
                                        .map((cls: Class) => (
                                             <option key={cls.id} value={cls.id}>
                                                 {cls.name} {user?.role_id === 1 ? `(${getUnitName(cls.unit_id)})` : ''}
                                             </option>
                                        ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Shield size={14} className="text-slate-400" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="px-5 py-3 font-medium w-12">No</th>
                                <th className="px-5 py-3 font-medium">Nama</th>
                                <th className="px-5 py-3 font-medium">Email</th>
                                <th className="px-5 py-3 font-medium">Role</th>
                                {(activeTab === 0 || activeTab === 6) && <th className="px-5 py-3 font-medium">Kelas</th>}
                                {(activeTab === 0 || activeTab === 6) && <th className="px-5 py-3 font-medium">Orang Tua</th>}
                                <th className="px-5 py-3 font-medium">Unit</th>
                                <th className="px-5 py-3 font-medium text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Memuat data...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Tidak ada user ditemukan</td></tr>
                            ) : filteredUsers.map((u: User, idx: number) => {
                                const parentName = getStudentParentName(u);
                                return (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3 text-slate-400 text-sm font-medium">{idx + 1}</td>
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
                                            <td className="px-5 py-3 text-sm text-slate-600 font-medium">{getStudentClass(u)}</td>
                                        )}
                                        {(activeTab === 0 || activeTab === 6) && (
                                            <td className="px-5 py-3 text-sm">
                                                {u.role_id === 6 ? (
                                                    parentName !== '-' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                                            <CheckCircle size={12} className="text-emerald-600" />
                                                            {parentName}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                                            <AlertCircle size={12} className="text-amber-500" />
                                                            Belum Ditentukan
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-5 py-3 text-sm text-slate-500">{getUnitName(u.unit_id)}</td>
                                        <td className="px-5 py-3 text-center space-x-1">
                                            <button onClick={() => handleEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus User"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                    <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="••••••••"
                                        required={!editingUser} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
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
                                                {((classes && classes.length > 0) ? classes : allClasses.filter((c: Class) => !formData.unit_id || c.unit_id === formData.unit_id))?.map((cls: Class) => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.name} {user?.role_id === 1 ? `(${getUnitName(cls.unit_id)})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Orang Tua / Wali Murid</label>
                                        <select 
                                            value={formData.parent_id} 
                                            onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                                        >
                                            <option value="">-- Belum Ada Orang Tua --</option>
                                            {allParentOptions.map(p => (
                                                <option key={p.userId} value={p.userId}>
                                                    {p.name} {p.email ? `(${p.email})` : ''} {p.phone ? `· ${p.phone}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        
                                        {/* Status Indicator */}
                                        {formData.parent_id ? (
                                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60">
                                                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                                                <span>
                                                    Terhubung dengan orang tua: <strong>{selectedParentName}</strong>
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium mt-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60">
                                                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                                                <span>Siswa ini belum terhubung dengan akun orang tua</span>
                                            </div>
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
