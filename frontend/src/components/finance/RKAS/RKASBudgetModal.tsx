import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { X, Sparkles, CheckCircle2, TrendingDown, TrendingUp, Calculator } from 'lucide-react';
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

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

const MONTH_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

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
        budget_type: 'Pengeluaran' as 'Pengeluaran' | 'Penerimaan',
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

    // Query active payment types for matching
    const { data: paymentTypes = [] } = useQuery<PaymentType[]>({
        queryKey: ['payment-types', form.academic_year_id],
        queryFn: async () => {
            const url = form.academic_year_id ? `/finance/payment-types?academic_year_id=${form.academic_year_id}` : '/finance/payment-types';
            return (await api.get(url)).data || [];
        },
        enabled: isOpen,
    });

    // Query simple student count for quick estimation helper
    const { data: activeStudentCount = 0 } = useQuery<number>({
        queryKey: ['active-student-count'],
        queryFn: async () => {
            try {
                const res = await api.get('/students');
                const list = res.data || [];
                return list.filter((s: any) => s.status === 'Active' || s.status === 'Aktif' || !s.status).length;
            } catch {
                return 0;
            }
        },
        enabled: isOpen && form.budget_type === 'Penerimaan',
    });

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setForm({
                    academic_year_id: String(editingItem.academic_year_id),
                    budget_type: (editingItem.budget_type as any) || 'Pengeluaran',
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
            }
        }
    }, [isOpen, editingItem, yearFilter]);

    const calcTotalPlanned = (qty: number, price: number) => {
        if (price > 0) {
            const q = qty > 0 ? qty : 1;
            return String(q * price);
        }
        return form.planned_amount;
    };

    // Filter transaction codes based on budget_type
    const filteredCodes = transactionCodes.filter(tc => {
        if (tc.description?.startsWith('RKAS Item: ')) return false;
        if (form.budget_type === 'Pengeluaran') {
            return tc.type === 'Expense' || tc.type === 'Pengeluaran';
        }
        return tc.type === 'Income' || tc.type === 'Penerimaan';
    });

    const masterFilteredCodes = filteredCodes.filter(tc => !tc.parent_code_id);

    // Matching payment types for Penerimaan
    const matchingPaymentTypes = (form.budget_type === 'Penerimaan' && form.template_code_id)
        ? paymentTypes.filter((pt: PaymentType) => {
            const selId = Number(form.template_code_id);
            if (pt.transaction_code_id === selId) return true;
            const childIds = transactionCodes.filter(c => c.parent_code_id === selId).map(c => c.id);
            return pt.transaction_code_id !== null && childIds.includes(pt.transaction_code_id);
        })
        : [];

    const handleSelectTemplateCode = (codeId: string) => {
        const selId = Number(codeId);
        const matches = (form.budget_type === 'Penerimaan' && selId)
            ? paymentTypes.filter((pt: PaymentType) => {
                if (pt.transaction_code_id === selId) return true;
                const childIds = transactionCodes.filter(c => c.parent_code_id === selId).map(c => c.id);
                return pt.transaction_code_id !== null && childIds.includes(pt.transaction_code_id);
            })
            : [];
        setSelectedPaymentTypeId('');

        const newForm = { ...form, template_code_id: codeId };
        const selectedCodeObj = transactionCodes.find(tc => tc.id === selId);

        if (matches.length === 1) {
            const singlePt = matches[0];
            const price = singlePt.amount;
            const qty = activeStudentCount > 0 ? activeStudentCount : (newForm.quantity > 0 ? newForm.quantity : 1);
            newForm.quantity = qty;
            newForm.unit_price = price;
            if (singlePt.payment_schedule === 'Bulanan') {
                newForm.period = 'Bulanan';
                newForm.months = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
            }
            newForm.planned_amount = calcTotalPlanned(qty, price);
            if (!newForm.item_name) {
                newForm.item_name = singlePt.name;
            }
        } else if (selectedCodeObj && !newForm.item_name) {
            newForm.item_name = selectedCodeObj.name;
        }

        setForm(newForm);
    };

    const handleSelectPaymentTypeOption = (paymentTypeIdStr: string) => {
        setSelectedPaymentTypeId(paymentTypeIdStr);
        if (!paymentTypeIdStr) return;

        const pt = matchingPaymentTypes.find((p: PaymentType) => String(p.id) === paymentTypeIdStr);
        if (pt) {
            const price = pt.amount;
            const qty = activeStudentCount > 0 ? activeStudentCount : (form.quantity > 0 ? form.quantity : 1);
            setForm(prev => ({
                ...prev,
                quantity: qty,
                unit_price: price,
                period: pt.payment_schedule === 'Bulanan' ? 'Bulanan' : prev.period,
                months: pt.payment_schedule === 'Bulanan' && prev.months.length === 0 ? [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6] : prev.months,
                planned_amount: calcTotalPlanned(qty, price),
                item_name: prev.item_name ? prev.item_name : pt.name
            }));
        }
    };

    const handleQuickEstimate = () => {
        const qty = activeStudentCount > 0 ? activeStudentCount : 1;
        const price = form.unit_price > 0 ? form.unit_price : 0;
        setForm(prev => ({
            ...prev,
            quantity: qty,
            planned_amount: calcTotalPlanned(qty, price)
        }));
    };

    const handlePeriodChange = (newPeriod: string) => {
        let newMonths = form.months;
        if (newPeriod === 'Bulanan' && newMonths.length === 0) {
            newMonths = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
        }
        setForm(prev => ({
            ...prev,
            period: newPeriod,
            months: newMonths,
            planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price)
        }));
    };

    const toggleMonth = (m: number) => {
        const exists = form.months.includes(m);
        const next = exists ? form.months.filter(x => x !== m) : [...form.months, m].sort((a, b) => a - b);
        setForm(prev => ({
            ...prev,
            months: next,
            planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price)
        }));
    };

    const toggleAllMonths = () => {
        const allMonths = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
        const next = form.months.length === 12 ? [] : allMonths;
        setForm(prev => ({
            ...prev,
            months: next,
            planned_amount: calcTotalPlanned(prev.quantity, prev.unit_price)
        }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const calcAmount = form.quantity > 0 && form.unit_price > 0
            ? form.quantity * form.unit_price
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {editingItem ? 'Edit Item Anggaran RKAS' : 'Tambah Anggaran RKAS Sekolah'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Rencana penerimaan atau pengeluaran operasional lembaga.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {/* Tipe Anggaran: Big Visual Switcher */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                            1. Tipe Anggaran
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setForm({ ...form, budget_type: 'Pengeluaran', template_code_id: '', item_name: '' });
                                    setSelectedPaymentTypeId('');
                                }}
                                className={clsx(
                                    "p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3",
                                    form.budget_type === 'Pengeluaran'
                                        ? "border-red-500 bg-red-50/40 text-red-950 shadow-sm"
                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                                )}
                            >
                                <div className={clsx(
                                    "p-2 rounded-xl shrink-0 mt-0.5",
                                    form.budget_type === 'Pengeluaran' ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                    <TrendingDown size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Pengeluaran / Belanja</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Gaji, listrik, ATK, sarpras, program kegiatan.</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setForm({ ...form, budget_type: 'Penerimaan', template_code_id: '', item_name: '' });
                                    setSelectedPaymentTypeId('');
                                }}
                                className={clsx(
                                    "p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3",
                                    form.budget_type === 'Penerimaan'
                                        ? "border-emerald-500 bg-emerald-50/40 text-emerald-950 shadow-sm"
                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                                )}
                            >
                                <div className={clsx(
                                    "p-2 rounded-xl shrink-0 mt-0.5",
                                    form.budget_type === 'Penerimaan' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Penerimaan / Pemasukan</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">SPP siswa, infaq, BOS, bantuan & usaha.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Tahun Ajaran & Pos Keuangan (CoA) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Tahun Ajaran <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.academic_year_id}
                                onChange={e => setForm({ ...form, academic_year_id: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                                required
                            >
                                <option value="">Pilih Tahun Ajaran</option>
                                {years.map(y => (
                                    <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Pos Keuangan / Standar (CoA) <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.template_code_id}
                                onChange={e => handleSelectTemplateCode(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                                required
                                disabled={!!editingItem}
                            >
                                <option value="">
                                    {form.budget_type === 'Pengeluaran' ? '-- Pilih Pos Belanja --' : '-- Pilih Pos Penerimaan --'}
                                </option>
                                {masterFilteredCodes.map(master => (
                                    <React.Fragment key={master.id}>
                                        <option value={master.id}>{master.code} — {master.name} (Induk)</option>
                                        {filteredCodes
                                            .filter(child => child.parent_code_id === master.id)
                                            .map(child => (
                                                <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.code} — {child.name}</option>
                                            ))}
                                    </React.Fragment>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Banner Info Keterhubungan Jenis Pembayaran (Khusus Penerimaan) */}
                    {form.budget_type === 'Penerimaan' && matchingPaymentTypes.length > 0 && (
                        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5 text-xs text-emerald-950 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                                    <CheckCircle2 size={15} className="text-emerald-600" />
                                    Terhubung ke Jenis Pembayaran Siswa
                                </span>
                                {activeStudentCount > 0 && (
                                    <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                        {activeStudentCount} Siswa Aktif
                                    </span>
                                )}
                            </div>

                            {matchingPaymentTypes.length === 1 ? (
                                <p className="text-emerald-800">
                                    Pos ini terhubung dengan tarif tagihan <strong>{matchingPaymentTypes[0].name}</strong> senilai <strong>{formatCurrency(matchingPaymentTypes[0].amount)}</strong>. Realisasi bertambah otomatis setiap siswa membayar tagihan ini.
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    <p className="text-emerald-800">Pilih salah satu tarif acuan pembayaran:</p>
                                    <select
                                        value={selectedPaymentTypeId}
                                        onChange={e => handleSelectPaymentTypeOption(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">-- Pilih Tarif Acuan --</option>
                                        {matchingPaymentTypes.map(pt => (
                                            <option key={pt.id} value={pt.id}>{pt.name} — {formatCurrency(pt.amount)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {activeStudentCount > 0 && (form.unit_price > 0 || matchingPaymentTypes.length > 0) && (
                                <div className="pt-1 flex items-center justify-between border-t border-emerald-200/60">
                                    <span className="text-[11px] text-emerald-700">Estimasi otomatis dari total siswa aktif:</span>
                                    <button
                                        type="button"
                                        onClick={handleQuickEstimate}
                                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1"
                                    >
                                        <Sparkles size={12} /> Terapkan Estimasi Siswa
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Nama Item Anggaran */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Nama Item Anggaran / Kegiatan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.item_name}
                            onChange={e => setForm({ ...form, item_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                            placeholder={form.budget_type === 'Pengeluaran'
                                ? "Contoh: Beban Listrik & Internet Bulanan / Pengadaan ATK Kantor"
                                : "Contoh: Penerimaan SPP Siswa / Infaq Pembangunan Gedung"}
                            required
                        />
                    </div>

                    {/* Periode Anggaran */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                            Periode Anggaran
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {['Tahunan', 'Semester 1', 'Semester 2', 'Bulanan'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handlePeriodChange(p)}
                                    className={clsx(
                                        "py-2 px-2 text-xs font-bold rounded-xl border text-center transition",
                                        form.period === p
                                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* Month Selector for Bulanan */}
                        {form.period === 'Bulanan' && (
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Pilih Bulan Anggaran:</span>
                                    <button
                                        type="button"
                                        onClick={toggleAllMonths}
                                        className="text-[11px] font-bold text-blue-600 hover:underline"
                                    >
                                        {form.months.length === 12 ? 'Batal Pilih Semua' : 'Pilih Semua (12 Bulan)'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                    {[7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map(m => {
                                        const isSel = form.months.includes(m);
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => toggleMonth(m)}
                                                className={clsx(
                                                    "py-1.5 px-2 text-[11px] font-bold rounded-lg transition text-center",
                                                    isSel
                                                        ? "bg-blue-600 text-white shadow-sm"
                                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                                )}
                                            >
                                                {MONTH_NAMES[m].slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Peringatan jika terhubung ke tagihan bulanan tapi user memilih non-bulanan */}
                        {form.period !== 'Bulanan' && (
                            matchingPaymentTypes.some(pt => pt.payment_schedule === 'Bulanan') ||
                            (matchingPaymentTypes.length === 0 && form.item_name.toLowerCase().includes('spp'))
                        ) && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
                                <span className="text-amber-600 font-bold mt-0.5">⚠️</span>
                                <div className="flex-1">
                                    <p className="font-bold">Pos ini merupakan Tagihan Bulanan Siswa (SPP)</p>
                                    <p className="text-[11px] text-amber-800 mt-0.5">
                                        Disarankan memilih periode <strong>Bulanan</strong> agar target anggaran terdistribusi ke masing-masing 12 bulan (dengan rumus: <code>Qty Siswa × Bulan × Tarif</code>) dan sinkron dengan pembayaran siswa.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handlePeriodChange('Bulanan')}
                                        className="mt-1.5 px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[10px] hover:bg-amber-700 transition"
                                    >
                                        Ubah ke Periode Bulanan (12 Bulan)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Kalkulasi Volume & Harga Satuan -> Pagu Anggaran */}
                    {(() => {
                        const isMonthly = form.period === 'Bulanan';
                        const monthsCount = isMonthly ? (form.months.length > 0 ? form.months.length : 12) : 1;
                        const qty = form.quantity || 1;
                        const unitPrice = form.unit_price || 0;
                        const monthlyAllocation = qty * unitPrice;
                        const totalPlannedAccumulated = isMonthly ? (qty * monthsCount * unitPrice) : monthlyAllocation;
                        const isSuspiciousMultiply = isMonthly && activeStudentCount > 0 && form.quantity >= (activeStudentCount * 2);

                        return (
                            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Calculator size={15} className="text-blue-600" />
                                        <span>Rincian Pagu Anggaran</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-semibold">
                                        {isMonthly ? 'Rumus: Qty Siswa × Bulan × Tarif' : 'Rumus: Qty × Tarif'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            {isMonthly && form.budget_type === 'Penerimaan'
                                                ? 'Jumlah Siswa (Qty Siswa)'
                                                : isMonthly
                                                    ? 'Volume per Bulan (Qty)'
                                                    : 'Volume / Qty (Item / Siswa)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.quantity}
                                            onChange={e => {
                                                const q = Number(e.target.value);
                                                setForm(prev => ({
                                                    ...prev,
                                                    quantity: q,
                                                    planned_amount: calcTotalPlanned(q, prev.unit_price)
                                                }));
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {isMonthly && (
                                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                                                💡 Masukkan jumlah siswa (misal: {activeStudentCount > 0 ? activeStudentCount : 50} siswa). Jangan dikalikan dengan bulan.
                                            </p>
                                        )}
                                        {isSuspiciousMultiply && (
                                            <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-medium">
                                                ⚠️ Nilai {form.quantity} tampak besar. Pastikan ini adalah <strong>jumlah siswa</strong>, bukan hasil perkalian dengan bulan ({activeStudentCount} × 12 = {activeStudentCount * 12}).
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            {isMonthly ? 'Tarif / Biaya per Bulan (Rp)' : 'Harga Satuan / Tarif (Rp)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.unit_price || ''}
                                            onChange={e => {
                                                const p = Number(e.target.value);
                                                setForm(prev => ({
                                                    ...prev,
                                                    unit_price: p,
                                                    planned_amount: calcTotalPlanned(prev.quantity, p)
                                                }));
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                                            placeholder="Contoh: 150000"
                                        />
                                        {isMonthly && (
                                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                                                Tarif per siswa per bulan.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Breakdown Penjelasan Rumus */}
                                {isMonthly ? (
                                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1.5">
                                        <div className="flex items-center justify-between font-semibold text-emerald-800">
                                            <span className="flex items-center gap-1.5">
                                                <span>📐</span> Rumus Pagu Tagihan Bulanan:
                                            </span>
                                            <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Qty Siswa × Bulan × Tarif
                                            </span>
                                        </div>
                                        <div className="text-xs font-extrabold text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-200/60">
                                            {qty} Siswa × {monthsCount} Bulan × {formatCurrency(unitPrice)} = <span className="text-emerald-700">{formatCurrency(totalPlannedAccumulated)}</span>
                                        </div>
                                        <div className="text-[11px] text-emerald-700 pt-0.5 flex items-center justify-between">
                                            <span>Alokasi Pagu per Bulan:</span>
                                            <span className="font-bold text-emerald-800">{formatCurrency(monthlyAllocation)} / bulan ({monthsCount} bulan)</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-center justify-between">
                                        <span className="font-semibold text-blue-700">Rumus Pagu:</span>
                                        <span className="font-bold">
                                            {qty} × {formatCurrency(unitPrice)} = {formatCurrency(qty * unitPrice)}
                                        </span>
                                    </div>
                                )}

                                {/* Total Pagu Display */}
                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">
                                            {isMonthly ? 'Total Target Anggaran RKAS:' : 'Total Pagu Anggaran:'}
                                        </span>
                                        <span className="text-[10.5px] text-slate-500">
                                            {isMonthly
                                                ? `Akumulasi ${monthsCount} bulan (@ ${formatCurrency(monthlyAllocation)}/bln)`
                                                : 'Nilai total pagu untuk pos anggaran ini'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-black text-blue-700 block">
                                            {formatCurrency(isMonthly ? totalPlannedAccumulated : Number(form.planned_amount || (qty * unitPrice)))}
                                        </span>
                                        {isMonthly && monthsCount > 1 && (
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                (@ {formatCurrency(monthlyAllocation)} per bulan)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Catatan */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Catatan Tambahan (Opsional)
                        </label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                            placeholder="Keterangan rincian penggunaan pos anggaran ini..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={clsx(
                                "px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition flex items-center gap-2",
                                form.budget_type === 'Pengeluaran'
                                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                            )}
                        >
                            {submitting ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Buat Anggaran')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
