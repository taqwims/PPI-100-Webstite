import React from 'react';

interface Props {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalEntries: number;
  setCurrentPage: (updater: (prev: number) => number) => void;
}

const CashLedgerPagination: React.FC<Props> = ({ currentPage, totalPages, itemsPerPage, totalEntries, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <p className="text-sm text-slate-500">
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalEntries)} dari {totalEntries} entri
        </p>
        <div className="flex gap-1 justify-end">
            <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 text-sm hover:bg-slate-50"
            >
                Sebelumnya
            </button>
            <span className="px-4 py-1.5 text-sm font-medium text-slate-700">Hal {currentPage} / {totalPages}</span>
            <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 text-sm hover:bg-slate-50"
            >
                Selanjutnya
            </button>
        </div>
    </div>
  );
};

export default CashLedgerPagination;
