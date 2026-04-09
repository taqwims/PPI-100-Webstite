import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Printer, Search, Building2, Banknote, CheckCircle, Pencil, Trash2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { exportToCSV } from '../../utils/exportUtils';
import { generatePayrollReceipt } from '../../utils/pdfUtils';
import { toast } from 'react-hot-toast';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';

interface UserData {
    id: string;
    name: string;
    email: string;
    role_id: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_holder?: string;
}

interface PayrollTemplate {
    id: string;
    user_id: string;
    base_salary: number;
    functional_allowance: number;
    transport_allowance: number;
    additional_task: number;
}

interface PayrollRecord {
    id: string;
    user_id: string;
    user: UserData;
    employee_name: string;
    employee_nik: string;
    position: string;
    period_month: number;
    period_year: number;
    base_salary: number;
    functional_allowance: number;
    transport_allowance: number;
    additional_task: number;
    total_income: number;
    lateness_penalty: number;
    infaq_deduction: number;
    cash_advance: number;
    total_deduction: number;
    net_salary: number;
    notes: string;
    status: string;
    paid_at?: string;
    payment_method: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('id-ID', { month: 'long' });
};

const PayrollTableDesktop = ({ payrolls, canManage, onEdit, onDelete, onPay, onPrint }: any) => {
    return (
        <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>NO</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>NAMA</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>NIK / NIP</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>JABATAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" colSpan={4}>PENDAPATAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center bg-gray-100" rowSpan={2}>JML PENDAPATAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" colSpan={3}>POTONGAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center bg-gray-100" rowSpan={2}>JML POTONGAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center bg-emerald-50 text-emerald-700" rowSpan={2}>GAJI BERSIH</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>KET.</th>
                        {canManage && <th className="p-3 font-semibold text-center" rowSpan={2}>AKSI</th>}
                    </tr>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                        {/* Pendapatan */}
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Gaji Pokok</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Tunj. Fungsional</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Tunj. Transport</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Tugas Tambahan</th>
                        {/* Potongan */}
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Keterlambatan</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Infaq</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Kasbon</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {payrolls.map((p: PayrollRecord, i: number) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 border-r border-slate-100 text-center">{i + 1}</td>
                            <td className="p-3 border-r border-slate-100 font-medium text-slate-800">{p.employee_name || p.user?.name}</td>
                            <td className="p-3 border-r border-slate-100 text-slate-600">{p.employee_nik}</td>
                            <td className="p-3 border-r border-slate-100 text-slate-600">{p.position}</td>
                            
                            {/* Pendapatan */}
                            <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.base_salary)}</td>
                            <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.functional_allowance)}</td>
                            <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.transport_allowance)}</td>
                            <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.additional_task)}</td>
                            <td className="p-3 border-r border-slate-100 text-right font-semibold bg-gray-50">{formatCurrency(p.total_income)}</td>
                            
                            {/* Potongan */}
                            <td className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(p.lateness_penalty)}</td>
                            <td className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(p.infaq_deduction)}</td>
                            <td className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(p.cash_advance)}</td>
                            <td className="p-3 border-r border-slate-100 text-right font-semibold text-red-600 bg-gray-50">{formatCurrency(p.total_deduction)}</td>
                            
                            <td className="p-3 border-r border-slate-100 text-right font-bold text-emerald-700 bg-emerald-50/30">{formatCurrency(p.net_salary)}</td>
                            <td className="p-3 border-r border-slate-100 text-slate-500 text-xs text-center">
                                {p.status === 'Paid' ? <span className="text-emerald-600 font-medium">Lunas</span> : <span className="text-amber-600 font-medium">Draft</span>}
                            </td>
                            
                            {canManage && (
                                <td className="p-3 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <button onClick={() => onPrint(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Cetak Slip">
                                            <Printer size={16} />
                                        </button>
                                        <button onClick={() => onEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => onDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                        {p.status !== 'Paid' && (
                                            <button onClick={() => onPay(p.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Bayar">
                                                <CheckCircle size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                    {payrolls.length === 0 && (
                        <tr>
                            <td colSpan={canManage ? 16 : 15} className="p-8 text-center text-slate-500">
                                Tidak ada data penggajian untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const PayrollCardMobile = ({ payroll, canManage, onEdit, onDelete, onPay, onPrint }: any) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="md:hidden bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-slate-800">{payroll.employee_name || payroll.user?.name}</h3>
                        <p className="text-xs text-slate-500">{payroll.position} • {payroll.employee_nik}</p>
                    </div>
                    <span className={clsx(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        payroll.status === 'Paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                        {payroll.status === 'Paid' ? 'Lunas' : 'Draft'}
                    </span>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Gaji Bersih</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(payroll.net_salary)}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : '' }}>
                        <ChevronDown size={18} />
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                    <div className="space-y-4">
                        {/* Pendapatan Section */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pendapatan</p>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-600">Gaji Pokok</span><span className="font-medium">{formatCurrency(payroll.base_salary)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Tunj. Fungsional</span><span className="font-medium">{formatCurrency(payroll.functional_allowance)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Tunj. Transport</span><span className="font-medium">{formatCurrency(payroll.transport_allowance)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Tugas Tambahan</span><span className="font-medium">{formatCurrency(payroll.additional_task)}</span></div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 mt-1"><span className="font-semibold text-slate-800">Total Pendapatan</span><span className="font-bold text-slate-800">{formatCurrency(payroll.total_income)}</span></div>
                            </div>
                        </div>

                        {/* Potongan Section */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Potongan</p>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-600">Keterlambatan</span><span className="text-red-500 font-medium">-{formatCurrency(payroll.lateness_penalty)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Infaq</span><span className="text-red-500 font-medium">-{formatCurrency(payroll.infaq_deduction)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Kasbon</span><span className="text-red-500 font-medium">-{formatCurrency(payroll.cash_advance)}</span></div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 mt-1"><span className="font-semibold text-slate-800">Total Potongan</span><span className="font-bold text-red-600">-{formatCurrency(payroll.total_deduction)}</span></div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200">
                            {payroll.notes && <p className="text-xs text-slate-500 italic mb-3">Catatan: {payroll.notes}</p>}
                            
                            {canManage && (
                                <div className="flex space-x-2">
                                    <button onClick={() => onPrint(payroll)} className="flex-1 bg-white border border-slate-200 text-indigo-600 py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                                        <Printer size={14} className="mr-1.5" /> Cetak
                                    </button>
                                    <button onClick={() => onEdit(payroll)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                                        <Pencil size={14} className="mr-1.5" /> Edit
                                    </button>
                                    {payroll.status !== 'Paid' && (
                                        <button onClick={() => onPay(payroll.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                                            <CheckCircle size={14} className="mr-1.5" /> Bayar
                                        </button>
                                    )}
                                    <button onClick={() => onDelete(payroll.id)} className="w-10 bg-white border border-slate-200 text-red-500 rounded-lg flex justify-center items-center">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const Payroll = () => {
    const { user } = useAuth();
    const canManage = [1, 9].includes(user?.role_id || 0);

    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [templates, setTemplates] = useState<PayrollTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Print Options
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [payrollToPrint, setPayrollToPrint] = useState<PayrollRecord | null>(null);

    const initialFormState = {
        user_id: '', employee_name: '', employee_nik: '', position: '',
        base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0,
        lateness_penalty: 0, infaq_deduction: 0, cash_advance: 0, notes: '',
        status: 'Draft', payment_method: 'Transfer', bank_name: '', bank_account_number: '', bank_account_holder: ''
    };
    
    const [formData, setFormData] = useState(initialFormState);

    // Template Form State
    const [templateUser, setTemplateUser] = useState('');
    const [templateForm, setTemplateForm] = useState({
        base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0
    });
    const [savingTemplate, setSavingTemplate] = useState(false);

    useEffect(() => {
        fetchPayrolls();
        if (canManage && users.length === 0) {
            fetchUsers();
            fetchTemplates();
        }
    }, [filterMonth, filterYear, canManage]);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/payroll?month=${filterMonth}&year=${filterYear}`);
            setPayrolls(res.data);
        } catch (error) {
            console.error("Failed to fetch payrolls", error);
            toast.error("Gagal memuat data gaji");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users/');
            setUsers(res.data.filter((u: UserData) => ![6, 7].includes(u.role_id)));
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/finance/payroll/templates');
            setTemplates(res.data || []);
        } catch (error) {
            console.error("Failed to fetch templates", error);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
            const numVal = parseFloat(value);
            setFormData(prev => ({ ...prev, [name]: isNaN(numVal) ? 0 : numVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Auto-fill details if user changes
        if (name === 'user_id' && value) {
            const selectedUser = users.find(u => u.id === value);
            const userTemplate = templates.find(t => t.user_id === value);
            if (selectedUser) {
                setFormData(prev => ({
                    ...prev,
                    employee_name: selectedUser.name,
                    bank_name: selectedUser.bank_name || '',
                    bank_account_number: selectedUser.bank_account_number || '',
                    bank_account_holder: selectedUser.bank_account_holder || '',
                    payment_method: (selectedUser.bank_account_number || selectedUser.bank_name) ? 'Transfer' : 'Cash',
                    // Auto-fill from template if available
                    base_salary: userTemplate?.base_salary || 0,
                    functional_allowance: userTemplate?.functional_allowance || 0,
                    transport_allowance: userTemplate?.transport_allowance || 0,
                    additional_task: userTemplate?.additional_task || 0
                }));
            }
        }
    };

    // Real-time calculation for form
    const formIncome = (formData.base_salary || 0) + (formData.functional_allowance || 0) + (formData.transport_allowance || 0) + (formData.additional_task || 0);
    const formDeduction = (formData.lateness_penalty || 0) + (formData.infaq_deduction || 0) + (formData.cash_advance || 0);
    const formNet = formIncome - formDeduction;

    const openCreateModal = () => {
        setEditingPayroll(null);
        setFormData(initialFormState);
        setShowModal(true);
    };

    const openEditModal = (payroll: PayrollRecord) => {
        setEditingPayroll(payroll);
        setFormData({
            user_id: payroll.user_id,
            employee_name: payroll.employee_name || '',
            employee_nik: payroll.employee_nik || '',
            position: payroll.position || '',
            base_salary: payroll.base_salary || 0,
            functional_allowance: payroll.functional_allowance || 0,
            transport_allowance: payroll.transport_allowance || 0,
            additional_task: payroll.additional_task || 0,
            lateness_penalty: payroll.lateness_penalty || 0,
            infaq_deduction: payroll.infaq_deduction || 0,
            cash_advance: payroll.cash_advance || 0,
            notes: payroll.notes || '',
            status: payroll.status || 'Draft',
            payment_method: payroll.payment_method || 'Transfer',
            bank_name: payroll.bank_name || '',
            bank_account_number: payroll.bank_account_number || '',
            bank_account_holder: payroll.bank_account_holder || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                period_month: filterMonth,
                period_year: filterYear
            };

            if (editingPayroll) {
                await api.put(`/finance/payroll/${editingPayroll.id}`, payload);
                if (payload.status === 'Paid' && editingPayroll.status !== 'Paid') {
                    // Automatically trigger payment API to sync logic (like recording expense)
                    await api.post(`/finance/payroll/${editingPayroll.id}/pay`);
                }
                toast.success("Perubahan data gaji berhasil disimpan");
            } else {
                const res = await api.post('/finance/payroll', payload);
                if (payload.status === 'Paid') {
                    await api.post(`/finance/payroll/${res.data.id}/pay`);
                }
                toast.success("Slip gaji untuk pekerja baru berhasil dibuat");
            }

            setShowModal(false);
            fetchPayrolls();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal menyimpan slip gaji");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus slip gaji ini?')) return;
        try {
            await api.delete(`/finance/payroll/${id}`);
            toast.success("Slip gaji dihapus!");
            fetchPayrolls();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal menghapus slip gaji");
        }
    };

    const handlePay = async (id: string) => {
        if (!window.confirm('Verifikasi status menjadi LUNAS? Tindakan ini akan otomatis mencatat pengeluaran di Buku Kas.')) return;
        try {
            await api.post(`/finance/payroll/${id}/pay`);
            toast.success("Gaji berhasil dilunasi dan tercatat sebagai pengeluaran otomatis.");
            fetchPayrolls();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal menandai lunas");
        }
    };

    const handlePrintClick = (p: PayrollRecord) => {
        setPayrollToPrint(p);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[]) => {
        if (payrollToPrint) {
            await generatePayrollReceipt(payrollToPrint, selectedRoles);
        }
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateUser) return toast.error("Pilih pengguna terlebih dahulu");
        
        setSavingTemplate(true);
        try {
            await api.post('/finance/payroll/templates', {
                user_id: templateUser,
                ...templateForm
            });
            toast.success("Template gaji berhasil disimpan");
            fetchTemplates();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal menyimpan template");
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleTemplateUserChange = (userId: string) => {
        setTemplateUser(userId);
        const existingTemplate = templates.find(t => t.user_id === userId);
        if (existingTemplate) {
            setTemplateForm({
                base_salary: existingTemplate.base_salary,
                functional_allowance: existingTemplate.functional_allowance,
                transport_allowance: existingTemplate.transport_allowance,
                additional_task: existingTemplate.additional_task
            });
        } else {
            setTemplateForm({ base_salary: 0, functional_allowance: 0, transport_allowance: 0, additional_task: 0 });
        }
    };

    // Filter payrolls by search query
    const filteredPayrolls = useMemo(() => {
        if (!searchQuery.trim()) return payrolls;
        const q = searchQuery.toLowerCase();
        return payrolls.filter(p => 
            (p.employee_name && p.employee_name.toLowerCase().includes(q)) || 
            (p.user?.name && p.user.name.toLowerCase().includes(q))
        );
    }, [payrolls, searchQuery]);

    const totalPayrollPaid = useMemo(() => {
        return payrolls.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + curr.net_salary, 0);
    }, [payrolls]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {canManage ? 'Data Penggajian' : 'Slip Gaji Saya'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Skema penggajian terperinci dengan komponen pendapatan dan potongan.
                    </p>
                </div>

                {canManage && (
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="hidden md:flex items-center space-x-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 shadow-sm transition"
                        >
                            <Building2 size={18} />
                            <span>Template Gaji</span>
                        </button>
                        <button
                            onClick={() => exportToCSV(filteredPayrolls, `Data_Gaji_${filterMonth}_${filterYear}`)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 shadow-sm transition"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-sm transition"
                        >
                            <Plus size={18} />
                            <span>Input Gaji</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button 
                            onClick={() => {
                                let m = filterMonth - 1; let y = filterYear;
                                if (m < 1) { m = 12; y--; }
                                setFilterMonth(m); setFilterYear(y);
                            }}
                            className="p-1 px-2 text-slate-500 hover:text-slate-800 transition"
                        >
                            &larr;
                        </button>
                        <div className="px-3 font-semibold text-slate-800 min-w-[120px] text-center">
                            {getMonthName(filterMonth)} {filterYear}
                        </div>
                        <button 
                            onClick={() => {
                                let m = filterMonth + 1; let y = filterYear;
                                if (m > 12) { m = 1; y++; }
                                setFilterMonth(m); setFilterYear(y);
                            }}
                            className="p-1 px-2 text-slate-500 hover:text-slate-800 transition"
                        >
                            &rarr;
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama pegawai..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                </div>
            </div>

            {canManage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-sm text-white flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium mb-1">Total Lunas Bulan {getMonthName(filterMonth)}</p>
                            <h2 className="text-3xl font-bold">{formatCurrency(totalPayrollPaid)}</h2>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Banknote size={24} className="text-white" />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Jumlah Data Gaji</p>
                            <h2 className="text-3xl font-bold text-slate-800">{payrolls.length} Pegawai</h2>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Building2 size={24} />
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <>
                    {/* Desktop View Table */}
                    <PayrollTableDesktop 
                        payrolls={filteredPayrolls} 
                        canManage={canManage}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        onPay={handlePay}
                        onPrint={handlePrintClick}
                    />

                    {/* Mobile View Cards */}
                    <div className="md:hidden">
                        {filteredPayrolls.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                                <p className="text-slate-500">Tidak ada data penggajian untuk periode ini.</p>
                            </div>
                        ) : (
                            filteredPayrolls.map(p => (
                                <PayrollCardMobile 
                                    key={p.id} 
                                    payroll={p} 
                                    canManage={canManage}
                                    onEdit={openEditModal}
                                    onDelete={handleDelete}
                                    onPay={handlePay}
                                    onPrint={handlePrintClick}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h2 className="text-xl font-bold flex items-center text-slate-800">
                                <Banknote className="text-emerald-600 mr-2" size={24} /> 
                                {editingPayroll ? 'Edit Penggajian' : 'Input Gaji Baru'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition">✕</button>
                        </div>

                        <div className="overflow-y-auto p-6 grow">
                            <form id="payrollForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-semibold text-slate-700">Akun Pegawai (Sistem)</label>
                                        <div className="flex gap-2">
                                            <select
                                                name="user_id"
                                                required
                                                value={formData.user_id}
                                                onChange={handleInput}
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                                            >
                                                <option value="">-- Pilih --</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                            {formData.user_id && (
                                                <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col justify-center min-w-[120px]">
                                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Est. Gaji</span>
                                                    <span className="text-sm font-bold text-emerald-700">{formatCurrency(formNet)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-semibold text-slate-700">Nama (Bisa disesuaikan)</label>
                                        <input
                                            type="text"
                                            name="employee_name"
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.employee_name}
                                            onChange={handleInput}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-semibold text-slate-700">NIK / NIP</label>
                                        <input
                                            type="text"
                                            name="employee_nik"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.employee_nik}
                                            onChange={handleInput}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-semibold text-slate-700">Jabatan</label>
                                        <input
                                            type="text"
                                            name="position"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.position}
                                            onChange={handleInput}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* PENDAPATAN */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 border-b border-emerald-100 pb-2">Pendapatan</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center group">
                                                <label className="text-sm text-slate-600">Gaji Pokok</label>
                                                <input type="number" name="base_salary" value={formData.base_salary === 0 ? '' : formData.base_salary} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-600">Tunj. Fungsional</label>
                                                <input type="number" name="functional_allowance" value={formData.functional_allowance === 0 ? '' : formData.functional_allowance} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-600">Tunj. Transport</label>
                                                <input type="number" name="transport_allowance" value={formData.transport_allowance === 0 ? '' : formData.transport_allowance} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-600">Tugas Tambahan</label>
                                                <input type="number" name="additional_task" value={formData.additional_task === 0 ? '' : formData.additional_task} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-emerald-500 transition-all" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* POTONGAN */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-red-500 border-b border-red-100 pb-2">Potongan</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-600">Keterlambatan</label>
                                                <input type="number" name="lateness_penalty" value={formData.lateness_penalty === 0 ? '' : formData.lateness_penalty} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400 transition-all" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-600">Infaq</label>
                                                <input type="number" name="infaq_deduction" value={formData.infaq_deduction === 0 ? '' : formData.infaq_deduction} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400 transition-all" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-slate-600">Kasbon</label>
                                                <input type="number" name="cash_advance" value={formData.cash_advance === 0 ? '' : formData.cash_advance} placeholder="0" onChange={handleInput} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-red-400 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">Informasi Pembayaran</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="block text-sm font-semibold text-slate-700">Metode Pembayaran</label>
                                            <select
                                                name="payment_method"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                                                value={formData.payment_method}
                                                onChange={handleInput}
                                            >
                                                <option value="Transfer">Transfer Bank</option>
                                                <option value="Cash">Tunai (Cash)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {formData.payment_method === 'Transfer' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-slate-700">Nama Bank</label>
                                                <input
                                                    type="text"
                                                    name="bank_name"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    value={formData.bank_name}
                                                    onChange={handleInput}
                                                    placeholder="Contoh: BSI, Mandiri"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-slate-700">Atas Nama (Rekening)</label>
                                                <input
                                                    type="text"
                                                    name="bank_account_holder"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    value={formData.bank_account_holder}
                                                    onChange={handleInput}
                                                    placeholder="Nama pemilik rekening"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-slate-700">Nomor Rekening</label>
                                                <input
                                                    type="text"
                                                    name="bank_account_number"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    value={formData.bank_account_number}
                                                    onChange={handleInput}
                                                    placeholder="1234567890"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1 mt-2">
                                        <label className="block text-sm font-semibold text-slate-700">Catatan Lainnya</label>
                                        <input
                                            type="text"
                                            name="notes"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                                            value={formData.notes || ''}
                                            onChange={handleInput}
                                            placeholder="Opsional"
                                        />
                                    </div>
                                </div>
                                
                                {editingPayroll?.status !== 'Paid' && (
                                    <div className="space-y-1">
                                        <label className="block text-sm font-semibold text-slate-700">Ubah Status Pembayaran (Opsional)</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-xs space-x-1">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'Draft' })}
                                                className={clsx(
                                                    "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                    formData.status === 'Draft' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                Draft / Tertunda
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                                className={clsx(
                                                    "flex-1 py-1.5 text-sm font-medium rounded-lg transition",
                                                    formData.status === 'Paid' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                Lunas
                                            </button>
                                        </div>
                                        {formData.status === 'Paid' && (
                                            <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-50 p-2 rounded flex items-center">
                                                <CheckCircle size={14} className="mr-1" />
                                                Menyimpan status Lunas akan otomatis mencatat pengeluaran di Buku Kas.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>
                        
                        {/* Real-time Calculation Footer */}
                        <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                                    <div>
                                        <p className="text-slate-500">Pendapatan</p>
                                        <p className="font-semibold text-emerald-600">{formatCurrency(formIncome)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Potongan</p>
                                        <p className="font-semibold text-red-500">-{formatCurrency(formDeduction)}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 pt-2 md:pt-0 border-t md:border-none border-slate-200">
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Gaji Bersih</p>
                                        <p className="font-bold text-xl text-slate-900">{formatCurrency(formNet)}</p>
                                    </div>
                                </div>
                                <div className="flex w-full md:w-auto space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        form="payrollForm" // Link outer button to form
                                        disabled={submitting}
                                        className={clsx(
                                            "flex-1 md:flex-none px-8 py-2.5 rounded-xl text-white font-bold shadow-md transition flex justify-center items-center min-w-[140px]",
                                            "bg-emerald-600 hover:bg-emerald-700",
                                            submitting && "opacity-70 cursor-not-allowed"
                                        )}
                                    >
                                        {submitting ? 'Menyimpan...' : 'Simpan Data'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Template */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                            <h2 className="text-xl font-bold flex items-center text-indigo-900">
                                <Building2 className="text-indigo-600 mr-2" size={24} /> 
                                Kelola Template Gaji Pegawai
                            </h2>
                            <button onClick={() => setShowTemplateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-200 text-indigo-600 hover:bg-indigo-300 transition">✕</button>
                        </div>

                        <div className="overflow-y-auto p-6 grow">
                            <form id="templateForm" onSubmit={handleSaveTemplate} className="space-y-6">
                                <div className="space-y-1 block">
                                    <label className="block text-sm font-semibold text-slate-700">Pilih Pegawai</label>
                                    <select
                                        required
                                        value={templateUser}
                                        onChange={(e) => handleTemplateUserChange(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Pilih pegawai untuk mengatur template pendapatan bulanannya.</p>
                                </div>

                                {templateUser && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Template Pendapatan</h3>
                                                <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                                    <span className="text-xs text-indigo-500 font-medium mr-2">Subtotal:</span>
                                                    <span className="text-sm font-bold text-indigo-700">{formatCurrency(templateForm.base_salary + templateForm.functional_allowance + templateForm.transport_allowance + templateForm.additional_task)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center group">
                                                    <label className="text-sm text-slate-600">Gaji Pokok</label>
                                                    <input type="number" required value={templateForm.base_salary === 0 ? '' : templateForm.base_salary} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, base_salary: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm text-slate-600">Tunj. Fungsional</label>
                                                    <input type="number" required value={templateForm.functional_allowance === 0 ? '' : templateForm.functional_allowance} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, functional_allowance: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm text-slate-600">Tunj. Transport</label>
                                                    <input type="number" required value={templateForm.transport_allowance === 0 ? '' : templateForm.transport_allowance} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, transport_allowance: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm text-slate-600">Tugas Tambahan</label>
                                                    <input type="number" required value={templateForm.additional_task === 0 ? '' : templateForm.additional_task} placeholder="0" onChange={(e) => setTemplateForm({...templateForm, additional_task: parseFloat(e.target.value) || 0})} className="w-1/2 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                )}
                            </form>
                        </div>
                        
                        <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(false)}
                                className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
                            >
                                Tutup
                            </button>
                            <button
                                type="submit"
                                form="templateForm"
                                disabled={savingTemplate || !templateUser}
                                className={clsx(
                                    "px-8 py-2.5 rounded-xl text-white font-bold shadow-md transition flex justify-center items-center min-w-[140px]",
                                    "bg-indigo-600 hover:bg-indigo-700",
                                    (savingTemplate || !templateUser) && "opacity-70 cursor-not-allowed"
                                )}
                            >
                                {savingTemplate ? 'Menyimpan...' : 'Simpan Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PrintOptionsModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onConfirm={handleConfirmPrint}
                title="Cetak Slip Gaji Pegawai"
            />
        </div>
    );
};

export default Payroll;
