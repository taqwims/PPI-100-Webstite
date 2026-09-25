import React, { useState, useEffect, useMemo } from 'react';
import { Users, X, Search, Tag, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { AcademicYear, ClassOption, PaymentType } from './types';

interface BulkAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    filterYearId: string;
    classes: ClassOption[];
    students: any[];
    academicYears: AcademicYear[];
    paymentTypes: PaymentType[];
    semesterMonths: { semester1: number[]; semester2: number[] };
}

interface PTGroup {
    key: string;
    code: string;
    name: string;
    items: PaymentType[];
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
    isOpen, onClose, onSuccess, filterYearId, classes, students, academicYears, paymentTypes, semesterMonths
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [assignTarget, setAssignTarget] = useState<'class' | 'student'>('class');
    const [bulkForm, setBulkForm] = useState({ payment_type_ids: [] as string[], academic_year_id: filterYearId });
    
    // Multi-class selection state
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [classSearch, setClassSearch] = useState('');

    // Multi-student selection state
    const [filterAssignClassId, setFilterAssignClassId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState('');

    // Hierarchical Payment Types state
    const [ptSearch, setPtSearch] = useState('');
    const [expandedPtGroups, setExpandedPtGroups] = useState<Record<string, boolean>>({});

    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [installmentCount, setInstallmentCount] = useState(1);

    const getCurrentSemesterMonths = (): number[] => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        if (semesterMonths.semester1.includes(currentMonth)) return semesterMonths.semester1;
        if (semesterMonths.semester2.includes(currentMonth)) return semesterMonths.semester2;
        return [...semesterMonths.semester1, ...semesterMonths.semester2];
    };

    // Group payment types hierarchically by transaction code
    const groupedPaymentTypes = useMemo(() => {
        const active = paymentTypes.filter(pt => pt.is_active);
        const groupsMap = new Map<string, PTGroup>();

        active.forEach(pt => {
            const tc = pt.transaction_code;
            const key = tc ? `tc_${tc.id}` : 'tc_unmapped';
            const code = tc ? tc.code : 'NON-POS';
            const name = tc ? tc.name : 'Lainnya / Tanpa Pos Transaksi';

            if (!groupsMap.has(key)) {
                groupsMap.set(key, { key, code, name, items: [] });
            }
            groupsMap.get(key)!.items.push(pt);
        });

        return Array.from(groupsMap.values());
    }, [paymentTypes]);

    useEffect(() => {
        if (isOpen) {
            setBulkForm({ payment_type_ids: [], academic_year_id: filterYearId });
            setAssignTarget('class');
            setSelectedClassIds([]);
            setClassSearch('');
            setSelectedStudentIds([]);
            setStudentSearch('');
            setFilterAssignClassId('');
            setSelectedMonths(getCurrentSemesterMonths());
            setInstallmentCount(1);
            setPtSearch('');

            // Expand all payment groups by default
            const initExpanded: Record<string, boolean> = {};
            groupedPaymentTypes.forEach(g => {
                initExpanded[g.key] = true;
            });
            setExpandedPtGroups(initExpanded);
        }
    }, [isOpen, filterYearId, groupedPaymentTypes]);

    const togglePtGroup = (key: string) => {
        setExpandedPtGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleGroup = (groupItems: PaymentType[]) => {
        const itemIds = groupItems.map(i => String(i.id));
        const allSelected = itemIds.length > 0 && itemIds.every(id => bulkForm.payment_type_ids.includes(id));
        if (allSelected) {
            setBulkForm(prev => ({
                ...prev,
                payment_type_ids: prev.payment_type_ids.filter(id => !itemIds.includes(id))
            }));
        } else {
            const set = new Set([...bulkForm.payment_type_ids, ...itemIds]);
            setBulkForm(prev => ({
                ...prev,
                payment_type_ids: Array.from(set)
            }));
        }
    };

    // Filter classes for search
    const filteredClasses = useMemo(() => {
        if (!classSearch.trim()) return classes;
        const q = classSearch.toLowerCase();
        return classes.filter(c => c.name.toLowerCase().includes(q));
    }, [classes, classSearch]);

    // Filter students for search & class
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (filterAssignClassId && String(s.student?.class?.id) !== filterAssignClassId) return false;
            if (studentSearch.trim()) {
                const q = studentSearch.toLowerCase();
                const nameMatch = s.name?.toLowerCase().includes(q);
                const nisMatch = s.student?.nis?.toLowerCase().includes(q);
                const classMatch = s.student?.class?.name?.toLowerCase().includes(q);
                return nameMatch || nisMatch || classMatch;
            }
            return true;
        });
    }, [students, filterAssignClassId, studentSearch]);

    if (!isOpen) return null;

    const selectedPTs = paymentTypes.filter(pt => bulkForm.payment_type_ids.includes(String(pt.id)));
    const hasMonthly = selectedPTs.some(pt => pt.payment_schedule === 'Bulanan');
    const hasYearly = selectedPTs.some(pt => pt.payment_schedule === 'Tahunan');

    // Class selection helpers
    const handleToggleAllClasses = () => {
        const visibleIds = filteredClasses.map(c => String(c.id));
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedClassIds.includes(id));
        if (allSelected) {
            setSelectedClassIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            const set = new Set([...selectedClassIds, ...visibleIds]);
            setSelectedClassIds(Array.from(set));
        }
    };

    const handleToggleClass = (id: string) => {
        setSelectedClassIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Student selection helpers
    const handleToggleAllStudents = () => {
        const visibleIds = filteredStudents.map(s => String(s.student?.id)).filter(Boolean);
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStudentIds.includes(id));
        if (allSelected) {
            setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            const set = new Set([...selectedStudentIds, ...visibleIds]);
            setSelectedStudentIds(Array.from(set));
        }
    };

    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkForm.payment_type_ids.length === 0) {
            toast.error('Pilih minimal satu jenis pembayaran');
            return;
        }

        if (assignTarget === 'class') {
            if (selectedClassIds.length === 0) {
                toast.error('Pilih minimal satu kelas');
                return;
            }
        } else {
            if (selectedStudentIds.length === 0) {
                toast.error('Pilih minimal satu siswa');
                return;
            }
        }

        setSubmitting(true);
        try {
            let totalCount = 0;
            for (const pt_id of bulkForm.payment_type_ids) {
                const pt = paymentTypes.find(p => p.id === Number(pt_id));
                if (assignTarget === 'class') {
                    const payload: any = {
                        class_ids: selectedClassIds.map(Number),
                        payment_type_id: Number(pt_id),
                        academic_year_id: Number(bulkForm.academic_year_id),
                    };
                    if (pt?.payment_schedule === 'Bulanan') {
                        payload.selected_months = selectedMonths;
                    }
                    if (pt?.payment_schedule === 'Tahunan' && installmentCount > 1) {
                        payload.installment_count = installmentCount;
                    }
                    const res = await api.post('/finance/student-obligations/bulk-assign', payload);
                    totalCount += res.data?.count || 0;
                } else {
                    for (const studentId of selectedStudentIds) {
                        if (pt?.payment_schedule === 'Bulanan' && selectedMonths.length > 0) {
                            for (const month of selectedMonths) {
                                await api.post('/finance/student-obligations', {
                                    student_id: studentId,
                                    payment_type_id: Number(pt_id),
                                    academic_year_id: Number(bulkForm.academic_year_id),
                                    billing_month: month
                                });
                                totalCount += 1;
                            }
                        } else if (pt?.payment_schedule === 'Tahunan' && installmentCount > 1) {
                            for (let i = 1; i <= installmentCount; i++) {
                                await api.post('/finance/student-obligations', {
                                    student_id: studentId,
                                    payment_type_id: Number(pt_id),
                                    academic_year_id: Number(bulkForm.academic_year_id),
                                    installment_number: i,
                                    total_installments: installmentCount
                                });
                                totalCount += 1;
                            }
                        } else {
                            await api.post('/finance/student-obligations', {
                                student_id: studentId,
                                payment_type_id: Number(pt_id),
                                academic_year_id: Number(bulkForm.academic_year_id),
                            });
                            totalCount += 1;
                        }
                    }
                }
            }

            if (assignTarget === 'class') {
                toast.success(`${totalCount} item tanggungan berhasil ditambahkan untuk ${selectedClassIds.length} kelas`);
            } else {
                toast.success(`${totalCount} item tanggungan berhasil ditambahkan untuk ${selectedStudentIds.length} siswa`);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Gagal menambahkan tanggungan');
        } finally { 
            setSubmitting(false); 
        }
    };

    const isAllClassesSelected = filteredClasses.length > 0 && filteredClasses.every(c => selectedClassIds.includes(String(c.id)));
    const isAllStudentsSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(String(s.student?.id)));

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Users size={20} className="text-blue-600" /> Assign Tanggungan
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Tetapkan tagihan massal untuk beberapa kelas atau beberapa siswa sekaligus
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto w-full max-h-full">
                    <form onSubmit={handleAssign} className="p-6 space-y-4">
                        {/* Tab Mode: Per Kelas vs Per Siswa */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setAssignTarget('class')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                                    assignTarget === 'class' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Per Beberapa Kelas
                            </button>
                            <button
                                type="button"
                                onClick={() => setAssignTarget('student')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                                    assignTarget === 'student' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Per Beberapa Siswa
                            </button>
                        </div>

                        {/* MODE: PER KELAS */}
                        {assignTarget === 'class' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-700">
                                        Pilih Kelas <span className="text-xs text-blue-600 font-semibold">({selectedClassIds.length} dipilih)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleToggleAllClasses}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {isAllClassesSelected ? 'Batal Pilih Semua' : 'Pilih Semua Kelas'}
                                    </button>
                                </div>

                                {classes.length > 5 && (
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={classSearch}
                                            onChange={e => setClassSearch(e.target.value)}
                                            placeholder="Cari kelas..."
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}

                                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 space-y-1">
                                    {filteredClasses.map(c => {
                                        const isChecked = selectedClassIds.includes(String(c.id));
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition text-sm ${
                                                    isChecked ? 'bg-blue-50/80 text-blue-900 font-medium' : 'hover:bg-white text-slate-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleClass(String(c.id))}
                                                />
                                                <span>{c.name}</span>
                                            </label>
                                        );
                                    })}
                                    {filteredClasses.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-3">Kelas tidak ditemukan</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* MODE: PER SISWA */
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                                    <select
                                        value={filterAssignClassId}
                                        onChange={e => setFilterAssignClassId(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                                    >
                                        <option value="">-- Semua Kelas --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700">
                                            Pilih Siswa <span className="text-xs text-blue-600 font-semibold">({selectedStudentIds.length} dipilih)</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleToggleAllStudents}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            {isAllStudentsSelected ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            placeholder="Cari nama atau NIS siswa..."
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 space-y-1">
                                        {filteredStudents.map(s => {
                                            const sId = String(s.student?.id);
                                            const isChecked = selectedStudentIds.includes(sId);
                                            return (
                                                <label
                                                    key={sId}
                                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition text-sm ${
                                                        isChecked ? 'bg-blue-50/80 text-blue-900 font-medium' : 'hover:bg-white text-slate-700'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                        checked={isChecked}
                                                        onChange={() => handleToggleStudent(sId)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate text-xs font-semibold">{s.name}</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {s.student?.class?.name || 'Tanpa kelas'} {s.student?.nis ? `• NIS: ${s.student?.nis}` : ''}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                        {filteredStudents.length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4">Tidak ada siswa ditemukan</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}                        {/* Jenis Pembayaran - Hierarkis Parent Child */}
                        <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <label className="block text-sm font-semibold text-slate-800">
                                    Jenis Pembayaran <span className="text-xs text-slate-400 font-normal">(Hierarki Pos Transaksi RKAS)</span>
                                </label>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                                    {bulkForm.payment_type_ids.length} jenis dipilih
                                </span>
                            </div>

                            {/* Search Filter for PT */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari jenis bayar / pos transaksi..."
                                    value={ptSearch}
                                    onChange={e => setPtSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 bg-slate-50/70 divide-y divide-slate-100">
                                {groupedPaymentTypes.map(group => {
                                    const isGroupExpanded = expandedPtGroups[group.key] ?? true;
                                    const filteredItems = group.items.filter(pt => {
                                        if (!ptSearch.trim()) return true;
                                        const q = ptSearch.toLowerCase();
                                        return pt.name.toLowerCase().includes(q) ||
                                               pt.code.toLowerCase().includes(q) ||
                                               group.name.toLowerCase().includes(q) ||
                                               group.code.toLowerCase().includes(q);
                                    });

                                    if (filteredItems.length === 0) return null;

                                    const groupItemIds = filteredItems.map(i => String(i.id));
                                    const allSelected = groupItemIds.length > 0 && groupItemIds.every(id => bulkForm.payment_type_ids.includes(id));
                                    const someSelected = groupItemIds.some(id => bulkForm.payment_type_ids.includes(id)) && !allSelected;
                                    const selectedCount = groupItemIds.filter(id => bulkForm.payment_type_ids.includes(id)).length;

                                    return (
                                        <div key={group.key} className="pt-2 first:pt-0 space-y-1.5">
                                            {/* Parent Group Header */}
                                            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePtGroup(group.key)}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                                                    >
                                                        {isGroupExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                    </button>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-[10px]">
                                                        <Tag size={10} className="text-emerald-600" />
                                                        {group.code}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800 truncate">
                                                        {group.name}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        {selectedCount}/{groupItemIds.length}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleGroup(filteredItems)}
                                                        className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition ${
                                                            allSelected
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : someSelected
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {allSelected ? 'Batal Semua' : 'Pilih Pos'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Child Payment Types */}
                                            {isGroupExpanded && (
                                                <div className="pl-4 space-y-1">
                                                    {filteredItems.map(pt => {
                                                        const isChecked = bulkForm.payment_type_ids.includes(String(pt.id));
                                                        return (
                                                            <label
                                                                key={pt.id}
                                                                className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition border ${
                                                                    isChecked
                                                                        ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                                                                        : 'bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                                    checked={isChecked}
                                                                    onChange={e => {
                                                                        const checked = e.target.checked;
                                                                        setBulkForm(prev => ({
                                                                            ...prev,
                                                                            payment_type_ids: checked
                                                                                ? [...prev.payment_type_ids, String(pt.id)]
                                                                                : prev.payment_type_ids.filter(id => id !== String(pt.id))
                                                                        }));
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold shrink-0">
                                                                            <CreditCard size={10} />
                                                                            {pt.code}
                                                                        </span>
                                                                        <span className="text-xs font-semibold truncate">
                                                                            {pt.name}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                                                                            {pt.payment_schedule}
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-900 font-mono">
                                                                            {formatCurrency(pt.amount)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {groupedPaymentTypes.length === 0 && (
                                    <p className="text-xs text-slate-500 text-center py-4">Belum ada jenis pembayaran aktif</p>
                                )}
                            </div>
                        </div>

                        {/* Tahun Ajaran */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                            <select value={bulkForm.academic_year_id} onChange={e => setBulkForm({ ...bulkForm, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" required>
                                <option value="">Pilih tahun ajaran</option>
                                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                            </select>
                        </div>

                        {/* Monthly billing options */}
                        {hasMonthly && (
                            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                                    <label className="text-sm font-medium text-blue-800">Bulan Tagihan (Bulanan)</label>
                                    <div className="flex bg-white rounded-lg border border-blue-100 p-1 text-xs">
                                        <button type="button" onClick={() => setSelectedMonths(semesterMonths.semester1)} className={`px-2 py-1 rounded-md transition-colors ${selectedMonths.join(',') === semesterMonths.semester1.join(',') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>Ganjil</button>
                                        <button type="button" onClick={() => setSelectedMonths(semesterMonths.semester2)} className={`px-2 py-1 rounded-md transition-colors ${selectedMonths.join(',') === semesterMonths.semester2.join(',') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>Genap</button>
                                        <button type="button" onClick={() => setSelectedMonths([...semesterMonths.semester1, ...semesterMonths.semester2])} className={`px-2 py-1 rounded-md transition-colors ${selectedMonths.length === 12 ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>1 Tahun</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    {[...semesterMonths.semester1, ...semesterMonths.semester2].map((m: number) => {
                                        const isSelected = selectedMonths.includes(m);
                                        return (
                                            <label key={m} className={`flex items-center justify-center py-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                                                <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                                                    if (e.target.checked) setSelectedMonths([...selectedMonths, m]);
                                                    else setSelectedMonths(selectedMonths.filter(x => x !== m));
                                                }} />
                                                <span className="text-[10px] font-bold uppercase">{MONTH_NAMES[m]?.slice(0,3)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Yearly billing options */}
                        {hasYearly && (
                            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
                                <label className="text-sm font-medium text-purple-800 block mb-2">Sistem Pembayaran (Tahunan)</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={installmentCount === 1} onChange={() => setInstallmentCount(1)} className="text-purple-600" />
                                        <span className="text-sm text-slate-700">Lunas / 1x Bayar</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={installmentCount > 1} onChange={() => setInstallmentCount(2)} className="text-purple-600" />
                                        <span className="text-sm text-slate-700">Cicil Beberapa Kali</span>
                                    </label>
                                </div>
                                {installmentCount > 1 && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <label className="text-sm text-slate-600">Jumlah Cicilan:</label>
                                        <div className="flex bg-white rounded-lg border border-purple-100 p-1">
                                            {[2,3,4,5,6].map(num => (
                                                <button type="button" key={num} onClick={() => setInstallmentCount(num)} className={`w-8 h-8 rounded-md text-sm transition-colors ${installmentCount === num ? 'bg-purple-100 text-purple-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>{num}x</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 shrink-0">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-[2] bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center py-2.5 transition disabled:opacity-50"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Assign Tagihan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
