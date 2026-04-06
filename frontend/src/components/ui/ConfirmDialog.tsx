import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen, onClose, onConfirm, title = 'Konfirmasi', message,
    confirmText = 'Ya, Hapus', cancelText = 'Batal', variant = 'danger',
}) => {
    if (!isOpen) return null;

    const colors = variant === 'danger'
        ? { bg: 'bg-red-50', icon: 'text-red-500', btn: 'bg-red-600 hover:bg-red-700 shadow-red-600/25' }
        : { bg: 'bg-amber-50', icon: 'text-amber-500', btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25' };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className={`mx-auto w-14 h-14 ${colors.bg} rounded-full flex items-center justify-center mb-4`}>
                        <AlertTriangle size={28} className={colors.icon} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500">{message}</p>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm transition-colors">
                        {cancelText}
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium text-sm transition-colors shadow-lg ${colors.btn}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
