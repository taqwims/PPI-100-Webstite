import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, AlertCircle, ChevronDown, ChevronRight, Send, CheckCircle, Clock, XCircle, Printer, CreditCard, X, Download } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { generateStudentBillPDF } from '../../utils/pdfUtils';
import MultiBillSelector from '../../components/finance/MultiBillSelector';
import { generateMultiPaymentInvoice } from '../../utils/invoiceTemplate';
import { useAcademicYear } from '../../context/AcademicYearContext';

interface Student {
    id: string;
    full_name?: string;
    nis?: string;
    nisn?: string;
    class?: { id: number; name: string };
    class_id?: number;
    parent?: { phone: string };
    user?: { id?: string; name?: string; email?: string; phone?: string };
}

const getStudentName = (s: Student) => s.full_name || s.user?.name || 'Siswa';

interface Class {
    id: number;
    name: string;
}

interface Obligation {
    id: string;
    student_id: string;
    payment_type: { id: number; name: string; code: string };
    amount: number;
    paid_amount: number;
    status: string; // Pending, Partial, Paid
    billing_month?: number;
    due_date?: string;
    installment_number?: number;
    total_installments?: number;
    created_at: string;
}

interface WATemplate {
    id: number;
    name: string;
    body_template: string;
    is_default: boolean;
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface StudentBillSummaryProps {
    isSubcomponent?: boolean;
}

const StudentBillSummary: React.FC<StudentBillSummaryProps> = ({ isSubcomponent = false }) => {
    const { user } = useAuth();
    const canManage = [1, 2, 3, 4, 9].includes(user?.role_id || 0);
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const { academicYears, selectedYear, setSelectedYear } = useAcademicYear();
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [waModal, setWaModal] = useState<{ student: Student; obligations: Obligation[] } | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Multi-payment state
    const [multiPayModal, setMultiPayModal] = useState<{ student: Student; obligations: Obligation[] } | null>(null);
    const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
    const [multiPayTotal, setMultiPayTotal] = useState(0);
    const [multiPayMethod, setMultiPayMethod] = useState<'Cash' | 'Transfer'>('Cash');
    const [isSubmittingMultiPay, setIsSubmittingMultiPay] = useState(false);
    const [isBulkSending, setIsBulkSending] = useState(false);
    const [bulkSendModal, setBulkSendModal] = useState(false);
    const [lastMultiPayResult, setLastMultiPayResult] = useState<{
        invoiceNumber: string;
        studentName: string;
        paymentMethod: string;
        bills: { title: string; amount: number }[];
        totalAmount: number;
        date: string;
    } | null>(null);

    const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

    const { data: classes = [] } = useQuery<Class[]>({
        queryKey: ['classes'],
        queryFn: async () => (await api.get('/academic/classes')).data || [],
    });

    const { data: students = [] } = useQuery<Student[]>({
        queryKey: ['students'],
        queryFn: async () => (await api.get('/students')).data || [],
    });

    const { data: allObligations = [] } = useQuery<Obligation[]>({
        queryKey: ['student-obligations', selectedYear?.id],
        queryFn: async () => {
            const params = selectedYear?.id ? `?academic_year_id=${selectedYear.id}` : '';
            return (await api.get(`/finance/student-obligations${params}`)).data || [];
        },
    });

    // Also fetch activity obligations
    const { data: activities = [] } = useQuery<any[]>({
        queryKey: ['activities-all', selectedYear?.id],
        queryFn: async () => {
            try {
                if (!selectedYear?.id) return [];
                return (await api.get(`/finance/activities?academic_year_id=${selectedYear.id}`)).data || [];
            }
            catch { return []; }
        },
        enabled: !!selectedYear?.id,
    });

    // Fetch all activity obligations
    const { data: activityObligations = [] } = useQuery<any[]>({
        queryKey: ['activity-obligations-all', activities],
        queryFn: async () => {
            const allObs: any[] = [];
            for (const act of activities) {
                try {
                    const res = await api.get(`/finance/activities/${act.id}/obligations`);
                    const obs = (res.data || []).map((o: any) => ({
                        ...o,
                        _activityName: act.name,
                    }));
                    allObs.push(...obs);
                } catch { /* skip */ }
            }
            return allObs;
        },
        enabled: activities.length > 0,
    });

    const { data: waTemplates = [] } = useQuery<WATemplate[]>({
        queryKey: ['wa-templates'],
        queryFn: async () => {
            try {
                return (await api.get('/finance/wa-templates')).data || [];
            } catch { return []; }
        },
    });

    // Group obligations by student
    const studentMap = useMemo(() => {
        const map: Record<string, { student: Student; obligations: Obligation[]; totalDebt: number; totalPaid: number }> = {};
        students.forEach(s => {
            const obs = allObligations.filter(o => o.student_id === s.id);
            // Add activity obligations as well
            const actObs = activityObligations
                .filter(o => o.student_id === s.id || o.student?.id === s.id)
                .map(o => ({
                    id: o.id,
                    student_id: s.id,
                    payment_type: { id: 0, name: o._activityName || 'Kegiatan', code: 'ACT' },
                    amount: o.amount || 0,
                    paid_amount: o.paid_amount || 0,
                    status: o.status || 'Pending',
                    billing_month: undefined,
                    due_date: undefined,
                    installment_number: undefined,
                    total_installments: undefined,
                    created_at: o.created_at || '',
                } as Obligation));
            const allObs = [...obs, ...actObs];
            const totalDebt = allObs.reduce((acc, o) => acc + (o.amount - o.paid_amount), 0);
            const totalPaid = allObs.reduce((acc, o) => acc + o.paid_amount, 0);
            if (allObs.length > 0) {
                map[s.id] = { student: s, obligations: allObs, totalDebt, totalPaid };
            }
        });
        return map;
    }, [students, allObligations]);

    const filteredStudents = useMemo(() => {
        const entries = Object.values(studentMap);
        if (!searchQuery.trim()) return entries;
        const q = searchQuery.toLowerCase();
        return entries.filter(e =>
            getStudentName(e.student).toLowerCase().includes(q) ||
            e.student.nis?.toLowerCase().includes(q) ||
            e.student.nisn?.toLowerCase().includes(q) ||
            e.student.class?.name?.toLowerCase().includes(q)
        );
    }, [studentMap, searchQuery]);

    const overallDebt = filteredStudents.reduce((s, e) => s + e.totalDebt, 0);
    const overallPaid = filteredStudents.reduce((s, e) => s + e.totalPaid, 0);

    const buildWAMessage = (template: WATemplate, student: Student, obligations: Obligation[]) => {
        const unpaid = obligations.filter(o => o.status !== 'Paid');
        const rincian = unpaid.map(o => {
            const name = o.payment_type?.name || 'Item';
            const monthLabel = o.billing_month ? ` (${MONTH_NAMES[o.billing_month]})` : '';
            const sisa = o.amount - o.paid_amount;
            return `• ${name}${monthLabel}: ${formatCurrency(sisa)}`;
        }).join('\n');
        const totalTagihan = unpaid.reduce((s, o) => s + (o.amount - o.paid_amount), 0);

        return template.body_template
            .replace(/{nama_siswa}/g, getStudentName(student))
            .replace(/{nis}/g, student.nis || student.nisn || '-')
            .replace(/{kelas}/g, student.class?.name || '-')
            .replace(/{total_tagihan}/g, formatCurrency(totalTagihan))
            .replace(/{rincian}/g, rincian)
            .replace(/{tanggal}/g, new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }));
    };

    const [isSending, setIsSending] = useState(false);

    const handleMultiPayment = async () => {
        if (selectedBillIds.length < 2) {
            toast.error('Pilih minimal 2 tagihan untuk pembayaran multi-tagihan');
            return;
        }
        setIsSubmittingMultiPay(true);
        try {
            const res = await api.post('/finance/bills/multi-payment', {
                bill_ids: selectedBillIds,
                amount: multiPayTotal,
                payment_method: multiPayMethod,
            });

            // Build bill items from selected obligations
            const selectedObligations = multiPayModal?.obligations.filter(o =>
                selectedBillIds.includes(o.id)
            ) || [];
            const invoiceNumber = res.data?.invoice_number || `INV-MULTI-${Date.now()}`;
            const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

            setLastMultiPayResult({
                invoiceNumber,
                studentName: multiPayModal ? getStudentName(multiPayModal.student) : '',
                paymentMethod: multiPayMethod,
                bills: selectedObligations.map(o => ({
                    title: o.payment_type?.name || 'Tagihan',
                    amount: o.amount - o.paid_amount,
                })),
                totalAmount: multiPayTotal,
                date: dateStr,
            });

            toast.success(`Pembayaran ${selectedBillIds.length} tagihan berhasil dicatat`);
            setMultiPayModal(null);
            setSelectedBillIds([]);
            setMultiPayTotal(0);
            queryClient.invalidateQueries({ queryKey: ['student-obligations'] });
            queryClient.invalidateQueries({ queryKey: ['activity-obligations-all'] });
        } catch (err: any) {
        } finally {
            setIsSubmittingMultiPay(false);
        }
    };

    const handleSendWA = async () => {
        if (!waModal) return;
        const template = waTemplates.find(t => t.id === Number(selectedTemplateId)) || waTemplates.find(t => t.is_default);
        if (!template) {
            toast.error('Pilih template WA terlebih dahulu atau buat template default');
            return;
        }

        const parentPhone = waModal.student.parent?.phone || '';
        const studentPhone = waModal.student.user?.phone || '';
        const targetPhones = [];
        if (parentPhone) targetPhones.push(parentPhone);
        if (studentPhone && studentPhone !== parentPhone) targetPhones.push(studentPhone);

        if (targetPhones.length === 0) {
            toast.error('Siswa tidak memiliki data nomor telepon orang tua maupun nomor telepon siswa');
            return;
        }

        const phoneString = targetPhones.join(',');
        const message = buildWAMessage(template, waModal.student, waModal.obligations);
        
        setIsSending(true);
        try {
            await api.post('/notifications/wa', {
                phone: phoneString,
                message: message
            });
            toast.success('Pesan WhatsApp dikirim via sistem!');
            setWaModal(null);
        } catch (error: any) {
            console.error('Failed to send WA via system', error);
            // Fallback to wa.me for all targets
            targetPhones.forEach(p => {
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/${p}?text=${encodedMessage}`, '_blank');
            });
            toast.error('Gagal kirim via sistem, mencoba membuka WhatsApp manual...');
            setWaModal(null);
        } finally {
            setIsSending(false);
        }
    };

    const handleBulkSendWA = async () => {
        const template = waTemplates.find(t => t.id === Number(selectedTemplateId)) || waTemplates.find(t => t.is_default);
        if (!template) {
            toast.error('Template WA belum dipilih atau tidak ada template default');
            return;
        }

        const studentsWithDebt = filteredStudents.filter(e => {
            const parentPhone = e.student.parent?.phone;
            const studentPhone = e.student.user?.phone;
            const matchesClass = selectedClassIds.length === 0 || (e.student.class?.id && selectedClassIds.includes(e.student.class.id)) || (e.student.class_id && selectedClassIds.includes(e.student.class_id));
            return e.totalDebt > 0 && (parentPhone || studentPhone) && matchesClass;
        });

        if (studentsWithDebt.length === 0) {
            toast.error('Tidak ada siswa dengan tunggakan dan nomor HP valid');
            setBulkSendModal(false);
            return;
        }

        setIsBulkSending(true);
        let successCount = 0;
        let failCount = 0;

        for (const { student, obligations } of studentsWithDebt) {
            const message = buildWAMessage(template, student, obligations);
            const parentPhone = student.parent?.phone || '';
            const studentPhone = student.user?.phone || '';
            const targetPhones = [];
            if (parentPhone) targetPhones.push(parentPhone);
            if (studentPhone && studentPhone !== parentPhone) targetPhones.push(studentPhone);
            
            const phoneString = targetPhones.join(',');
            try {
                await api.post('/notifications/wa', {
                    phone: phoneString,
                    message: message
                });
                successCount += targetPhones.length;
            } catch (error) {
                failCount += targetPhones.length;
            }
        }

        setIsBulkSending(false);
        setBulkSendModal(false);
        toast.success(`Berhasil mengirim ${successCount} pesan. Gagal: ${failCount}`);
    };

    return (
        <div className="space-y-6">
            {isSubcomponent ? (
                <div className="flex justify-end">
                    {canManage && (
                        <button
                            onClick={() => { setSelectedClassIds([]); setBulkSendModal(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all font-medium text-sm"
                        >
                            <Send size={18} /> Kirim Notifikasi Massal
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Surat Tagihan Siswa</h1>
                        <p className="text-slate-500 mt-1">Ringkasan tunggakan per siswa — untuk keperluan surat tagihan & WhatsApp</p>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => { setSelectedClassIds([]); setBulkSendModal(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all font-medium text-sm"
                        >
                            <Send size={18} /> Kirim Notifikasi Massal
                        </button>
                    )}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Siswa Bertagihan</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{filteredStudents.length}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-red-100 shadow-sm">
                    <p className="text-xs font-medium text-red-500 uppercase tracking-wider">Total Tunggakan</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(overallDebt)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-100 shadow-sm">
                    <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider">Total Terbayar</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(overallPaid)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari siswa berdasarkan nama, NIS, atau kelas..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <select
                    value={selectedYear?.id || ''}
                    onChange={e => {
                        const yearId = parseInt(e.target.value);
                        const year = academicYears.find(y => y.id === yearId) || null;
                        setSelectedYear(year);
                        setCurrentPage(1);
                    }}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white/80 backdrop-blur-sm min-w-[180px]"
                >
                    <option value="">Semua Tahun Ajaran</option>
                    {academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name} {y.is_active ? '✓' : ''}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Tampilkan:</span>
                    <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                        <option value="20">20 Baris</option>
                        <option value="40">40 Baris</option>
                        <option value="80">80 Baris</option>
                    </select>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-700">Tidak ada data tagihan siswa</p>
                    </div>
                ) : (
                    <>
                    {filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(({ student, obligations, totalDebt, totalPaid }) => {
                        const isExpanded = expandedStudent === student.id;
                        const unpaidCount = obligations.filter(o => o.status !== 'Paid').length;

                        return (
                            <div key={student.id}>
                                {/* Student Header Row */}
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 transition gap-4"
                                    onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                                            {isExpanded ? <ChevronDown size={18} className="text-blue-600" /> : <ChevronRight size={18} className="text-blue-600" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 truncate">{getStudentName(student)}</p>
                                            <p className="text-sm text-slate-500 truncate">{student.nis || student.nisn || '-'} • {student.class?.name || '-'}</p>
                                        </div>
                                        {unpaidCount > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 shrink-0">
                                                {unpaidCount} tunggakan
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                        <div className="text-left sm:text-right">
                                            <p className="text-sm text-red-600 font-semibold">{totalDebt > 0 ? `- ${formatCurrency(totalDebt)}` : '-'}</p>
                                            <p className="text-xs text-emerald-500">{formatCurrency(totalPaid)} terbayar</p>
                                        </div>
                                        {canManage && totalDebt > 0 && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={async e => {
                                                        e.stopPropagation();
                                                        try {
                                                            await generateStudentBillPDF({
                                                                studentName: getStudentName(student),
                                                                className: student.class?.name || '-',
                                                                nisn: student.nis || student.nisn || '-',
                                                                academicYear: obligations[0]?.created_at ? new Date(obligations[0].created_at).getFullYear().toString() : '-',
                                                                obligations: obligations.map(o => ({
                                                                    name: o.payment_type?.name || '-',
                                                                    amount: o.amount,
                                                                    paid_amount: o.paid_amount,
                                                                    status: o.status,
                                                                    billing_month: o.billing_month,
                                                                    due_date: o.due_date
                                                                }))
                                                            });
                                                            toast.success('Surat tagihan berhasil diunduh');
                                                        } catch (err) {
                                                            toast.error('Gagal membuat surat tagihan');
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition shrink-0"
                                                    title="Cetak Surat Tagihan"
                                                >
                                                    <Printer size={14} /> PDF
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setWaModal({ student, obligations }); setSelectedTemplateId(String(waTemplates.find(t => t.is_default)?.id || '')); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition shrink-0"
                                                    title="Kirim Tagihan via WA"
                                                >
                                                    <Send size={14} /> WA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="px-4 pb-4">
                                        {/* Multi-bill selector for canManage users */}
                                        {canManage && (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-semibold text-slate-700">Pilih Tagihan untuk Dibayar Sekaligus</p>
                                                    <button
                                                        disabled={selectedBillIds.length < 2}
                                                        onClick={() => setMultiPayModal({ student, obligations })}
                                                        className={clsx(
                                                            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition',
                                                            selectedBillIds.length >= 2
                                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/25'
                                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                        )}
                                                    >
                                                        <CreditCard size={15} />
                                                        Bayar Terpilih
                                                        {selectedBillIds.length >= 2 && (
                                                            <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                                                                {selectedBillIds.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                                <MultiBillSelector
                                                    bills={obligations.map(o => ({
                                                        id: o.id,
                                                        title: o.payment_type?.name || 'Tagihan',
                                                        amount: o.amount - o.paid_amount,
                                                        due_date: o.due_date || '',
                                                        status: o.status === 'Paid' ? 'Paid' : o.status === 'Partial' ? 'Partial' : 'Unpaid',
                                                        student_id: typeof o.student_id === 'string' ? parseInt(o.student_id) : o.student_id,
                                                    }))}
                                                    onSelectionChange={(ids, total) => {
                                                        setSelectedBillIds(ids);
                                                        setMultiPayTotal(total);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm min-w-[600px] whitespace-nowrap">
                                                    <thead>
                                                    <tr className="bg-slate-100 text-slate-600">
                                                        <th className="p-3 text-left font-medium">Jenis Pembayaran</th>
                                                        <th className="p-3 text-left font-medium">Bulan</th>
                                                        <th className="p-3 text-right font-medium">Total</th>
                                                        <th className="p-3 text-right font-medium">Terbayar</th>
                                                        <th className="p-3 text-right font-medium">Sisa</th>
                                                        <th className="p-3 text-center font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {Object.entries(obligations.reduce((acc, o) => {
                                                        const groupName = o.payment_type?.name || 'Lainnya';
                                                        if (!acc[groupName]) acc[groupName] = [];
                                                        acc[groupName].push(o);
                                                        return acc;
                                                    }, {} as Record<string, Obligation[]>)).map(([groupName, obs]) => (
                                                        <React.Fragment key={groupName}>
                                                            <tr className="bg-slate-50/50">
                                                                <td colSpan={6} className="p-3 font-semibold text-slate-700">{groupName}</td>
                                                            </tr>
                                                            {obs.map(o => {
                                                                const sisa = o.amount - o.paid_amount;
                                                                return (
                                                                    <tr key={o.id} className="hover:bg-white transition">
                                                                        <td className="p-3 font-medium text-slate-800 pl-6">
                                                                            {o.installment_number && o.total_installments ? `Cicilan ${o.installment_number}/${o.total_installments}` : '-'}
                                                                        </td>
                                                                        <td className="p-3 text-slate-600">
                                                                            {o.billing_month ? MONTH_NAMES[o.billing_month] : '-'}
                                                                            {o.due_date && <span className="block text-[10px] text-slate-400">JT: {new Date(o.due_date).toLocaleDateString('id-ID')}</span>}
                                                                        </td>
                                                                        <td className="p-3 text-right text-slate-700">{formatCurrency(o.amount)}</td>
                                                                        <td className="p-3 text-right text-emerald-600">{formatCurrency(o.paid_amount)}</td>
                                                                        <td className="p-3 text-right font-semibold text-red-600">{sisa > 0 ? formatCurrency(sisa) : '-'}</td>
                                                                        <td className="p-3 text-center">
                                                                            <span className={clsx(
                                                                                "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full",
                                                                                o.status === 'Paid' ? "bg-emerald-100 text-emerald-700" :
                                                                                o.status === 'Partial' ? "bg-amber-100 text-amber-700" :
                                                                                "bg-red-100 text-red-700"
                                                                            )}>
                                                                                {o.status === 'Paid' ? <CheckCircle size={12} /> : o.status === 'Partial' ? <Clock size={12} /> : <XCircle size={12} />}
                                                                                {o.status === 'Paid' ? 'Lunas' : o.status === 'Partial' ? 'Cicil' : 'Belum'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-100 font-semibold text-slate-800">
                                                        <td className="p-3" colSpan={2}>Total</td>
                                                        <td className="p-3 text-right">{formatCurrency(obligations.reduce((s, o) => s + o.amount, 0))}</td>
                                                        <td className="p-3 text-right text-emerald-600">{formatCurrency(totalPaid)}</td>
                                                        <td className="p-3 text-right text-red-600">{totalDebt > 0 ? formatCurrency(totalDebt) : '-'}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredStudents.length > itemsPerPage && (
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl">
                            <p className="text-sm text-slate-500">Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} siswa</p>
                            <div className="flex gap-1 justify-end">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 text-sm hover:bg-slate-50"
                                >
                                    Sebelumnya
                                </button>
                                <span className="px-4 py-1.5 text-sm font-medium text-slate-700">Hal {currentPage} / {Math.ceil(filteredStudents.length / itemsPerPage)}</span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredStudents.length / itemsPerPage)))}
                                    disabled={currentPage === Math.ceil(filteredStudents.length / itemsPerPage)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 text-sm hover:bg-slate-50"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                )}
            </div>

            {/* WA Modal */}
            {waModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-emerald-50">
                            <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                                <Send className="text-emerald-600" size={22} /> Kirim Tagihan via WhatsApp
                            </h2>
                            <p className="text-sm text-emerald-600 mt-1">Siswa: {getStudentName(waModal.student)}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Template</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">-- Pilih Template --</option>
                                    {waTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Default)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedTemplateId && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Preview Pesan</label>
                                    <div className="bg-emerald-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap border border-emerald-100 max-h-64 overflow-y-auto">
                                        {buildWAMessage(
                                            waTemplates.find(t => t.id === Number(selectedTemplateId))!,
                                            waModal.student,
                                            waModal.obligations
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setWaModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                                    Batal
                                </button>
                                <button
                                    onClick={handleSendWA}
                                    disabled={isSending}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : <Send size={16} />} 
                                    {isSending ? 'Mengirim...' : 'Kirim WhatsApp'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Send WA Modal */}
            {bulkSendModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-emerald-50">
                            <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                                <Send className="text-emerald-600" size={22} /> Kirim Notifikasi Massal
                            </h2>
                            <p className="text-sm text-emerald-600 mt-1">Kirim otomatis ke semua siswa tertampil yang memiliki tunggakan.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Template</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">-- Pilih Template --</option>
                                    {waTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Default)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Kelas Penerima (Kosongkan untuk Kirim ke Semua Kelas)</label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                                    {classes.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-emerald-600">
                                            <input
                                                type="checkbox"
                                                checked={selectedClassIds.includes(c.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedClassIds([...selectedClassIds, c.id]);
                                                    } else {
                                                        setSelectedClassIds(selectedClassIds.filter(id => id !== c.id));
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <p className="text-sm text-emerald-700 font-medium">
                                    Total target pengiriman: {filteredStudents.filter(e => {
                                        const matchesClass = selectedClassIds.length === 0 || (e.student.class?.id && selectedClassIds.includes(e.student.class.id)) || (e.student.class_id && selectedClassIds.includes(e.student.class_id));
                                        return e.totalDebt > 0 && (e.student.parent?.phone || e.student.user?.phone) && matchesClass;
                                    }).length} orang tua/siswa
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setBulkSendModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                                    Batal
                                </button>
                                <button
                                    onClick={handleBulkSendWA}
                                    disabled={isBulkSending}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isBulkSending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : <Send size={16} />} 
                                    {isBulkSending ? 'Memproses...' : 'Kirim Massal Sekarang'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Payment Modal */}
            {multiPayModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-indigo-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                                    <CreditCard className="text-indigo-600" size={22} /> Bayar Terpilih
                                </h2>
                                <p className="text-sm text-indigo-600 mt-1">Siswa: {getStudentName(multiPayModal.student)}</p>
                            </div>
                            <button
                                onClick={() => setMultiPayModal(null)}
                                className="p-2 rounded-xl hover:bg-indigo-100 text-indigo-600 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                <p className="text-sm text-indigo-700 font-medium">
                                    {selectedBillIds.length} tagihan dipilih
                                </p>
                                <p className="text-2xl font-bold text-indigo-800 mt-1">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(multiPayTotal)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Metode Pembayaran</label>
                                <select
                                    value={multiPayMethod}
                                    onChange={e => setMultiPayMethod(e.target.value as 'Cash' | 'Transfer')}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="Cash">Tunai (Cash)</option>
                                    <option value="Transfer">Transfer Bank</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setMultiPayModal(null)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleMultiPayment}
                                    disabled={isSubmittingMultiPay || selectedBillIds.length < 2}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmittingMultiPay ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : <CreditCard size={16} />}
                                    {isSubmittingMultiPay ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Multi-Payment Invoice Download Modal */}
            {lastMultiPayResult && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                                    <CheckCircle className="text-emerald-600" size={22} /> Pembayaran Berhasil
                                </h2>
                                <p className="text-sm text-emerald-600 mt-1">
                                    {lastMultiPayResult.bills.length} tagihan telah dibayar
                                </p>
                            </div>
                            <button
                                onClick={() => setLastMultiPayResult(null)}
                                className="p-2 rounded-xl hover:bg-emerald-100 text-emerald-600 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Siswa</span>
                                    <span className="font-semibold text-slate-800">{lastMultiPayResult.studentName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">No. Invoice</span>
                                    <span className="font-mono text-slate-700">{lastMultiPayResult.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total</span>
                                    <span className="font-bold text-emerald-700">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(lastMultiPayResult.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setLastMultiPayResult(null)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50"
                                >
                                    Tutup
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await generateMultiPaymentInvoice(lastMultiPayResult);
                                            toast.success('Invoice berhasil diunduh');
                                        } catch {
                                            toast.error('Gagal membuat invoice');
                                        }
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                                >
                                    <Download size={16} /> Download Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentBillSummary;
