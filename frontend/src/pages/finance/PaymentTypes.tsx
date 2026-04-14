import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, X, CreditCard, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
}

interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: string;
    category: string;
    is_active: boolean;
    parent_code_id: number | null;
}

interface PaymentType {
    id: number;
    code: string;
    name: string;
    class_id: number | null;
    class?: { id: number; name: string };
    payment_schedule: string;
    amount: number;
    academic_year_id: number;
    academic_year?: AcademicYear;
    transaction_code_id: number | null;
    transaction_code?: TransactionCode;
    is_active: boolean;
}

interface ClassOption { id: number; name: string; }

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const PaymentTypes = () => {
    const { user } = useAuth();
    const canEdit = user?.role_id === 1 || user?.role_id === 9;

    const [types, setTypes] = useState<PaymentType[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [transactionCodes, setTransactionCodes] = useState<TransactionCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<PaymentType | null>(null);
    const [filterYearId, setFilterYearId] = useState<string>('');
    const [form, setForm] = useState({
        code: '', name: '', class_id: '', payment_schedule: 'Bulanan', amount: '', academic_year_id: '', transaction_code_id: '', is_active: true
    });

    useEffect(() => {
        fetchAcademicYears();
        fetchClasses();
        fetchTransactionCodes();
    }, []);

    useEffect(() => { fetchData(); }, [filterYearId]);

    const fetchAcademicYears = async () => {
        try {
            const res = await api.get('/finance/academic-years');
            const years: AcademicYear[] = res.data || [];
            setAcademicYears(years);
            const active = years.find(y => y.is_active);
            if (active && !filterYearId) setFilterYearId(String(active.id));
        } catch (e) { console.error(e); }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get('/academic/classes');
            setClasses(res.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchTransactionCodes = async () => {
        try {
            const res = await api.get('/finance/transaction-codes');
            setTransactionCodes((res.data || []).filter((tc: TransactionCode) => tc.is_active));
        } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const url = filterYearId ? `/finance/payment-types?academic_year_id=${filterYearId}` : '/finance/payment-types';
            const res = await api.get(url);
            setTypes(res.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleEdit = (item: PaymentType) => {
        setEditItem(item);
        setForm({
            code: item.code, name: item.name,
            class_id: item.class_id ? String(item.class_id) : '',
            payment_schedule: item.payment_schedule,
            amount: String(item.amount),
            academic_year_id: String(item.academic_year_id),
            transaction_code_id: item.transaction_code_id ? String(item.transaction_code_id) : '',
            is_active: item.is_active
        });
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setEditItem(null);
        setForm({ code: '', name: '', class_id: '', payment_schedule: 'Bulanan', amount: '', academic_year_id: filterYearId || '', transaction_code_id: '', is_active: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.transaction_code_id) {
            toast.error('Kode transaksi wajib dipilih');
            return;
        }

        const payload: any = {
            code: form.code, name: form.name,
            payment_schedule: form.payment_schedule,
            amount: parseFloat(form.amount),
            academic_year_id: Number(form.academic_year_id),
            transaction_code_id: Number(form.transaction_code_id),
            is_active: form.is_active,
        };
        if (form.class_id) payload.class_id = Number(form.class_id);

        try {
            if (editItem) {
                await api.put(`/finance/payment-types/${editItem.id}`, payload);
                toast.success('Jenis pembayaran diperbarui');
            } else {
                await api.post('/finance/payment-types', payload);
                toast.success('Jenis pembayaran ditambahkan');
            }
            handleClose();
            fetchData();
        } catch (err: any) {
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus jenis pembayaran ini?')) return;
        try {
            await api.delete(`/finance/payment-types/${id}`);
            toast.success('Berhasil dihapus');
            fetchData();
        } catch (err: any) { }
    };

    const scheduleLabel: Record<string, string> = {
        'Bulanan': 'Bulanan', 'Tahunan': 'Tahunan', 'Semesteran': 'Semesteran', 'Bertahap': 'Bertahap'
    };

    // Group transaction codes: master (no parent) and children
    const masterTransactionCodes = transactionCodes.filter(tc => !tc.parent_code_id);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Jenis Pembayaran</h1>
                    <p className="text-slate-500 mt-1">Kelola kode dan jenis pembayaran siswa.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={filterYearId} onChange={e => setFilterYearId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                        <option value="">Semua Tahun</option>
                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>)}
                    </select>
                    {canEdit && (
                        <button onClick={() => { setForm({ ...form, academic_year_id: filterYearId }); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition">
                            <Plus size={18} /> Tambah Jenis
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="px-6 py-4 font-medium">Kode</th>
                                <th className="px-6 py-4 font-medium">Nama Pembayaran</th>
                                <th className="px-6 py-4 font-medium">Kelas</th>
                                <th className="px-6 py-4 font-medium">Jenis</th>
                                <th className="px-6 py-4 font-medium">Kode Transaksi</th>
                                <th className="px-6 py-4 font-medium text-right">Nominal</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                {canEdit && <th className="px-6 py-4 font-medium text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
                            ) : types.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Belum ada jenis pembayaran</td></tr>
                            ) : types.map(pt => (
                                <tr key={pt.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-semibold text-sm">
                                            <CreditCard size={14} />{pt.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{pt.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{pt.class?.name || 'Semua Kelas'}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                            {scheduleLabel[pt.payment_schedule] || pt.payment_schedule}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {pt.transaction_code ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-mono text-xs font-medium">
                                                <Tag size={12} />{pt.transaction_code.code} — {pt.transaction_code.name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Belum ada</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-800">{formatCurrency(pt.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pt.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {pt.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    {canEdit && (
                                        <td className="px-6 py-4 text-center space-x-2">
                                            <button onClick={() => handleEdit(pt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(pt.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">{editItem ? 'Edit Jenis Pembayaran' : 'Tambah Jenis Pembayaran'}</h2>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
                                    <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="SPP-01" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="SPP" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                                    <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                                        <option value="">Semua Kelas</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jadwal Bayar</label>
                                    <select value={form.payment_schedule} onChange={e => setForm({ ...form, payment_schedule: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required>
                                        <option value="Bulanan">Bulanan</option>
                                        <option value="Semesteran">Semesteran</option>
                                        <option value="Tahunan">Tahunan</option>
                                        <option value="Bertahap">Bertahap</option>
                                    </select>
                                </div>
                            </div>

                            {/* Kode Transaksi - WAJIB */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Kode Transaksi <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.transaction_code_id}
                                    onChange={e => setForm({ ...form, transaction_code_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                                    required
                                >
                                    <option value="">Pilih Kode Transaksi</option>
                                    {masterTransactionCodes.map(tc => (
                                        <optgroup key={tc.id} label={`${tc.code} — ${tc.name}`}>
                                            <option value={tc.id}>
                                                {tc.code} — {tc.name} ({tc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'})
                                            </option>
                                            {transactionCodes
                                                .filter(child => child.parent_code_id === tc.id)
                                                .map(child => (
                                                    <option key={child.id} value={child.id}>
                                                        &nbsp;&nbsp;↳ {child.code} — {child.name}
                                                    </option>
                                                ))}
                                        </optgroup>
                                    ))}
                                    {/* Also show codes without parents (non-master) that have no parent_code_id but aren't masters */}
                                    {transactionCodes.filter(tc => tc.parent_code_id === null && !masterTransactionCodes.find(m => m.id === tc.id)).length > 0 && (
                                        <optgroup label="Lainnya">
                                            {transactionCodes.filter(tc => tc.parent_code_id === null).map(tc => (
                                                <option key={tc.id} value={tc.id}>
                                                    {tc.code} — {tc.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <p className="mt-1 text-xs text-slate-400">Wajib dipilih untuk menghubungkan ke Buku Kas Umum</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required placeholder="150000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                                    <select value={form.academic_year_id} onChange={e => setForm({ ...form, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required>
                                        <option value="">Pilih</option>
                                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" id="pt-active" />
                                <label htmlFor="pt-active" className="text-sm text-slate-700">Aktif</label>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition text-sm">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTypes;
