import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Users, X, CheckCircle, AlertCircle, Trash2, Edit2, User, ChevronDown, ChevronRight, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AcademicYear { id: number; name: string; is_active: boolean; start_date: string; end_date: string; }
interface ClassOption { id: number; name: string; }

interface PaymentType {
    id: number; code: string; name: string; payment_schedule: string; amount: number;
    academic_year_id: number; is_active: boolean;
}

interface Obligation {
    id: string;
    student_id: string;
    student: { id: string; user: { name: string }; class: { name: string }; parent_id?: string };
    payment_type_id: number;
    payment_type: { id: number; code: string; name: string; payment_schedule: string };
    academic_year_id: number;
    academic_year: { name: string };
    amount: number;
    paid_amount: number;
    status: string;
    billing_month: number;
    due_date: string | null;
    installment_number: number;
    total_installments: number;
    notes: string;
    parent_name: string;
    parent_phone: string;
}

interface GroupedStudentAmount {
    student_id: string;
    student_name: string;
    class_name: string;
    parent_name: string;
    parent_phone: string;
    total_amount: number;
    total_paid: number;
    obligations: Obligation[];
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const StudentObligations = () => {
    const { user } = useAuth();
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [obligations, setObligations] = useState<Obligation[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [filterYearId, setFilterYearId] = useState('');
    const [filterClassId, setFilterClassId] = useState('');

    // Bulk assign modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState<'class' | 'student'>('class');
    const [bulkForm, setBulkForm] = useState({ class_id: '', payment_type_ids: [] as string[], academic_year_id: '' });
    const [studentId, setStudentId] = useState('');
    const [filterAssignClassId, setFilterAssignClassId] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Monthly billing & installment options
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

    // Derive semester months from academic year dates
    const getSemesterMonths = (year: AcademicYear): { semester1: number[]; semester2: number[] } => {
        const start = new Date(year.start_date);
        const end = new Date(year.end_date);
        const startMonth = start.getMonth() + 1; // 1-indexed
        const endMonth = end.getMonth() + 1;
        
        // Semester 1: from start month to December (or midpoint)
        const sem1: number[] = [];
        const sem2: number[] = [];
        
        if (startMonth >= 7) {
            // Typical: Jul-Dec for Sem1, Jan-Jun for Sem2
            for (let m = startMonth; m <= 12; m++) sem1.push(m);
            for (let m = 1; m <= Math.min(endMonth, 6); m++) sem2.push(m);
        } else {
            // Non-standard: split evenly
            const totalMonths: number[] = [];
            if (startMonth <= endMonth) {
                for (let m = startMonth; m <= endMonth; m++) totalMonths.push(m);
            } else {
                for (let m = startMonth; m <= 12; m++) totalMonths.push(m);
                for (let m = 1; m <= endMonth; m++) totalMonths.push(m);
            }
            const half = Math.ceil(totalMonths.length / 2);
            sem1.push(...totalMonths.slice(0, half));
            sem2.push(...totalMonths.slice(half));
        }
        return { semester1: sem1, semester2: sem2 };
    };

    const activeYear = academicYears.find(y => y.is_active);
    const semesterMonths = activeYear ? getSemesterMonths(activeYear) : { semester1: [7,8,9,10,11,12], semester2: [1,2,3,4,5,6] };

    // Determine current semester
    const getCurrentSemesterMonths = (): number[] => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        if (semesterMonths.semester1.includes(currentMonth)) return semesterMonths.semester1;
        if (semesterMonths.semester2.includes(currentMonth)) return semesterMonths.semester2;
        return [...semesterMonths.semester1, ...semesterMonths.semester2];
    };
    const [installmentCount, setInstallmentCount] = useState(1);

    const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Pay modal
    const [payingOb, setPayingOb] = useState<Obligation | null>(null);
    const [payAmount, setPayAmount] = useState('');

    // Edit modal
    const [editingOb, setEditingOb] = useState<Obligation | null>(null);
    const [editAmount, setEditAmount] = useState('');

    // Expandable rows
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchAcademicYears();
        fetchClasses();
        fetchPaymentTypes();
        api.get('/users/?role=6').then(res => setStudents(res.data || []));
    }, []);

    useEffect(() => { fetchData(); }, [filterYearId, filterClassId]);

    const fetchAcademicYears = async () => {
        try {
            const res = await api.get('/finance/academic-years');
            const years: AcademicYear[] = res.data || [];
            setAcademicYears(years);
            const active = years.find(y => y.is_active);
            if (active && !filterYearId) {
                setFilterYearId(String(active.id));
                // Automatically set selectedMonths for monthly obligations
                const sm = getSemesterMonths(active);
                const now = new Date();
                const cm = now.getMonth() + 1;
                setSelectedMonths(sm.semester1.includes(cm) ? sm.semester1 : sm.semester2.includes(cm) ? sm.semester2 : [...sm.semester1, ...sm.semester2]);
            }
        } catch (e) { console.error(e); }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get('/academic/classes');
            setClasses(res.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchPaymentTypes = async () => {
        try {
            const res = await api.get('/finance/payment-types');
            setPaymentTypes(res.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = '/finance/student-obligations?';
            if (filterYearId) url += `academic_year_id=${filterYearId}&`;
            if (filterClassId) url += `class_id=${filterClassId}&`;
            const res = await api.get(url);
            setObligations(res.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // Determine if any selected payment type is monthly or yearly
    const selectedPTs = paymentTypes.filter(pt => bulkForm.payment_type_ids.includes(String(pt.id)));
    const hasMonthly = selectedPTs.some(pt => pt.payment_schedule === 'Bulanan');
    const hasYearly = selectedPTs.some(pt => pt.payment_schedule === 'Tahunan');

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkForm.payment_type_ids.length === 0) {
            toast.error('Pilih minimal satu jenis pembayaran');
            return;
        }
        setSubmitting(true);
        try {
            let totalCount = 0;
            for (const pt_id of bulkForm.payment_type_ids) {
                const pt = paymentTypes.find(p => p.id === Number(pt_id));
                if (assignTarget === 'class') {
                    const payload: any = {
                        class_id: Number(bulkForm.class_id),
                        payment_type_id: Number(pt_id),
                        academic_year_id: Number(bulkForm.academic_year_id),
                    };
                    // Send monthly billing months
                    if (pt?.payment_schedule === 'Bulanan') {
                        payload.selected_months = selectedMonths;
                    }
                    // Send installment count for yearly
                    if (pt?.payment_schedule === 'Tahunan' && installmentCount > 1) {
                        payload.installment_count = installmentCount;
                    }
                    const res = await api.post('/finance/student-obligations/bulk-assign', payload);
                    totalCount += res.data?.count || 0;
                } else {
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
            if (assignTarget === 'class') {
                toast.success(`${totalCount} item tanggungan berhasil ditambahkan`);
            } else {
                toast.success(`${totalCount} tanggungan berhasil ditambahkan untuk siswa`);
            }
            setShowBulkModal(false);
            setBulkForm({ class_id: '', payment_type_ids: [], academic_year_id: filterYearId });
            setStudentId('');
            setFilterAssignClassId('');
            setSelectedMonths(getCurrentSemesterMonths());
            setInstallmentCount(1);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal menambahkan tanggungan');
        } finally { setSubmitting(false); }
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingOb) return;
        try {
            await api.post(`/finance/student-obligations/${payingOb.id}/pay`, {
                amount: parseFloat(payAmount)
            });
            toast.success('Pembayaran berhasil dicatat');
            setPayingOb(null);
            setPayAmount('');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal mencatat pembayaran');
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOb) return;
        try {
            await api.put(`/finance/student-obligations/${editingOb.id}`, {
                amount: parseFloat(editAmount)
            });
            toast.success('Berhasil diperbarui');
            setEditingOb(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Gagal memperbarui');
        }
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Hapus tanggungan ini?')) return;
        try {
            await api.delete(`/finance/student-obligations/${id}`);
            toast.success('Berhasil dihapus');
            fetchData();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal menghapus'); }
    };

    const filtered = obligations.filter(ob => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            ob.student?.user?.name?.toLowerCase().includes(q) ||
            ob.student?.class?.name?.toLowerCase().includes(q) ||
            ob.payment_type?.name?.toLowerCase().includes(q) ||
            ob.parent_name?.toLowerCase().includes(q)
        );
    });

    const toggleRow = (studentId: string) => {
        setExpandedRows(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    const groupedStudents = useMemo(() => {
        const groups: Record<string, GroupedStudentAmount> = {};
        
        filtered.forEach(ob => {
            const sid = ob.student_id;
            if (!groups[sid]) {
                groups[sid] = {
                    student_id: sid,
                    student_name: ob.student?.user?.name || '-',
                    class_name: ob.student?.class?.name || '-',
                    parent_name: ob.parent_name || '-',
                    parent_phone: ob.parent_phone || '',
                    total_amount: 0,
                    total_paid: 0,
                    obligations: []
                };
            }
            groups[sid].total_amount += ob.amount;
            groups[sid].total_paid += ob.paid_amount;
            groups[sid].obligations.push(ob);
        });
        
        return Object.values(groups).sort((a, b) => a.student_name.localeCompare(b.student_name));
    }, [filtered]);

    const totalAmount = obligations.reduce((s, o) => s + o.amount, 0);
    const totalPaid = obligations.reduce((s, o) => s + o.paid_amount, 0);
    const totalUnpaid = totalAmount - totalPaid;

    const statusColor = (s: string) => {
        if (s === 'Paid') return 'bg-green-100 text-green-700';
        if (s === 'Partial') return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
    };
    const statusLabel = (s: string) => {
        if (s === 'Paid') return 'Lunas';
        if (s === 'Partial') return 'Cicilan';
        return 'Belum Bayar';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tanggungan Siswa</h1>
                    <p className="text-slate-500 mt-1">Item pembayaran yang harus dibayar oleh siswa.</p>
                </div>
                {canManage && (
                    <button onClick={() => { setBulkForm({ ...bulkForm, payment_type_ids: [], academic_year_id: filterYearId }); setShowBulkModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition">
                        <Plus size={18} /> Assign Tanggungan
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Total Tagihan</p>
                    <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalAmount)}</h2>
                    <p className="text-xs text-slate-400 mt-1">{obligations.length} item tanggungan</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Total Terbayar</p>
                    <h2 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</h2>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Sisa Belum Bayar</p>
                    <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalUnpaid)}</h2>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Cari siswa, kelas, atau jenis..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm" />
                    </div>
                    <select value={filterYearId} onChange={e => setFilterYearId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Semua Tahun</option>
                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                    <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Semua Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                <th className="px-4 py-3 font-medium w-10"></th>
                                <th className="px-4 py-3 font-medium">Siswa</th>
                                <th className="px-4 py-3 font-medium">Kelas</th>
                                <th className="px-4 py-3 font-medium hidden md:table-cell">Orang Tua / Wali</th>
                                <th className="px-4 py-3 font-medium text-right">Total Tagihan</th>
                                <th className="px-4 py-3 font-medium text-right">Total Terbayar</th>
                                <th className="px-4 py-3 font-medium text-right">Sisa Tagihan / Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {loading ? (
                                <tr><td colSpan={7} className="py-12 text-center">
                                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                                </td></tr>
                            ) : groupedStudents.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                                    <AlertCircle size={40} className="mx-auto mb-2 text-slate-300" />
                                    <p className="font-medium text-slate-600">Belum ada tanggungan</p>
                                </td></tr>
                            ) : groupedStudents.map((group, idx) => {
                                const isExpanded = expandedRows[group.student_id];
                                const globalStatus = group.total_paid >= group.total_amount ? 'Paid' : (group.total_paid > 0 ? 'Partial' : 'Unpaid');
                                return (
                                    <React.Fragment key={group.student_id}>
                                        <tr 
                                            onClick={() => toggleRow(group.student_id)}
                                            className={clsx(
                                                "cursor-pointer transition-colors group",
                                                isExpanded ? "bg-blue-50/50" : (idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/30 hover:bg-slate-50")
                                            )}
                                        >
                                            <td className="px-4 py-4 text-slate-400 group-hover:text-blue-600 transition-colors text-center">
                                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-blue-500" />
                                                    <span className="font-semibold text-slate-900">{group.student_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 text-sm">{group.class_name}</td>
                                            <td className="px-4 py-4 hidden md:table-cell">
                                                <div className="text-sm">
                                                    <p className="text-slate-800 font-medium">{group.parent_name}</p>
                                                    {group.parent_phone && <p className="text-xs text-slate-400">{group.parent_phone}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-slate-800 text-sm">{formatCurrency(group.total_amount)}</td>
                                            <td className="px-4 py-4 text-right text-emerald-600 font-bold text-sm">{formatCurrency(group.total_paid)}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-red-600 font-bold text-sm">{formatCurrency(group.total_amount - group.total_paid)}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(globalStatus)}`}>{statusLabel(globalStatus)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="p-0 border-b border-slate-100">
                                                    <div className="bg-slate-50/80 p-4 pl-12 shadow-inner space-y-4">
                                                        {/* Cetak Surat Tagihan Button */}
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    import('../../utils/pdfUtils').then(mod => {
                                                                        const ayName = academicYears.find(y => String(y.id) === filterYearId)?.name || 'Semua';
                                                                        mod.generateStudentBillPDF({
                                                                            studentName: group.student_name,
                                                                            className: group.class_name,
                                                                            academicYear: ayName,
                                                                            obligations: group.obligations.map(ob => ({
                                                                                name: ob.payment_type?.name || '-',
                                                                                amount: ob.amount,
                                                                                paid_amount: ob.paid_amount,
                                                                                status: ob.status,
                                                                                billing_month: ob.billing_month,
                                                                                due_date: ob.due_date || undefined,
                                                                                installment_number: ob.installment_number,
                                                                                total_installments: ob.total_installments
                                                                            }))
                                                                        });
                                                                    });
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                                            >
                                                                <FileText size={14} /> Cetak Surat Tagihan
                                                            </button>
                                                        </div>
                                                        {(() => {
                                                            const byType: Record<string, Obligation[]> = {};
                                                            group.obligations.forEach(ob => {
                                                                const key = ob.payment_type?.name || 'Lainnya';
                                                                if (!byType[key]) byType[key] = [];
                                                                byType[key].push(ob);
                                                            });
                                                            return Object.entries(byType).map(([typeName, obs]) => {
                                                                const schedule = obs[0]?.payment_type?.payment_schedule || '';
                                                                const typeTotal = obs.reduce((s, o) => s + o.amount, 0);
                                                                const typePaid = obs.reduce((s, o) => s + o.paid_amount, 0);

                                                                return (
                                                                    <div key={typeName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                                                <span className="font-semibold text-slate-800 text-sm">{typeName}</span>
                                                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">{schedule}</span>
                                                                            </div>
                                                                            <div className="text-xs text-slate-500">
                                                                                {formatCurrency(typePaid)} / {formatCurrency(typeTotal)}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Monthly Grid */}
                                                                        {schedule === 'Bulanan' ? (
                                                                            <div className="p-4">
                                                                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                                                                                    {MONTH_NAMES.slice(1).map((monthName, i) => {
                                                                                        const month = i + 1;
                                                                                        const ob = obs.find(o => o.billing_month === month);
                                                                                        const isPaid = ob?.status === 'Paid';
                                                                                        const isPartial = ob?.status === 'Partial';
                                                                                        const hasOb = !!ob;
                                                                                        return (
                                                                                            <div
                                                                                                key={month}
                                                                                                className={clsx(
                                                                                                    'rounded-xl p-2 text-center border transition-all cursor-default',
                                                                                                    isPaid ? 'bg-emerald-50 border-emerald-200' :
                                                                                                    isPartial ? 'bg-amber-50 border-amber-200' :
                                                                                                    hasOb ? 'bg-red-50 border-red-200' :
                                                                                                    'bg-slate-50 border-slate-100 opacity-40'
                                                                                                )}
                                                                                            >
                                                                                                <p className="text-[10px] font-bold text-slate-600 uppercase">{monthName.slice(0, 3)}</p>
                                                                                                {hasOb ? (
                                                                                                    <>
                                                                                                        <p className={clsx('text-[10px] font-bold mt-0.5', isPaid ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-red-600')}>
                                                                                                            {isPaid ? '✓' : isPartial ? `${Math.round((ob.paid_amount/ob.amount)*100)}%` : '✗'}
                                                                                                        </p>
                                                                                                        {canManage && !isPaid && (
                                                                                                            <div className="flex items-center justify-center gap-1 mt-1">
                                                                                                                <button
                                                                                                                    onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }}
                                                                                                                    className="text-[9px] text-green-600 hover:text-green-700 font-medium" title="Bayar"
                                                                                                                >💵</button>
                                                                                                                <button
                                                                                                                    onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }}
                                                                                                                    className="text-[9px] text-blue-600 hover:text-blue-700 font-medium" title="Ubah Nominal"
                                                                                                                >✏️</button>
                                                                                                                <button
                                                                                                                    onClick={(e) => handleDelete(ob.id, e)}
                                                                                                                    className="text-[9px] text-red-600 hover:text-red-700 font-medium" title="Hapus"
                                                                                                                >🗑️</button>
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {(isPaid || isPartial) && (
                                                                                                            <button
                                                                                                                onClick={(e) => { e.stopPropagation(); import('../../utils/pdfUtils').then(m => m.generateObligationReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount, billingMonth: ob.billing_month })); }}
                                                                                                                className="mt-1 block mx-auto text-[9px] text-blue-600 hover:text-blue-700 font-medium"
                                                                                                            >Cetak</button>
                                                                                                        )}
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <p className="text-[10px] text-slate-400 mt-0.5">—</p>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ) : schedule === 'Semesteran' ? (
                                                                            /* Semester Cards */
                                                                            <div className="p-4 grid grid-cols-2 gap-3">
                                                                                {obs.map((ob, idx) => {
                                                                                    const isPaid = ob.status === 'Paid';
                                                                                    const isPartial = ob.status === 'Partial';
                                                                                    return (
                                                                                        <div key={ob.id} className={clsx('rounded-xl p-4 border', isPaid ? 'bg-emerald-50 border-emerald-200' : isPartial ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                                                                                            <p className="text-sm font-semibold text-slate-800">Semester {idx + 1}</p>
                                                                                            <p className="text-lg font-bold mt-1 text-slate-900">{formatCurrency(ob.amount)}</p>
                                                                                            <div className="flex items-center justify-between mt-2">
                                                                                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(ob.status))}>{statusLabel(ob.status)}</span>
                                                                                                {isPartial && <span className="text-xs text-slate-500">Terbayar: {formatCurrency(ob.paid_amount)}</span>}
                                                                                            </div>
                                                                                            {canManage && !isPaid && (
                                                                                                <div className="mt-2 flex gap-1">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="flex-1 text-xs bg-green-600 text-white py-1.5 rounded-lg hover:bg-green-700 font-medium transition">Bayar</button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="bg-blue-100 text-blue-600 px-2 py-1.5 rounded-lg hover:bg-blue-200 transition" title="Edit Nominal"><Edit2 size={14} /></button>
                                                                                                    <button onClick={(e) => handleDelete(ob.id, e)} className="bg-red-100 text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-200 transition" title="Hapus"><Trash2 size={14} /></button>
                                                                                                </div>
                                                                                            )}
                                                                                            {(isPaid || isPartial) && (
                                                                                                <button onClick={(e) => { e.stopPropagation(); import('../../utils/pdfUtils').then(m => m.generateObligationReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount })); }} className="mt-2 w-full text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 font-medium transition">Cetak Kuitansi</button>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : obs[0]?.total_installments > 0 ? (
                                                                            /* Installment Progress */
                                                                            <div className="p-4">
                                                                                <div className="flex items-center gap-2 mb-3">
                                                                                    <div className="flex-1 bg-slate-100 rounded-full h-3">
                                                                                        <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${(typePaid / typeTotal) * 100}%` }} />
                                                                                    </div>
                                                                                    <span className="text-xs font-bold text-slate-600">{Math.round((typePaid / typeTotal) * 100)}%</span>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                                    {obs.sort((a, b) => a.installment_number - b.installment_number).map(ob => {
                                                                                        const isPaid = ob.status === 'Paid';
                                                                                        const isPartial = ob.status === 'Partial';
                                                                                        return (
                                                                                            <div key={ob.id} className={clsx('rounded-lg p-3 border text-center', isPaid ? 'bg-emerald-50 border-emerald-200' : isPartial ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                                                                                                <p className="text-xs font-bold text-slate-600">Cicilan {ob.installment_number}/{ob.total_installments}</p>
                                                                                                <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(ob.amount)}</p>
                                                                                                <span className={clsx('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(ob.status))}>{statusLabel(ob.status)}</span>
                                                                                                {canManage && !isPaid && (
                                                                                                    <div className="mt-2 flex gap-1 justify-center">
                                                                                                        <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200" title="Bayar">Bayar</button>
                                                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-1 rounded hover:bg-blue-200" title="Edit Nominal"><Edit2 size={10} /></button>
                                                                                                        <button onClick={(e) => handleDelete(ob.id, e)} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-1 rounded hover:bg-red-200" title="Hapus"><Trash2 size={10} /></button>
                                                                                                    </div>
                                                                                                )}
                                                                                                {(isPaid || isPartial) && (
                                                                                                    <button onClick={(e) => { e.stopPropagation(); import('../../utils/pdfUtils').then(m => m.generateObligationReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount, installmentNumber: ob.installment_number, totalInstallments: ob.total_installments })); }} className="mt-1 block w-full text-[10px] text-blue-600 hover:text-blue-700 font-medium">Cetak</button>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            /* Default: Single / Tahunan */
                                                                            <div className="p-4">
                                                                                {obs.map(ob => (
                                                                                    <div key={ob.id} className="flex items-center justify-between">
                                                                                        <div>
                                                                                            <p className="text-sm font-medium text-slate-800">{formatCurrency(ob.amount)}</p>
                                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(ob.status))}>{statusLabel(ob.status)}</span>
                                                                                                {ob.paid_amount > 0 && ob.status !== 'Paid' && <span className="text-xs text-slate-500">Terbayar: {formatCurrency(ob.paid_amount)}</span>}
                                                                                                {ob.due_date && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={8} /> {new Date(ob.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1">
                                                                                            {(ob.status === 'Paid' || ob.status === 'Partial') && (
                                                                                                <button onClick={(e) => { e.stopPropagation(); import('../../utils/pdfUtils').then(m => m.generateObligationReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount })); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Cetak Kuitansi">
                                                                                                    <FileText size={16} />
                                                                                                </button>
                                                                                            )}
                                                                                            {canManage && ob.status !== 'Paid' && (
                                                                                                <>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition" title="Bayar"><CheckCircle size={16} /></button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Ubah Nominal"><Edit2 size={16} /></button>
                                                                                                </>
                                                                                            )}
                                                                                            {canManage && (
                                                                                                <button onClick={(e) => handleDelete(ob.id, e)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition" title="Hapus"><Trash2 size={16} /></button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Assign Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600" /> Assign Tanggungan</h2>
                            <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAssign} className="p-6 space-y-4">
                            <div className="flex gap-4 border-b border-slate-200 pb-2 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={assignTarget === 'class'} onChange={() => setAssignTarget('class')} className="text-blue-600" />
                                    <span className="text-sm font-medium text-slate-700">Per Kelas</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={assignTarget === 'student'} onChange={() => setAssignTarget('student')} className="text-blue-600" />
                                    <span className="text-sm font-medium text-slate-700">Per Siswa</span>
                                </label>
                            </div>

                            {assignTarget === 'class' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                                    <select value={bulkForm.class_id} onChange={e => setBulkForm({ ...bulkForm, class_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required={assignTarget === 'class'}>
                                        <option value="">Pilih kelas</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                                    <select value={filterAssignClassId} onChange={e => { setFilterAssignClassId(e.target.value); setStudentId(''); }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl mb-3 text-sm">
                                        <option value="">-- Semua Kelas --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>

                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                                    <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required={assignTarget === 'student'}>
                                        <option value="">Pilih Siswa</option>
                                        {students.filter(s => filterAssignClassId ? String(s.student?.class?.id) === filterAssignClassId : true).map(s => <option key={s.student?.id} value={s.student?.id}>{s.name} ({s.student?.class?.name || 'Belum ada kelas'})</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Pembayaran (Bisa Pilih Lebih dari 1)</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                                    {paymentTypes.filter(pt => pt.is_active).map(pt => (
                                        <label key={pt.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition border border-transparent hover:border-slate-200">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                                                checked={bulkForm.payment_type_ids.includes(String(pt.id))} 
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setBulkForm(prev => ({
                                                        ...prev,
                                                        payment_type_ids: checked 
                                                            ? [...prev.payment_type_ids, String(pt.id)] 
                                                            : prev.payment_type_ids.filter(id => id !== String(pt.id))
                                                    }));
                                                }}
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-800">[{pt.code}] {pt.name}</p>
                                                <p className="text-xs text-slate-500">{formatCurrency(pt.amount)}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {paymentTypes.filter(pt => pt.is_active).length === 0 && (
                                        <p className="text-xs text-slate-500 text-center py-2">Belum ada jenis pembayaran aktif</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                                <select value={bulkForm.academic_year_id} onChange={e => setBulkForm({ ...bulkForm, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required>
                                    <option value="">Pilih tahun ajaran</option>
                                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                </select>
                            </div>

                            {/* Monthly billing options */}
                            {hasMonthly && (
                                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                                        <label className="text-sm font-medium text-blue-800">Bulan Tagihan (Bulanan)</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            <button type="button" onClick={() => setSelectedMonths(semesterMonths.semester1)} className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition">
                                                Semester 1 ({semesterMonths.semester1.map(m => MONTH_NAMES[m]?.substring(0,3)).join(', ')})
                                            </button>
                                            <button type="button" onClick={() => setSelectedMonths(semesterMonths.semester2)} className="text-[10px] px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 transition">
                                                Semester 2 ({semesterMonths.semester2.map(m => MONTH_NAMES[m]?.substring(0,3)).join(', ')})
                                            </button>
                                            <button type="button" onClick={() => setSelectedMonths([...semesterMonths.semester1, ...semesterMonths.semester2].sort((a,b)=>a-b))} className="text-[10px] px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition">
                                                Semua
                                            </button>
                                            <button type="button" onClick={() => setSelectedMonths([])} className="text-[10px] px-2 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition">
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {MONTH_NAMES.slice(1).map((name, i) => {
                                            const month = i + 1;
                                            const isSelected = selectedMonths.includes(month);
                                            const inSem1 = semesterMonths.semester1.includes(month);
                                            const inSem2 = semesterMonths.semester2.includes(month);
                                            return (
                                                <button
                                                    key={month}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMonths(prev =>
                                                            isSelected ? prev.filter(m => m !== month) : [...prev, month].sort((a,b) => a-b)
                                                        );
                                                    }}
                                                    className={clsx(
                                                        'px-2 py-2 rounded-lg text-xs font-medium transition-all border',
                                                        isSelected
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                    )}
                                                >
                                                    {name}
                                                    <span className="block text-[9px] opacity-70">{inSem1 ? 'Sem1' : inSem2 ? 'Sem2' : ''}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-blue-600 mt-2">{selectedMonths.length} bulan dipilih — Total per siswa: {formatCurrency(selectedPTs.filter(p => p.payment_schedule === 'Bulanan').reduce((s, p) => s + p.amount, 0) * selectedMonths.length)}</p>
                                </div>
                            )}

                            {/* Yearly installment options */}
                            {hasYearly && assignTarget === 'class' && (
                                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50">
                                    <label className="block text-sm font-medium text-amber-800 mb-2">Opsi Cicilan (Tahunan)</label>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={installmentCount}
                                            onChange={e => setInstallmentCount(Number(e.target.value))}
                                            className="px-3 py-2 border border-amber-200 rounded-xl text-sm bg-white"
                                        >
                                            <option value={1}>Bayar Penuh (1x)</option>
                                            <option value={2}>2x Cicilan</option>
                                            <option value={3}>3x Cicilan</option>
                                            <option value={4}>4x Cicilan</option>
                                            <option value={6}>6x Cicilan</option>
                                            <option value={12}>12x Cicilan</option>
                                        </select>
                                        {installmentCount > 1 && (
                                            <span className="text-xs text-amber-700">
                                                Per cicilan: {formatCurrency(selectedPTs.filter(p => p.payment_schedule === 'Tahunan').reduce((s, p) => s + p.amount, 0) / installmentCount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-xl">
                                {assignTarget === 'class' ? 'Semua siswa aktif di kelas yang dipilih akan otomatis mendapatkan tanggungan ini.' : 'Siswa tunggal ini akan mendapatkan tanggungan yang dipilih.'}
                            </p>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowBulkModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                <button type="submit" disabled={submitting} className={clsx("px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition text-sm", submitting && "opacity-50 cursor-not-allowed")}>
                                    {submitting ? 'Memproses...' : 'Assign Sekarang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {payingOb && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Catat Pembayaran</h2>
                            <button onClick={() => setPayingOb(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handlePay} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <p className="text-sm text-slate-700 font-medium">{payingOb.student?.user?.name}</p>
                                <p className="text-xs text-slate-500">{payingOb.payment_type?.name} — Sisa: {formatCurrency(payingOb.amount - payingOb.paid_amount)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Bayar (Rp)</label>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium" required min="1" />
                            </div>
                            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setPayingOb(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">Batal</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition text-sm">Bayar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {editingOb && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditingOb(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Ubah Tanggungan</h2>
                            <button onClick={() => setEditingOb(null)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEdit} className="p-5">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Asli (Rp)</label>
                                <input
                                    type="number"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Mengubah nominal asli tagihan. Belum terbayar: {formatCurrency(Math.max(0, parseFloat(editAmount || '0') - editingOb.paid_amount))}</p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setEditingOb(null)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentObligations;
