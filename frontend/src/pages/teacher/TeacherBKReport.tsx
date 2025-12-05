import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { AlertTriangle, Save } from 'lucide-react';

interface Student {
    id: string;
    user: {
        name: string;
    };
    class: {
        name: string;
    };
}

const TeacherBKReport: React.FC = () => {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [type, setType] = useState<'call' | 'violation'>('call');
    const [points, setPoints] = useState(0); // Only for violations

    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const res = await api.get('/students/');
            return res.data as Student[];
        }
    });

    const createCallMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/bk/calls', data);
        },
        onSuccess: () => {
            alert('Panggilan BK berhasil dibuat');
            setReason('');
            setSelectedStudentId('');
        },
        onError: (err: any) => {
            alert('Gagal membuat panggilan: ' + (err.response?.data?.error || err.message));
        }
    });

    const createViolationMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/bk/violations', data);
        },
        onSuccess: () => {
            alert('Pelanggaran berhasil dilaporkan');
            setReason('');
            setPoints(0);
            setSelectedStudentId('');
        },
        onError: (err: any) => {
            alert('Gagal melaporkan pelanggaran: ' + (err.response?.data?.error || err.message));
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) {
            alert('Pilih siswa terlebih dahulu');
            return;
        }

        if (type === 'call') {
            createCallMutation.mutate({
                student_id: selectedStudentId,
                date: new Date(date).toISOString(),
                reason: reason,
                status: 'Pending'
            });
        } else {
            createViolationMutation.mutate({
                student_id: selectedStudentId,
                date: new Date(date).toISOString(),
                violation_name: reason,
                points: Number(points)
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="text-yellow-600" /> Lapor BK
                </h1>
                <p className="text-slate-600">Laporkan pelanggaran atau buat panggilan BK untuk siswa</p>
            </div>

            <CardGlass className="p-6 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">Jenis Laporan</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setType('call')}
                                className={`flex-1 py-2 rounded-lg border transition-all ${type === 'call'
                                    ? 'bg-yellow-100 border-yellow-200 text-yellow-600'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Panggilan BK
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('violation')}
                                className={`flex-1 py-2 rounded-lg border transition-all ${type === 'violation'
                                    ? 'bg-red-100 border-red-200 text-red-600'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Pelanggaran
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">Pilih Siswa</label>
                        <select
                            className="w-full glass-input text-slate-900 bg-white/50 border-slate-200 focus:border-purple-500"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            required
                        >
                            <option value="" className="bg-white">-- Cari Siswa --</option>
                            {students?.map((student) => (
                                <option key={student.id} value={student.id} className="bg-white">
                                    {student.user.name} - {student.class?.name || 'Tanpa Kelas'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">Tanggal</label>
                        <InputGlass
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">
                            {type === 'call' ? 'Alasan Panggilan' : 'Nama Pelanggaran'}
                        </label>
                        <textarea
                            className="w-full glass-input min-h-[100px] text-slate-900 bg-white/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-purple-500"
                            placeholder={type === 'call' ? 'Contoh: Sering terlambat masuk kelas...' : 'Contoh: Merokok di area sekolah...'}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        />
                    </div>

                    {type === 'violation' && (
                        <div className="space-y-2">
                            <label className="text-sm text-slate-600">Poin Pelanggaran</label>
                            <InputGlass
                                type="number"
                                placeholder="Contoh: 10"
                                value={points}
                                onChange={(e) => setPoints(Number(e.target.value))}
                                required
                            />
                        </div>
                    )}

                    <div className="pt-4">
                        <ButtonGlass
                            type="submit"
                            className="w-full flex justify-center items-center gap-2"
                            disabled={createCallMutation.isPending || createViolationMutation.isPending}
                        >
                            <Save size={18} />
                            {createCallMutation.isPending || createViolationMutation.isPending ? 'Menyimpan...' : 'Kirim Laporan'}
                        </ButtonGlass>
                    </div>
                </form>
            </CardGlass>
        </div>
    );
};

export default TeacherBKReport;
