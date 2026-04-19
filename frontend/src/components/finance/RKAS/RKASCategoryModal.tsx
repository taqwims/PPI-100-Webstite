import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RKASCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
}

export const RKASCategoryModal: React.FC<RKASCategoryModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [catForm, setCatForm] = useState({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCatForm({ name: '', description: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit(catForm);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold">Tambah Kategori</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kategori</label>
                        <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                        <input type="text" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Batal</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700">Tambah</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
