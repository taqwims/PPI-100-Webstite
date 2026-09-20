import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronRight, Layers, Tag, X } from 'lucide-react';
import { BudgetCategory, BudgetComponent } from './types';
import ConfirmDialog from '../../ui/ConfirmDialog';

interface RKASCategoriesTabProps {
    categories: BudgetCategory[];
    components?: BudgetComponent[];
    onDeleteCategory: (id: number) => void;
    onDeleteComponent?: (id: number) => void;
    onCreateCategory?: (data: { name: string; description: string }) => void;
    onCreateComponent?: (data: { category_id: number; name: string; description?: string }) => void;
}

export const RKASCategoriesTab: React.FC<RKASCategoriesTabProps> = ({
    categories,
    components = [],
    onDeleteCategory,
    onDeleteComponent,
    onCreateCategory,
    onCreateComponent
}) => {
    const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});
    const [isConfirmCatOpen, setIsConfirmCatOpen] = useState(false);
    const [catIdToDelete, setCatIdToDelete] = useState<number | null>(null);

    const [isConfirmCompOpen, setIsConfirmCompOpen] = useState(false);
    const [compIdToDelete, setCompIdToDelete] = useState<number | null>(null);

    // Adding component state per category
    const [addingCompCatId, setAddingCompCatId] = useState<number | null>(null);
    const [newCompName, setNewCompName] = useState('');

    // Adding new category state
    const [showAddCat, setShowAddCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');

    const toggleExpand = (id: number) => {
        setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleConfirmDeleteCat = () => {
        if (catIdToDelete !== null) {
            onDeleteCategory(catIdToDelete);
            setIsConfirmCatOpen(false);
            setCatIdToDelete(null);
        }
    };

    const handleConfirmDeleteComp = () => {
        if (compIdToDelete !== null && onDeleteComponent) {
            onDeleteComponent(compIdToDelete);
            setIsConfirmCompOpen(false);
            setCompIdToDelete(null);
        }
    };

    const handleSaveComponent = (catId: number) => {
        if (!newCompName.trim() || !onCreateComponent) return;
        onCreateComponent({ category_id: catId, name: newCompName.trim() });
        setNewCompName('');
        setAddingCompCatId(null);
    };

    const handleSaveCategory = () => {
        if (!newCatName.trim() || !onCreateCategory) return;
        onCreateCategory({ name: newCatName.trim(), description: newCatDesc.trim() });
        setNewCatName('');
        setNewCatDesc('');
        setShowAddCat(false);
    };

    return (
        <div className="space-y-4">
            {/* Header & Add Category Button */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="text-indigo-600" size={18} /> Master Kategori & Komponen Anggaran
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola Kategori induk beserta Komponen turunannya yang digunakan pada RKAS dan Buku Kas Umum (BKU).
                    </p>
                </div>
                {onCreateCategory && (
                    <button
                        type="button"
                        onClick={() => setShowAddCat(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs transition shrink-0"
                    >
                        <Plus size={15} /> Tambah Kategori
                    </button>
                )}
            </div>

            {/* Inline Add Category Form */}
            {showAddCat && (
                <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Tambah Kategori Baru</h4>
                        <button type="button" onClick={() => setShowAddCat(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Nama Kategori (contoh: Operasional Sekolah)..."
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            className="px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="Deskripsi (opsional)..."
                            value={newCatDesc}
                            onChange={e => setNewCatDesc(e.target.value)}
                            className="px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowAddCat(false)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            disabled={!newCatName.trim()}
                            onClick={handleSaveCategory}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            Simpan Kategori
                        </button>
                    </div>
                </div>
            )}

            {/* Category & Components Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Kategori / Komponen</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Deskripsi</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Jumlah Komponen</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">
                                    Belum ada kategori anggaran. Klik "+ Tambah Kategori" untuk menambahkan.
                                </td>
                            </tr>
                        ) : (
                            categories.map(c => {
                                const childComps = components.filter(cmp => cmp.category_id === c.id);
                                const isExpanded = expandedCats[c.id] ?? true;

                                return (
                                    <React.Fragment key={c.id}>
                                        {/* Category Row (Parent) */}
                                        <tr className="bg-white hover:bg-slate-50/80 transition-colors font-medium">
                                            <td className="px-5 py-3.5 text-sm text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpand(c.id)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                                                    >
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                                            <Layers size={14} />
                                                        </span>
                                                        <span className="font-bold text-slate-800">{c.name}</span>
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                                            Kategori Induk
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500">
                                                {c.description || '-'}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-600">
                                                <span className="font-semibold text-indigo-600">{childComps.length}</span> komponen
                                            </td>
                                            <td className="px-5 py-3.5 text-right space-x-1.5">
                                                {onCreateComponent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAddingCompCatId(c.id);
                                                            setExpandedCats(prev => ({ ...prev, [c.id]: true }));
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                                                        title="Tambah Komponen untuk Kategori ini"
                                                    >
                                                        <Plus size={13} /> Komponen
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => { setCatIdToDelete(c.id); setIsConfirmCatOpen(true); }}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                    title="Hapus Kategori (akan menghapus seluruh komponen di dalamnya)"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Inline Add Component Form */}
                                        {isExpanded && addingCompCatId === c.id && (
                                            <tr className="bg-emerald-50/50">
                                                <td colSpan={4} className="px-5 py-2.5">
                                                    <div className="flex items-center gap-2 ml-8">
                                                        <span className="text-xs text-emerald-800 font-bold">↳ Tambah Komponen:</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Nama komponen (contoh: ATK, Honor Guru, Listrik)..."
                                                            value={newCompName}
                                                            onChange={e => setNewCompName(e.target.value)}
                                                            className="flex-1 max-w-sm px-3 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveComponent(c.id); }}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={!newCompName.trim()}
                                                            onClick={() => handleSaveComponent(c.id)}
                                                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition"
                                                        >
                                                            Simpan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setAddingCompCatId(null); setNewCompName(''); }}
                                                            className="px-2.5 py-1 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Component Child Rows */}
                                        {isExpanded && childComps.map(cmp => (
                                            <tr key={cmp.id} className="bg-slate-50/40 hover:bg-slate-100/60 transition-colors">
                                                <td className="px-5 py-2.5 text-xs text-slate-700">
                                                    <div className="flex items-center gap-2 ml-8">
                                                        <span className="text-slate-300">↳</span>
                                                        <Tag size={13} className="text-emerald-600 shrink-0" />
                                                        <span className="font-semibold text-slate-800">{cmp.name}</span>
                                                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                                                            Komponen Child
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-2.5 text-xs text-slate-400">
                                                    {cmp.description || '-'}
                                                </td>
                                                <td className="px-5 py-2.5 text-[11px] text-slate-400 font-mono">
                                                    ID #{cmp.id}
                                                </td>
                                                <td className="px-5 py-2.5 text-right">
                                                    {onDeleteComponent && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setCompIdToDelete(cmp.id); setIsConfirmCompOpen(true); }}
                                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                            title="Hapus Komponen ini"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirm Dialog Category Delete */}
            <ConfirmDialog 
                isOpen={isConfirmCatOpen}
                onClose={() => setIsConfirmCatOpen(false)}
                onConfirm={handleConfirmDeleteCat}
                title="Hapus Kategori Anggaran?"
                message="Apakah Anda yakin ingin menghapus kategori ini? Menghapus kategori akan sekaligus menghapus seluruh komponen turunan di dalamnya."
                confirmText="Ya, Hapus Kategori & Komponen"
                cancelText="Batal"
                variant="danger"
            />

            {/* Confirm Dialog Component Delete */}
            <ConfirmDialog 
                isOpen={isConfirmCompOpen}
                onClose={() => setIsConfirmCompOpen(false)}
                onConfirm={handleConfirmDeleteComp}
                title="Hapus Komponen?"
                message="Apakah Anda yakin ingin menghapus komponen anggaran ini? Aksi ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus Komponen"
                cancelText="Batal"
                variant="danger"
            />
        </div>
    );
};
