
import { Download, Plus, ArrowDownRight, FileText, X } from 'lucide-react';
import clsx from 'clsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PrintOptionsModal from '../../components/ui/PrintOptionsModal';
import { useDailyInfaq } from '../../hooks/useDailyInfaq';
import { useUnits } from '../../hooks/useUnits';

import DailyInfaqStats from '../../components/finance/DailyInfaq/DailyInfaqStats';
import DailyInfaqFilter from '../../components/finance/DailyInfaq/DailyInfaqFilter';
import DailyInfaqTable from '../../components/finance/DailyInfaq/DailyInfaqTable';
import DailyInfaqFormModal from '../../components/finance/DailyInfaq/DailyInfaqFormModal';

const DailyInfaq = () => {
    const {
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
    } = useDailyInfaq();

    const { units: activeUnits } = useUnits();

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manajemen Infaq Harian</h1>
                        <p className="text-slate-500 mt-1">Kelola pemasukan dan pengeluaran infaq dari siswa dan umum.</p>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        {[1, 9, 10, 11].includes(user?.role_id || 0) && (
                            <div className="p-1 bg-slate-100 rounded-lg hidden sm:flex shadow-sm border border-slate-200">
                                {activeUnits.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => setUnitID(u.id)}
                                        className={clsx(
                                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                            unitID === u.id ? "bg-white text-emerald-700 shadow flex items-center" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {u.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {canManage && (
                            <>
                                <button
                                    onClick={() => openCreateModal('Expense')}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 shadow-sm transition"
                                >
                                    <ArrowDownRight size={18} />
                                    <span className="hidden sm:inline">Pengeluaran</span>
                                </button>
                                <button
                                    onClick={() => openCreateModal('Income')}
                                    className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-sm transition"
                                >
                                    <Plus size={18} />
                                    <span className="hidden sm:inline">Tambah Infaq</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Statistics Cards */}
                <DailyInfaqStats
                    entries={entries}
                    totalIncome={totalIncome}
                    totalExpense={totalExpense}
                    netBalance={netBalance}
                />

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Filter and Search Panel */}
                    <DailyInfaqFilter
                        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        filterStartDate={filterStartDate} setFilterStartDate={setFilterStartDate}
                        filterEndDate={filterEndDate} setFilterEndDate={setFilterEndDate}
                        showFilterPanel={showFilterPanel} setShowFilterPanel={setShowFilterPanel}
                    />

                    {/* Table Data */}
                    <DailyInfaqTable
                        entries={filteredEntries} loading={loading} canManage={canManage}
                        searchQuery={searchQuery}
                        handlePrintReceipt={handlePrintReceipt}
                        openEditModal={openEditModal}
                        setConfirmDelete={setConfirmDelete}
                    />
                </div>

                {/* Main Form Modal */}
                <DailyInfaqFormModal
                    showModal={showModal} setShowModal={setShowModal}
                    editingEntry={editingEntry} setEditingEntry={setEditingEntry}
                    formData={formData} setFormData={setFormData}
                    handleInput={handleInput} handleSubmit={handleSubmit} submitting={submitting}
                    classList={classList} staffList={staffList}
                    transactionCodes={transactionCodes} infaqTypes={infaqTypes}
                />

                {/* Print Modal */}
                <PrintOptionsModal 
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    onConfirm={handleConfirmPrint}
                    title="Cetak Kuitansi Penerimaan Infaq"
                />

                {/* Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-lg font-bold flex items-center text-slate-800">
                                    <Download className="text-emerald-600 mr-2" size={22} /> Export Laporan Infaq
                                </h2>
                                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Periode Waktu</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Dari</label>
                                            <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Sampai</label>
                                            <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Kosongkan untuk export semua data.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Format Export</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button type="button" onClick={() => setExportFormat('pdf')}
                                            className={clsx("flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                exportFormat === 'pdf' ? "bg-white text-red-600 shadow-sm" : "text-slate-500")}>
                                            <FileText size={16} /> PDF
                                        </button>
                                        <button type="button" onClick={() => setExportFormat('csv')}
                                            className={clsx("flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                                exportFormat === 'csv' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>
                                            <Download size={16} /> Excel (CSV)
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                                    <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">Batal</button>
                                    <button onClick={handleExport} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition text-sm flex items-center gap-1.5">
                                        <Download size={16} /> Export Sekarang
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }}
                title="Hapus Data Infaq"
                message="Yakin ingin menghapus data infaq ini? Tindakan ini tidak bisa dibatalkan."
            />
        </div>
    );
};

export default DailyInfaq;
