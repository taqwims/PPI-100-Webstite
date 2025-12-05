import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, Trash2, User, Save, Edit2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useAuth } from '../../context/AuthContext';

interface Student {
    id: string;
    user: {
        name: string;
        email: string;
    };
    nisn: string;
    class: {
        id: number;
        name: string;
    };
    unit_id: number;
}

const Students: React.FC = () => {
    const { user } = useAuth();
    // Initialize unitID based on user role. Super Admin (role_id 1) defaults to 1, others use their assigned unit_id.
    const [unitID, setUnitID] = useState(user?.role_id === 1 ? 1 : user?.unit_id || 1);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const queryClient = useQueryClient();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        nisn: '',
        class_id: '',
        unit_id: unitID,
        parent_id: '',
    });

    // Update formData.unit_id when unitID changes
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, unit_id: unitID }));
    }, [unitID]);

    // Fetch Students
    const { data: students, isLoading } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Fetch Classes
    const { data: classes } = useQuery({
        queryKey: ['classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Fetch Parents (Users with role_id 7)
    // We need an endpoint to get all parents. Assuming /users?role_id=7 exists or we filter client side.
    // Ideally backend should provide /users/parents endpoint.
    // Let's use /users and filter for now, or check if there's a better way.
    // Actually, let's assume we can fetch all users and filter by role 7.
    const { data: parents } = useQuery({
        queryKey: ['parents'],
        queryFn: async () => {
            const res = await api.get('/users/');
            return res.data.filter((u: any) => u.role_id === 7);
        },
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/students/', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/students/${editingStudent?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/students/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            nisn: '',
            class_id: '',
            unit_id: unitID,
            parent_id: '',
        });
        setEditingStudent(null);
    };

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            name: student.user.name,
            email: student.user.email,
            password: '', // Password not filled for edit
            nisn: student.nisn,
            class_id: student.class?.id.toString() || '',
            unit_id: student.unit_id,
            parent_id: (student as any).parent_id || '', // Need to ensure student object has parent_id
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus siswa ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            class_id: Number(formData.class_id),
            unit_id: unitID,
        };

        if (editingStudent) {
            // Remove password if empty during edit
            if (!payload.password) delete (payload as any).password;
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const filteredStudents = students?.filter((student: Student) =>
        student.user.name.toLowerCase().includes(search.toLowerCase()) ||
        student.nisn.includes(search)
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Siswa</h1>
                    <p className="text-slate-300-400">Kelola data siswa per unit</p>
                </div>
                <ButtonGlass onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2">
                    <Plus size={18} /> Tambah Siswa
                </ButtonGlass>
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
                    <div className="flex gap-2">
                        {user?.role_id === 1 ? (
                            <select
                                className="glass-input bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                value={unitID}
                                onChange={(e) => setUnitID(Number(e.target.value))}
                            >
                                <option value={1} className="bg-gray-900">MTS</option>
                                <option value={2} className="bg-gray-900">MA</option>
                            </select>
                        ) : (
                            <div className="glass-input bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-900">
                                {unitID === 1 ? 'MTS' : 'MA'}
                            </div>
                        )}
                    </div>
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>NISN</TableHeadGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>Kelas</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredStudents?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={4} className="text-center py-8">Tidak ada data siswa</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredStudents?.map((student: Student) => (
                                <TableRowGlass key={student.id}>
                                    <TableCellGlass>
                                        <span className="font-mono text-slate-300-300">{student.nisn}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-400">
                                                <User size={14} />
                                            </div>
                                            <span className="font-medium text-slate-900">{student.user.name}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-900 border border-white/10">
                                            {student.class?.name || '-'}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
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

            <ModalGlass
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingStudent ? "Edit Siswa" : "Tambah Siswa Baru"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputGlass
                        label="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <InputGlass
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    {!editingStudent && (
                        <InputGlass
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!editingStudent}
                        />
                    )}
                    <InputGlass
                        label="NISN"
                        value={formData.nisn}
                        onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-900/80 mb-1 ml-1">Kelas</label>
                        <select
                            value={formData.class_id}
                            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                            className="w-full glass-input"
                            required
                        >
                            <option value="" className="bg-gray-900">-- Pilih Kelas --</option>
                            {classes?.map((c: any) => (
                                <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-900/80 mb-1 ml-1">Orang Tua</label>
                        <select
                            value={formData.parent_id}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                            className="w-full glass-input"
                        >
                            <option value="" className="bg-gray-900">-- Pilih Orang Tua (Opsional) --</option>
                            {parents?.map((p: any) => (
                                <option key={p.id} value={p.parent?.id} className="bg-gray-900">{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <ButtonGlass type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </ButtonGlass>
                        <ButtonGlass type="submit" icon={Save}>
                            Simpan
                        </ButtonGlass>
                    </div>
                </form>
            </ModalGlass>
        </div>
    );
};

export default Students;
