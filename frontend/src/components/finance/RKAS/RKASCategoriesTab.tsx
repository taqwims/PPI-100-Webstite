import React from 'react';
import { Trash2 } from 'lucide-react';
import { BudgetCategory } from './types';
import ConfirmDialog from '../../ui/ConfirmDialog';

interface RKASCategoriesTabProps {
    categories: BudgetCategory[];
    onDelete: (id: number) => void;
}

export const RKASCategoriesTab: React.FC<RKASCategoriesTabProps> = ({ categories, onDelete }) => {
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [idToDelete, setIdToDelete] = React.useState<number | null>(null);

    const handleConfirmDelete = () => {
        if (idToDelete !== null) {
            onDelete(idToDelete);
            setIsConfirmOpen(false);
            setIdToDelete(null);
        }
    };
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
                <thead className="bg-slate-50/80"><tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Nama</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {categories.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                            <td className="px-6 py-4 text-slate-600 text-sm">{c.description || '-'}</td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => { setIdToDelete(c.id); setIsConfirmOpen(true); }} 
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <ConfirmDialog 
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Hapus Kategori?"
                message="Apakah Anda yakin ingin menghapus kategori anggaran ini? Aksi ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="danger"
            />
        </div>
    );
};
