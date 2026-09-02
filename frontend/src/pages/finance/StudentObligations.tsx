import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFeatureStore } from '../../store/featureStore';
import { Plus, Search, Trash2 } from 'lucide-react';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';
import { ObligationsTable } from '../../components/finance/StudentObligations/ObligationsTable';
import { BulkAssignModal } from '../../components/finance/StudentObligations/BulkAssignModal';
import { BulkDeleteModal } from '../../components/finance/StudentObligations/BulkDeleteModal';
import { ActionModals } from '../../components/finance/StudentObligations/ActionModals';
import { AcademicYear, ClassOption, PaymentType, Obligation, GroupedStudentAmount } from '../../components/finance/StudentObligations/types';
import toast from 'react-hot-toast';

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const StudentObligations = () => {
    const { user } = useAuth();
    const isBulkDeleteEnabled = useFeatureStore(s => s.isEnabled('bulk_delete_obligations'));
    const canManage = [1, 9, 11].includes(user?.role_id || 0);

    const [obligations, setObligations] = useState<Obligation[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [filterYearId, setFilterYearId] = useState('');
    const [filterClassId, setFilterClassId] = useState('');

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    const [payingOb, setPayingOb] = useState<Obligation | null>(null);
    const [payAmount, setPayAmount] = useState('');
    
    const [editingOb, setEditingOb] = useState<Obligation | null>(null);
    const [editAmount, setEditAmount] = useState('');

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printParams, setPrintParams] = useState<any>(null);

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
            }
        } catch (e) {
            console.error(e);
        }
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

    const getSemesterMonths = (year: AcademicYear): { semester1: number[]; semester2: number[] } => {
        const start = new Date(year.start_date);
        const end = new Date(year.end_date);
        const startMonth = start.getMonth() + 1;
        const endMonth = end.getMonth() + 1;
        
        const sem1: number[] = [];
        const sem2: number[] = [];
        
        if (startMonth >= 7) {
            for (let m = startMonth; m <= 12; m++) sem1.push(m);
            for (let m = 1; m <= Math.min(endMonth, 6); m++) sem2.push(m);
        } else {
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

    const isForceDeleteAllowed = useFeatureStore(s => s.school.allow_delete_paid_obligations === 'true');

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const targetOb = obligations.find(o => o.id === id);
        const isPaid = targetOb && targetOb.paid_amount > 0;

        let confirmMsg = 'Hapus tanggungan ini?';
        if (isPaid) {
            confirmMsg = `⚠️ PERINGATAN KOREKSI TRANSAKSI:\n\nTanggungan ini SUDAH MEMILIKI PEMBAYARAN sebesar ${formatCurrency(targetOb.paid_amount)}.\n\nMenghapus tanggungan ini akan secara otomatis:\n1. Menghapus tagihan siswa (Bill)\n2. Menghapus riwayat transaksi pembayaran (Payment)\n3. Menghapus pencatatan pemasukan di Buku Kas Umum (BKU)\n4. Membatalkan & mengurangi realisasi anggaran RKAS terkait\n\nApakah Anda yakin ingin melanjutkan penghapusan?`;
        }

        if (!confirm(confirmMsg)) return;
        try {
            await api.delete(`/finance/student-obligations/${id}`);
            toast.success(isPaid ? 'Tanggungan dan seluruh riwayat pembayaran terkait berhasil dihapus' : 'Berhasil dihapus');
            fetchData();
        } catch (err: any) { 
            console.error(err);
            toast.error(err.response?.data?.error || 'Gagal menghapus tanggungan');
        }
    };

    const handleBulkDeleteGroup = async (ids: string[], typeName: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const groupObs = obligations.filter(o => ids.includes(o.id));
        const totalPaid = groupObs.reduce((s, o) => s + (o.paid_amount || 0), 0);
        const hasPaid = totalPaid > 0;

        let confirmMsg = `Hapus semua tanggungan ${typeName}?`;
        if (hasPaid) {
            confirmMsg = `⚠️ PERINGATAN KOREKSI TRANSAKSI:\n\nBeberapa tanggungan ${typeName} SUDAH DIBAYAR (Total Terbayar: ${formatCurrency(totalPaid)}).\n\nMenghapus tanggungan ini akan membatalkan riwayat pembayaran, menghapus catatan kas BKU, dan mengurangi realisasi RKAS terkait.\n\nApakah Anda yakin ingin menghapus semua tanggungan ${typeName} ini?`;
        }

        if (!confirm(confirmMsg)) return;
        try {
            await Promise.all(ids.map(id => api.delete(`/finance/student-obligations/${id}`)));
            toast.success(`Berhasil menghapus ${typeName}`);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || `Gagal menghapus ${typeName}`);
        }
    };

    const handlePrintReceipt = (params: any) => {
        setPrintParams(params);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[], format: 'A4' | 'A5') => {
        if (printParams) {
            try {
                const mod = await import('../../utils/pdfUtils');
                await mod.generateObligationReceipt(printParams, selectedRoles, format);
                toast.success('Kuitansi berhasil diunduh');
            } catch (error) {
                console.error(error);
                toast.error('Gagal membuat kuitansi');
            }
        }
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tanggungan Siswa</h1>
                    <p className="text-slate-500 mt-1">Item pembayaran yang harus dibayar oleh siswa.</p>
                </div>
                {canManage && (
                    <div className="flex gap-2">
                        {isBulkDeleteEnabled && (
                            <button onClick={() => setShowBulkDeleteModal(true)} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 shadow-sm transition">
                                <Trash2 size={18} /> Hapus Massal
                            </button>
                        )}
                        <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition">
                            <Plus size={18} /> Assign Tanggungan
                        </button>
                    </div>
                )}
            </div>

            {isForceDeleteAllowed && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs shadow-sm">
                    <span className="text-base">⚠️</span>
                    <div>
                        <p className="font-bold">Mode Koreksi Transaksi Sedang Aktif</p>
                        <p className="text-amber-700 mt-0.5">Penghapusan tanggungan yang sudah dibayar diperbolehkan oleh Admin. Menghapus tanggungan terbayar akan otomatis membatalkan pembayaran, menghapus catatan kas BKU, dan mengurangi realisasi RKAS.</p>
                    </div>
                </div>
            )}

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

                <ObligationsTable 
                    loading={loading}
                    groupedStudents={groupedStudents}
                    academicYears={academicYears}
                    filterYearId={filterYearId}
                    canManage={canManage}
                    setPayingOb={setPayingOb}
                    setPayAmount={setPayAmount}
                    setEditingOb={setEditingOb}
                    setEditAmount={setEditAmount}
                    handleDelete={handleDelete}
                    handleBulkDeleteGroup={handleBulkDeleteGroup}
                    handlePrintReceipt={handlePrintReceipt}
                />
            </div>

            <BulkAssignModal 
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                onSuccess={fetchData}
                filterYearId={filterYearId}
                classes={classes}
                students={students}
                academicYears={academicYears}
                paymentTypes={paymentTypes}
                semesterMonths={semesterMonths}
            />

            <BulkDeleteModal 
                isOpen={showBulkDeleteModal}
                onClose={() => setShowBulkDeleteModal(false)}
                onSuccess={fetchData}
                paymentTypes={paymentTypes}
                classes={classes}
                academicYears={academicYears}
                filterYearId={filterYearId}
                filterClassId={filterClassId}
            />

            <ActionModals 
                payingOb={payingOb}
                setPayingOb={setPayingOb}
                payAmount={payAmount}
                setPayAmount={setPayAmount}
                editingOb={editingOb}
                setEditingOb={setEditingOb}
                editAmount={editAmount}
                setEditAmount={setEditAmount}
                onSuccess={fetchData}
            />

            <PrintOptionsModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onConfirm={handleConfirmPrint}
                title="Cetak Kuitansi Pembayaran"
                defaultFormat="A5"
                defaultRoles={['treasurer', 'admin_tu', 'principal']}
                availableRoles={[
                    { id: 'treasurer', label: 'Bendahara' },
                    { id: 'admin_tu', label: 'Tata Usaha' },
                    { id: 'principal', label: 'Kepala Sekolah' },
                ]}
            />
        </div>
    );
};

export default StudentObligations;
