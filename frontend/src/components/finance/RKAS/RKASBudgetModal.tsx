import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { X, Sparkles, CheckCircle2, Users, UserMinus, Search } from 'lucide-react';
import clsx from 'clsx';
import { Budget, AcademicYear, TransactionCode } from './types';

interface PaymentType {
    id: number;
    code: string;
    name: string;
    amount: number;
    academic_year_id: number;
    transaction_code_id: number | null;
    payment_schedule: string;
}

interface ClassRecord {
    id: number;
    name: string;
    unit_id?: number;
}

interface StudentRecord {
    id: string;
    nisn: string;
    class_id: number;
    status: string;
    user?: {
        name: string;
    };
    class?: {
        name: string;
    };
}

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
    const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<string>('');

    // Class selection & student exclusion states
    const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
    const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
    const [showClassCalc, setShowClassCalc] = useState<boolean>(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

    // Queries
    const { data: paymentTypes = [] } = useQuery<PaymentType[]>({
        queryKey: ['payment-types', form.academic_year_id],
        queryFn: async () => {
            const url = form.academic_year_id ? `/finance/payment-types?academic_year_id=${form.academic_year_id}` : '/finance/payment-types';
            return (await api.get(url)).data || [];
        },
        enabled: isOpen,
    });

    const { data: classes = [] } = useQuery<ClassRecord[]>({
        queryKey: ['academic-classes'],
        queryFn: async () => (await api.get('/academic/classes')).data || [],
        enabled: isOpen,
    });

    const { data: allStudents = [] } = useQuery<StudentRecord[]>({
        queryKey: ['all-students'],
        queryFn: async () => (await api.get('/students/')).data || (await api.get('/students')).data || [],
        enabled: isOpen,
    });

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
                setSelectedPaymentTypeId('');
                setSelectedClassIds([]);
                setExcludedStudentIds([]);
                setShowClassCalc(false);
            }
        }
    }, [isOpen, editingItem, yearFilter]);

    const getPeriodMultiplier = (period: string, monthsCount: number) => {
        if (period === 'Tahunan') return 12;
        if (period === 'Semester 1' || period === 'Semester 2') return 6;
        if (period === 'Bulanan') return monthsCount > 0 ? monthsCount : 1;
        return 1;
    };

    const calcTotalPlanned = (qty: number, price: number, period: string, months: number[]) => {
        if (price > 0) {
            const mult = getPeriodMultiplier(period, months.length);
            const q = qty > 0 ? qty : 1;
            return String(q * price * mult);
        }
        return form.planned_amount;
    };

    const matchingPaymentTypes = form.template_code_id 
        ? paymentTypes.filter((pt: PaymentType) => pt.transaction_code_id === Number(form.template_code_id))
        : [];

    const handleSelectTemplateCode = (codeId: string) => {
        const matches = codeId ? paymentTypes.filter((pt: PaymentType) => pt.transaction_code_id === Number(codeId)) : [];
        setSelectedPaymentTypeId('');
        
        let newForm = { ...form, template_code_id: codeId };

        if (matches.length === 1) {
            const singlePt = matches[0];
            const price = singlePt.amount;
            const qty = newForm.quantity > 0 ? newForm.quantity : 1;
            newForm.unit_price = price;
            newForm.planned_amount = calcTotalPlanned(qty, price, newForm.period, newForm.months);
            if (!newForm.item_name) {
                newForm.item_name = singlePt.name;
            }
        }

        setForm(newForm);
    };

    const handleSelectPaymentTypeOption = (paymentTypeIdStr: string) => {
        setSelectedPaymentTypeId(paymentTypeIdStr);
        if (!paymentTypeIdStr) return;

        const pt = matchingPaymentTypes.find((p: PaymentType) => String(p.id) === paymentTypeIdStr);
        if (pt) {
            const price = pt.amount;
            const qty = form.quantity > 0 ? form.quantity : 1;
            setForm(prev => ({
                ...prev,
                unit_price: price,
                planned_amount: calcTotalPlanned(qty, price, prev.period, prev.months),
                item_name: prev.item_name ? prev.item_name : pt.name
            }));
        }
    };

    // Calculate students in selected classes
    const classStudents = allStudents.filter((s: StudentRecord) => 
        selectedClassIds.includes(s.class_id) && (s.status === 'Active' || s.status === 'Aktif' || !s.status)
    );

    const effectiveStudentCount = Math.max(0, classStudents.length - excludedStudentIds.length);

    const handleToggleClass = (classId: number) => {
        let nextClasses: number[];
        if (selectedClassIds.includes(classId)) {
            nextClasses = selectedClassIds.filter(id => id !== classId);
        } else {
            nextClasses = [...selectedClassIds, classId];
        }
        setSelectedClassIds(nextClasses);
        
        // Clean up exclusions for classes that were unselected
        const nextStudents = allStudents.filter((s: StudentRecord) => 
            nextClasses.includes(s.class_id) && (s.status === 'Active' || s.status === 'Aktif' || !s.status)
        );
        const validStudentIds = new Set(nextStudents.map(s => String(s.id)));
        const nextExclusions = excludedStudentIds.filter(id => validStudentIds.has(id));
        setExcludedStudentIds(nextExclusions);

        const newQty = Math.max(1, nextStudents.length - nextExclusions.length);
        setForm(prev => ({
            ...prev,
            quantity: nextClasses.length > 0 ? newQty : prev.quantity,
            planned_amount: nextClasses.length > 0 ? calcTotalPlanned(newQty, prev.unit_price, prev.period, prev.months) : prev.planned_amount
        }));
    };

    const handleToggleExclusion = (studentId: string) => {
        let nextExclusions: string[];
        if (excludedStudentIds.includes(studentId)) {
            nextExclusions = excludedStudentIds.filter(id => id !== studentId);
        } else {
            nextExclusions = [...excludedStudentIds, studentId];
        }
        setExcludedStudentIds(nextExclusions);

        const newQty = Math.max(1, classStudents.length - nextExclusions.length);
        setForm(prev => ({
            ...prev,
            quantity: selectedClassIds.length > 0 ? newQty : prev.quantity,
            planned_amount: selectedClassIds.length > 0 ? calcTotalPlanned(newQty, prev.unit_price, prev.period, prev.months) : prev.planned_amount
        }));
    };

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
        const calcAmount = form.quantity > 0 && form.unit_price > 0 
            ? form.quantity * form.unit_price * getPeriodMultiplier(form.period, form.months.length) 
            : Number(form.planned_amount);

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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold">{editingItem ? 'Edit Anggaran' : 'Tambah Anggaran RKAS'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                        <select value={form.academic_year_id} onChange={e => setForm({ ...form, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required>
                            <option value="">Pilih Tahun Ajaran</option>
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

                    {/* Standar / Kode Transaksi Select */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Standar / Pos Keuangan (Wajib)</label>
                        <select
                            value={form.template_code_id}
                            onChange={e => handleSelectTemplateCode(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                            required
                            disabled={!!editingItem}
                        >
                            <option value="">-- Pilih Standar Kode Transaksi --</option>
                            {transactionCodes.filter(tc => !tc.description?.startsWith('RKAS Item: ')).map(tc => (
                                <option key={tc.id} value={tc.id}>
                                    [{tc.code}] {tc.name} ({tc.category})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Auto-fill feedback / Multiple tariff options UI */}
                    {matchingPaymentTypes.length === 1 && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Tarif Otomatis Terdeteksi:</span>
                                <p className="mt-0.5">
                                    Nominal terisi dari Jenis Pembayaran <strong>{matchingPaymentTypes[0].name}</strong> ({formatCurrency(matchingPaymentTypes[0].amount)}).
                                </p>
                            </div>
                        </div>
                    )}

                    {matchingPaymentTypes.length > 1 && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900 animate-in fade-in">
                            <div className="flex items-center gap-1.5 font-bold">
                                <Sparkles size={15} className="text-amber-600" />
                                <span>Pilih Acuan Tarif Jenis Pembayaran:</span>
                            </div>
                            <p className="text-[11px] text-amber-700">
                                Ditemukan {matchingPaymentTypes.length} tarif pembayaran yang terhubung dengan kode transaksi ini. Pilih salah satu untuk mengisi nominal otomatis:
                            </p>
                            <select
                                value={selectedPaymentTypeId}
                                onChange={e => handleSelectPaymentTypeOption(e.target.value)}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white font-semibold text-amber-950 focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="">-- Gunakan Nominal Manual / Pilih Tarif --</option>
                                {matchingPaymentTypes.map(pt => (
                                    <option key={pt.id} value={pt.id}>
                                        {pt.name} — {formatCurrency(pt.amount)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Item Anggaran</label>
                        <input type="text" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium" placeholder="Contoh: SPP Siswa Kelas 1" required />
                    </div>

                    {/* Class & Student Calculation Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowClassCalc(!showClassCalc)}
                                className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-emerald-700 transition"
                            >
                                <Users size={16} className="text-emerald-600" />
                                <span>Kalkulasi Qty Berdasarkan Jumlah Siswa & Kelas</span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Opsional</span>
                            </button>
                            {selectedClassIds.length > 0 && (
                                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                    {effectiveStudentCount} Siswa Efektif
                                </span>
                            )}
                        </div>

                        {showClassCalc && (
                            <div className="space-y-4 pt-2 border-t border-slate-200/80 animate-in fade-in">
                                {/* Class Selection Pills */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-slate-700">1. Pilih Kelas Target:</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allIds = classes.map(c => c.id);
                                                    setSelectedClassIds(allIds);
                                                    const count = allStudents.filter(s => allIds.includes(s.class_id) && (s.status === 'Active' || s.status === 'Aktif' || !s.status)).length;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        quantity: count || 1,
                                                        planned_amount: calcTotalPlanned(count || 1, prev.unit_price, prev.period, prev.months)
                                                    }));
                                                }}
                                                className="text-[10px] font-bold text-emerald-700 hover:underline"
                                            >
                                                Pilih Semua
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedClassIds([]);
                                                    setExcludedStudentIds([]);
                                                }}
                                                className="text-[10px] font-bold text-slate-500 hover:underline"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                                        {classes.map(c => {
                                            const countInClass = allStudents.filter(s => s.class_id === c.id && (s.status === 'Active' || s.status === 'Aktif' || !s.status)).length;
                                            const isSelected = selectedClassIds.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => handleToggleClass(c.id)}
                                                    className={clsx(
                                                        "px-2.5 py-1 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5",
                                                        isSelected 
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                                                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                                                    )}
                                                >
                                                    <span>{c.name}</span>
                                                    <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full", isSelected ? "bg-emerald-700 text-emerald-100 font-bold" : "bg-slate-100 text-slate-500")}>
                                                        {countInClass}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Student Exclusions */}
                                {selectedClassIds.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                <UserMinus size={14} className="text-rose-600" />
                                                <span>2. Pengecualian Siswa (Beasiswa / Diskon / Khusus):</span>
                                            </label>
                                            {excludedStudentIds.length > 0 && (
                                                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                                    {excludedStudentIds.length} Siswa Dikecualikan
                                                </span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                value={studentSearchQuery}
                                                onChange={e => setStudentSearchQuery(e.target.value)}
                                                placeholder="Cari nama siswa untuk dikecualikan..."
                                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                                            />
                                        </div>

                                        <div className="max-h-36 overflow-y-auto bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 p-1">
                                            {classStudents.filter(s => (s.user?.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 ? (
                                                <div className="p-3 text-center text-xs text-slate-400">Tidak ada siswa yang cocok.</div>
                                            ) : (
                                                classStudents
                                                    .filter(s => (s.user?.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                                    .map(s => {
                                                        const isExcluded = excludedStudentIds.includes(String(s.id));
                                                        return (
                                                            <label key={s.id} className={clsx("flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition", isExcluded ? "bg-rose-50/70 text-rose-900 font-semibold" : "hover:bg-slate-50")}>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isExcluded}
                                                                        onChange={() => handleToggleExclusion(String(s.id))}
                                                                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                                    />
                                                                    <span>{s.user?.name || `Siswa NISN: ${s.nisn}`}</span>
                                                                    <span className="text-[10px] text-slate-400">({s.class?.name || 'Kelas'})</span>
                                                                </div>
                                                                {isExcluded && (
                                                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                                                        Dikecualikan
                                                                    </span>
                                                                )}
                                                            </label>
                                                        );
                                                    })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Periode <span className="text-xs text-slate-400 font-normal">(Tahunan/Semester/Bulanan)</span></label>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                {['Tahunan', 'Semester 1', 'Semester 2', 'Bulanan'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setForm(prev => {
                                            const updatedMonths = p === 'Bulanan' ? prev.months : [];
                                            return {
                                                ...prev,
                                                period: p,
                                                months: updatedMonths,
                                                planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, p, updatedMonths)
                                            };
                                        })}
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
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => {
                                                const newM = [...new Set([...prev.months, ...semMonths.semester1])];
                                                return { ...prev, months: newM, planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, prev.period, newM) };
                                            })}
                                            className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm hover:bg-emerald-100 transition"
                                        >
                                            Pilih Sem 1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => {
                                                const newM = [...new Set([...prev.months, ...semMonths.semester2])];
                                                return { ...prev, months: newM, planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, prev.period, newM) };
                                            })}
                                            className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm hover:bg-emerald-100 transition"
                                        >
                                            Pilih Sem 2
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => {
                                                return { ...prev, months: allSemMonths, planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, prev.period, allSemMonths) };
                                            })}
                                            className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 transition"
                                        >
                                            Pilih Semua
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, months: [], planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, prev.period, []) }))}
                                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-200 transition"
                                        >
                                            Reset
                                        </button>
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
                                                        const newM = [m];
                                                        setForm(prev => ({ ...prev, months: newM, planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, prev.period, newM) }));
                                                    } else {
                                                        const newM = e.target.checked ? [...form.months, m] : form.months.filter(x => x !== m);
                                                        setForm(prev => ({ ...prev, months: newM, planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price, prev.period, newM) }));
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Volume / Qty (Siswa/Item)</label>
                            <input type="number" min={1} value={form.quantity} onChange={e => {
                                const qty = Number(e.target.value);
                                setForm(prev => ({ ...prev, quantity: qty, planned_amount: calcTotalPlanned(qty, prev.unit_price, prev.period, prev.months) }));
                            }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                            <input type="number" min={0} value={form.unit_price} onChange={e => {
                                const price = Number(e.target.value);
                                setForm(prev => ({ ...prev, unit_price: price, planned_amount: calcTotalPlanned(prev.quantity, price, prev.period, prev.months) }));
                            }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-mono" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Total Anggaran (Rp)
                        </label>
                        <input type="number" value={form.planned_amount} onChange={e => setForm({ ...form, planned_amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 text-base" required />
                        {form.quantity > 0 && form.unit_price > 0 && (
                            <p className="text-xs text-slate-500 font-normal mt-1">
                                💡 Kalkulasi: {form.quantity} Qty × {formatCurrency(form.unit_price)} × {getPeriodMultiplier(form.period, form.months.length)} Bulan = <strong className="text-emerald-700 font-bold">{formatCurrency(Number(form.planned_amount))}</strong>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" rows={2} placeholder="Catatan tambahan anggaran..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 transition">
                            {submitting ? 'Menyimpan...' : (editingItem ? 'Simpan' : 'Tambah Anggaran')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
