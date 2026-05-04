import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { UserData, PayrollTemplate, PayrollCustomItem } from './types';

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
    const [customIncomeItems, setCustomIncomeItems] = useState<PayrollCustomItem[]>([]);
    const [customDeductionItems, setCustomDeductionItems] = useState<PayrollCustomItem[]>([]);
    const [savingTemplate, setSavingTemplate] = useState(false);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setTemplateUser('');
            setTemplateForm({ base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0 });
            setCustomIncomeItems([]);
            setCustomDeductionItems([]);
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
            setCustomIncomeItems(existingTemplate.custom_income_items || []);
            setCustomDeductionItems(existingTemplate.custom_deduction_items || []);
        } else {
            setTemplateForm({ base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0 });
            setCustomIncomeItems([]);
            setCustomDeductionItems([]);
        }
    };

    const addCustomIncomeItem = () => setCustomIncomeItems(prev => [...prev, { name: '', amount: 0 }]);
    const addCustomDeductionItem = () => setCustomDeductionItems(prev => [...prev, { name: '', amount: 0 }]);
    const updateCustomIncomeItem = (idx: number, field: keyof PayrollCustomItem, value: string | number) => {
        setCustomIncomeItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };
    const updateCustomDeductionItem = (idx: number, field: keyof PayrollCustomItem, value: string | number) => {
        setCustomDeductionItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };
    const removeCustomIncomeItem = (idx: number) => setCustomIncomeItems(prev => prev.filter((_, i) => i !== idx));
    const removeCustomDeductionItem = (idx: number) => setCustomDeductionItems(prev => prev.filter((_, i) => i !== idx));

    const customIncomeTotal = customIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const customDeductionTotal = customDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const fixedIncomeTotal = templateForm.base_salary + templateForm.functional_allowance + templateForm.transport_allowance + templateForm.additional_task;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateUser) return;
        
        setSavingTemplate(true);
        try {
            await onSaveTemplate({
                user_id: templateUser,
                ...templateForm,
                custom_income_items: customIncomeItems.filter(i => i.name && i.amount > 0),
                custom_deduction_items: customDeductionItems.filter(i => i.name && i.amount > 0),
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
                                        <span className="text-sm font-bold text-indigo-700">{formatCurrency(fixedIncomeTotal + customIncomeTotal)}</span>
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

                                    {/* Custom Income Items */}
                                    {customIncomeItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                            <input type="text" placeholder="Nama komponen" value={item.name} onChange={e => updateCustomIncomeItem(idx, 'name', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500" />
                                            <input type="number" placeholder="0" value={item.amount === 0 ? '' : item.amount} onChange={e => updateCustomIncomeItem(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500" />
                                            <button type="button" onClick={() => removeCustomIncomeItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addCustomIncomeItem} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition w-full justify-center border border-indigo-200 border-dashed">
                                        <Plus size={14} /> Tambah Komponen Pendapatan
                                    </button>
                                </div>

                                {/* Custom Deduction Template */}
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Template Potongan (Opsional)</h3>
                                        {customDeductionTotal > 0 && (
                                            <div className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                                <span className="text-xs text-red-400 font-medium mr-2">Subtotal:</span>
                                                <span className="text-sm font-bold text-red-600">{formatCurrency(customDeductionTotal)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {customDeductionItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-red-50/50 p-2 rounded-lg border border-red-100">
                                                <input type="text" placeholder="Nama potongan" value={item.name} onChange={e => updateCustomDeductionItem(idx, 'name', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-red-400" />
                                                <input type="number" placeholder="0" value={item.amount === 0 ? '' : item.amount} onChange={e => updateCustomDeductionItem(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400" />
                                                <button type="button" onClick={() => removeCustomDeductionItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addCustomDeductionItem} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition w-full justify-center border border-red-200 border-dashed">
                                            <Plus size={14} /> Tambah Komponen Potongan
                                        </button>
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
