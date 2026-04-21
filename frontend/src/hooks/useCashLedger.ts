import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CashLedgerEntry, StaffUser, TransactionCode } from '../types/cashLedgerTypes';
import { exportToCSV } from '../utils/exportUtils';
import { generateCashLedgerReceipt, generateCashLedgerReport } from '../utils/pdfUtils';

export const useCashLedger = () => {
    const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CashLedgerEntry | null>(null);
    const [formData, setFormData] = useState({
        source: '',
        item_name: '',
        type: 'Expense',
        amount: '',
        category: 'Operasional',
        fund_source: 'Kas Umum',
        notes: '',
        responsible_id: '',
        transaction_code_id: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [transactionCodes, setTransactionCodes] = useState<TransactionCode[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Print Options
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [entryToPrint, setEntryToPrint] = useState<CashLedgerEntry | null>(null);

    // Filters & Pagination
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [itemsPerPage, setItemsPerPage] = useState<number>(20);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedSemester, setSelectedSemester] = useState<string>('all');

    // Export modal state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

    useEffect(() => {
        fetchLedger();
        fetchStaff();
        fetchTransactionCodes();
    }, []);

    const fetchTransactionCodes = async () => {
        try {
            const res = await api.get('/finance/transaction-codes');
            setTransactionCodes(res.data || []);
        } catch (error) { console.error('Failed to fetch codes', error); }
    };

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/cash-ledger');
            setEntries(res.data);
        } catch (error) {
            console.error("Failed to fetch ledger", error);
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

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTransactionCodeChange = (codeId: string) => {
        const tc = transactionCodes.find(c => c.id === Number(codeId));
        setFormData({
            ...formData,
            transaction_code_id: codeId,
            category: tc ? tc.category : formData.category,
            type: tc ? (tc.type as 'Income' | 'Expense') : formData.type,
        });
    };

    const openCreateModal = () => {
        setEditingEntry(null);
        setFormData({ source: '', item_name: '', type: 'Expense', amount: '', category: '', fund_source: 'Kas Umum', notes: '', responsible_id: '', transaction_code_id: '' });
        setShowModal(true);
    };

    const openEditModal = (entry: CashLedgerEntry) => {
        setEditingEntry(entry);
        setFormData({
            source: entry.source,
            item_name: entry.item_name,
            type: entry.type,
            amount: String(entry.amount),
            category: entry.category,
            fund_source: entry.fund_source || 'Kas Umum',
            notes: entry.notes || '',
            responsible_id: entry.responsible_id || '',
            transaction_code_id: entry.transaction_code_id ? String(entry.transaction_code_id) : ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = {
                source: formData.source,
                item_name: formData.item_name,
                type: formData.type,
                amount: parseFloat(formData.amount),
                category: formData.category,
                fund_source: formData.fund_source,
                notes: formData.notes
            };

            if (formData.type === 'Expense' && formData.responsible_id) {
                payload.responsible_id = formData.responsible_id;
            }
            if (formData.transaction_code_id) {
                payload.transaction_code_id = Number(formData.transaction_code_id);
            }

            if (editingEntry) {
                await api.put(`/finance/cash-ledger/${editingEntry.id}`, payload);
            } else {
                await api.post('/finance/cash-ledger', payload);
            }
            setShowModal(false);
            setEditingEntry(null);
            setFormData({ source: '', item_name: '', type: 'Expense', amount: '', category: '', fund_source: 'Kas Umum', notes: '', responsible_id: '', transaction_code_id: '' });
            fetchLedger();
            toast.success(editingEntry ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil disimpan');
        } catch (error: any) {
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/finance/cash-ledger/${id}`);
            fetchLedger();
            toast.success('Data berhasil dihapus');
        } catch (error: any) {
        }
    };

    const handlePrintReceipt = (entry: CashLedgerEntry) => {
        setEntryToPrint(entry);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = async (selectedRoles: string[]) => {
        if (entryToPrint) {
            await generateCashLedgerReceipt(entryToPrint, selectedRoles);
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
            generateCashLedgerReport(filtered, exportStartDate || 'Awal', exportEndDate || 'Akhir');
        } else {
            exportToCSV(filtered, `Cash_Ledger_${exportStartDate || 'all'}_${exportEndDate || 'all'}`);
        }
        setShowExportModal(false);
    };

    // Filter, Sort and Paginate
    let processedEntries = entries.filter(e => {
        let match = true;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!(
                e.item_name?.toLowerCase().includes(q) ||
                e.source?.toLowerCase().includes(q) ||
                e.notes?.toLowerCase().includes(q) ||
                e.category?.toLowerCase().includes(q) ||
                e.responsible?.name?.toLowerCase().includes(q)
            )) match = false;
        }
        if (filterStartDate && e.date.split('T')[0] < filterStartDate) match = false;
        if (filterEndDate && e.date.split('T')[0] > filterEndDate) match = false;
        if (selectedSemester !== 'all') {
            const month = new Date(e.date).getMonth() + 1;
            const isSem1 = month >= 7 && month <= 12; // Jul-Dec
            if (selectedSemester === '1' && !isSem1) match = false;
            if (selectedSemester === '2' && isSem1) match = false;
        }
        return match;
    });

    processedEntries.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
    });

    const totalPages = Math.ceil(processedEntries.length / itemsPerPage);
    const paginatedEntries = processedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalIncome = entries.filter(e => e.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = entries.filter(e => e.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    const currentSaldo = entries.reduce((acc, curr) => curr.type === 'Income' ? acc + curr.amount : acc - curr.amount, 0);

    return {
        // States
        loading,
        paginatedEntries,
        totalPages,
        totalEntries: processedEntries.length,
        currentSaldo,
        totalIncome,
        totalExpense,
        
        searchQuery, setSearchQuery,
        filterStartDate, setFilterStartDate,
        filterEndDate, setFilterEndDate,
        selectedSemester, setSelectedSemester,
        sortOrder, setSortOrder,
        itemsPerPage, setItemsPerPage,
        currentPage, setCurrentPage,

        showModal, setShowModal,
        editingEntry, setEditingEntry,
        formData, setFormData,
        submitting,
        transactionCodes,
        staffList,
        confirmDelete, setConfirmDelete,

        isPrintModalOpen, setIsPrintModalOpen,
        showExportModal, setShowExportModal,
        exportStartDate, setExportStartDate,
        exportEndDate, setExportEndDate,
        exportFormat, setExportFormat,

        // Handlers
        handleInput,
        handleTransactionCodeChange,
        openCreateModal,
        openEditModal,
        handleSubmit,
        handleDelete,
        handlePrintReceipt,
        handleConfirmPrint,
        handleExport
    };
};
