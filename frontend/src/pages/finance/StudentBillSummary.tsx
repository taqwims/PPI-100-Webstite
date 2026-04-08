import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, AlertCircle, ChevronDown, ChevronRight, Send, CheckCircle, Clock, XCircle, Printer } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { generateStudentBillPDF } from '../../utils/pdfUtils';

interface Student {
    id: string;
    full_name: string;
    nis: string;
    class?: { name: string };
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

const StudentBillSummary: React.FC = () => {
    const { user } = useAuth();
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [waModal, setWaModal] = useState<{ student: Student; obligations: Obligation[] } | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const { data: students = [] } = useQuery<Student[]>({
        queryKey: ['students'],
        queryFn: async () => (await api.get('/students')).data || [],
    });

    const { data: allObligations = [] } = useQuery<Obligation[]>({
        queryKey: ['student-obligations'],
        queryFn: async () => (await api.get('/finance/student-obligations')).data || [],
    });

    // Also fetch activity obligations
    const { data: activities = [] } = useQuery<any[]>({
        queryKey: ['activities-all'],
        queryFn: async () => {
            try { return (await api.get('/finance/activities')).data || []; }
            catch { return []; }
        },
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
            e.student.full_name.toLowerCase().includes(q) ||
            e.student.nis?.toLowerCase().includes(q) ||
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
            .replace(/{nama_siswa}/g, student.full_name)
            .replace(/{nis}/g, student.nis || '-')
            .replace(/{kelas}/g, student.class?.name || '-')
            .replace(/{total_tagihan}/g, formatCurrency(totalTagihan))
            .replace(/{rincian}/g, rincian)
            .replace(/{tanggal}/g, new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }));
    };

    const handleSendWA = () => {
        if (!waModal) return;
        const template = waTemplates.find(t => t.id === Number(selectedTemplateId)) || waTemplates.find(t => t.is_default);
        if (!template) {
            toast.error('Pilih template WA terlebih dahulu atau buat template default');
            return;
        }
        const message = buildWAMessage(template, waModal.student, waModal.obligations);
        // Use wa.me link — placeholder phone (user should have parent's phone)
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        setWaModal(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Surat Tagihan Siswa</h1>
                    <p className="text-slate-500 mt-1">Ringkasan tunggakan per siswa — untuk keperluan surat tagihan & WhatsApp</p>
                </div>
            </div>

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

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Cari siswa berdasarkan nama, NIS, atau kelas..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
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
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 transition"
                                    onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-blue-50">
                                            {isExpanded ? <ChevronDown size={18} className="text-blue-600" /> : <ChevronRight size={18} className="text-blue-600" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{student.full_name}</p>
                                            <p className="text-sm text-slate-500">{student.nis} • {student.class?.name || '-'}</p>
                                        </div>
                                        {unpaidCount > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                                {unpaidCount} tunggakan
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-red-600 font-semibold">{totalDebt > 0 ? `- ${formatCurrency(totalDebt)}` : '-'}</p>
                                            <p className="text-xs text-emerald-500">{formatCurrency(totalPaid)} terbayar</p>
                                        </div>
                                        {canManage && totalDebt > 0 && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        generateStudentBillPDF({
                                                            studentName: student.full_name,
                                                            className: student.class?.name || '-',
                                                            nisn: student.nis,
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
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                                    title="Cetak Surat Tagihan"
                                                >
                                                    <Printer size={14} /> PDF
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setWaModal({ student, obligations }); setSelectedTemplateId(String(waTemplates.find(t => t.is_default)?.id || '')); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
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
                                        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                            <table className="w-full text-sm">
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
                            <p className="text-sm text-emerald-600 mt-1">Siswa: {waModal.student.full_name}</p>
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
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                                >
                                    <Send size={16} /> Buka WhatsApp
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
