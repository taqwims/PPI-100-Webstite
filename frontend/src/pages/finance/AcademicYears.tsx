import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, Calendar, X, CheckCircle, ArrowRightLeft, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
}

const AcademicYears = () => {
    const { user } = useAuth();
    const canEdit = user?.role_id === 1 || user?.role_id === 9;

    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<AcademicYear | null>(null);
    const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false });

    // Rollover state
    const [showRollover, setShowRollover] = useState(false);
    const [rolloverFrom, setRolloverFrom] = useState('');
    const [rolloverTo, setRolloverTo] = useState('');
    const [isRollingOver, setIsRollingOver] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/academic-years');
            setYears(res.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleEdit = (item: AcademicYear) => {
        setEditItem(item);
        setForm({
            name: item.name,
            start_date: item.start_date ? item.start_date.split('T')[0] : '',
            end_date: item.end_date ? item.end_date.split('T')[0] : '',
            is_active: item.is_active
        });
        setShowModal(true);
    };

    const handleClose = () => { setShowModal(false); setEditItem(null); setForm({ name: '', start_date: '', end_date: '', is_active: false }); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: form.name,
            start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
            end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
            is_active: form.is_active,
        };
        try {
            if (editItem) {
                await api.put(`/finance/academic-years/${editItem.id}`, payload);
                toast.success('Tahun ajaran diperbarui');
            } else {
                await api.post('/finance/academic-years', payload);
                toast.success('Tahun ajaran ditambahkan');
            }
            handleClose();
            fetchData();
        } catch (err: any) {
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus tahun ajaran ini?')) return;
        try {
            await api.delete(`/finance/academic-years/${id}`);
            toast.success('Berhasil dihapus');
            fetchData();
        } catch (err: any) { }
    };

    const handleSetActive = async (id: number) => {
        try {
            await api.put(`/finance/academic-years/${id}/set-active`);
            toast.success('Tahun ajaran diaktifkan');
            fetchData();
        } catch (err: any) { }
    };

    const handleRollover = async () => {
        if (!rolloverFrom || !rolloverTo || rolloverFrom === rolloverTo) {
            toast.error('Pilih tahun ajaran asal dan tujuan yang berbeda');
            return;
        }
        setIsRollingOver(true);
        try {
            const res = await api.post('/finance/academic-years/rollover', {
                from_year_id: parseInt(rolloverFrom),
                to_year_id: parseInt(rolloverTo),
            });
            toast.success(res.data.message || 'Rollover berhasil');
            setShowRollover(false);
            setRolloverFrom('');
            setRolloverTo('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal melakukan rollover');
        } finally {
            setIsRollingOver(false);
        }
    };

    const fromYear = years.find(y => y.id === parseInt(rolloverFrom));
    const toYear = years.find(y => y.id === parseInt(rolloverTo));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tahun Ajaran</h1>
                    <p className="text-slate-500 mt-1">Kelola periode tahun ajaran dan transisi data keuangan.</p>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <button onClick={() => setShowRollover(true)} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 shadow-sm transition">
                            <ArrowRightLeft size={18} /> Rollover Tunggakan
                        </button>
                        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition">
                            <Plus size={18} /> Tambah Tahun Ajaran
                        </button>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex gap-3">
                    <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Tentang Rollover Tunggakan</p>
                        <p>Fitur <b>Rollover</b> akan menyalin semua tanggungan siswa yang belum lunas (Unpaid/Partial) dari tahun ajaran lama ke tahun ajaran baru. Hanya sisa hutang yang dipindahkan, bukan jumlah penuh. Tanggungan yang sudah lunas <b>tidak</b> akan ikut dipindahkan.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="px-6 py-4 font-medium">Nama</th>
                                <th className="px-6 py-4 font-medium">Tanggal Mulai</th>
                                <th className="px-6 py-4 font-medium">Tanggal Selesai</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                {canEdit && <th className="px-6 py-4 font-medium text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
                            ) : years.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Belum ada tahun ajaran</td></tr>
                            ) : years.map(y => (
                                <tr key={y.id} className={`hover:bg-slate-50/50 transition-colors ${y.is_active ? 'bg-green-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className={y.is_active ? 'text-green-600' : 'text-slate-400'} />
                                            <span className="font-medium text-slate-900">{y.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{y.start_date ? new Date(y.start_date).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">{y.end_date ? new Date(y.end_date).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="px-6 py-4">
                                        {y.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <CheckCircle size={12} /> Aktif
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Nonaktif</span>
                                        )}
                                    </td>
                                    {canEdit && (
                                        <td className="px-6 py-4 text-center space-x-1">
                                            {!y.is_active && (
                                                <button onClick={() => handleSetActive(y.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Set Aktif">
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(y)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(y.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">{editItem ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}</h2>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Tahun Ajaran</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="2024/2025" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" id="ay-active" />
                                <label htmlFor="ay-active" className="text-sm text-slate-700">Set sebagai tahun ajaran aktif</label>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition text-sm">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rollover Modal */}
            {showRollover && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
                            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                                <ArrowRightLeft size={20} /> Rollover Tunggakan
                            </h2>
                            <button onClick={() => setShowRollover(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <p className="text-sm text-slate-600">
                                Pindahkan seluruh tunggakan siswa yang <b>belum lunas</b> (Unpaid/Partial) dari tahun ajaran lama ke tahun ajaran baru. 
                                Hanya <b>sisa hutang</b> yang akan dipindahkan.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">Dari Tahun Ajaran</label>
                                    <select
                                        value={rolloverFrom}
                                        onChange={(e) => setRolloverFrom(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                                    >
                                        <option value="">-- Pilih Asal --</option>
                                        {years.map(y => (
                                            <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">Ke Tahun Ajaran</label>
                                    <select
                                        value={rolloverTo}
                                        onChange={(e) => setRolloverTo(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                                    >
                                        <option value="">-- Pilih Tujuan --</option>
                                        {years.filter(y => y.id !== parseInt(rolloverFrom)).map(y => (
                                            <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {fromYear && toYear && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                                    <p className="font-semibold">Konfirmasi:</p>
                                    <p className="mt-1">
                                        Semua tunggakan yang belum lunas dari <b>{fromYear.name}</b> akan dipindahkan ke <b>{toYear.name}</b> sebagai tanggungan baru.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setShowRollover(false)} 
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleRollover}
                                    disabled={isRollingOver || !rolloverFrom || !rolloverTo}
                                    className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isRollingOver ? (
                                        <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                                    ) : (
                                        <><ArrowRightLeft size={16} /> Mulai Rollover</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademicYears;
