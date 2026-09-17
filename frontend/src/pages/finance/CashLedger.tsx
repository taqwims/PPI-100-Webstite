
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, Plus, BookOpen, Printer } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';
import { useCashLedger } from '../../hooks/useCashLedger';

import CashLedgerStats from '../../components/finance/CashLedger/CashLedgerStats';
import CashLedgerFilter from '../../components/finance/CashLedger/CashLedgerFilter';
import CashLedgerTable from '../../components/finance/CashLedger/CashLedgerTable';
import CashLedgerPagination from '../../components/finance/CashLedger/CashLedgerPagination';
import CashLedgerFormModal from '../../components/finance/CashLedger/CashLedgerFormModal';
import CashLedgerExportModal from '../../components/finance/CashLedger/CashLedgerExportModal';
import FinancialFlowGuideModal from '../../components/finance/FinancialFlowGuideModal';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const CashLedger = () => {
    const { user } = useAuth();
    const canManage = [1, 9, 11].includes(user?.role_id || 0);
    const [showGuideModal, setShowGuideModal] = useState(false);

    const {
        loading,
        paginatedEntries,
        totalPages,
        totalEntries,
        currentSaldo,
        totalIncome,
        totalExpense,

        searchQuery, setSearchQuery,
        filterStartDate, setFilterStartDate,
        filterEndDate, setFilterEndDate,
        selectedSemester, setSelectedSemester,
        filterTransactionCodeId, setFilterTransactionCodeId,
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

        handleInput,
        handleTransactionCodeChange,
        openCreateModal,
        openEditModal,
        handleSubmit,
        handleDelete,
        handlePrintReceipt,
        handleConfirmPrint,
        handleExport,
        handlePrintFiltered
    } = useCashLedger();

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Buku Kas Umum</h1>
                        <p className="text-slate-500 mt-1">Pencatatan sirkulasi seluruh dana operasional sekolah.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() => setShowGuideModal(true)}
                            className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 px-3.5 py-2 rounded-xl hover:bg-blue-100/70 transition shadow-xs text-sm font-semibold"
                            title="Panduan Alur Keuangan, Pos Pengeluaran, dan RKAS"
                        >
                            <BookOpen size={16} className="text-blue-600" />
                            <span>Panduan Alur Keuangan</span>
                        </button>
                        <button
                            onClick={handlePrintFiltered}
                            className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 shadow-sm transition text-sm font-medium"
                            title="Cetak Buku Kas Umum berdasarkan data yang sedang difilter"
                        >
                            <Printer size={16} />
                            <span>Cetak Laporan</span>
                        </button>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition text-sm font-medium"
                        >
                            <Download size={16} />
                            <span>Export Data</span>
                        </button>
                        {canManage && (
                            <button
                                onClick={openCreateModal}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition text-sm font-medium"
                            >
                                <Plus size={16} />
                                <span>Input Transaksi Kas</span>
                            </button>
                        )}
                    </div>
                </div>

                <CashLedgerStats 
                    currentSaldo={currentSaldo} 
                    totalIncome={totalIncome} 
                    totalExpense={totalExpense} 
                    formatCurrency={formatCurrency} 
                />

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <CashLedgerFilter 
                        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        filterStartDate={filterStartDate} setFilterStartDate={setFilterStartDate}
                        filterEndDate={filterEndDate} setFilterEndDate={setFilterEndDate}
                        selectedSemester={selectedSemester} setSelectedSemester={setSelectedSemester}
                        filterTransactionCodeId={filterTransactionCodeId} setFilterTransactionCodeId={setFilterTransactionCodeId}
                        transactionCodes={transactionCodes}
                        sortOrder={sortOrder} setSortOrder={setSortOrder}
                        itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
                        setCurrentPage={setCurrentPage}
                    />

                    <CashLedgerTable 
                        paginatedEntries={paginatedEntries} 
                        loading={loading} 
                        canManage={canManage}
                        searchQuery={searchQuery}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                        formatCurrency={formatCurrency}
                        handlePrintReceipt={handlePrintReceipt}
                        openEditModal={openEditModal}
                        setConfirmDelete={setConfirmDelete}
                    />

                    <CashLedgerPagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        totalEntries={totalEntries}
                        setCurrentPage={setCurrentPage}
                    />
                </div>

                <CashLedgerFormModal 
                    showModal={showModal} setShowModal={setShowModal}
                    editingEntry={editingEntry} setEditingEntry={setEditingEntry}
                    formData={formData} setFormData={setFormData}
                    submitting={submitting}
                    handleSubmit={handleSubmit}
                    handleInput={handleInput}
                    handleTransactionCodeChange={handleTransactionCodeChange}
                    transactionCodes={transactionCodes}
                    staffList={staffList}
                />

                <CashLedgerExportModal 
                    showExportModal={showExportModal} setShowExportModal={setShowExportModal}
                    exportStartDate={exportStartDate} setExportStartDate={setExportStartDate}
                    exportEndDate={exportEndDate} setExportEndDate={setExportEndDate}
                    exportFormat={exportFormat} setExportFormat={setExportFormat}
                    handleExport={handleExport}
                />

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }}
                title="Hapus Transaksi"
                message="Yakin ingin menghapus entri ini? Tindakan ini tidak bisa dibatalkan."
            />

            <PrintOptionsModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onConfirm={handleConfirmPrint}
                title="Cetak Bukti Transaksi Kas"
            />

            <FinancialFlowGuideModal 
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
            />
        </div>
    );
};

export default CashLedger;
