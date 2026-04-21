import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { exportToCSV } from '../utils/exportUtils';
import { generateCashLedgerReport } from '../utils/pdfUtils';
import { useAuth } from '../context/AuthContext';

export interface StaffUser {
    id: string;
    name: string;
    role_id: number;
}

export interface ClassData {
    id: number;
    name: string;
}

export interface DailyInfaqEntry {
    id: string;
    date: string;
    source: string;
    type: 'Income' | 'Expense';
    amount: number;
    class_name?: string;
    handled_by: { name: string };
    responsible_id?: string;
    responsible?: { id: string; name: string };
    notes: string;
    created_at: string;
    transaction_code_id?: number;
    infaq_type_id?: number;
    infaq_type?: { id: number; name: string };
    proof_url?: string;
    fund_source?: string;
}

export interface InfaqType { id: number; name: string; description: string; is_active: boolean; }
export interface TransactionCode { id: number; code: string; name: string; type: string; category: string; is_active: boolean; parent_code_id?: number | null; }

export const useDailyInfaq = () => {
    const { user } = useAuth();
    const canManage = [1, 9, 11].includes(user?.role_id || 0);

    const getDefaultUnitID = () => {
        if (user?.role_id === 2 || user?.role_id === 4 || user?.role_id === 6 || user?.role_id === 13) return 2; // MA
        if (user?.role_id === 3 || user?.role_id === 5 || user?.role_id === 7 || user?.role_id === 12) return 1; // MTS
        return 1; // Default
    };
    const [unitID, setUnitID] = useState<number>(getDefaultUnitID());

    const [entries, setEntries] = useState<DailyInfaqEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [classList, setClassList] = useState<ClassData[]>([]);

    const [transactionCodes, setTransactionCodes] = useState<TransactionCode[]>([]);
    const [infaqTypes, setInfaqTypes] = useState<InfaqType[]>([]);

    // Form State
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<DailyInfaqEntry | null>(null);
    const [formData, setFormData] = useState({
        source: '',
        type: 'Income' as 'Income' | 'Expense',
        amount: '',
        class_name: '',
        notes: '',
        responsible_id: '',
        transaction_code_id: '',
        infaq_type_id: '',
        fund_source: 'Infaq',
        proof_url: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Filter & Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Print
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printParams, setPrintParams] = useState<any>(null);

    useEffect(() => {
        fetchInfaq();
        fetchStaff();
        fetchClasses();
        fetchTransactionCodes();
        fetchInfaqTypes();
    }, [unitID]);

    const fetchTransactionCodes = async () => {
        try {
            const res = await api.get('/finance/transaction-codes');
            setTransactionCodes(res.data || []);
        } catch (error) { console.error('Failed to fetch codes', error); }
    };

    const fetchInfaqTypes = async () => {
        try {
            const res = await api.get('/finance/infaq-types');
            setInfaqTypes((res.data || []).filter((t: InfaqType) => t.is_active));
        } catch (error) { console.error('Failed to fetch infaq types', error); }
    };

    const fetchInfaq = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/daily-infaq');
            setEntries(res.data || []);
        } catch (error) {
            console.error("Failed to fetch infaq", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/users');
            const allUsers = res.data || [];
            setStaffList(allUsers.filter((u: StaffUser) => ![6, 7].includes(u.role_id)));
        } catch (error) {
            console.error("Failed to fetch staff", error);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get(`/academic/classes?unit_id=${unitID}`);
            setClassList(res.data || []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openCreateModal = (type: 'Income' | 'Expense' = 'Income') => {
        setEditingEntry(null);
        setFormData({ source: '', type, amount: '', class_name: '', notes: '', responsible_id: '', transaction_code_id: '', infaq_type_id: '', fund_source: 'Infaq', proof_url: '' });
        setShowModal(true);
    };

    const openEditModal = (entry: DailyInfaqEntry) => {
        setEditingEntry(entry);
        setFormData({
            source: entry.source,
            type: entry.type,
            amount: String(entry.amount),
            class_name: entry.class_name || '',
            notes: entry.notes || '',
            responsible_id: entry.responsible_id || '',
            transaction_code_id: entry.transaction_code_id ? String(entry.transaction_code_id) : '',
            infaq_type_id: entry.infaq_type_id ? String(entry.infaq_type_id) : '',
            fund_source: entry.fund_source || 'Infaq',
            proof_url: entry.proof_url || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = {
                source: formData.source,
                type: formData.type,
                amount: parseFloat(formData.amount),
                notes: formData.notes
            };

            if (formData.class_name) payload.class_name = formData.class_name;
            if (formData.type === 'Expense' && formData.responsible_id) {
                payload.responsible_id = formData.responsible_id;
            }
            if (formData.transaction_code_id) {
                payload.transaction_code_id = Number(formData.transaction_code_id);
            }
            if (formData.infaq_type_id) {
                payload.infaq_type_id = Number(formData.infaq_type_id);
            }
            payload.fund_source = formData.fund_source;
            if (formData.proof_url) payload.proof_url = formData.proof_url;

            if (editingEntry) {
                await api.put(`/finance/daily-infaq/${editingEntry.id}`, payload);
            } else {
                await api.post('/finance/daily-infaq', payload);
            }
            setShowModal(false);
            setEditingEntry(null);
            setFormData({ source: '', type: 'Income', amount: '', class_name: '', notes: '', responsible_id: '', transaction_code_id: '', infaq_type_id: '', fund_source: 'Infaq', proof_url: '' });
            fetchInfaq();
            toast.success(editingEntry ? 'Data infaq berhasil diperbarui' : 'Data infaq berhasil disimpan');
        } catch (error: any) {
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/finance/daily-infaq/${id}`);
            fetchInfaq();
            toast.success('Data infaq berhasil dihapus');
        } catch (error: any) {
        }
    };

    const handleExport = () => {
        let filtered = entries;
        if (exportStartDate && exportEndDate) {
            filtered = entries.filter(e => {
                const d = new Date(e.date).toISOString().split('T')[0];
                return d >= exportStartDate && d <= exportEndDate;
            });
        } else if (exportStartDate) {
            filtered = entries.filter(e => new Date(e.date).toISOString().split('T')[0] >= exportStartDate);
        } else if (exportEndDate) {
            filtered = entries.filter(e => new Date(e.date).toISOString().split('T')[0] <= exportEndDate);
        }

        if (filtered.length === 0) {
            toast.error('Tidak ada data pada periode yang dipilih.');
            return;
        }

        if (exportFormat === 'pdf') {
            const data = filtered.map(e => ({
                id: e.id,
                date: e.date,
                source: e.source,
                item_name: e.type === 'Income' ? `Infaq${e.class_name ? ` - ${e.class_name}` : ''}` : `Pengeluaran Infaq`,
                type: e.type,
                amount: e.amount,
                category: 'Infaq',
                notes: e.notes
            }));
            generateCashLedgerReport(data, exportStartDate || 'Awal', exportEndDate || 'Akhir');
        } else {
            exportToCSV(filtered, `Infaq_Harian_${exportStartDate || 'all'}_${exportEndDate || 'all'}`);
        }
        setShowExportModal(false);
    };

    const handlePrintReceipt = (params: any) => {
        setPrintParams(params);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[]) => {
        if (printParams) {
            try {
                const mod = await import('../utils/pdfUtils');
                await mod.generateInfaqReceipt(printParams, selectedRoles);
                toast.success('Kuitansi berhasil diunduh');
            } catch (error) {
                console.error(error);
                toast.error('Gagal membuat kuitansi');
            }
        }
    };

    const filteredEntries = entries.filter(e => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchSearch = (
                e.source?.toLowerCase().includes(q) ||
                e.notes?.toLowerCase().includes(q) ||
                e.class_name?.toLowerCase().includes(q) ||
                e.handled_by?.name?.toLowerCase().includes(q) ||
                e.responsible?.name?.toLowerCase().includes(q)
            );
            if (!matchSearch) return false;
        }
        if (filterStartDate) {
            const d = new Date(e.date).toISOString().split('T')[0];
            if (d < filterStartDate) return false;
        }
        if (filterEndDate) {
            const d = new Date(e.date).toISOString().split('T')[0];
            if (d > filterEndDate) return false;
        }
        return true;
    });

    const totalIncome = entries.filter((t) => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = entries.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    return {
        user, canManage, unitID, setUnitID,
        loading, entries, filteredEntries, totalIncome, totalExpense, netBalance,
        searchQuery, setSearchQuery, filterStartDate, setFilterStartDate, filterEndDate, setFilterEndDate,
        showFilterPanel, setShowFilterPanel,
        showExportModal, setShowExportModal, exportStartDate, setExportStartDate, exportEndDate, setExportEndDate, exportFormat, setExportFormat,
        showModal, setShowModal, formData, setFormData, handleInput, openCreateModal, openEditModal, editingEntry, setEditingEntry,
        submitting, handleSubmit,
        confirmDelete, setConfirmDelete, handleDelete,
        handleExport,
        isPrintModalOpen, setIsPrintModalOpen, handlePrintReceipt, handleConfirmPrint,
        classList, staffList, transactionCodes, infaqTypes
    };
};
