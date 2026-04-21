import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterStartDate: string;
  setFilterStartDate: (val: string) => void;
  filterEndDate: string;
  setFilterEndDate: (val: string) => void;
  selectedSemester: string;
  setSelectedSemester: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (val: 'asc' | 'desc') => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  setCurrentPage: (val: number) => void;
}

const CashLedgerFilter: React.FC<Props> = ({
  searchQuery, setSearchQuery,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  selectedSemester, setSelectedSemester,
  sortOrder, setSortOrder,
  itemsPerPage, setItemsPerPage,
  setCurrentPage
}) => {
  return (
    <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Cari transaksi..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                />
            </div>
            <div className="flex items-center gap-2">
                <input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); }} title="Tanggal Mulai" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                <span className="text-slate-400">-</span>
                <input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); }} title="Tanggal Akhir" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white cursor-pointer w-full sm:w-auto">
                <option value="all">Semua Semester</option>
                <option value="1">Ganjil</option>
                <option value="2">Genap</option>
            </select>
            <select value={sortOrder} onChange={e => { setSortOrder(e.target.value as 'asc'|'desc'); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white cursor-pointer w-full sm:w-auto">
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
            </select>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white cursor-pointer w-full sm:w-auto">
                <option value="20">20 Baris</option>
                <option value="40">40 Baris</option>
                <option value="80">80 Baris</option>
            </select>
        </div>
    </div>
  );
};

export default CashLedgerFilter;
