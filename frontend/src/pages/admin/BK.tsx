import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { AlertTriangle, Phone, Plus } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';

const BK: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'violations' | 'calls'>('violations');
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
        queryKey: ['bk_calls', 1], // Assuming Unit ID 1
        queryFn: async () => {
            const res = await api.get('/bk/calls?unit_id=1');
            return res.data;
        },
    });

    // Fetch Students & Teachers for Dropdowns
    const { data: students } = useQuery({
        queryKey: ['students', 1],
        queryFn: async () => {
            const res = await api.get('/students/?unit_id=1');
            return res.data;
        },
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers', 1],
        queryFn: async () => {
            const res = await api.get('/users/?role_id=4'); // Role 4 is Teacher
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
        const headers = ['Nama Pelanggaran', 'Poin', 'Deskripsi'];
        const data = violations?.map((v: any) => ({
            id: v.ID,
            name: v.Name,
            points: <span className="text-red-400 font-bold">+{v.Points}</span>,
            description: v.Description || '-',
        })) || [];

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Daftar Jenis Pelanggaran</h2>
                    <ButtonGlass onClick={() => setIsViolationModalOpen(true)} icon={Plus}>
                        Tambah Pelanggaran
                    </ButtonGlass>
                </div>
                <TableGlass headers={headers} data={data} />
            </div>
        );
    };

    const renderCalls = () => {
        const headers = ['Siswa', 'Guru Pemanggil', 'Alasan', 'Tanggal', 'Status'];
        const data = calls?.map((c: any) => ({
            id: c.ID,
            student: c.Student?.User?.Name || 'Unknown',
            teacher: c.Teacher?.User?.Name || 'Unknown',
            reason: c.Reason,
            date: new Date(c.Date).toLocaleDateString('id-ID'),
            status: (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.Status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {c.Status}
                </span>
            ),
        })) || [];

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Riwayat Pemanggilan</h2>
                    <ButtonGlass onClick={() => setIsCallModalOpen(true)} icon={Phone}>
                        Buat Pemanggilan
                    </ButtonGlass>
                </div>
                <TableGlass headers={headers} data={data} />
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
                            {students?.map((s: any) => (
                                <option key={s.ID} value={s.ID}>{s.User.Name}</option>
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
                            {teachers?.map((t: any) => (
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
