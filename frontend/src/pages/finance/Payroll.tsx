import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Search, Building2, Banknote } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { generatePayrollReceipt } from '../../utils/pdfUtils';
import { toast } from 'react-hot-toast';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';
import { PayrollTableDesktop } from '../../components/finance/Payroll/PayrollTableDesktop';
import { PayrollCardMobile } from '../../components/finance/Payroll/PayrollCardMobile';
import { PayrollFormModal } from '../../components/finance/Payroll/PayrollFormModal';
import { PayrollTemplateModal } from '../../components/finance/Payroll/PayrollTemplateModal';
import { UserData, PayrollRecord, PayrollTemplate } from '../../components/finance/Payroll/types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
};

const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('id-ID', { month: 'long' });
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

    // Print Options
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [payrollToPrint, setPayrollToPrint] = useState<PayrollRecord | null>(null);

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

    const handleSavePayroll = async (formData: any) => {
        try {
            const payload = {
                ...formData,
                period_month: filterMonth,
                period_year: filterYear
            };

            if (editingPayroll) {
                await api.put(`/finance/payroll/${editingPayroll.id}`, payload);
                if (payload.status === 'Paid' && editingPayroll.status !== 'Paid') {
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
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus slip gaji ini?')) return;
        try {
            await api.delete(`/finance/payroll/${id}`);
            toast.success("Slip gaji dihapus!");
            fetchPayrolls();
        } catch (error: any) {
            console.error(error);
        }
    };

    const handlePay = async (id: string) => {
        if (!window.confirm('Verifikasi status menjadi LUNAS? Tindakan ini akan otomatis mencatat pengeluaran di Buku Kas.')) return;
        try {
            await api.post(`/finance/payroll/${id}/pay`);
            toast.success("Gaji berhasil dilunasi dan tercatat sebagai pengeluaran otomatis.");
            fetchPayrolls();
        } catch (error: any) {
            console.error(error);
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

    const onSaveTemplate = async (data: { user_id: string } & Record<string, any>) => {
        try {
            await api.post('/finance/payroll/templates', data);
            toast.success("Template gaji berhasil disimpan");
            fetchTemplates();
        } catch (error: any) {
            console.error(error);
        }
    };

    // Filter payrolls by search query
    const filteredPayrolls = useMemo(() => {
        if (!searchQuery.trim()) return payrolls;
        const q = searchQuery.toLowerCase();
        return payrolls.filter((p: PayrollRecord) => 
            (p.employee_name && p.employee_name.toLowerCase().includes(q)) || 
            (p.user?.name && p.user.name.toLowerCase().includes(q))
        );
    }, [payrolls, searchQuery]);

    const totalPayrollPaid = useMemo(() => {
        return payrolls.filter((p: PayrollRecord) => p.status === 'Paid').reduce((acc: number, curr: PayrollRecord) => acc + curr.net_salary, 0);
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
                            onClick={() => { setEditingPayroll(null); setShowModal(true); }}
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
                        onEdit={(p: PayrollRecord) => { setEditingPayroll(p); setShowModal(true); }}
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
                            filteredPayrolls.map((p: PayrollRecord) => (
                                <PayrollCardMobile 
                                    key={p.id} 
                                    payroll={p} 
                                    canManage={canManage}
                                    onEdit={(p: PayrollRecord) => { setEditingPayroll(p); setShowModal(true); }}
                                    onDelete={handleDelete}
                                    onPay={handlePay}
                                    onPrint={handlePrintClick}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Modals from new components */}
            <PayrollFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                editingPayroll={editingPayroll}
                users={users}
                templates={templates}
                onSubmit={handleSavePayroll}
            />
            <PayrollTemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                users={users}
                templates={templates}
                onSaveTemplate={onSaveTemplate}
            />
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
