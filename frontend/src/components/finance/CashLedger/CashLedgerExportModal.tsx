import React from 'react';
import { Download, X, Calendar, FileText } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  showExportModal: boolean;
  setShowExportModal: (val: boolean) => void;
  exportStartDate: string;
  setExportStartDate: (val: string) => void;
  exportEndDate: string;
  setExportEndDate: (val: string) => void;
  exportFormat: 'pdf' | 'csv';
  setExportFormat: (val: 'pdf' | 'csv') => void;
  handleExport: () => void;
}

const CashLedgerExportModal: React.FC<Props> = ({
  showExportModal, setShowExportModal,
  exportStartDate, setExportStartDate,
  exportEndDate, setExportEndDate,
  exportFormat, setExportFormat,
  handleExport
}) => {
  if (!showExportModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold flex items-center text-slate-800">
                    <Download className="text-blue-600 mr-2" size={22} /> Export Data Kas
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
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Sampai</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Kosongkan untuk export semua data.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Format Export</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setExportFormat('pdf')}
                            className={clsx(
                                "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                exportFormat === 'pdf' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <FileText size={16} />
                            PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => setExportFormat('csv')}
                            className={clsx(
                                "flex-1 py-2.5 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5",
                                exportFormat === 'csv' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Download size={16} />
                            Excel (CSV)
                        </button>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                        onClick={() => setShowExportModal(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition text-sm flex items-center gap-1.5"
                    >
                        <Download size={16} />
                        Export Sekarang
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CashLedgerExportModal;
