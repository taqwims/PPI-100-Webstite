import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Search, User, Save, Edit2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

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

const HomeroomStudents: React.FC = () => {
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
        unit_id: 1, // Default, will be updated from student
        parent_id: '',
    });

    // Fetch Homeroom Class
    const { data: homeroomClass } = useQuery({
        queryKey: ['homeroom-class'],
        queryFn: async () => {
            const res = await api.get('/academic/classes/homeroom');
            return res.data;
        },
    });

    // Fetch Students in Homeroom Class
    const { data: students, isLoading } = useQuery({
        queryKey: ['homeroom-students', homeroomClass?.id],
        queryFn: async () => {
            if (!homeroomClass?.id) return [];
            // We need an endpoint to get students by class. 
            // Assuming /students?class_id=... works or we filter client side from all students (less efficient).
            // Let's try fetching all students for the unit and filtering by class_id.
            const res = await api.get(`/students/?unit_id=${homeroomClass.unit_id}`);
            return res.data.filter((s: any) => s.class_id === homeroomClass.id);
        },
        enabled: !!homeroomClass?.id,
    });

    // Fetch Classes (for editing class)
    const { data: classes } = useQuery({
        queryKey: ['classes', homeroomClass?.unit_id],
        queryFn: async () => {
            if (!homeroomClass?.unit_id) return [];
            const res = await api.get(`/academic/classes?unit_id=${homeroomClass.unit_id}`);
            return res.data;
        },
        enabled: !!homeroomClass?.unit_id,
    });

    // Fetch Parents
    const { data: parents } = useQuery({
        queryKey: ['parents'],
        queryFn: async () => {
            const res = await api.get('/users/');
            return res.data.filter((u: any) => u.role_id === 7);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/students/${editingStudent?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['homeroom-students'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            nisn: '',
            class_id: '',
            unit_id: 1,
            parent_id: '',
        });
        setEditingStudent(null);
    };

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            name: student.user.name,
            email: student.user.email,
            password: '',
            nisn: student.nisn,
            class_id: student.class?.id.toString() || '',
            unit_id: student.unit_id,
            parent_id: (student as any).parent_id || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            class_id: Number(formData.class_id),
            unit_id: Number(formData.unit_id),
        };

        if (editingStudent) {
            if (!payload.password) delete (payload as any).password;
            updateMutation.mutate(payload);
        }
    };

    const filteredStudents = students?.filter((student: Student) =>
        student.user.name.toLowerCase().includes(search.toLowerCase()) ||
        student.nisn.includes(search)
    );

    if (!homeroomClass && !isLoading) {
        return <div className="p-6 text-slate-900">Anda belum ditugaskan sebagai wali kelas.</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Siswa Kelas {homeroomClass?.name}</h1>
                    <p className="text-slate-300-400">Kelola data siswa di kelas Anda</p>
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
                title="Edit Siswa"
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
                        <label className="block text-sm font-medium text-slate-900/80 mb-1 ml-1">Unit</label>
                        <select
                            value={formData.unit_id}
                            onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                            className="w-full glass-input"
                            required
                        >
                            <option value={1} className="bg-gray-900">MTS</option>
                            <option value={2} className="bg-gray-900">MA</option>
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

export default HomeroomStudents;
