import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, DollarSign, Edit, Trash2, Filter, GraduationCap, Eye, ShieldCheck, X, Image, Tag, Download, Settings, PieChart, Wallet, CreditCard, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { generateBillReceipt } from '../../utils/pdfUtils';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';

interface Student {
    id: string;
    class_id: number;
    class?: {
        id: number;
        name: string;
    };
    user: {
        name: string;
    };
}

interface ClassData {
    id: number;
    name: string;
    unit_id: number;
}

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
}

interface Payment {
    id: string;
    amount: number;
    payment_method: string;
    status: string;
    proof_url?: string;
    paid_at: string;
}

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    bill_type: string;
    academic_year_id?: number;
    transaction_code_id?: number;
    student_id: number;
    is_installment?: boolean;
    student: {
        user: {
            name: string;
        };
        class?: {
            name: string;
        };
        class_id?: number;
    };
    payments?: Payment[];
}

interface TransactionCode {
    id: number;
    code: string;
    name: string;
    type: string;
    category: string;
    is_active: boolean;
}

interface BillFormData {
    student_id: string;
    title: string;
    amount: string;
    due_date: string;
    bill_type: string;
    academic_year_id: string;
    transaction_code_id: string;
    is_installment: boolean;
}

// Determine default unit_id based on role
function getDefaultUnitID(roleId?: number, unitId?: number, defaultId?: number): number {
    if (unitId) return unitId;
    if (roleId === 2) return 1;
    if (roleId === 3) return 2;
    return defaultId || 1;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const getRemainingAmount = (bill: Bill) => {
    if (bill.status === 'Paid') return 0;
    const totalPaid = (bill.payments || []).reduce((sum, p) => p.status === 'Success' ? sum + p.amount : sum, 0);
    return bill.amount - totalPaid;
};

const hasPendingTransfer = (bill: Bill) => {
    const transferPayment = bill.payments?.find(p => p.payment_method === 'Transfer' && p.proof_url && p.status !== 'Success');
    return !!transferPayment;
};

const Finance: React.FC = () => {
    const { user } = useAuth();
    const { units, defaultUnitId } = useUnits();
    const [unitID, setUnitID] = useState(getDefaultUnitID(user?.role_id, user?.unit_id, defaultUnitId));
    const queryClient = useQueryClient();
    
    // UI States
    const [showForm, setShowForm] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Filters
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterClass, setFilterClass] = useState<string>('');

    // Payment proof viewer
    const [showProofModal, setShowProofModal] = useState(false);
    const [proofUrl, setProofUrl] = useState('');
    const [proofBill, setProofBill] = useState<Bill | null>(null);

    // Admin Payment Modal
    const [showAdminPayModal, setShowAdminPayModal] = useState(false);
    const [selectedPayBill, setSelectedPayBill] = useState<Bill | null>(null);
    const [adminPaymentAmount, setAdminPaymentAmount] = useState<number>(0);
    const [adminPaymentMethod, setAdminPaymentMethod] = useState<'Cash' | 'Transfer'>('Cash');

    // Template Management Modal
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ template_name: '', title: '', amount: '', bill_type: '', transaction_code_id: '', is_installment: false });

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printBill, setPrintBill] = useState<Bill | null>(null);

    const [formData, setFormData] = useState<BillFormData>({
        student_id: '', title: '', amount: '', due_date: '', bill_type: '', academic_year_id: '', transaction_code_id: '', is_installment: false,
    });

    const { data: bills, isLoading } = useQuery({
        queryKey: ['bills', unitID],
        queryFn: async () => {
            const res = await api.get(`/finance/bills?unit_id=${unitID}`);
            return res.data;
        },
        enabled: !!unitID,
    });

    const { data: academicYears } = useQuery({
        queryKey: ['academic-years'],
        queryFn: async () => (await api.get('/finance/academic-years')).data,
    });

    const { data: students } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => (await api.get(`/students/?unit_id=${unitID}`)).data,
        enabled: showForm,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes', unitID],
        queryFn: async () => (await api.get(`/academic/classes?unit_id=${unitID}`)).data,
    });

    const { data: transactionCodes = [] } = useQuery<TransactionCode[]>({
        queryKey: ['transaction-codes'],
        queryFn: async () => (await api.get('/finance/transaction-codes')).data,
    });

    const { data: savedTemplates = [] } = useQuery({
        queryKey: ['bill-templates', unitID],
        queryFn: async () => (await api.get(`/finance/templates?unit_id=${unitID}`)).data,
    });

    // Mutations
    const createBillMutation = useMutation({
        mutationFn: (data: BillFormData) => api.post('/finance/bills', {
            ...data, amount: Number(data.amount), academic_year_id: data.academic_year_id ? parseInt(data.academic_year_id) : null,
            transaction_code_id: data.transaction_code_id ? Number(data.transaction_code_id) : null,
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bills'] }); handleCloseModal(); toast.success('Tagihan berhasil dibuat'); },
    });

    const updateBillMutation = useMutation({
        mutationFn: (data: any) => api.put(`/finance/bills/${editingBill?.id}`, {
            ...data, amount: Number(data.amount), academic_year_id: data.academic_year_id ? parseInt(data.academic_year_id) : null,
            transaction_code_id: data.transaction_code_id ? Number(data.transaction_code_id) : null,
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bills'] }); handleCloseModal(); toast.success('Tagihan berhasil diperbarui'); },
    });

    const deleteBillMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/finance/bills/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bills'] }); toast.success('Tagihan berhasil dihapus'); },
    });

    const recordPaymentMutation = useMutation({
        mutationFn: (data: { bill_id: string, amount: number, method: string }) => api.post('/finance/payments', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bills'] }); toast.success('Pembayaran dicatat'); setShowAdminPayModal(false); },
    });

    const createTemplateMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/templates', { ...data, amount: Number(data.amount), unit_id: unitID }),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['bill-templates'] }); 
            toast.success('Template ditambahkan'); 
            setNewTemplate({ template_name: '', title: '', amount: '', bill_type: '', transaction_code_id: '', is_installment: false }); 
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/finance/templates/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bill-templates'] }); toast.success('Template dihapus'); },
    });

    // Handlers
    const handleLoadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tempId = e.target.value;
        setSelectedTemplateId(tempId);
        if (!tempId) return;
        const t = savedTemplates.find((x: any) => x.id.toString() === tempId);
        if (t) {
            setFormData({
                ...formData, title: t.title, amount: t.amount.toString(), bill_type: t.bill_type,
                transaction_code_id: t.transaction_code_id ? t.transaction_code_id.toString() : '',
                is_installment: t.is_installment
            });
        }
    };

    const handleTransactionCodeChange = (codeId: string, isTemplate: boolean = false) => {
        const tc = transactionCodes.find(c => c.id === Number(codeId));
        if (isTemplate) {
            setNewTemplate({ ...newTemplate, transaction_code_id: codeId, bill_type: tc ? tc.name : newTemplate.bill_type });
        } else {
            setFormData({ ...formData, transaction_code_id: codeId, bill_type: tc ? tc.name : formData.bill_type });
        }
    };

    const handleDelete = (id: string) => {
        deleteBillMutation.mutate(id);
    };

    const handleCloseModal = () => {
        setShowForm(false);
        setEditingBill(null);
        setFormData({ student_id: '', title: '', amount: '', due_date: '', bill_type: '', academic_year_id: '', transaction_code_id: '', is_installment: false });
        setSelectedTemplateId('');
    };

    const handleEdit = (bill: Bill) => {
        setEditingBill(bill);
        setFormData({
            student_id: bill.student_id.toString(), title: bill.title, amount: bill.amount.toString(),
            due_date: new Date(bill.due_date).toISOString().split('T')[0], bill_type: bill.bill_type || '',
            academic_year_id: bill.academic_year_id ? bill.academic_year_id.toString() : '',
            transaction_code_id: bill.transaction_code_id ? String(bill.transaction_code_id) : '',
            is_installment: bill.is_installment || false,
        });
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBill) updateBillMutation.mutate(formData);
        else createBillMutation.mutate(formData);
    };

    const handleViewProof = (bill: Bill) => {
        const transferPayment = bill.payments?.find(p => p.payment_method === 'Transfer' && p.proof_url && p.status !== 'Success');
        setProofUrl(transferPayment?.proof_url || '');
        setProofBill(bill);
        setShowProofModal(true);
    };

    const openAdminPayModal = (bill: Bill, isVerify: boolean = false) => {
        setSelectedPayBill(bill);
        
        // If it's a verification, default amount to the pending transfer amount if we can find it
        let defaultAmt = getRemainingAmount(bill);
        if (isVerify && bill.payments) {
            const pendingTransfer = bill.payments.find(p => p.payment_method === 'Transfer' && p.proof_url && p.status !== 'Success');
            if (pendingTransfer) defaultAmt = pendingTransfer.amount;
        }

        setAdminPaymentAmount(defaultAmt);
        setAdminPaymentMethod(isVerify ? 'Transfer' : 'Cash');
        setShowAdminPayModal(true);
        if (showProofModal) setShowProofModal(false);
    };

    const handleConfirmPayment = () => {
        if (!selectedPayBill) return;
        if (adminPaymentAmount <= 0) {
            toast.error("Jumlah harus lebih besar dari 0");
            return;
        }
        recordPaymentMutation.mutate({
            bill_id: selectedPayBill.id,
            amount: adminPaymentAmount,
            method: adminPaymentMethod,
        });
    };

    const handlePrintReceipt = (bill: Bill) => {
        setPrintBill(bill);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[], format: 'A4' | 'A5') => {
        if (printBill) {
            try {
                await generateBillReceipt(printBill, selectedRoles, format);
                toast.success('Kuitansi berhasil diunduh');
            } catch (error) {
                console.error(error);
                toast.error('Gagal membuat kuitansi');
            }
        }
    };

    const filteredBills = bills?.filter((bill: Bill) => {
        const matchYear = filterYear ? bill.academic_year_id?.toString() === filterYear : true;
        const matchType = filterType ? bill.bill_type === filterType || (!bill.bill_type && filterType === 'SPP') : true;
        const matchClass = filterClass ? bill.student?.class_id?.toString() === filterClass : true;
        return matchYear && matchType && matchClass;
    });

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Keuangan & Invoices</h1>
                    <p className="text-slate-500">Manajemen tagihan dan rekam pembayaran siswa</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filters */}
                    <div className="flex items-center space-x-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1 hidden lg:flex">
                        <Filter size={16} className="text-slate-400 ml-2" />
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-1 pr-6">
                            <option value="">Semua Tahun</option>
                            {academicYears?.map((y: AcademicYear) => <option key={y.id} value={y.id}>{y.name}</option>)}
                        </select>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-1 pr-6">
                            <option value="">Semua Tagihan</option>
                            {transactionCodes.filter(tc => tc.is_active).map(tc => <option key={tc.id} value={tc.name}>[{tc.code}] {tc.name}</option>)}
                        </select>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-1 pr-6">
                            <option value="">Semua Kelas</option>
                            {classes?.map((c: ClassData) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {(user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3 || user?.role_id === 9) && (
                        <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                            {units.map(u => (
                                <button key={u.id} onClick={() => setUnitID(u.id)} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition", unitID === u.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50")}>{u.name}</button>
                            ))}
                        </div>
                    )}

                    <button onClick={() => setShowTemplateModal(true)} className="flex items-center space-x-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition shadow-sm">
                        <Settings size={16} />
                        <span className="hidden sm:inline">Kelola Template</span>
                    </button>

                    <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                        <Plus size={16} />
                        <span>Buat Tagihan</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-500">Loading data keuangan...</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-medium">Siswa</th>
                                    <th className="p-4 font-medium">Jenis Tagihan</th>
                                    <th className="p-4 font-medium text-right">Total (Rp)</th>
                                    <th className="p-4 font-medium text-right">Sisa (Rp)</th>
                                    <th className="p-4 font-medium text-center">Jatuh Tempo</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 font-medium text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBills?.map((bill: Bill) => {
                                    const remaining = getRemainingAmount(bill);
                                    let statusEl;
                                    if (hasPendingTransfer(bill)) {
                                        statusEl = <span className="px-2.5 py-1 inline-flex text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800 gap-1 items-center whitespace-nowrap"><Image size={12} /> Pending Transfer</span>;
                                    } else if (bill.status === 'Paid') {
                                        statusEl = <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Lunas</span>;
                                    } else if (bill.status === 'Partial') {
                                        statusEl = <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-amber-100 text-amber-800 whitespace-nowrap"><PieChart size={12} className="inline mr-1"/> Dicicil</span>;
                                    } else {
                                        statusEl = <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Belum Lunas</span>;
                                    }

                                    return (
                                        <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <span className="font-semibold text-slate-800">{bill.student?.user?.name}</span>
                                                {bill.student?.class?.name && (
                                                    <span className="block text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <GraduationCap size={12} /> {bill.student.class.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-800 font-medium">{bill.title}</span>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase">
                                                            {bill.bill_type || 'SPP'}
                                                        </span>
                                                        {bill.is_installment && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">Bisa Cicil</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-slate-500">{formatCurrency(bill.amount)}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-semibold text-slate-800">{remaining > 0 ? formatCurrency(remaining) : '-'}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-slate-500 text-sm whitespace-nowrap">{new Date(bill.due_date).toLocaleDateString('id-ID')}</span>
                                            </td>
                                            <td className="p-4 text-center">{statusEl}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1.5 items-center flex-wrap">
                                                    {['Paid', 'Partial'].includes(bill.status) && (
                                                        <button onClick={() => handlePrintReceipt(bill)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition tooltip border border-transparent hover:border-emerald-100" title="Cetak Kwitansi">
                                                            <Download size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {bill.status !== 'Paid' && (
                                                        hasPendingTransfer(bill) ? (
                                                            <>
                                                                <button onClick={() => handleViewProof(bill)} className="flex items-center text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition gap-1 whitespace-nowrap">
                                                                    <Eye size={12} /> Bukti
                                                                </button>
                                                                <button onClick={() => openAdminPayModal(bill, true)} className="flex items-center text-xs px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition gap-1 whitespace-nowrap">
                                                                    <ShieldCheck size={12} /> Verifikasi
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => openAdminPayModal(bill, false)} className="flex items-center text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition whitespace-nowrap">
                                                                    <DollarSign size={14} className="mr-0.5" /> Bayar
                                                                </button>
                                                                <button onClick={() => handleEdit(bill)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition hover:bg-indigo-50 rounded-lg">
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button onClick={() => setConfirmDelete(bill.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition hover:bg-red-50 rounded-lg">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredBills?.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">Tidak ada tagihan yang sesuai dengan filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create/Edit Bill Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">{editingBill ? "Edit Tagihan" : "Buat Tagihan Baru"}</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            {!editingBill && (
                                <div className="mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Muat dari Template (Opsional)</label>
                                    <select value={selectedTemplateId} onChange={handleLoadTemplate} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white">
                                        <option value="">-- Buat Manual --</option>
                                        {savedTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.template_name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1"><span className="flex items-center gap-1.5"><Tag size={14} className="text-green-500" /> Kode Transaksi</span></label>
                                    <select value={formData.transaction_code_id} onChange={(e) => handleTransactionCodeChange(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500" required>
                                        <option value="">-- Pilih Kode Transaksi --</option>
                                        {transactionCodes.filter(tc => tc.is_active).map(tc => <option key={tc.id} value={tc.id}>[{tc.code}] {tc.name} ({tc.type})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                                    <select value={formData.academic_year_id} onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500">
                                        <option value="">-- Pilih Jika Perlu --</option>
                                        {academicYears?.map((year: AcademicYear) => <option key={year.id} value={year.id}>{year.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Siswa</label>
                                <select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500" required>
                                    <option value="">Pilih Siswa</option>
                                    {students?.map((s: Student) => <option key={s.id} value={s.id}>{s.user.name}{s.class ? ` (${s.class.name})` : ''}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Judul Tagihan</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500" placeholder="Contoh: SPP Juli" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                    <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500" placeholder="0" min="0" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Batas Pembayaran (Jatuh Tempo)</label>
                                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500" required />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <input type="checkbox" id="is_installment_fin" checked={formData.is_installment} onChange={e => setFormData({ ...formData, is_installment: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="is_installment_fin" className="text-sm text-slate-700">
                                    <span className="font-medium">Boleh Dicicil</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">Siswa dapat membayar sebagian.</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition">Batal</button>
                                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition">Simpan Tagihan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Template Management Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold flex items-center text-slate-800"><Settings className="mr-2" size={20} /> Kelola Template Tagihan</h2>
                            <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 md:flex gap-6">
                            {/* Create New Template */}
                            <div className="w-full md:w-1/2 mb-6 md:mb-0 border-r border-slate-100 pr-0 md:pr-6">
                                <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Buat Template Baru</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Nama Template (Internal)</label>
                                        <input type="text" value={newTemplate.template_name} onChange={e => setNewTemplate({...newTemplate, template_name: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Template SPP 1 Bulan" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Judul Tagihan</label>
                                        <input type="text" value={newTemplate.title} onChange={e => setNewTemplate({...newTemplate, title: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="SPP Bulan [Ganti Nanti]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                                        <input type="number" value={newTemplate.amount} onChange={e => setNewTemplate({...newTemplate, amount: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Kode Transaksi</label>
                                        <select value={newTemplate.transaction_code_id} onChange={(e) => handleTransactionCodeChange(e.target.value, true)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- Pilih Kode Transaksi --</option>
                                            {transactionCodes.filter(tc => tc.is_active).map(tc => <option key={tc.id} value={tc.id}>[{tc.code}] {tc.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={newTemplate.is_installment} onChange={e => setNewTemplate({...newTemplate, is_installment: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                                        <span className="text-sm text-slate-700">Dapat Dicicil</span>
                                    </div>
                                    <button 
                                        onClick={() => createTemplateMutation.mutate(newTemplate)}
                                        disabled={!newTemplate.template_name || !newTemplate.title || !newTemplate.amount || !newTemplate.transaction_code_id}
                                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300"
                                    >
                                        Simpan Template
                                    </button>
                                </div>
                            </div>
                            
                            {/* Saved Templates List */}
                            <div className="w-full md:w-1/2">
                                <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Template Tersimpan</h3>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                                    {savedTemplates.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">Belum ada template.</p>
                                    ) : (
                                        savedTemplates.map((t: any) => (
                                            <div key={t.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{t.template_name}</p>
                                                    <p className="text-xs text-slate-500">{t.title} - {formatCurrency(t.amount)}</p>
                                                </div>
                                                <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="text-slate-400 hover:text-red-500 p-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Pay/Verify Modal */}
            {showAdminPayModal && selectedPayBill && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <h2 className="text-lg font-bold flex items-center text-slate-800">
                                <ShieldCheck className="text-indigo-600 mr-2" size={22} /> Catat/Verifikasi Pembayaran
                            </h2>
                            <button onClick={() => setShowAdminPayModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-sm text-slate-500">{selectedPayBill.student.user.name}</p>
                                <p className="font-semibold text-slate-800">{selectedPayBill.title}</p>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs font-medium text-slate-500">Sisa Tagihan:</p>
                                    <p className="text-xl font-bold text-slate-800">{formatCurrency(getRemainingAmount(selectedPayBill))}</p>
                                </div>
                            </div>
                            
                            {/* Riwayat Pembayaran */}
                            {selectedPayBill.payments && selectedPayBill.payments.length > 0 && (
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Riwayat Pembayaran</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        {selectedPayBill.payments.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                                                <div>
                                                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-medium", 
                                                        p.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                    )}>{p.status}</span>
                                                    <span className="text-xs text-slate-500 ml-2">{p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-'}</span>
                                                </div>
                                                <span className="font-semibold text-slate-700">{formatCurrency(p.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Metode</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button type="button" onClick={() => setAdminPaymentMethod('Cash')} className={clsx("flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5", adminPaymentMethod === 'Cash' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>
                                        <Wallet size={14} /> Tunai
                                    </button>
                                    <button type="button" onClick={() => setAdminPaymentMethod('Transfer')} className={clsx("flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5", adminPaymentMethod === 'Transfer' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}>
                                        <CreditCard size={14} /> Transfer Bank
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nominal Diterima (Rp)</label>
                                {selectedPayBill.is_installment ? (
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                                        <input
                                            type="number"
                                            value={adminPaymentAmount}
                                            onChange={(e) => setAdminPaymentAmount(Number(e.target.value))}
                                            max={getRemainingAmount(selectedPayBill)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                                        />
                                        <p className="text-xs text-blue-600 mt-1">Tagihan ini mengizinkan cicilan.</p>
                                    </div>
                                ) : (
                                    <div className="px-4 py-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-800 font-bold text-lg">
                                        {formatCurrency(adminPaymentAmount)}
                                        <span className="block text-xs text-red-500 mt-1 font-normal">* Tidak bisa dicicil</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={adminPaymentAmount <= 0 || adminPaymentAmount > getRemainingAmount(selectedPayBill)}
                                className={clsx("w-full py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2", 
                                    (adminPaymentAmount <= 0 || adminPaymentAmount > getRemainingAmount(selectedPayBill)) ? "bg-slate-300" : "bg-indigo-600 hover:bg-indigo-700")}
                            >
                                <Send size={16} /> Simpan Pembayaran
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Proof Viewer Modal */}
            {showProofModal && proofBill && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50">
                            <h2 className="text-lg font-bold flex items-center text-slate-800"><Image className="text-blue-600 mr-2" size={22} /> Bukti Transfer (Review)</h2>
                            <button onClick={() => setShowProofModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {proofUrl ? (
                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh]">
                                    <img src={proofUrl} alt="Bukti Pembayaran" className="w-full object-contain bg-slate-100" />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500"><Image size={40} className="mx-auto text-slate-300 mb-3" /><p>Gambar tidak diproses</p></div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => openAdminPayModal(proofBill, true)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                                    <ShieldCheck size={16} /> Lanjut Verifikasi Nominal
                                </button>
                                <button onClick={() => setShowProofModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }}
                title="Hapus Tagihan"
                message="Yakin ingin menghapus tagihan ini? Tindakan ini tidak bisa dibatalkan."
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

export default Finance;
