import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { AlertTriangle, Phone, Plus } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import { useAuth } from '../../context/AuthContext';

interface Violation {
    id: string;
    name: string;
    points: number;
    description: string;
}

interface BKCall {
    id: string;
    student: {
        user: {
            name: string;
        };
    };
    teacher: {
        user: {
            name: string;
        };
    };
    reason: string;
    date: string;
    status: string;
}

interface Student {
    id: string;
    user: {
        name: string;
    };
}

interface Teacher {
    id: string;
    name: string;
}

const BK: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'violations' | 'calls'>('violations');
    const [unitID, setUnitID] = useState(user?.unit_id || 1);
    const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // --- Violations State & Queries ---
    const [newViolation, setNewViolation] = useState({ name: '', points: 0, description: '' });

    const { data: violations } = useQuery({
        queryKey: ['violations'],
        queryFn: async () => {
            const res = await api.get('/bk/violations');
            return res.data;
        },
    });

    const createViolationMutation = useMutation({
        mutationFn: (data: typeof newViolation) => api.post('/bk/violations', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['violations'] });
            setIsViolationModalOpen(false);
            setNewViolation({ name: '', points: 0, description: '' });
        },
    });

    // --- Calls State & Queries ---
    const [newCall, setNewCall] = useState({ student_id: '', teacher_id: '', reason: '', date: '' });

    const { data: calls } = useQuery({
        queryKey: ['bk_calls', unitID],
        queryFn: async () => {
            const res = await api.get(`/bk/calls?unit_id=${unitID}`);
            return res.data;
        },
    });

    // Fetch Students & Teachers for Dropdowns
    const { data: students } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
            return res.data;
        },
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers', unitID],
        queryFn: async () => {
            const res = await api.get(`/teachers?unit_id=${unitID}`); // Role 4 is Teacher
            return res.data;
        },
    });

    const createCallMutation = useMutation({
        mutationFn: (data: typeof newCall) => api.post('/bk/calls', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bk_calls'] });
            setIsCallModalOpen(false);
            setNewCall({ student_id: '', teacher_id: '', reason: '', date: '' });
        },
    });

    // --- Render Helpers ---

    const renderViolations = () => {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Daftar Jenis Pelanggaran</h2>
                    <ButtonGlass onClick={() => setIsViolationModalOpen(true)} className="flex items-center gap-2">
                        <Plus size={18} /> Tambah Pelanggaran
                    </ButtonGlass>
                </div>
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama Pelanggaran</TableHeadGlass>
                            <TableHeadGlass>Poin</TableHeadGlass>
                            <TableHeadGlass>Deskripsi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {violations?.map((v: Violation) => (
                            <TableRowGlass key={v.id}>
                                <TableCellGlass>
                                    <span className="font-medium text-white">{v.name}</span>
                                </TableCellGlass>
                                <TableCellGlass>
                                    <span className="text-red-400 font-bold">+{v.points}</span>
                                </TableCellGlass>
                                <TableCellGlass>
                                    <span className="text-gray-400">{v.description || '-'}</span>
                                </TableCellGlass>
                            </TableRowGlass>
                        ))}
                        {violations?.length === 0 && (
                            <TableRowGlass>
                                <TableCellGlass colSpan={3} className="text-center py-8">Tidak ada data pelanggaran</TableCellGlass>
                            </TableRowGlass>
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </div>
        );
    };

    const renderCalls = () => {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Riwayat Pemanggilan</h2>
                    <ButtonGlass onClick={() => setIsCallModalOpen(true)} className="flex items-center gap-2">
                        <Phone size={18} /> Buat Pemanggilan
                    </ButtonGlass>
                </div>
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Siswa</TableHeadGlass>
                            <TableHeadGlass>Guru Pemanggil</TableHeadGlass>
                            <TableHeadGlass>Alasan</TableHeadGlass>
                            <TableHeadGlass>Tanggal</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {calls?.map((c: BKCall) => (
                            <TableRowGlass key={c.id}>
                                <TableCellGlass>
                                    <span className="font-medium text-white">{c.student?.user?.name || 'Unknown'}</span>
                                </TableCellGlass>
                                <TableCellGlass>
                                    <span className="text-gray-300">{c.teacher?.user?.name || 'Unknown'}</span>
                                </TableCellGlass>
                                <TableCellGlass>
                                    <span className="text-gray-300">{c.reason}</span>
                                </TableCellGlass>
                                <TableCellGlass>
                                    <span className="text-gray-400">{new Date(c.date).toLocaleDateString('id-ID')}</span>
                                </TableCellGlass>
                                <TableCellGlass>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {c.status}
                                    </span>
                                </TableCellGlass>
                            </TableRowGlass>
                        ))}
                        {calls?.length === 0 && (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Tidak ada data pemanggilan</TableCellGlass>
                            </TableRowGlass>
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Bimbingan Konseling</h1>
                    <p className="text-gray-400">Manajemen pelanggaran dan pemanggilan siswa</p>
                </div>
                {/* Unit Switcher for Admins */}
                {(user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3) && (
                    <div className="flex items-center gap-2">
                        <select
                            value={unitID}
                            onChange={(e) => setUnitID(Number(e.target.value))}
                            className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={user?.role_id !== 1} // Only Super Admin can switch
                        >
                            <option value={1} className="bg-gray-900">MTS</option>
                            <option value={2} className="bg-gray-900">MA</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex space-x-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('violations')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'violations' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <AlertTriangle size={18} />
                    Jenis Pelanggaran
                </button>
                <button
                    onClick={() => setActiveTab('calls')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'calls' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Phone size={18} />
                    Pemanggilan BK
                </button>
            </div>

            <CardGlass className="p-6">
                {activeTab === 'violations' ? renderViolations() : renderCalls()}
            </CardGlass>

            {/* Modal Create Violation */}
            <ModalGlass
                isOpen={isViolationModalOpen}
                onClose={() => setIsViolationModalOpen(false)}
                title="Tambah Jenis Pelanggaran"
            >
                <div className="space-y-4">
                    <InputGlass
                        label="Nama Pelanggaran"
                        placeholder="Contoh: Terlambat"
                        value={newViolation.name}
                        onChange={(e) => setNewViolation({ ...newViolation, name: e.target.value })}
                    />
                    <InputGlass
                        label="Poin"
                        type="number"
                        placeholder="Contoh: 5"
                        value={newViolation.points}
                        onChange={(e) => setNewViolation({ ...newViolation, points: parseInt(e.target.value) })}
                    />
                    <InputGlass
                        label="Deskripsi"
                        placeholder="Keterangan tambahan..."
                        value={newViolation.description}
                        onChange={(e) => setNewViolation({ ...newViolation, description: e.target.value })}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setIsViolationModalOpen(false)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => createViolationMutation.mutate(newViolation)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>

            {/* Modal Create Call */}
            <ModalGlass
                isOpen={isCallModalOpen}
                onClose={() => setIsCallModalOpen(false)}
                title="Buat Pemanggilan BK"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Siswa</label>
                        <select
                            className="w-full glass-input text-gray-900"
                            value={newCall.student_id}
                            onChange={(e) => setNewCall({ ...newCall, student_id: e.target.value })}
                        >
                            <option value="">-- Pilih Siswa --</option>
                            {students?.map((s: Student) => (
                                <option key={s.id} value={s.id}>{s.user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Guru Pemanggil</label>
                        <select
                            className="w-full glass-input text-gray-900"
                            value={newCall.teacher_id}
                            onChange={(e) => setNewCall({ ...newCall, teacher_id: e.target.value })}
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers?.map((t: Teacher) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <InputGlass
                        label="Alasan Pemanggilan"
                        placeholder="Contoh: Merokok di kantin"
                        value={newCall.reason}
                        onChange={(e) => setNewCall({ ...newCall, reason: e.target.value })}
                    />
                    <InputGlass
                        label="Tanggal"
                        type="date"
                        value={newCall.date}
                        onChange={(e) => setNewCall({ ...newCall, date: e.target.value })}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <ButtonGlass variant="secondary" onClick={() => setIsCallModalOpen(false)}>Batal</ButtonGlass>
                        <ButtonGlass onClick={() => createCallMutation.mutate(newCall)}>Simpan</ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default BK;
