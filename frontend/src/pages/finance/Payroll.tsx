import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Download, Search, Building2, Banknote, CheckCircle2, Clock, Wallet, Send, AlertCircle, ArrowRight } from 'lucide-react';
import { exportPayrollToExcel } from '../../utils/exportUtils';
import { generatePayrollReceipt } from '../../utils/pdfUtils';
import { toast } from 'react-hot-toast';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';
import { PayrollTableDesktop } from '../../components/finance/Payroll/PayrollTableDesktop';
import { PayrollCardMobile } from '../../components/finance/Payroll/PayrollCardMobile';
import { PayrollFormModal } from '../../components/finance/Payroll/PayrollFormModal';
import { PayrollTemplateModal } from '../../components/finance/Payroll/PayrollTemplateModal';
import { UserData, PayrollRecord, PayrollTemplate } from '../../components/finance/Payroll/types';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import clsx from 'clsx';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
};

const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('id-ID', { month: 'long' });
};

const Payroll: React.FC = () => {
    const { user } = useAuth();
    const canManage = [1, 2, 3, 8, 9, 11].includes(user?.role_id || 0);

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

    // BKU Posting State
    const [bkuStatus, setBkuStatus] = useState<{ posted: boolean; entry: any | null }>({ posted: false, entry: null });
    const [showPostBKUModal, setShowPostBKUModal] = useState(false);
    const [postingBKU, setPostingBKU] = useState(false);
    const [bkuFundSource, setBkuFundSource] = useState('TATA USAHA');

    // Print Options
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [payrollToPrint, setPayrollToPrint] = useState<PayrollRecord | null>(null);

    // Confirm Dialog State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isLoading: boolean;
        variant: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isLoading: false,
        variant: 'danger'
    });

    useEffect(() => {
        fetchPayrolls();
        fetchBKUStatus();
        if (canManage && users.length === 0) {
            fetchUsers();
            fetchTemplates();
        }
    }, [filterMonth, filterYear, canManage]);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/payroll?month=${filterMonth}&year=${filterYear}`);
            setPayrolls(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch payrolls", error);
            setPayrolls([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBKUStatus = async () => {
        try {
            const res = await api.get(`/finance/payroll/bku-status?month=${filterMonth}&year=${filterYear}`);
            setBkuStatus(res.data || { posted: false, entry: null });
        } catch (error) {
            console.error("Failed to fetch BKU status", error);
            setBkuStatus({ posted: false, entry: null });
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
                toast.success("Perubahan data gaji berhasil disimpan");
            } else {
                await api.post('/finance/payroll', payload);
                toast.success("Slip gaji baru berhasil dibuat");
            }

            setShowModal(false);
            fetchPayrolls();
            fetchBKUStatus();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Gagal menyimpan data gaji");
        }
    };

    const handleDelete = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Hapus Slip Gaji?',
            message: 'Apakah Anda yakin ingin menghapus slip gaji ini? Data yang sudah dihapus tidak dapat dikembalikan.',
            variant: 'danger',
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                try {
                    await api.delete(`/finance/payroll/${id}`);
                    toast.success("Slip gaji dihapus!");
                    fetchPayrolls();
                    fetchBKUStatus();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    console.error(error);
                    toast.error(error.response?.data?.error || "Gagal menghapus data");
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handlePay = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Verifikasi Pelunasan?',
            message: 'Tandai status gaji pegawai ini menjadi LUNAS? (Pencatatan pengeluaran ke Buku Kas dapat dilakukan secara kolektif via tombol "Posting ke BKU").',
            variant: 'info',
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                try {
                    await api.post(`/finance/payroll/${id}/pay`);
                    toast.success("Status gaji pegawai berhasil diubah menjadi Lunas!");
                    fetchPayrolls();
                    fetchBKUStatus();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    console.error(error);
                    toast.error(error.response?.data?.error || "Gagal mengubah status gaji");
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handleExecutePostToBKU = async () => {
        setPostingBKU(true);
        try {
            const res = await api.post('/finance/payroll/post-to-bku', {
                month: filterMonth,
                year: filterYear,
                fund_source: bkuFundSource
            });
            toast.success(res.data.message || "Total gaji berhasil diposting ke Buku Kas Umum (BKU)!");
            setShowPostBKUModal(false);
            fetchBKUStatus();
            fetchPayrolls();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Gagal memposting ke Buku Kas");
        } finally {
            setPostingBKU(false);
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
            toast.error("Gagal menyimpan template");
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

    // Summary Calculations
    const totalAllNet = useMemo(() => {
        return payrolls.reduce((acc, curr) => acc + (curr.net_salary || 0), 0);
    }, [payrolls]);

    const paidPayrolls = useMemo(() => {
        return payrolls.filter(p => p.status === 'Paid');
    }, [payrolls]);

    const paidTotal = useMemo(() => {
        return paidPayrolls.reduce((acc, curr) => acc + (curr.net_salary || 0), 0);
    }, [paidPayrolls]);

    const draftPayrolls = useMemo(() => {
        return payrolls.filter(p => p.status !== 'Paid');
    }, [payrolls]);

    const draftTotal = useMemo(() => {
        return draftPayrolls.reduce((acc, curr) => acc + (curr.net_salary || 0), 0);
    }, [draftPayrolls]);

    return (
        <div className="space-y-6">
            {/* Header Title & Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Banknote className="text-emerald-600" size={32} />
                        {canManage ? 'Data Penggajian Pegawai' : 'Slip Gaji Saya'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Skema penggajian dengan komponen pendapatan, potongan, dan pencatatan BKU terpusat.
                    </p>
                </div>

                {canManage && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Tombol Posting ke BKU */}
                        <button
                            onClick={() => setShowPostBKUModal(true)}
                            className={clsx(
                                "flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-sm font-semibold transition text-sm",
                                bkuStatus.posted
                                    ? "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                                    : paidPayrolls.length > 0
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-md animate-pulse"
                                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            )}
                            disabled={!bkuStatus.posted && paidPayrolls.length === 0}
                            title={bkuStatus.posted ? "Sudah masuk ke BKU" : "Posting total gaji lunas ke Buku Kas Umum"}
                        >
                            <Send size={16} />
                            <span>{bkuStatus.posted ? 'Sudah Masuk BKU' : 'Posting ke BKU'}</span>
                        </button>

                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 shadow-sm transition text-sm font-medium"
                        >
                            <Building2 size={16} />
                            <span>Template Gaji</span>
                        </button>

                        <button
                            onClick={() => exportPayrollToExcel(filteredPayrolls, filterMonth, filterYear)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 shadow-sm transition text-sm font-medium"
                        >
                            <Download size={16} />
                            <span>Export Excel</span>
                        </button>

                        <button
                            onClick={() => { setEditingPayroll(null); setShowModal(true); }}
                            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm transition text-sm font-semibold"
                        >
                            <Plus size={16} />
                            <span>Input Gaji</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Filter Period & Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                        <button
                            onClick={() => {
                                let m = filterMonth - 1; let y = filterYear;
                                if (m < 1) { m = 12; y--; }
                                setFilterMonth(m); setFilterYear(y);
                            }}
                            className="p-1.5 px-3 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white transition"
                        >
                            &larr;
                        </button>
                        <div className="px-4 font-bold text-slate-800 min-w-[140px] text-center text-sm">
                            {getMonthName(filterMonth)} {filterYear}
                        </div>
                        <button
                            onClick={() => {
                                let m = filterMonth + 1; let y = filterYear;
                                if (m > 12) { m = 1; y++; }
                                setFilterMonth(m); setFilterYear(y);
                            }}
                            className="p-1.5 px-3 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white transition"
                        >
                            &rarr;
                        </button>
                    </div>
                </div>

                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama pegawai atau NIK..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50/50"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            {canManage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Anggaran */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Anggaran Gaji</span>
                            <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
                                <Wallet size={18} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalAllNet)}</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{payrolls.length} Total Pegawai</p>
                    </div>

                    {/* Card 2: Total Lunas */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl p-5 border border-emerald-200/70 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Gaji Lunas</span>
                            <div className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-sm">
                                <CheckCircle2 size={18} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-700">{formatCurrency(paidTotal)}</h3>
                        <p className="text-xs text-emerald-600 mt-1 font-medium">{paidPayrolls.length} dari {payrolls.length} Pegawai Lunas</p>
                    </div>

                    {/* Card 3: Total Draft */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-5 border border-amber-200/70 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Total Draft / Tertunda</span>
                            <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-sm">
                                <Clock size={18} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-amber-700">{formatCurrency(draftTotal)}</h3>
                        <p className="text-xs text-amber-600 mt-1 font-medium">{draftPayrolls.length} Pegawai Belum Lunas</p>
                    </div>

                    {/* Card 4: Status BKU */}
                    <div className={clsx(
                        "rounded-2xl p-5 border shadow-sm relative overflow-hidden flex flex-col justify-between",
                        bkuStatus.posted
                            ? "bg-blue-50/60 border-blue-200 text-blue-900"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Status Buku Kas (BKU)</span>
                                <div className={clsx(
                                    "w-7 h-7 rounded-lg flex items-center justify-center",
                                    bkuStatus.posted ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                                )}>
                                    <Send size={14} />
                                </div>
                            </div>
                            {bkuStatus.posted ? (
                                <div>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                                        ✓ Sudah Masuk BKU
                                    </span>
                                    <p className="text-xs text-blue-600 mt-1.5 font-medium truncate">
                                        {bkuStatus.entry?.invoice_number || 'Tercatat'} ({formatCurrency(bkuStatus.entry?.amount)})
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                        Belum Masuk BKU
                                    </span>
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        {paidPayrolls.length > 0 ? `${paidPayrolls.length} gaji lunas siap diposting` : 'Belum ada gaji lunas'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {!bkuStatus.posted && paidPayrolls.length > 0 && (
                            <button
                                onClick={() => setShowPostBKUModal(true)}
                                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                            >
                                Posting Sekarang <ArrowRight size={12} />
                            </button>
                        )}
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

            {/* Modal: Posting Total Gaji ke BKU */}
            {showPostBKUModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/70">
                            <h2 className="text-lg font-bold flex items-center text-indigo-900">
                                <Send className="text-indigo-600 mr-2" size={22} />
                                Posting Gaji ke Buku Kas Umum (BKU)
                            </h2>
                            <button onClick={() => setShowPostBKUModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {bkuStatus.posted ? (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2 text-blue-800 font-bold">
                                        <CheckCircle2 size={20} className="text-blue-600" />
                                        Periode Ini Sudah Diposting ke BKU
                                    </div>
                                    <p className="text-xs text-blue-700">
                                        Gaji periode <strong>{getMonthName(filterMonth)} {filterYear}</strong> telah tercatat pada transaksi BKU dengan nomor bukti <strong>{bkuStatus.entry?.invoice_number}</strong> sebesar <strong>{formatCurrency(bkuStatus.entry?.amount)}</strong>.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-amber-900">
                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <AlertCircle size={18} className="text-amber-600" />
                                            Konfirmasi Pencatatan Pengeluaran
                                        </div>
                                        <p className="text-xs leading-relaxed text-amber-800">
                                            Tindakan ini akan menggabungkan seluruh gaji yang telah berstatus <strong>LUNAS</strong> pada periode <strong>{getMonthName(filterMonth)} {filterYear}</strong> dan mencatatnya sebagai <strong>1 transaksi pengeluaran (Gaji Pegawai)</strong> di Buku Kas Umum (BKU).
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Periode</span>
                                            <span className="font-bold text-slate-800">{getMonthName(filterMonth)} {filterYear}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Jumlah Pegawai Lunas</span>
                                            <span className="font-bold text-emerald-600">{paidPayrolls.length} Pegawai</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Total Pegawai Draft (Belum Lunas)</span>
                                            <span className="font-medium text-amber-600">{draftPayrolls.length} Pegawai (Tidak Diikutsertakan)</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase text-slate-600">Total Pengeluaran BKU</span>
                                            <span className="text-xl font-black text-indigo-700">{formatCurrency(paidTotal)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold uppercase text-slate-700">Sumber Dana / Kas</label>
                                        <select
                                            value={bkuFundSource}
                                            onChange={(e) => setBkuFundSource(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                        >
                                            <option value="TATA USAHA">TATA USAHA</option>
                                            <option value="Kas Utama">Kas Utama</option>
                                            <option value="Bank BSI">Bank BSI</option>
                                            <option value="Bank Mandiri">Bank Mandiri</option>
                                            <option value="Kas Operasional">Kas Operasional</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPostBKUModal(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm"
                            >
                                {bkuStatus.posted ? 'Tutup' : 'Batal'}
                            </button>
                            {!bkuStatus.posted && (
                                <button
                                    type="button"
                                    onClick={handleExecutePostToBKU}
                                    disabled={postingBKU || paidPayrolls.length === 0}
                                    className={clsx(
                                        "px-6 py-2.5 rounded-xl text-white font-bold shadow-md transition flex items-center gap-2 text-sm",
                                        "bg-indigo-600 hover:bg-indigo-700",
                                        (postingBKU || paidPayrolls.length === 0) && "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    <Send size={15} />
                                    {postingBKU ? 'Memposting...' : 'Posting ke BKU Sekarang'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals from components */}
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
            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
                isLoading={confirmConfig.isLoading}
            />
        </div>
    );
};

export default Payroll;
