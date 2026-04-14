import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Search, Plus, Edit2, Trash2, Package, BarChart3 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import {
    TableGlass,
    TableHeaderGlass,
    TableBodyGlass,
    TableRowGlass,
    TableHeadGlass,
    TableCellGlass,
} from '../../components/ui/glass/TableGlass';
import toast from 'react-hot-toast';
import AssetRecapPanel from './AssetRecapPanel';

interface Asset {
    id: string;
    name: string;
    category: string;
    condition: string;
    location: string;
    acquisition_value: number;
    acquisition_date: string;
    status: string;
    notes?: string;
    created_at: string;
}

interface AssetCategory {
    id: number;
    name: string;
    description?: string;
}

const CONDITIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
const STATUSES = ['Aktif', 'Dalam Perbaikan', 'Dihapuskan'];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        'Aktif': 'bg-green-100 text-green-700',
        'Dalam Perbaikan': 'bg-yellow-100 text-yellow-700',
        'Dihapuskan': 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorMap[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    );
};

const Assets: React.FC = () => {
    const queryClient = useQueryClient();

    // Tab state
    const [activeTab, setActiveTab] = useState<'list' | 'recap'>('list');

    // Filter state
    const [keyword, setKeyword] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterCondition, setFilterCondition] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Form modal state
    const [showForm, setShowForm] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editAsset, setEditAsset] = useState<Asset | null>(null);

    // Fetch categories
    const { data: categories = [] } = useQuery<AssetCategory[]>({
        queryKey: ['asset-categories'],
        queryFn: async () => {
            const res = await api.get('/assets/categories');
            return res.data;
        },
    });

    // Fetch assets with query params (server-side filtering)
    const { data: assets = [], isLoading } = useQuery<Asset[]>({
        queryKey: ['assets', filterCategory, filterCondition, filterStatus, keyword],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (filterCategory) params.kategori = filterCategory;
            if (filterCondition) params.kondisi = filterCondition;
            if (filterStatus) params.status = filterStatus;
            if (keyword) params.keyword = keyword;
            const res = await api.get('/assets', { params });
            return res.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/assets/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Aset berhasil dihapus');
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus aset ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (asset: Asset) => {
        setEditAsset(asset);
        setShowForm(true);
    };

    const handleAdd = () => {
        setEditAsset(null);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditAsset(null);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Aset</h1>
                    <p className="text-slate-600">Kelola inventaris aset sekolah</p>
                </div>
                {activeTab === 'list' && (
                    <div className="flex gap-2">
                        <ButtonGlass variant="secondary" onClick={() => setShowCategoryModal(true)} className="flex items-center gap-2">
                            Kelola Kategori
                        </ButtonGlass>
                        <ButtonGlass variant="primary" onClick={handleAdd} className="flex items-center gap-2">
                            <Plus size={18} />
                            Tambah Aset
                        </ButtonGlass>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === 'list'
                            ? 'bg-white border border-b-white border-slate-200 text-green-700 -mb-px'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Package size={15} />
                    Daftar Aset
                </button>
                <button
                    onClick={() => setActiveTab('recap')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === 'recap'
                            ? 'bg-white border border-b-white border-slate-200 text-green-700 -mb-px'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <BarChart3 size={15} />
                    Rekap Aset
                </button>
            </div>

            {/* Recap Tab */}
            {activeTab === 'recap' && <AssetRecapPanel />}

            {/* List Tab */}
            {activeTab === 'list' && (
            <CardGlass className="p-6 space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <InputGlass
                            placeholder="Cari nama aset..."
                            icon={Search}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        <option value="">Semua Kondisi</option>
                        {CONDITIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        <option value="">Semua Status</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Nama</TableHeadGlass>
                            <TableHeadGlass>Kategori</TableHeadGlass>
                            <TableHeadGlass>Kondisi</TableHeadGlass>
                            <TableHeadGlass>Lokasi</TableHeadGlass>
                            <TableHeadGlass className="text-right">Nilai Perolehan</TableHeadGlass>
                            <TableHeadGlass>Tanggal Perolehan</TableHeadGlass>
                            <TableHeadGlass className="text-center">Status</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={8} className="text-center py-8 text-slate-600">
                                    Loading...
                                </TableCellGlass>
                            </TableRowGlass>
                        ) : assets.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={8} className="text-center py-10 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Package size={32} className="text-slate-300" />
                                        <span>Tidak ada data aset</span>
                                    </div>
                                </TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            assets.map((asset) => (
                                <TableRowGlass key={asset.id}>
                                    <TableCellGlass>
                                        <span className="font-medium text-slate-900">{asset.name}</span>
                                        {asset.notes && (
                                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{asset.notes}</p>
                                        )}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-700">{asset.category}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-700">{asset.condition}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-700">{asset.location}</span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <span className="font-medium text-slate-900">
                                            {formatCurrency(asset.acquisition_value)}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600 text-sm">
                                            {formatDate(asset.acquisition_date)}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-center">
                                        <StatusBadge status={asset.status} />
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(asset)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={13} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(asset.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={13} />
                                                Hapus
                                            </button>
                                        </div>
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>
            )} {/* end activeTab === 'list' */}

            {/* Asset Form Modal */}
            {showForm && (
                <AssetFormModal
                    asset={editAsset}
                    categories={categories}
                    onClose={handleFormClose}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['assets'] });
                        handleFormClose();
                    }}
                />
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <CategoryManagementModal
                    onClose={() => setShowCategoryModal(false)}
                />
            )}
        </div>
    );
};

/* ── Asset Form Modal ── */
interface AssetFormModalProps {
    asset: Asset | null;
    categories: AssetCategory[];
    onClose: () => void;
    onSuccess: () => void;
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({ asset, categories, onClose, onSuccess }) => {
    const isEdit = !!asset;
    const [form, setForm] = useState({
        name: asset?.name ?? '',
        category: asset?.category ?? '',
        condition: asset?.condition ?? '',
        location: asset?.location ?? '',
        acquisition_value: asset?.acquisition_value?.toString() ?? '',
        acquisition_date: asset?.acquisition_date ? asset.acquisition_date.split('T')[0] : '',
        status: asset?.status ?? 'Aktif',
        notes: asset?.notes ?? '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                acquisition_value: parseFloat(form.acquisition_value),
            };
            if (isEdit) {
                await api.put(`/assets/${asset!.id}`, payload);
                toast.success('Aset berhasil diperbarui');
            } else {
                await api.post('/assets', payload);
                toast.success('Aset berhasil ditambahkan');
            }
            onSuccess();
        } catch {
            // error handled by global interceptor
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isEdit ? 'Edit Aset' : 'Tambah Aset'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Aset *</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            placeholder="Contoh: Laptop Dell Inspiron"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kategori *</label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            >
                                <option value="">Pilih kategori</option>
                                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi *</label>
                            <select
                                name="condition"
                                value={form.condition}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            >
                                <option value="">Pilih kondisi</option>
                                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi *</label>
                        <input
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            placeholder="Contoh: Ruang Guru Lt. 2"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nilai Perolehan (Rp) *</label>
                            <input
                                name="acquisition_value"
                                type="number"
                                min="1"
                                value={form.acquisition_value}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                placeholder="5000000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Perolehan *</label>
                            <input
                                name="acquisition_date"
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                value={form.acquisition_date}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                            placeholder="Catatan tambahan (opsional)"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-xl transition-colors"
                        >
                            {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Aset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Category Management Modal ── */
const CategoryManagementModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data: categories = [], isLoading } = useQuery<AssetCategory[]>({
        queryKey: ['asset-categories'],
        queryFn: async () => {
            const res = await api.get('/assets/categories');
            return res.data;
        },
    });

    const mutation = useMutation({
        mutationFn: async (payload: { id?: number; name: string }) => {
            if (payload.id) {
                return api.put(`/assets/categories/${payload.id}`, payload);
            }
            return api.post('/assets/categories', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
            setName('');
            setEditingId(null);
            toast.success('Kategori berhasil disimpan');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/assets/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
            toast.success('Kategori berhasil dihapus');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutation.mutate({ id: editingId ?? undefined, name });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Kelola Kategori Aset</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                        <Plus className="rotate-45" size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nama kategori baru..."
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            required
                        />
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {editingId ? 'Update' : 'Tambah'}
                        </button>
                    </form>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="text-center py-4 text-slate-400 text-xs">Loading...</div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-4 text-slate-400 text-xs">Belum ada kategori</div>
                        ) : (
                            categories.map((c) => (
                                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingId(c.id); setName(c.name); }}
                                            className="p-1.5 text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => { if(confirm('Hapus kategori?')) deleteMutation.mutate(c.id); }}
                                            className="p-1.5 text-red-600 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Assets;
