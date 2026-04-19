import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { Budget, AcademicYear, TransactionCode } from './types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface RKASBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: Budget | null;
    years: AcademicYear[];
    transactionCodes: TransactionCode[];
    yearFilter: string;
    onSubmit: (data: any, isMultiple: boolean, months: number[]) => Promise<void>;
}

export const RKASBudgetModal: React.FC<RKASBudgetModalProps> = ({
    isOpen, onClose, editingItem, years, transactionCodes, yearFilter, onSubmit
}) => {
    const initialFormState = {
        academic_year_id: yearFilter || '', 
        budget_type: 'Pengeluaran', 
        item_name: '', 
        period: 'Tahunan', 
        months: [] as number[], 
        quantity: 1, 
        unit_price: 0, 
        planned_amount: '', 
        notes: '', 
        template_code_id: ''
    };

    const [form, setForm] = useState(initialFormState);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setForm({
                    academic_year_id: String(editingItem.academic_year_id),
                    budget_type: editingItem.budget_type || 'Pengeluaran',
                    item_name: editingItem.item_name,
                    period: editingItem.period || 'Tahunan',
                    months: editingItem.month ? [editingItem.month] : [],
                    quantity: editingItem.quantity || 1,
                    unit_price: editingItem.unit_price || 0,
                    planned_amount: String(editingItem.planned_amount),
                    notes: editingItem.notes,
                    template_code_id: String(editingItem.transaction_code_id || '')
                });
            } else {
                setForm(initialFormState);
            }
        }
    }, [isOpen, editingItem, yearFilter]);

    if (!isOpen) return null;

    const selectedYear = years.find(y => String(y.id) === (form.academic_year_id || yearFilter));
    const getSemesterMonths = (year?: AcademicYear) => {
        if (!year?.start_date) return { semester1: [7,8,9,10,11,12], semester2: [1,2,3,4,5,6] };
        const startMonth = new Date(year.start_date).getMonth() + 1;
        const endMonth = new Date(year.end_date).getMonth() + 1;
        const sem1: number[] = [], sem2: number[] = [];
        if (startMonth >= 7) {
            for (let m = startMonth; m <= 12; m++) sem1.push(m);
            for (let m = 1; m <= Math.min(endMonth, 6); m++) sem2.push(m);
        } else {
            const all: number[] = [];
            if (startMonth <= endMonth) { for (let m = startMonth; m <= endMonth; m++) all.push(m); }
            else { for (let m = startMonth; m <= 12; m++) all.push(m); for (let m = 1; m <= endMonth; m++) all.push(m); }
            const half = Math.ceil(all.length / 2);
            sem1.push(...all.slice(0, half)); sem2.push(...all.slice(half));
        }
        return { semester1: sem1, semester2: sem2 };
    };
    const semMonths = getSemesterMonths(selectedYear || years.find(y => y.is_active));
    const allSemMonths = [...semMonths.semester1, ...semMonths.semester2].sort((a,b) => a-b);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const calcAmount = form.quantity > 0 && form.unit_price > 0 ? form.quantity * form.unit_price : Number(form.planned_amount);
        const data: any = {
            ...form,
            academic_year_id: Number(form.academic_year_id),
            planned_amount: calcAmount,
            quantity: form.quantity,
            unit_price: form.unit_price,
            budget_type: form.budget_type,
        };
        if (form.template_code_id) data.template_code_id = Number(form.template_code_id);
        
        setSubmitting(true);
        try {
            await onSubmit(data, form.period === 'Bulanan' && form.months.length > 0 && !editingItem, form.months);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold">{editingItem ? 'Edit Anggaran' : 'Tambah Anggaran'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                        <select value={form.academic_year_id} onChange={e => setForm({ ...form, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                            <option value="">Pilih</option>
                            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Anggaran</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button type="button" onClick={() => setForm({ ...form, budget_type: 'Pengeluaran' })}
                                className={clsx("flex-1 py-1.5 text-sm font-medium rounded-lg transition", form.budget_type === 'Pengeluaran' ? "bg-white text-red-600 shadow-sm" : "text-slate-500")}>
                                Pengeluaran
                            </button>
                            <button type="button" onClick={() => setForm({ ...form, budget_type: 'Penerimaan' })}
                                className={clsx("flex-1 py-1.5 text-sm font-medium rounded-lg transition", form.budget_type === 'Penerimaan' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>
                                Penerimaan
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Item</label>
                        <input type="text" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Periode <span className="text-xs text-slate-400 font-normal">(Tahunan/Semester/Bulanan)</span></label>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                {['Tahunan', 'Semester 1', 'Semester 2', 'Bulanan'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setForm({ ...form, period: p, months: [] })}
                                        className={clsx(
                                            "flex-1 py-1.5 text-xs font-bold rounded-xl transition",
                                            form.period === p ? "bg-white text-blue-600 shadow-sm border border-blue-100" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {p === 'Tahunan' ? 'Tahun' : p.replace('Semester ', 'Sem ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {form.period === 'Bulanan' && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Bulan <span className="text-xs text-slate-500 font-normal">(Bisa pilih lebih dari satu)</span></label>
                                
                                {!editingItem && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, months: [...new Set([...prev.months, ...semMonths.semester1])] }))} className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm hover:bg-emerald-100 transition">Pilih Sem 1</button>
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, months: [...new Set([...prev.months, ...semMonths.semester2])] }))} className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm hover:bg-emerald-100 transition">Pilih Sem 2</button>
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, months: allSemMonths }))} className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 transition">Pilih Semua</button>
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, months: [] }))} className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-200 transition">Reset</button>
                                    </div>
                                )}

                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {allSemMonths.map(m => (
                                        <label key={m} className={clsx("flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium cursor-pointer transition-all border", form.months.includes(m) ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50")}>
                                            <input 
                                                type="checkbox" 
                                                className="sr-only"
                                                checked={form.months.includes(m)}
                                                onChange={(e) => {
                                                    if (editingItem) {
                                                        setForm(prev => ({ ...prev, months: [m] }));
                                                    } else {
                                                        if (e.target.checked) setForm(prev => ({ ...prev, months: [...prev.months, m] }));
                                                        else setForm(prev => ({ ...prev, months: prev.months.filter(x => x !== m) }));
                                                    }
                                                }}
                                            />
                                            <span className="capitalize">{MONTH_NAMES[m].substring(0,3)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Volume / Qty</label>
                            <input type="number" min={1} value={form.quantity} onChange={e => {
                                const qty = Number(e.target.value);
                                setForm({ ...form, quantity: qty, planned_amount: String(qty * form.unit_price || form.planned_amount) });
                            }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                            <input type="number" min={0} value={form.unit_price} onChange={e => {
                                const price = Number(e.target.value);
                                setForm({ ...form, unit_price: price, planned_amount: String(form.quantity * price || form.planned_amount) });
                            }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Total Anggaran (Rp) {form.quantity > 0 && form.unit_price > 0 && <span className="text-xs text-slate-400">= {form.quantity} × {formatCurrency(form.unit_price)}</span>}
                        </label>
                        <input type="number" value={form.planned_amount} onChange={e => setForm({ ...form, planned_amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Standar (Wajib)</label>
                        <select value={form.template_code_id} onChange={e => setForm({ ...form, template_code_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required disabled={!!editingItem}>
                            <option value="">Pilih Standar</option>
                            {transactionCodes.filter(tc => !tc.description?.startsWith('RKAS Item: ')).map(tc => <option key={tc.id} value={tc.id}>{tc.name} ({tc.category})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" rows={2} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Batal</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/25">
                            {submitting ? 'Menyimpan...' : (editingItem ? 'Simpan' : 'Tambah')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
