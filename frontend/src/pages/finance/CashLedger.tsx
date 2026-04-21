
import { useAuth } from '../../context/AuthContext';
import { Download, Plus } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';
import { useCashLedger } from '../../hooks/useCashLedger';

import CashLedgerStats from '../../components/finance/CashLedger/CashLedgerStats';
import CashLedgerFilter from '../../components/finance/CashLedger/CashLedgerFilter';
import CashLedgerTable from '../../components/finance/CashLedger/CashLedgerTable';
import CashLedgerPagination from '../../components/finance/CashLedger/CashLedgerPagination';
import CashLedgerFormModal from '../../components/finance/CashLedger/CashLedgerFormModal';
import CashLedgerExportModal from '../../components/finance/CashLedger/CashLedgerExportModal';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const CashLedger = () => {
    const { user } = useAuth();
    const canManage = [1, 9].includes(user?.role_id || 0);

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
        handleExport
    } = useCashLedger();

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Buku Kas Umum</h1>
                        <p className="text-slate-500 mt-1">Pencatatan sirkulasi seluruh dana operasional sekolah.</p>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Download size={18} />
                            <span>Export Data</span>
                        </button>
                        {canManage && (
                            <button
                                onClick={openCreateModal}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition"
                            >
                                <Plus size={18} />
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
            </div>

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
        </div>
    );
};

export default CashLedger;
