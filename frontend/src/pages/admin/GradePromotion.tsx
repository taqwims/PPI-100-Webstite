import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import { Search, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import toast from 'react-hot-toast';

const GradePromotion: React.FC = () => {
    const { user } = useAuth();
    const { units, defaultUnitId } = useUnits();
    const [unitID, setUnitID] = useState(user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId);
    const [sourceClassID, setSourceClassID] = useState<number | ''>('');
    const [targetClassID, setTargetClassID] = useState<number | ''>('');
    const [action, setAction] = useState<'promote' | 'graduate'>('promote');
    const [search, setSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    
    // Auto bill states
    const [autoBill, setAutoBill] = useState(false);
    const [paymentTypeID, setPaymentTypeID] = useState<number | ''>('');
    const [academicYearID, setAcademicYearID] = useState<number | ''>('');

    const queryClient = useQueryClient();

    // Fetch Classes
    const { data: classes } = useQuery({
        queryKey: ['classes', unitID],
        queryFn: async () => {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    // Fetch Students
    const { data: allStudents, isLoading: isLoadingStudents } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    // Fetch Payment Types for Auto Bill
    const { data: paymentTypes } = useQuery({
        queryKey: ['payment_types', unitID],
        queryFn: async () => {
            const res = await api.get(`/finance/payment-types?unit_id=${unitID}`);
            return res.data || [];
        },
    });

    // Fetch Academic Years for Auto Bill
    const { data: academicYears } = useQuery({
        queryKey: ['academic_years'],
        queryFn: async () => {
            const res = await api.get('/finance/academic-years');
            return res.data || [];
        },
    });

    // Filter students by selected source class
    const sourceStudents = useMemo(() => {
        if (!allStudents || sourceClassID === '') return [];
        return allStudents.filter((s: any) => s.class?.id === sourceClassID && s.status === 'Active');
    }, [allStudents, sourceClassID]);

    const filteredStudents = useMemo(() => {
        if (!search) return sourceStudents;
        return sourceStudents.filter((s: any) => 
            s.user.name.toLowerCase().includes(search.toLowerCase()) || 
            s.nisn.includes(search)
        );
    }, [sourceStudents, search]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudents(filteredStudents.map((s: any) => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (id: string) => {
        setSelectedStudents((prev) => 
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const promoteMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/students/bulk-promote', payload);
            return res.data;
        },
        onSuccess: (data: any) => {
            toast.success(data?.message || (action === 'promote' ? 'Berhasil menaikkan kelas siswa' : 'Berhasil meluluskan siswa'));
            setSelectedStudents([]);
            setSourceClassID('');
            setTargetClassID('');
            // Invalidate ALL queries that reference student data so every page sees the updated class
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            queryClient.invalidateQueries({ queryKey: ['student_obligations'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Gagal memproses data');
        }
    });

    const handleSubmit = () => {
        if (selectedStudents.length === 0) {
            toast.error('Pilih minimal 1 siswa');
            return;
        }

        if (action === 'promote' && targetClassID === '') {
            toast.error('Pilih kelas tujuan');
            return;
        }

        if (action === 'promote' && sourceClassID === targetClassID) {
            toast.error('Kelas tujuan tidak boleh sama dengan kelas asal');
            return;
        }

        if (autoBill && action === 'promote') {
            if (paymentTypeID === '' || academicYearID === '') {
                toast.error('Pilih Jenis Tagihan dan Tahun Ajaran untuk Tagihan Otomatis');
                return;
            }
        }

        const payload = {
            student_ids: selectedStudents,
            action,
            next_class_id: action === 'promote' ? Number(targetClassID) : 0,
            auto_bill: autoBill && action === 'promote',
            payment_type_id: autoBill ? Number(paymentTypeID) : 0,
            academic_year_id: autoBill ? Number(academicYearID) : 0,
        };

        if (confirm(`Apakah Anda yakin ingin ${action === 'promote' ? 'menaikkan kelas' : 'meluluskan'} ${selectedStudents.length} siswa terpilih?`)) {
            promoteMutation.mutate(payload);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kenaikan Kelas & Kelulusan</h1>
                    <p className="text-slate-600">Pindahkan siswa ke tingkat selanjutnya atau proses kelulusan</p>
                </div>
                {user?.role_id === 1 && (
                    <select
                        className="glass-input bg-white/40 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        value={unitID}
                        onChange={(e) => {
                            setUnitID(Number(e.target.value));
                            setSourceClassID('');
                            setTargetClassID('');
                            setSelectedStudents([]);
                        }}
                    >
                        {units.map(u => (
                            <option key={u.id} value={u.id} className="bg-white">{u.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <CardGlass className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <ArrowRight size={20} className="text-purple-600" /> Pengaturan Tindakan
                        </h2>
                        
                        <div className="space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Tindakan</label>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setAction('promote')}
                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${action === 'promote' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Naik Kelas
                                    </button>
                                    <button
                                        onClick={() => setAction('graduate')}
                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${action === 'graduate' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Lulus
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kelas Asal</label>
                                <select 
                                    className="w-full glass-input bg-white/50 border border-slate-200"
                                    value={sourceClassID}
                                    onChange={(e) => {
                                        setSourceClassID(e.target.value === '' ? '' : Number(e.target.value));
                                        setSelectedStudents([]);
                                    }}
                                >
                                    <option value="" className="bg-white">-- Pilih Kelas Asal --</option>
                                    {classes?.map((c: any) => (
                                        <option key={c.id} value={c.id} className="bg-white">{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {action === 'promote' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kelas Tujuan</label>
                                    <select 
                                        className="w-full glass-input bg-white/50 border border-slate-200"
                                        value={targetClassID}
                                        onChange={(e) => setTargetClassID(e.target.value === '' ? '' : Number(e.target.value))}
                                    >
                                        <option value="" className="bg-white">-- Pilih Kelas Tujuan --</option>
                                        {classes?.filter((c: any) => c.id !== sourceClassID).map((c: any) => (
                                            <option key={c.id} value={c.id} className="bg-white">{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {action === 'promote' && (
                                <div className="border hover:border-purple-300 border-slate-200 rounded-xl p-4 bg-purple-50/30 transition-colors">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-600"
                                            checked={autoBill}
                                            onChange={(e) => setAutoBill(e.target.checked)}
                                        />
                                        <div>
                                            <span className="block text-sm font-semibold text-slate-900">Buat Tagihan Otomatis</span>
                                            <span className="block text-xs text-slate-500 mt-1">Otomatis buatkan SPP bulan Juli/Tagihan Awal Tahun</span>
                                        </div>
                                    </label>

                                    {autoBill && (
                                        <div className="mt-4 space-y-3 pl-7">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Tagihan (Misal: SPP)</label>
                                                <select 
                                                    className="w-full text-sm bg-white/70 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
                                                    value={paymentTypeID}
                                                    onChange={(e) => setPaymentTypeID(e.target.value === '' ? '' : Number(e.target.value))}
                                                >
                                                    <option value="" className="bg-white">-- Pilih Tagihan --</option>
                                                    {paymentTypes?.map((pt: any) => (
                                                        <option key={pt.id} value={pt.id} className="bg-white">{pt.name} (Rp. {pt.amount.toLocaleString()})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Ajaran Baru</label>
                                                <select 
                                                    className="w-full text-sm bg-white/70 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
                                                    value={academicYearID}
                                                    onChange={(e) => setAcademicYearID(e.target.value === '' ? '' : Number(e.target.value))}
                                                >
                                                    <option value="" className="bg-white">-- Pilih Tahun Ajaran --</option>
                                                    {academicYears?.map((ay: any) => (
                                                        <option key={ay.id} value={ay.id} className="bg-white">{ay.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-4">
                                <ButtonGlass 
                                    className="w-full justify-center" 
                                    onClick={handleSubmit}
                                    disabled={promoteMutation.isPending || selectedStudents.length === 0}
                                >
                                    {promoteMutation.isPending ? 'Memproses...' : 
                                        action === 'graduate' ? `Luluskan (${selectedStudents.length}) Siswa` : `Naikan Kelas (${selectedStudents.length}) Siswa`
                                    }
                                </ButtonGlass>
                                {action === 'promote' && (
                                    <p className="text-xs text-slate-500 mt-3 text-center">
                                        <AlertCircle size={12} className="inline mr-1" />
                                        Jangan ceklis siswa yang <b>tinggal kelas</b>.
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardGlass>
                </div>

                <div className="lg:col-span-2">
                    <CardGlass className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Daftar Siswa</h2>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Cari siswa..."
                                    className="w-full bg-white/40 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    title="Cari"
                                />
                            </div>
                        </div>

                        {sourceClassID === '' ? (
                            <div className="text-center py-12 text-slate-500">
                                <CheckCircle size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>Silakan pilih <b>Kelas Asal</b> terlebih dahulu untuk melihat daftar siswa.</p>
                            </div>
                        ) : (
                            <TableGlass>
                                <TableHeaderGlass>
                                    <TableRowGlass>
                                        <TableHeadGlass className="w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-600"
                                                checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                                onChange={handleSelectAll}
                                                title="Pilih Semua"
                                            />
                                        </TableHeadGlass>
                                        <TableHeadGlass>NISN</TableHeadGlass>
                                        <TableHeadGlass>Nama Siswa</TableHeadGlass>
                                        <TableHeadGlass>Status</TableHeadGlass>
                                    </TableRowGlass>
                                </TableHeaderGlass>
                                <TableBodyGlass>
                                    {isLoadingStudents ? (
                                        <TableRowGlass>
                                            <TableCellGlass colSpan={4} className="text-center py-8">Memuat data...</TableCellGlass>
                                        </TableRowGlass>
                                    ) : filteredStudents.length === 0 ? (
                                        <TableRowGlass>
                                            <TableCellGlass colSpan={4} className="text-center py-8">Tidak ada data siswa ditemukan</TableCellGlass>
                                        </TableRowGlass>
                                    ) : (
                                        filteredStudents.map((student: any) => (
                                            <TableRowGlass key={student.id} className={selectedStudents.includes(student.id) ? 'bg-purple-50/30' : ''}>
                                                <TableCellGlass className="text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-600"
                                                        checked={selectedStudents.includes(student.id)}
                                                        onChange={() => handleSelectStudent(student.id)}
                                                        title="Pilih Siswa"
                                                    />
                                                </TableCellGlass>
                                                <TableCellGlass className="font-mono text-sm">{student.nisn}</TableCellGlass>
                                                <TableCellGlass className="font-medium text-slate-900">{student.user?.name}</TableCellGlass>
                                                <TableCellGlass>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {student.status}
                                                    </span>
                                                </TableCellGlass>
                                            </TableRowGlass>
                                        ))
                                    )}
                                </TableBodyGlass>
                            </TableGlass>
                        )}
                    </CardGlass>
                </div>
            </div>
        </div>
    );
};

export default GradePromotion;
