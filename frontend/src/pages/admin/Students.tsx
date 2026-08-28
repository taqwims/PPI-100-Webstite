import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, Trash2, User, Save, Edit2, Radio, Smartphone, XCircle } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import toast from 'react-hot-toast';

interface Student {
    id: string;
    user: {
        name: string;
        email: string;
    };
    nisn: string;
    rfid?: string;
    class: {
        id: number;
        name: string;
    };
    parent?: {
        id: string;
        phone: string;
        user?: {
            name: string;
            phone: string;
        }
    };
    unit_id: number;
}

const Students: React.FC = () => {
    const { user } = useAuth();
    const { units, getUnitName, defaultUnitId } = useUnits();
    // Initialize unitID based on user role. Super Admin (role_id 1) defaults to first available unit, others use their assigned unit_id.
    const [unitID, setUnitID] = useState(user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId);
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
        rfid: '',
        class_id: '',
        unit_id: unitID,
        parent_id: '',
    });

    // NFC Scan State for Modal
    const [isScanningNfc, setIsScanningNfc] = useState(false);
    const nfcAbortRef = useRef<AbortController | null>(null);

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

    // Fetch Parents from /parents/ endpoint
    const { data: parentsList } = useQuery({
        queryKey: ['parent-users'],
        queryFn: async () => {
            const res = await api.get('/parents/');
            return res.data || [];
        },
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/students/', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['parent-users'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/students/${editingStudent?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            queryClient.invalidateQueries({ queryKey: ['parent-users'] });
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
        if (nfcAbortRef.current) {
            nfcAbortRef.current.abort();
            nfcAbortRef.current = null;
        }
        setIsScanningNfc(false);
        setFormData({
            name: '',
            email: '',
            password: '',
            nisn: '',
            rfid: '',
            class_id: '',
            unit_id: unitID,
            parent_id: '',
        });
        setEditingStudent(null);
    };

    const handleEdit = (student: Student) => {
        if (nfcAbortRef.current) {
            nfcAbortRef.current.abort();
            nfcAbortRef.current = null;
        }
        setIsScanningNfc(false);
        setEditingStudent(student);
        // Resolve parent_id (Parent table ID) back to User ID for the dropdown
        let parentUserId = '';
        if ((student as any).parent_id && parentsList) {
            const parentRecord = parentsList.find((p: any) => p.id === (student as any).parent_id);
            if (parentRecord) {
                parentUserId = parentRecord.user?.id || parentRecord.user_id || '';
            }
        }
        setFormData({
            name: student.user.name,
            email: student.user.email,
            password: '',
            nisn: student.nisn,
            rfid: (student as any).rfid || '',
            class_id: student.class?.id.toString() || '',
            unit_id: student.unit_id,
            parent_id: parentUserId,
        });
        setIsModalOpen(true);
    };

    // NFC Scanner for Modal
    const startModalNfcScan = async () => {
        if (typeof window === 'undefined' || !('NDEFReader' in window)) {
            toast.error('Web NFC tidak didukung di browser ini. Anda dapat mengetikkan UID kartu atau menggunakan USB scanner.');
            return;
        }

        try {
            const ndef = new (window as any).NDEFReader();
            const controller = new AbortController();
            nfcAbortRef.current = controller;

            await ndef.scan({ signal: controller.signal });
            setIsScanningNfc(true);
            toast.success('Tempelkan kartu siswa ke belakang HP...');

            ndef.onreading = (event: any) => {
                const serial = event.serialNumber;
                if (serial) {
                    const cleanSerial = serial.replace(/:/g, '').toUpperCase();
                    setFormData((prev) => ({ ...prev, rfid: cleanSerial }));
                    toast.success(`Kartu terbaca: ${cleanSerial}`);
                    if (nfcAbortRef.current) {
                        nfcAbortRef.current.abort();
                        nfcAbortRef.current = null;
                    }
                    setIsScanningNfc(false);
                }
            };
        } catch (err: any) {
            setIsScanningNfc(false);
            toast.error(err.message || 'Gagal membaca sensor NFC.');
        }
    };

    const stopModalNfcScan = () => {
        if (nfcAbortRef.current) {
            nfcAbortRef.current.abort();
            nfcAbortRef.current = null;
        }
        setIsScanningNfc(false);
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
        student.nisn.includes(search) ||
        (student.rfid && student.rfid.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Siswa</h1>
                    <p className="text-slate-500">Kelola data santri, NISN, dan nomor kartu RFID / NFC per unit</p>
                </div>
                <ButtonGlass onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2">
                    <Plus size={18} /> Tambah Siswa
                </ButtonGlass>
            </div>

            <CardGlass className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <InputGlass
                            placeholder="Cari nama, NISN, atau nomor RFID..."
                            icon={Search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {user?.role_id === 1 ? (
                            <select
                                className="glass-input bg-white/5 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                value={unitID}
                                onChange={(e) => setUnitID(Number(e.target.value))}
                            >
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="glass-input bg-white/5 border border-slate-200 rounded-xl px-4 py-3 text-slate-900">
                                {getUnitName(unitID)}
                            </div>
                        )}
                    </div>
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>NISN</TableHeadGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>RFID / NFC</TableHeadGlass>
                            <TableHeadGlass>Kelas</TableHeadGlass>
                            <TableHeadGlass>Orang Tua</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={6} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : filteredStudents?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={6} className="text-center py-8">Tidak ada data siswa</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredStudents?.map((student: Student) => (
                                <TableRowGlass key={student.id}>
                                    <TableCellGlass>
                                        <span className="font-mono text-slate-600">{student.nisn}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-600">
                                                <User size={14} />
                                            </div>
                                            <span className="font-medium text-slate-900">{student.user.name}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {student.rfid ? (
                                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                <Radio size={12} /> {student.rfid}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Belum Ada</span>
                                        )}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                            {student.class?.name || '-'}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-900">{student.parent?.user?.name || '-'}</span>
                                            {student.parent?.user?.phone && (
                                                <span className="text-xs text-slate-500">{student.parent.user.phone}</span>
                                            )}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors"
                                                title="Edit Data & RFID"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-red-600 transition-colors"
                                                title="Hapus Siswa"
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
                onClose={() => {
                    stopModalNfcScan();
                    setIsModalOpen(false);
                }}
                title={editingStudent ? "Edit Data & Kartu Siswa" : "Tambah Siswa Baru"}
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

                    {/* RFID Field with Scan helper */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-900/80 ml-1">
                                UID / Nomor Kartu RFID (Opsional)
                            </label>
                            {isScanningNfc ? (
                                <button
                                    type="button"
                                    onClick={stopModalNfcScan}
                                    className="text-xs text-red-600 font-bold flex items-center gap-1 hover:underline"
                                >
                                    <XCircle size={13} /> Batal Scan NFC
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startModalNfcScan}
                                    className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                                >
                                    <Smartphone size={13} /> Scan via HP NFC
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.rfid}
                                onChange={(e) => setFormData({ ...formData, rfid: e.target.value })}
                                placeholder="Contoh: 04A1B2C3 atau tap kartu dengan USB Reader..."
                                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:ring-2 focus:ring-emerald-500 bg-white ${
                                    isScanningNfc ? 'border-emerald-500 ring-2 ring-emerald-200 animate-pulse' : 'border-slate-200'
                                }`}
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {isScanningNfc
                                ? '🟢 Mendengarkan kartu... Tempelkan kartu ke bodi belakang smartphone.'
                                : 'Dapat diisi otomatis dengan menempelkan kartu ke USB reader saat input ini aktif.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-900/80 mb-1 ml-1">Kelas</label>
                        <select
                            value={formData.class_id}
                            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                            required
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-900/80 mb-1 ml-1">Orang Tua</label>
                        <select
                            value={formData.parent_id}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Pilih Orang Tua (Opsional) --</option>
                            {parentsList?.map((p: any) => (
                                <option key={p.id} value={p.user?.id || p.user_id || ''}>{p.user?.name || 'Unknown'}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <ButtonGlass type="button" variant="ghost" onClick={() => {
                            stopModalNfcScan();
                            setIsModalOpen(false);
                        }}>
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
