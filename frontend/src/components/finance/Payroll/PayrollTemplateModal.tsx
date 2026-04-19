import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import clsx from 'clsx';
import { UserData, PayrollTemplate } from './types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

interface PayrollTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: UserData[];
    templates: PayrollTemplate[];
    onSaveTemplate: (data: { user_id: string } & Partial<PayrollTemplate>) => Promise<void>;
}

export const PayrollTemplateModal: React.FC<PayrollTemplateModalProps> = ({ 
    isOpen, onClose, users, templates, onSaveTemplate 
}) => {
    const [templateUser, setTemplateUser] = useState('');
    const [templateForm, setTemplateForm] = useState({
        base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0
    });
    const [savingTemplate, setSavingTemplate] = useState(false);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setTemplateUser('');
            setTemplateForm({ base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0 });
            setSavingTemplate(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTemplateUserChange = (userId: string) => {
        setTemplateUser(userId);
        const existingTemplate = templates.find(t => t.user_id === userId);
        if (existingTemplate) {
            setTemplateForm({
                base_salary: existingTemplate.base_salary,
                functional_allowance: existingTemplate.functional_allowance,
                transport_allowance: existingTemplate.transport_allowance,
                additional_task: existingTemplate.additional_task
            });
        } else {
            setTemplateForm({ base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0 });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateUser) return;
        
        setSavingTemplate(true);
        try {
            await onSaveTemplate({
                user_id: templateUser,
                ...templateForm
            });
            onClose();
        } finally {
            setSavingTemplate(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                    <h2 className="text-xl font-bold flex items-center text-indigo-900">
                        <Building2 className="text-indigo-600 mr-2" size={24} /> 
                        Kelola Template Gaji Pegawai
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-200 text-indigo-600 hover:bg-indigo-300 transition">✕</button>
                </div>

                <div className="overflow-y-auto p-6 grow">
                    <form id="templateForm" onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-1 block">
                            <label className="block text-sm font-semibold text-slate-700">Pilih Pegawai</label>
                            <select
                                required
                                value={templateUser}
                                onChange={(e) => handleTemplateUserChange(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                            >
                                <option value="">-- Pilih --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Pilih pegawai untuk mengatur template pendapatan bulanannya.</p>
                        </div>

                        {templateUser && (
                            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Template Pendapatan</h3>
                                    <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                        <span className="text-xs text-indigo-500 font-medium mr-2">Subtotal:</span>
                                        <span className="text-sm font-bold text-indigo-700">{formatCurrency(templateForm.base_salary + templateForm.functional_allowance + templateForm.transport_allowance + templateForm.additional_task)}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center group">
                                        <label className="text-sm text-slate-600">Gaji Pokok</label>
                                        <input type="number" required value={templateForm.base_salary === 0 ? '' : templateForm.base_salary} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, base_salary: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-slate-600">Tunj. Fungsional</label>
                                        <input type="number" required value={templateForm.functional_allowance === 0 ? '' : templateForm.functional_allowance} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, functional_allowance: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-slate-600">Tunj. Transport</label>
                                        <input type="number" required value={templateForm.transport_allowance === 0 ? '' : templateForm.transport_allowance} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, transport_allowance: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-slate-600">Tugas Tambahan</label>
                                        <input type="number" required value={templateForm.additional_task === 0 ? '' : templateForm.additional_task} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, additional_task: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
                
                <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
                    >
                        Tutup
                    </button>
                    <button
                        type="submit"
                        form="templateForm"
                        disabled={savingTemplate || !templateUser}
                        className={clsx(
                            "px-8 py-2.5 rounded-xl text-white font-bold shadow-md transition flex justify-center items-center min-w-[140px]",
                            "bg-indigo-600 hover:bg-indigo-700",
                            (savingTemplate || !templateUser) && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {savingTemplate ? 'Menyimpan...' : 'Simpan Template'}
                    </button>
                </div>
            </div>
        </div>
    );
};
