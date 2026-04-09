import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Users, CreditCard, Receipt, FileText, Plus, Search, Trash2, X, CheckSquare, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { generateActivityReportPDF, generateActivityBillPDF, generateSingleActivityBillPDF } from '../../utils/pdfUtils';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));

const ActivityDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [activeTab, setActiveTab] = useState<'obligations' | 'ledger' | 'report'>('obligations');
    const [searchStudent, setSearchStudent] = useState('');

    // Assign Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState<'class' | 'student'>('class');
    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [assignClassId, setAssignClassId] = useState('');
    const [assignStudentId, setAssignStudentId] = useState('');
    const [filterAssignClassId, setFilterAssignClassId] = useState('');

    // Pay Modal
    const [payModal, setPayModal] = useState<any>(null);
    const [payAmount, setPayAmount] = useState('');

    // Expense Modal
    const [expenseModal, setExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', receipt_image: '' });

    // Print Options
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printParams, setPrintParams] = useState<any>(null);

    // Fetch Data
    const { data: activity } = useQuery({
        queryKey: ['activity', id],
        queryFn: async () => (await api.get(`/finance/activities/${id}`)).data
    });

    const { data: obligations = [] } = useQuery<any[]>({
        queryKey: ['activity-obligations', id],
        queryFn: async () => (await api.get(`/finance/activities/${id}/obligations`)).data || []
    });

    const { data: transactions = [] } = useQuery<any[]>({
        queryKey: ['activity-transactions', id],
        queryFn: async () => (await api.get(`/finance/activities/${id}/transactions`)).data || []
    });

    const { data: summary } = useQuery({
        queryKey: ['activity-summary', id],
        queryFn: async () => (await api.get(`/finance/activities/${id}/summary`)).data
    });

    useEffect(() => {
        api.get('/academic/classes').then(res => setClasses(res.data || []));
        api.get('/users/?role=6').then(res => setStudents(res.data || []));
    }, []);

    // Mutations
    const assignMutation = useMutation({
        mutationFn: () => {
            if (assignTarget === 'class') {
                return api.post(`/finance/activities/${id}/obligations/bulk-assign`, { class_id: Number(assignClassId) });
            } else {
                return api.post(`/finance/activities/${id}/obligations/assign-student`, { student_id: assignStudentId });
            }
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['activity-obligations'] });
            setShowAssignModal(false);
            if (assignTarget === 'class') {
                toast.success(`${res.data.count} siswa berhasil ditambahkan tagihan`);
            } else {
                toast.success(`1 siswa berhasil ditambahkan tagihan`);
            }
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Gagal assign tagihan')
    });

    const payMutation = useMutation({
        mutationFn: () => api.post(`/finance/activities/obligations/${payModal.id}/pay`, { amount: parseFloat(payAmount) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-obligations'] });
            queryClient.invalidateQueries({ queryKey: ['activity-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['activity-summary'] });
            setPayModal(null);
            toast.success('Pembayaran berhasil dicatat');
        },
        onError: () => toast.error('Gagal mencatat pembayaran')
    });

    const expenseMutation = useMutation({
        mutationFn: () => api.post(`/finance/activities/${id}/transactions`, {
            transaction_type: 'Expense',
            amount: parseFloat(expenseForm.amount),
            description: expenseForm.description,
            receipt_image: expenseForm.receipt_image || undefined
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['activity-summary'] });
            setExpenseModal(false);
            setExpenseForm({ description: '', amount: '', receipt_image: '' });
            toast.success('Pengeluaran berhasil dicatat');
        },
        onError: () => toast.error('Gagal mencatat pengeluaran')
    });

    const deleteObligation = useMutation({
        mutationFn: (obId: string) => api.delete(`/finance/activities/obligations/${obId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-obligations'] });
            toast.success('Hapus tagihan berhasil');
        }
    });

    const deleteTx = useMutation({
        mutationFn: (txId: string) => api.delete(`/finance/activities/transactions/${txId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['activity-summary'] });
            toast.success('Hapus transaksi berhasil');
        }
    });

    const handleExportPDF = () => {
        generateActivityReportPDF({
            activity,
            obligationsCount: obligations.length,
            summary,
            transactions
        });
    };

    const handlePrintReceipt = (params: any) => {
        setPrintParams(params);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[]) => {
        if (printParams) {
            try {
                const mod = await import('../../utils/pdfUtils');
                await mod.generateActivityObligationReceipt(printParams, selectedRoles);
                toast.success('Kwitansi berhasil diunduh');
            } catch (error) {
                console.error(error);
                toast.error('Gagal membuat kwitansi');
            }
        }
    };

    if (!activity) return <div className="p-12 text-center text-slate-500">Memuat data kegiatan...</div>;

    const filteredObs = obligations.filter(ob =>
        ob.student?.user?.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        ob.student?.class?.name.toLowerCase().includes(searchStudent.toLowerCase())
    );

    const totalTarget = obligations.length * activity.target_amount;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/dashboard/finance/activities" className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{activity.name}</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{activity.academic_year?.name} • Tagihan: {formatCurrency(activity.target_amount)}/siswa</p>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Pemasukan</p>
                    <h2 className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.total_income || 0)}</h2>
                    <p className="text-xs text-slate-400 mt-1">Dari pembayaran {obligations.filter(o => o.paid_amount > 0).length} siswa</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Pengeluaran</p>
                    <h2 className="text-2xl font-bold text-red-600">{formatCurrency(summary?.total_expense || 0)}</h2>
                    <p className="text-xs text-slate-400 mt-1">{transactions.filter(t => t.transaction_type === 'Expense').length} transaksi</p>
                </div>
                <div className="bg-slate-900 rounded-2xl p-5 shadow-sm col-span-1 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-6 -top-10 text-white/5 opacity-20"><Receipt size={140} /></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Saldo Bersih Kegiatan</p>
                        <div className="flex items-end gap-3">
                            <h2 className="text-3xl font-bold text-white">{formatCurrency(summary?.balance || 0)}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button onClick={() => setActiveTab('obligations')} className={clsx('px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors', activeTab === 'obligations' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
                    <Users size={16} /> Data Tagihan Siswa
                </button>
                <button onClick={() => setActiveTab('ledger')} className={clsx('px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors', activeTab === 'ledger' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
                    <Receipt size={16} /> Buku Kas Kegiatan
                </button>
                <button onClick={() => setActiveTab('report')} className={clsx('px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors', activeTab === 'report' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
                    <FileText size={16} /> Ringkasan Laporan
                </button>
            </div>

            {/* Tab: Obligations */}
            {activeTab === 'obligations' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Cari nama siswa atau kelas..." value={searchStudent} onChange={e => setSearchStudent(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm" />
                        </div>
                        {canManage && (
                            <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={async () => {
                                        const billItems = filteredObs.filter(ob => ob.status !== 'Paid').map(ob => ({
                                            studentName: ob.student?.user?.name || '-',
                                            className: ob.student?.class?.name || '-',
                                            activityName: activity.name,
                                            amount: ob.amount,
                                            paidAmount: ob.paid_amount,
                                            status: ob.status
                                        }));
                                        if (billItems.length === 0) { toast.error('Tidak ada siswa yang belum lunas'); return; }
                                        try {
                                            await generateActivityBillPDF(billItems, activity.name, activity.id);
                                            toast.success('Surat tagihan berhasil diunduh');
                                        } catch (e) {
                                            toast.error('Gagal membuat surat tagihan');
                                        }
                                    }} className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition shadow-sm">
                                        <FileText size={16} /> Cetak Surat Tagihan
                                    </button>
                                <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                                    <Plus size={16} /> Assign Siswa
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white">
                                <tr className="text-slate-500 border-b border-slate-200">
                                    <th className="px-5 py-4 font-medium">Nama Siswa</th>
                                    <th className="px-5 py-4 font-medium">Kelas</th>
                                    <th className="px-5 py-4 font-medium text-right">Tagihan</th>
                                    <th className="px-5 py-4 font-medium text-right">Terbayar</th>
                                    <th className="px-5 py-4 font-medium text-center">Status</th>
                                    {canManage && <th className="px-5 py-4 font-medium text-right">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredObs.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Belum ada siswa yang di-assign untuk kegiatan ini.</td></tr>
                                ) : filteredObs.map(ob => (
                                    <tr key={ob.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3 font-medium text-slate-900">{ob.student?.user?.name}</td>
                                        <td className="px-5 py-3 text-slate-600">{ob.student?.class?.name}</td>
                                        <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCurrency(ob.amount)}</td>
                                        <td className="px-5 py-3 text-right font-medium text-emerald-600">{formatCurrency(ob.paid_amount)}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ob.status === 'Paid' ? 'bg-green-100 text-green-700' : ob.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {ob.status === 'Paid' ? 'Lunas' : ob.status === 'Partial' ? 'Cicil' : 'Belum'}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {ob.status !== 'Paid' && (
                                                        <>
                                                            <button onClick={() => { setPayModal(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" title="Catat Bayar"><CheckSquare size={16} /></button>
                                                            <button onClick={async () => {
                                                                try {
                                                                    await generateSingleActivityBillPDF({
                                                                        studentName: ob.student?.user?.name || '-',
                                                                        className: ob.student?.class?.name || '-',
                                                                        activityName: activity.name,
                                                                        amount: ob.amount,
                                                                        paidAmount: ob.paid_amount,
                                                                        status: ob.status
                                                                    }, activity.id);
                                                                    toast.success('Surat tagihan berhasil diunduh');
                                                                } catch (e) {
                                                                    toast.error('Gagal membuat surat tagihan');
                                                                }
                                                            }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Surat Tagihan"><FileText size={16} /></button>
                                                        </>
                                                    )}
                                                    {ob.status === 'Paid' && (
                                                        <button onClick={() => {
                                                            handlePrintReceipt({
                                                                id: ob.id,
                                                                studentName: ob.student?.user?.name || '-',
                                                                className: ob.student?.class?.name || '-',
                                                                activityName: activity.name,
                                                                amount: ob.paid_amount,
                                                                paidAt: ob.updated_at
                                                            });
                                                        }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Cetak Kwitansi"><Receipt size={16} /></button>
                                                    )}
                                                    <button onClick={() => { if (confirm('Hapus siswa dari daftar tagihan kegiatan?')) deleteObligation.mutate(ob.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Hapus"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Ledger */}
            {activeTab === 'ledger' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Riwayat Transaksi Kegiatan</h3>
                        {canManage && (
                            <button onClick={() => { setShowAssignModal(false); setExpenseModal(true); }} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition border border-red-200">
                                <Plus size={16} /> Catat Pengeluaran
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white">
                                <tr className="text-slate-500 border-b border-slate-200">
                                    <th className="px-5 py-4 font-medium">Tanggal</th>
                                    <th className="px-5 py-4 font-medium">Uraian / Keterangan</th>
                                    <th className="px-5 py-4 font-medium text-right">Pemasukan</th>
                                    <th className="px-5 py-4 font-medium text-right">Pengeluaran</th>
                                    <th className="px-5 py-4 font-medium">PIC</th>
                                    {canManage && <th className="px-5 py-4 text-center font-medium">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-slate-400">Belum ada transaksi kegiatan.</td></tr>
                                ) : transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3 text-slate-600">{formatDate(tx.date)}</td>
                                        <td className="px-5 py-3 font-medium text-slate-900">{tx.description}</td>
                                        <td className="px-5 py-3 text-right font-medium text-emerald-600">{tx.transaction_type === 'Income' ? formatCurrency(tx.amount) : '-'}</td>
                                        <td className="px-5 py-3 text-right font-medium text-red-600">{tx.transaction_type === 'Expense' ? formatCurrency(tx.amount) : '-'}</td>
                                        <td className="px-5 py-3 text-slate-500 text-xs">{tx.created_by?.name}</td>
                                        {canManage && (
                                            <td className="px-5 py-3 text-center">
                                                {tx.transaction_type === 'Expense' && (
                                                    <button onClick={() => { if (confirm('Hapus transaksi pengeluaran ini?')) deleteTx.mutate(tx.id); }} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Report */}
            {activeTab === 'report' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                        <div className="text-center pb-8 border-b border-slate-100 mb-8 relative">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Laporan Rekapitulasi Keuangan Kegiatan</h2>
                            <p className="text-slate-500">{activity.name} • Tahun Ajaran {activity.academic_year?.name}</p>
                            <button onClick={handleExportPDF} className="absolute right-0 top-0 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-700 transition">
                                Export PDF
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={20} className="text-blue-500" /> Analisis Tagihan Siswa</h3>
                                <div className="bg-slate-50 rounded-2xl p-5 grid grid-cols-2 gap-4 border border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Total Target Pendapatan (Peserta x Tagihan)</p>
                                        <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTarget)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Proyeksi Sisa yang Belum Tertagih</p>
                                        <p className="text-lg font-bold text-amber-600">{formatCurrency(totalTarget - (summary?.total_income || 0))}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Receipt size={20} className="text-emerald-500" /> Arus Kas Kegiatan</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl text-emerald-800 font-medium">
                                        <span>Total Dana Masuk dari Siswa</span>
                                        <span>{formatCurrency(summary?.total_income || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl text-red-800 font-medium">
                                        <span>Total Pengeluaran Panitia</span>
                                        <span>- {formatCurrency(summary?.total_expense || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-5 bg-slate-900 rounded-2xl text-white font-bold text-xl mt-4">
                                        <span>Saldo Akhir Kegiatan</span>
                                        <span>{formatCurrency(summary?.balance || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Assign Peserta Kegiatan</h2>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(); }} className="p-6 space-y-4">
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
                                    <p className="text-sm text-slate-600 mb-2">Seluruh siswa di kelas yang dipilih akan diberi tagihan kegiatan ini: <strong className="text-slate-900">{formatCurrency(activity.target_amount)}</strong></p>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
                                    <select value={assignClassId} onChange={e => setAssignClassId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required={assignTarget === 'class'}>
                                        <option value="">-- Pilih Kelas --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-slate-600 mb-2">Siswa akan diberi tagihan kegiatan ini: <strong className="text-slate-900">{formatCurrency(activity.target_amount)}</strong></p>

                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
                                    <select value={filterAssignClassId} onChange={e => { setFilterAssignClassId(e.target.value); setAssignStudentId(''); }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl mb-3">
                                        <option value="">-- Semua Kelas --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>

                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                                    <select value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required={assignTarget === 'student'}>
                                        <option value="">-- Pilih Siswa --</option>
                                        {students.filter(s => filterAssignClassId ? String(s.student?.class?.id) === filterAssignClassId : true).map(s => <option key={s.student?.id} value={s.student?.id}>{s.name} ({s.student?.class?.name || 'Belum ada kelas'})</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">Batal</button>
                                <button type="submit" disabled={assignMutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {payModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Terima Pembayaran</h2>
                            <button onClick={() => setPayModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); payMutation.mutate(); }} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                                <p className="text-sm font-bold text-slate-900">{payModal.student?.user?.name}</p>
                                <p className="text-xs text-slate-500">Sisa Tagihan: {formatCurrency(payModal.amount - payModal.paid_amount)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Dibayar (Rp)</label>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-lg font-semibold" required min="1" />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setPayModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">Batal</button>
                                <button type="submit" disabled={payMutation.isPending} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">Simpan {payMutation.isPending && '...'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {expenseModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-red-100 flex justify-between items-center bg-red-50">
                            <h2 className="text-lg font-bold text-red-800">Catat Pengeluaran Kegiatan</h2>
                            <button onClick={() => setExpenseModal(false)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); expenseMutation.mutate(); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rincian / Uraian Pengeluaran</label>
                                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" required placeholder="Cth: Sewa Bus, Konsumsi Panitia, dll" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Keluar (Rp)</label>
                                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-semibold text-lg" required min="1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5"><Upload size={14} /> URL Bukti / Arsip (opsional)</label>
                                <input type="url" value={expenseForm.receipt_image} onChange={e => setExpenseForm({ ...expenseForm, receipt_image: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="https://drive.google.com/..." />
                            </div>
                            <p className="text-xs text-slate-500">Dana akan langsung memotong saldo kas kegiatan ini, bukan Kas Umum.</p>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setExpenseModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">Batal</button>
                                <button type="submit" disabled={expenseMutation.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">Simpan Pengeluaran</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <PrintOptionsModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onConfirm={handleConfirmPrint}
                title="Cetak Kwitansi Kegiatan"
            />
        </div>
    );
};

export default ActivityDetail;
