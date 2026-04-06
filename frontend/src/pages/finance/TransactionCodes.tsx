import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Edit, Trash2, Tag, X, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: string;
    category: string;
    description: string;
    is_active: boolean;
    parent_code_id: number | null;
    parent_code?: TransactionCode | null;
    children?: TransactionCode[];
}

const TransactionCodes: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<TransactionCode | null>(null);
    const [form, setForm] = useState({ code: '', name: '', type: 'Income', category: '', description: '', parent_code_id: '', is_active: true });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const canEdit = user?.role_id === 1 || user?.role_id === 9;

    const { data: codes = [], isLoading } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'],
        queryFn: async () => (await api.get('/finance/transaction-codes')).data,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/transaction-codes', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transaction-codes'] }); handleClose(); },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/finance/transaction-codes/${data.id}`, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transaction-codes'] }); handleClose(); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/transaction-codes/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction-codes'] }),
    });

    const handleClose = () => {
        setShowModal(false);
        setEditItem(null);
        setForm({ code: '', name: '', type: 'Income', category: '', description: '', parent_code_id: '', is_active: true });
    };

    const toggleGroup = (id: number) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Master codes: no parent_code_id AND not auto-generated from RKAS
    const masterCodes = codes.filter(c => !c.parent_code_id && !c.description?.startsWith('RKAS Item: '));

    // All children (including auto-generated) grouped by parent
    const getChildren = (parentId: number) => codes.filter(c => c.parent_code_id === parentId);

    // Standalone (non-master, non-child) codes from RKAS auto-generation
    const standaloneGenerated = codes.filter(c => c.description?.startsWith('RKAS Item: ') && !c.parent_code_id);

    const handleEdit = (item: TransactionCode) => {
        setEditItem(item);
        setForm({
            code: item.code,
            name: item.name,
            type: item.type,
            category: item.category,
            description: item.description,
            parent_code_id: item.parent_code_id ? String(item.parent_code_id) : '',
            is_active: item.is_active,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...form };
        if (form.parent_code_id) {
            payload.parent_code_id = Number(form.parent_code_id);
        } else {
            payload.parent_code_id = null;
        }
        if (editItem) {
            updateMutation.mutate({ ...payload, id: editItem.id });
        } else {
            createMutation.mutate(payload);
        }
    };

    const renderCodeRow = (tc: TransactionCode, isChild: boolean = false) => {
        const children = getChildren(tc.id);
        const isExpanded = expandedGroups[tc.id];

        return (
            <React.Fragment key={tc.id}>
                <tr className={clsx(
                    'transition-colors',
                    isChild ? 'bg-slate-50/50 hover:bg-slate-100/50' : 'hover:bg-slate-50/50'
                )}>
                    <td className={clsx('px-6 py-4', isChild && 'pl-12')}>
                        <div className="flex items-center gap-2">
                            {!isChild && children.length > 0 ? (
                                <button onClick={() => toggleGroup(tc.id)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            ) : (
                                <div className="w-6" />
                            )}
                            <span className={clsx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-semibold text-sm',
                                isChild ? 'bg-slate-100 border border-slate-200 text-slate-700 text-xs' : 'bg-green-50 text-green-700'
                            )}>
                                {!isChild && <Tag size={14} />}{tc.code}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                            {tc.name}
                            {!isChild && children.length > 0 && (
                                <span className="text-xs text-slate-400 font-normal">({children.length} kode turunan)</span>
                            )}
                            {isChild && tc.parent_code && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">
                                    <Link2 size={10} /> Turunan
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', tc.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                            {tc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{tc.category}</td>
                    <td className="px-6 py-4">
                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', tc.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                            {tc.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                    </td>
                    {canEdit && (
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEdit(tc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                            <button onClick={() => { if (confirm('Hapus kode transaksi ini?')) deleteMutation.mutate(tc.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </td>
                    )}
                </tr>
                {isExpanded && children.map(child => renderCodeRow(child, true))}
            </React.Fragment>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kode Transaksi</h1>
                    <p className="text-slate-500 mt-1">Master data kode kegiatan untuk standarisasi transaksi keuangan</p>
                </div>
                {canEdit && (
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/25">
                        <Plus size={18} /> Tambah Kode
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                {canEdit && <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
                            ) : masterCodes.length === 0 && standaloneGenerated.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Belum ada kode transaksi</td></tr>
                            ) : (
                                <>
                                    {masterCodes.map(tc => renderCodeRow(tc))}
                                    {standaloneGenerated.length > 0 && (
                                        <>
                                            <tr className="bg-slate-100/50">
                                                <td colSpan={6} className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Kode Otomatis dari RKAS
                                                </td>
                                            </tr>
                                            {standaloneGenerated.map(tc => renderCodeRow(tc))}
                                        </>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900">{editItem ? 'Edit Kode Transaksi' : 'Tambah Kode Transaksi'}</h3>
                            <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
                                    <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="A1" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                        <option value="Income">Pendapatan</option>
                                        <option value="Expense">Pengeluaran</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Pendapatan SPP" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                            </div>

                            {/* Kode Induk (Parent) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Kode Induk <span className="text-xs text-slate-400 font-normal">(Opsional — kosongkan jika ini kode master)</span>
                                </label>
                                <select
                                    value={form.parent_code_id}
                                    onChange={e => setForm({ ...form, parent_code_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">— Kode Master (Tidak ada induk) —</option>
                                    {masterCodes
                                        .filter(mc => mc.id !== editItem?.id) // don't allow self-referencing
                                        .map(mc => (
                                            <option key={mc.id} value={mc.id}>
                                                {mc.code} — {mc.name} ({mc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori (Bebas)</label>
                                <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Contoh: SPP, Gaji, Operasional" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi kode transaksi..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent" rows={2} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                <label htmlFor="is_active" className="text-sm text-slate-700">Aktif</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/25">
                                    {editItem ? 'Simpan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionCodes;
