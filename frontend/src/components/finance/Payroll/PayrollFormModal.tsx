import React, { useState, useEffect, useMemo } from 'react';
import { Banknote, CheckCircle, Plus, Trash2, Clock, Calculator, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { PayrollRecord, UserData, PayrollTemplate, PayrollCustomItem } from './types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

interface PayrollFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingPayroll: PayrollRecord | null;
    users: UserData[];
    templates: PayrollTemplate[];
    onSubmit: (data: any) => Promise<void>;
}

export const PayrollFormModal: React.FC<PayrollFormModalProps> = ({
    isOpen,
    onClose,
    editingPayroll,
    users,
    templates,
    onSubmit
}) => {
    const initialFormState = {
        user_id: '',
        employee_name: '',
        employee_nik: '',
        position: '',
        base_salary: 0,
        functional_allowance: 0,
        transport_allowance: 0,
        additional_task: 0,
        lateness_penalty: 0,
        infaq_deduction: 0,
        cash_advance: 0,
        notes: '',
        status: 'Draft',
        payment_method: 'Transfer',
        bank_name: '',
        bank_account_number: '',
        bank_account_holder: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [customIncomeItems, setCustomIncomeItems] = useState<PayrollCustomItem[]>([]);
    const [customDeductionItems, setCustomDeductionItems] = useState<PayrollCustomItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Keterlambatan Calculator State: (menit / 60) * harga
    const [lateMinutes, setLateMinutes] = useState<number | ''>('');
    const [lateHourlyRate, setLateHourlyRate] = useState<number | ''>('');
    const [showLateCalc, setShowLateCalc] = useState(false);

    // Infaq State: 2.5% of total income
    const [autoInfaq, setAutoInfaq] = useState<boolean>(true);

    // Calculate current income
    const customIncomeTotal = useMemo(() => {
        return customIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    }, [customIncomeItems]);

    const formIncome = useMemo(() => {
        return (formData.base_salary || 0) +
            (formData.functional_allowance || 0) +
            (formData.transport_allowance || 0) +
            (formData.additional_task || 0) +
            customIncomeTotal;
    }, [formData.base_salary, formData.functional_allowance, formData.transport_allowance, formData.additional_task, customIncomeTotal]);

    const standardInfaqAmount = useMemo(() => {
        return Math.round(formIncome * 0.025);
    }, [formIncome]);

    // Keep infaq deduction in sync when autoInfaq is on and formIncome changes
    useEffect(() => {
        if (autoInfaq && isOpen) {
            setFormData(prev => ({
                ...prev,
                infaq_deduction: standardInfaqAmount
            }));
        }
    }, [formIncome, autoInfaq, isOpen, standardInfaqAmount]);

    useEffect(() => {
        if (isOpen) {
            if (editingPayroll) {
                setFormData({
                    user_id: editingPayroll.user_id,
                    employee_name: editingPayroll.employee_name || '',
                    employee_nik: editingPayroll.employee_nik || '',
                    position: editingPayroll.position || '',
                    base_salary: editingPayroll.base_salary || 0,
                    functional_allowance: editingPayroll.functional_allowance || 0,
                    transport_allowance: editingPayroll.transport_allowance || 0,
                    additional_task: editingPayroll.additional_task || 0,
                    lateness_penalty: editingPayroll.lateness_penalty || 0,
                    infaq_deduction: editingPayroll.infaq_deduction || 0,
                    cash_advance: editingPayroll.cash_advance || 0,
                    notes: editingPayroll.notes || '',
                    status: editingPayroll.status || 'Draft',
                    payment_method: editingPayroll.payment_method || 'Transfer',
                    bank_name: editingPayroll.bank_name || '',
                    bank_account_number: editingPayroll.bank_account_number || '',
                    bank_account_holder: editingPayroll.bank_account_holder || ''
                });
                setCustomIncomeItems(editingPayroll.custom_income_items || []);
                setCustomDeductionItems(editingPayroll.custom_deduction_items || []);
                setLateMinutes('');
                setLateHourlyRate('');
                setShowLateCalc(false);
                // Check if existing infaq matches standard 2.5%
                const currentGross = (editingPayroll.base_salary || 0) +
                    (editingPayroll.functional_allowance || 0) +
                    (editingPayroll.transport_allowance || 0) +
                    (editingPayroll.additional_task || 0) +
                    (editingPayroll.custom_income_items || []).reduce((s, i) => s + (i.amount || 0), 0);
                const expectedInfaq = Math.round(currentGross * 0.025);
                setAutoInfaq(editingPayroll.infaq_deduction === expectedInfaq || editingPayroll.infaq_deduction === 0);
            } else {
                setFormData(initialFormState);
                setCustomIncomeItems([]);
                setCustomDeductionItems([]);
                setLateMinutes('');
                setLateHourlyRate('');
                setShowLateCalc(false);
                setAutoInfaq(true);
            }
        }
    }, [isOpen, editingPayroll]);

    if (!isOpen) return null;

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
            const numVal = parseFloat(value);
            setFormData(prev => ({ ...prev, [name]: isNaN(numVal) ? 0 : numVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // If user manually types infaq_deduction, disable auto-sync
        if (name === 'infaq_deduction') {
            setAutoInfaq(false);
        }

        // Auto-fill details if user changes
        if (name === 'user_id' && value) {
            const selectedUser = users.find(u => u.id === value);
            const userTemplate = templates.find(t => t.user_id === value);
            if (selectedUser) {
                const bSalary = userTemplate?.base_salary || 0;
                const fAllowance = userTemplate?.functional_allowance || 0;
                const tAllowance = userTemplate?.transport_allowance || 0;
                const aTask = userTemplate?.additional_task || 0;
                const cIncomes = userTemplate?.custom_income_items || [];
                const cIncomesSum = cIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
                const gross = bSalary + fAllowance + tAllowance + aTask + cIncomesSum;
                const infaq = Math.round(gross * 0.025);

                setFormData(prev => ({
                    ...prev,
                    employee_name: selectedUser.name,
                    bank_name: selectedUser.bank_name || '',
                    bank_account_number: selectedUser.bank_account_number || '',
                    bank_account_holder: selectedUser.bank_account_holder || '',
                    payment_method: (selectedUser.bank_account_number || selectedUser.bank_name) ? 'Transfer' : 'Cash',
                    base_salary: bSalary,
                    functional_allowance: fAllowance,
                    transport_allowance: tAllowance,
                    additional_task: aTask,
                    infaq_deduction: infaq
                }));
                setCustomIncomeItems(cIncomes);
                setCustomDeductionItems(userTemplate?.custom_deduction_items || []);
                setAutoInfaq(true);
            }
        }
    };

    // Calculate late penalty whenever lateMinutes or lateHourlyRate changes: (menit / 60) * harga
    const handleLateMinutesChange = (minutesVal: string) => {
        const mins = minutesVal === '' ? '' : Math.max(0, parseFloat(minutesVal) || 0);
        setLateMinutes(mins);
        if (mins !== '' && typeof lateHourlyRate === 'number' && lateHourlyRate > 0) {
            const calculated = Math.round((mins / 60) * lateHourlyRate);
            setFormData(prev => ({ ...prev, lateness_penalty: calculated }));
        }
    };

    const handleLateRateChange = (rateVal: string) => {
        const rate = rateVal === '' ? '' : Math.max(0, parseFloat(rateVal) || 0);
        setLateHourlyRate(rate);
        if (typeof lateMinutes === 'number' && lateMinutes > 0 && rate !== '') {
            const calculated = Math.round((lateMinutes / 60) * rate);
            setFormData(prev => ({ ...prev, lateness_penalty: calculated }));
        }
    };

    const applyLateCalc = () => {
        const mins = typeof lateMinutes === 'number' ? lateMinutes : 0;
        const rate = typeof lateHourlyRate === 'number' ? lateHourlyRate : 0;
        const calculated = Math.round((mins / 60) * rate);
        setFormData(prev => ({ ...prev, lateness_penalty: calculated }));
    };

    // Custom item handlers
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

    const customDeductionTotal = customDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const formDeduction = (formData.lateness_penalty || 0) + (formData.infaq_deduction || 0) + (formData.cash_advance || 0) + customDeductionTotal;
    const formNet = formIncome - formDeduction;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit({
                ...formData,
                custom_income_items: customIncomeItems.filter(i => i.name && i.amount > 0),
                custom_deduction_items: customDeductionItems.filter(i => i.name && i.amount > 0),
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-xl font-bold flex items-center text-slate-800">
                        <Banknote className="text-emerald-600 mr-2" size={24} />
                        {editingPayroll ? 'Edit Penggajian' : 'Input Gaji Baru'}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition">✕</button>
                </div>

                <div className="overflow-y-auto p-6 grow">
                    <form id="payrollForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">Akun Pegawai (Sistem)</label>
                                <div className="flex gap-2">
                                    <select
                                        name="user_id"
                                        required
                                        value={formData.user_id}
                                        onChange={handleInput}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                                    >
                                        <option value="">-- Pilih Pegawai --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                    {formData.user_id && (
                                        <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col justify-center min-w-[120px]">
                                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Est. Gaji Bersih</span>
                                            <span className="text-sm font-bold text-emerald-700">{formatCurrency(formNet)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">Nama (Bisa disesuaikan)</label>
                                <input
                                    type="text"
                                    name="employee_name"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={formData.employee_name}
                                    onChange={handleInput}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">NIK / NIP</label>
                                <input
                                    type="text"
                                    name="employee_nik"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={formData.employee_nik}
                                    onChange={handleInput}
                                    placeholder="Nomor Induk Pegawai"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">Jabatan</label>
                                <input
                                    type="text"
                                    name="position"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={formData.position}
                                    onChange={handleInput}
                                    placeholder="Guru / Staff / TU"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* PENDAPATAN */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600">Pendapatan</h3>
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        Total: {formatCurrency(formIncome)}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center group">
                                        <label className="text-sm text-slate-600">Gaji Pokok</label>
                                        <input type="number" name="base_salary" value={formData.base_salary === 0 ? '' : formData.base_salary} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-slate-600">Tunj. Fungsional</label>
                                        <input type="number" name="functional_allowance" value={formData.functional_allowance === 0 ? '' : formData.functional_allowance} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-slate-600">Tunj. Transport</label>
                                        <input type="number" name="transport_allowance" value={formData.transport_allowance === 0 ? '' : formData.transport_allowance} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-slate-600">Tugas Tambahan</label>
                                        <input type="number" name="additional_task" value={formData.additional_task === 0 ? '' : formData.additional_task} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                    </div>

                                    {/* Custom Income Items */}
                                    {customIncomeItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                            <input
                                                type="text"
                                                placeholder="Nama komponen"
                                                value={item.name}
                                                onChange={e => updateCustomIncomeItem(idx, 'name', e.target.value)}
                                                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={item.amount === 0 ? '' : item.amount}
                                                onChange={e => updateCustomIncomeItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <button type="button" onClick={() => removeCustomIncomeItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addCustomIncomeItem} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition w-full justify-center border border-emerald-200 border-dashed">
                                        <Plus size={14} /> Tambah Komponen Pendapatan
                                    </button>
                                </div>
                            </div>

                            {/* POTONGAN */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-red-100 pb-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Potongan</h3>
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                        Total: -{formatCurrency(formDeduction)}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {/* KETERLAMBATAN */}
                                    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={15} className="text-amber-500" />
                                                <label className="text-sm font-medium text-slate-700">Keterlambatan</label>
                                            </div>
                                            <input
                                                type="number"
                                                name="lateness_penalty"
                                                value={formData.lateness_penalty === 0 ? '' : formData.lateness_penalty}
                                                placeholder="0"
                                                onChange={handleInput}
                                                className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400 transition-all font-semibold text-red-600"
                                            />
                                        </div>

                                        {/* Toggle Mini Calculator */}
                                        <div className="pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowLateCalc(!showLateCalc)}
                                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                                            >
                                                <Calculator size={13} />
                                                <span>Kalkulator Keterlambatan (menit : 60 × harga)</span>
                                                {showLateCalc ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            </button>

                                            {showLateCalc && (
                                                <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2 animate-in fade-in">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                                                Menit Terlambat
                                                            </label>
                                                            <input
                                                                type="number"
                                                                placeholder="Contoh: 120"
                                                                value={lateMinutes}
                                                                onChange={(e) => handleLateMinutesChange(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-right"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                                                Tarif / Harga per Jam (60 mnt)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                placeholder="Contoh: 20000"
                                                                value={lateHourlyRate}
                                                                onChange={(e) => handleLateRateChange(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-right"
                                                            />
                                                        </div>
                                                    </div>

                                                    {typeof lateMinutes === 'number' && typeof lateHourlyRate === 'number' && (
                                                        <div className="flex items-center justify-between bg-indigo-50/70 p-2 rounded-lg text-xs text-indigo-900 border border-indigo-100">
                                                            <span>
                                                                ({lateMinutes} mnt : 60) × {formatCurrency(lateHourlyRate)} = <strong>{formatCurrency(Math.round((lateMinutes / 60) * lateHourlyRate))}</strong>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={applyLateCalc}
                                                                className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 transition"
                                                            >
                                                                Terapkan
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* INFAQ (2.5% dari Total Pendapatan / Total Gaji) */}
                                    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <Sparkles size={15} className="text-emerald-600" />
                                                <label className="text-sm font-medium text-slate-700">Infaq (2.5% Gaji)</label>
                                            </div>
                                            <input
                                                type="number"
                                                name="infaq_deduction"
                                                value={formData.infaq_deduction === 0 ? '' : formData.infaq_deduction}
                                                placeholder="0"
                                                onChange={handleInput}
                                                className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400 transition-all font-semibold text-red-600"
                                            />
                                        </div>

                                        {/* Auto 2.5% Infaq Helper */}
                                        <div className="flex items-center justify-between pt-1 text-xs">
                                            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={autoInfaq}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setAutoInfaq(checked);
                                                        if (checked) {
                                                            setFormData(prev => ({ ...prev, infaq_deduction: standardInfaqAmount }));
                                                        }
                                                    }}
                                                    className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                                />
                                                <span>Otomatis 2.5% Total Gaji</span>
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAutoInfaq(true);
                                                    setFormData(prev => ({ ...prev, infaq_deduction: standardInfaqAmount }));
                                                }}
                                                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition"
                                                title="Hitung ulang 2.5% dari total pendapatan saat ini"
                                            >
                                                = {formatCurrency(standardInfaqAmount)}
                                            </button>
                                        </div>
                                    </div>

                                    {/* KASBON */}
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-sm text-slate-600">Kasbon</label>
                                        <input
                                            type="number"
                                            name="cash_advance"
                                            value={formData.cash_advance === 0 ? '' : formData.cash_advance}
                                            placeholder="0"
                                            onChange={handleInput}
                                            className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400 transition-all"
                                        />
                                    </div>

                                    {/* Custom Deduction Items */}
                                    {customDeductionItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-red-50/50 p-2 rounded-lg border border-red-100">
                                            <input
                                                type="text"
                                                placeholder="Nama potongan"
                                                value={item.name}
                                                onChange={e => updateCustomDeductionItem(idx, 'name', e.target.value)}
                                                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-red-400"
                                            />
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={item.amount === 0 ? '' : item.amount}
                                                onChange={e => updateCustomDeductionItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400"
                                            />
                                            <button type="button" onClick={() => removeCustomDeductionItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addCustomDeductionItem} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition w-full justify-center border border-red-200 border-dashed">
                                        <Plus size={14} /> Tambah Komponen Potongan
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">Informasi Pembayaran</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-semibold text-slate-700">Metode Pembayaran</label>
                                    <select
                                        name="payment_method"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                                        value={formData.payment_method}
                                        onChange={handleInput}
                                    >
                                        <option value="Transfer">Transfer Bank</option>
                                        <option value="Cash">Tunai (Cash)</option>
                                    </select>
                                </div>
                            </div>

                            {formData.payment_method === 'Transfer' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-700">Nama Bank</label>
                                        <input
                                            type="text"
                                            name="bank_name"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.bank_name}
                                            onChange={handleInput}
                                            placeholder="Contoh: BSI, Mandiri, BCA"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-700">Atas Nama (Rekening)</label>
                                        <input
                                            type="text"
                                            name="bank_account_holder"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.bank_account_holder}
                                            onChange={handleInput}
                                            placeholder="Nama pemilik rekening"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-700">Nomor Rekening</label>
                                        <input
                                            type="text"
                                            name="bank_account_number"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.bank_account_number}
                                            onChange={handleInput}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 mt-2">
                                <label className="block text-sm font-semibold text-slate-700">Catatan Lainnya</label>
                                <input
                                    type="text"
                                    name="notes"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={formData.notes || ''}
                                    onChange={handleInput}
                                    placeholder="Catatan tambahan (opsional)"
                                />
                            </div>
                        </div>

                        {editingPayroll?.status !== 'Paid' && (
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">Status Pembayaran</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-xs space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: 'Draft' })}
                                        className={clsx(
                                            "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                            formData.status === 'Draft' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Draft / Tertunda
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                        className={clsx(
                                            "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                            formData.status === 'Paid' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Lunas
                                    </button>
                                </div>
                                {formData.status === 'Paid' && (
                                    <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-50 p-2 rounded flex items-center">
                                        <CheckCircle size={14} className="mr-1" />
                                        Menyimpan status Lunas akan otomatis mencatat pengeluaran di Buku Kas Umum (BKU).
                                    </p>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Real-time Calculation Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <p className="text-slate-500">Total Pendapatan</p>
                                <p className="font-semibold text-emerald-600">{formatCurrency(formIncome)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Total Potongan</p>
                                <p className="font-semibold text-red-500">-{formatCurrency(formDeduction)}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1 pt-2 md:pt-0 border-t md:border-none border-slate-200">
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Gaji Bersih</p>
                                <p className="font-bold text-xl text-slate-900">{formatCurrency(formNet)}</p>
                            </div>
                        </div>
                        <div className="flex w-full md:w-auto space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="payrollForm"
                                disabled={submitting}
                                className={clsx(
                                    "flex-1 md:flex-none px-8 py-2.5 rounded-xl text-white font-bold shadow-md transition flex justify-center items-center min-w-[140px]",
                                    "bg-emerald-600 hover:bg-emerald-700",
                                    submitting && "opacity-70 cursor-not-allowed"
                                )}
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Data'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
