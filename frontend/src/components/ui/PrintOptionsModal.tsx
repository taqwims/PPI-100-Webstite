import React, { useState } from 'react';
import { X, Printer, CheckSquare, Square } from 'lucide-react';

interface PrintOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedRoles: string[]) => void;
    title?: string;
}

const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({ isOpen, onClose, onConfirm, title = "Opsi Cetak & Tanda Tangan" }) => {
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['principal', 'treasurer', 'chairman']);

    if (!isOpen) return null;

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => 
            prev.includes(role) 
                ? prev.filter(r => r !== role) 
                : [...prev, role]
        );
    };

    const handleConfirm = () => {
        onConfirm(selectedRoles);
        onClose();
    };

    const roles = [
        { id: 'principal', label: 'Kepala Sekolah' },
        { id: 'treasurer', label: 'Bendahara' },
        { id: 'admin_tu', label: 'Tata Usaha' },
        { id: 'committee', label: 'Komite' },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Printer size={18} className="text-blue-600" />
                        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5">
                    <p className="text-xs text-slate-500 mb-4">Pilih pejabat yang akan tampil di lembar tanda tangan dokumen ini:</p>
                    
                    <div className="space-y-2">
                        {roles.map(role => (
                            <button
                                key={role.id}
                                onClick={() => toggleRole(role.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                                    selectedRoles.includes(role.id)
                                        ? 'border-blue-200 bg-blue-50/50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <span className="text-sm font-medium">{role.label}</span>
                                {selectedRoles.includes(role.id) ? (
                                    <CheckSquare size={18} className="text-blue-600" />
                                ) : (
                                    <Square size={18} className="text-slate-300" />
                                )}
                            </button>
                        ))}
                    </div>

                    {selectedRoles.length === 0 && (
                        <p className="text-[10px] text-rose-500 mt-2 text-center font-medium">
                            Minimal pilih satu penandatangan
                        </p>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedRoles.length === 0}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        Cetak PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintOptionsModal;
