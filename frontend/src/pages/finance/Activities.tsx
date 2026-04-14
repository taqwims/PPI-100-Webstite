import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Calendar, Edit2, Trash2, X, Activity as ActivityIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AcademicYear { id: number; name: string; is_active: boolean; }

interface Activity {
    id: string;
    academic_year_id: number;
    academic_year: AcademicYear;
    name: string;
    description: string;
    target_amount: number;
    start_date: string;
    end_date: string;
    status: string;
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

const Activities = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canManage = [1, 8, 9].includes(user?.role_id || 0);

    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [filterYearId, setFilterYearId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Activity | null>(null);
    const [form, setForm] = useState({
        academic_year_id: '', name: '', description: '',
        target_amount: '', start_date: '', end_date: '', status: 'Active'
    });

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    const fetchAcademicYears = async () => {
        try {
            const res = await api.get('/finance/academic-years');
            const years: AcademicYear[] = res.data || [];
            setAcademicYears(years);
            const active = years.find(y => y.is_active);
            if (active && !filterYearId) {
                setFilterYearId(String(active.id));
                setForm(prev => ({ ...prev, academic_year_id: String(active.id) }));
            }
        } catch (e) { console.error(e); }
    };

    const { data: activities = [], isLoading } = useQuery<Activity[]>({
        queryKey: ['activities', filterYearId],
        queryFn: async () => {
            if (!filterYearId) return [];
            return (await api.get(`/finance/activities?academic_year_id=${filterYearId}`)).data || [];
        },
        enabled: !!filterYearId
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/activities', { ...data, target_amount: parseFloat(data.target_amount), academic_year_id: parseInt(data.academic_year_id) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setShowModal(false);
            toast.success('Kegiatan berhasil ditambahkan');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/finance/activities/${editItem?.id}`, { ...data, target_amount: parseFloat(data.target_amount), academic_year_id: parseInt(data.academic_year_id) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setShowModal(false);
            toast.success('Kegiatan berhasil diupdate');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/finance/activities/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            toast.success('Kegiatan berhasil dihapus');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            start_date: new Date(form.start_date).toISOString(),
            end_date: new Date(form.end_date).toISOString(),
        };
        if (editItem) updateMutation.mutate(payload);
        else createMutation.mutate(payload);
    };

    const openEdit = (a: Activity) => {
        setEditItem(a);
        setForm({
            academic_year_id: String(a.academic_year_id),
            name: a.name,
            description: a.description,
            target_amount: String(a.target_amount),
            start_date: a.start_date.split('T')[0],
            end_date: a.end_date.split('T')[0],
            status: a.status
        });
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Hapus kegiatan ini beserta seluruh data tagihan dan keuangannya?')) {
            deleteMutation.mutate(id);
        }
    };

    const filtered = activities.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Laporan Ringkasan Kegiatan Siswa', 14, 22);

        const yearName = academicYears.find(y => String(y.id) === filterYearId)?.name || '';
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Tahun Ajaran: ${yearName}`, 14, 30);

        const tableData = filtered.map((a, i) => [
            i + 1,
            a.name,
            `${formatDate(a.start_date)} - ${formatDate(a.end_date)}`,
            formatCurrency(a.target_amount),
            a.status === 'Active' ? 'Berjalan' : 'Selesai'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['No', 'Nama Kegiatan', 'Periode', 'Tagihan/Siswa', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.save(`Ringkasan_Kegiatan_${yearName || 'All'}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kegiatan Siswa</h1>
                    <p className="text-slate-500 mt-1">Kelola event, tagihan, dan keuangan per kegiatan.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportPDF} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 shadow-sm transition h-10">
                        Export PDF
                    </button>
                    {canManage && (
                        <button onClick={() => {
                            setEditItem(null);
                            setForm({ academic_year_id: filterYearId, name: '', description: '', target_amount: '', start_date: '', end_date: '', status: 'Active' });
                            setShowModal(true);
                        }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition h-10">
                            <Plus size={18} /> Buat Kegiatan Baru
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Cari nama kegiatan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm" />
                    </div>
                    <select value={filterYearId} onChange={e => setFilterYearId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>)}
                    </select>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="py-12 text-center text-slate-400">Memuat data kegiatan...</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <ActivityIcon size={40} className="mx-auto mb-3 text-slate-300" />
                            <p>Belum ada kegiatan untuk tahun ajaran ini.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map(a => (
                                <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-900 line-clamp-1">{a.name}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {a.status === 'Active' ? 'Berjalan' : 'Selesai'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 flex items-center gap-1.5 line-clamp-1">
                                                <Calendar size={12} /> {formatDate(a.start_date)} - {formatDate(a.end_date)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="py-3 border-y border-slate-100 my-3">
                                        <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">{a.description || 'Tidak ada deskripsi.'}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tagihan per Siswa</p>
                                            <p className="font-semibold text-slate-800">{formatCurrency(a.target_amount)}</p>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canManage && (
                                                <>
                                                    <button onClick={() => openEdit(a)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition" title="Edit"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(a.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition" title="Hapus"><Trash2 size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <Link to={`/dashboard/finance/activities/${a.id}`} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold transition group-hover/card:bg-blue-600 group-hover/card:text-white">
                                        Kelola Keuangan <ArrowRight size={16} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ActivityIcon size={20} className="text-blue-600" />
                                {editItem ? 'Edit Kegiatan' : 'Buat Kegiatan Baru'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kegiatan</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="Contoh: Study Tour Kelas 6" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi & Tujuan</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" rows={2} placeholder="Opsional" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Tagihan per Siswa (Rp)</label>
                                <input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required min="0" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required />
                                </div>
                            </div>
                            {editItem && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Kegiatan</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                                        <option value="Active">Berjalan (Active)</option>
                                        <option value="Completed">Selesai (Completed)</option>
                                    </select>
                                </div>
                            )}
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/25 text-sm disabled:opacity-50">
                                    {editItem ? 'Simpan Perubahan' : 'Buat Kegiatan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Activities;
