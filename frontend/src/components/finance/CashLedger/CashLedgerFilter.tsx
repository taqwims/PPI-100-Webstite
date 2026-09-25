import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowUpRight, ArrowDownRight, Layers, RotateCcw, ChevronDown, Filter } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionCode } from '../../../types/cashLedgerTypes';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterType: 'all' | 'Income' | 'Expense';
  setFilterType: (val: 'all' | 'Income' | 'Expense') => void;
  filterStartDate: string;
  setFilterStartDate: (val: string) => void;
  filterEndDate: string;
  setFilterEndDate: (val: string) => void;
  selectedSemester?: string;
  setSelectedSemester?: (val: string) => void;
  selectedSemesters?: string[];
  setSelectedSemesters?: React.Dispatch<React.SetStateAction<string[]>>;
  filterTransactionCodeId?: string;
  setFilterTransactionCodeId?: (val: string) => void;
  filterTransactionCodeIds?: number[];
  setFilterTransactionCodeIds?: React.Dispatch<React.SetStateAction<number[]>>;
  filterFundSource?: string;
  setFilterFundSource?: (val: string) => void;
  filterFundSources?: string[];
  setFilterFundSources?: React.Dispatch<React.SetStateAction<string[]>>;
  transactionCodes: TransactionCode[];
  sortOrder: 'asc' | 'desc';
  setSortOrder: (val: 'asc' | 'desc') => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  setCurrentPage: (val: number) => void;
  resetFilters: () => void;
  totalIncomeCount?: number;
  totalExpenseCount?: number;
}

const FUND_SOURCE_OPTIONS = ['Kas Umum', 'Kas Bank', 'Kas Kecil', 'BOS', 'Yayasan'];
const SEMESTER_OPTIONS = [
  { value: '1', label: 'Semester 1 (Ganjil - Jul-Des)' },
  { value: '2', label: 'Semester 2 (Genap - Jan-Jun)' }
];

const CashLedgerFilter: React.FC<Props> = ({
  searchQuery, setSearchQuery,
  filterType, setFilterType,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  selectedSemesters = [], setSelectedSemesters,
  filterTransactionCodeIds = [], setFilterTransactionCodeIds,
  filterFundSources = [], setFilterFundSources,
  transactionCodes,
  sortOrder, setSortOrder,
  itemsPerPage, setItemsPerPage,
  setCurrentPage,
  resetFilters
}) => {
  // Popover state
  const [openDropdown, setOpenDropdown] = useState<'code' | 'fund' | 'semester' | null>(null);
  const [codeSearch, setCodeSearch] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Transaction Codes (Parent & Child Hierarchy) based on active filterType
  const relevantTransactionCodes = transactionCodes.filter(tc => {
    if (!tc.is_active) return false;
    if (filterType === 'all') return true;
    return tc.type === filterType || tc.parent_code?.type === filterType;
  });

  const masterCodes = relevantTransactionCodes.filter(tc => !tc.parent_code_id);
  const filteredMasterCodes = masterCodes.filter(master => {
    if (!codeSearch.trim()) return true;
    const q = codeSearch.toLowerCase();
    const masterMatch = master.code.toLowerCase().includes(q) || master.name.toLowerCase().includes(q);
    const childrenMatch = relevantTransactionCodes.some(c => c.parent_code_id === master.id && (c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)));
    return masterMatch || childrenMatch;
  });

  const toggleTransactionCode = (id: number) => {
    if (!setFilterTransactionCodeIds) return;
    setFilterTransactionCodeIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setCurrentPage(1);
  };

  const toggleFundSource = (fund: string) => {
    if (!setFilterFundSources) return;
    setFilterFundSources(prev =>
      prev.includes(fund) ? prev.filter(item => item !== fund) : [...prev, fund]
    );
    setCurrentPage(1);
  };

  const toggleSemester = (sem: string) => {
    if (!setSelectedSemesters) return;
    setSelectedSemesters(prev =>
      prev.includes(sem) ? prev.filter(item => item !== sem) : [...prev, sem]
    );
    setCurrentPage(1);
  };

  const isFiltered = Boolean(
    searchQuery ||
    filterType !== 'all' ||
    filterStartDate ||
    filterEndDate ||
    (selectedSemesters && selectedSemesters.length > 0) ||
    (filterTransactionCodeIds && filterTransactionCodeIds.length > 0) ||
    (filterFundSources && filterFundSources.length > 0)
  );

  return (
    <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3.5" ref={dropdownRef}>
      {/* Top Row: Type Action Buttons & Search */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between lg:items-center">
        {/* Buttons for Semua, Seluruh Pemasukan, Seluruh Pengeluaran */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              filterType === 'all'
                ? "bg-white text-slate-800 shadow-xs ring-1 ring-slate-300/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            <Layers size={14} className={filterType === 'all' ? "text-blue-600" : "text-slate-400"} />
            <span>Semua Transaksi</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterType('Income'); setCurrentPage(1); }}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              filterType === 'Income'
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:bg-emerald-50/80 hover:text-emerald-900"
            )}
          >
            <ArrowUpRight size={14} />
            <span>Seluruh Pemasukan</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterType('Expense'); setCurrentPage(1); }}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              filterType === 'Expense'
                ? "bg-red-600 text-white shadow-sm"
                : "text-red-700 hover:bg-red-50/80 hover:text-red-900"
            )}
          >
            <ArrowDownRight size={14} />
            <span>Seluruh Pengeluaran</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari transaksi, invoice, uraian, pos, penanggung jawab..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Bottom Row: Detailed Multi-Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium">Tgl:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
              title="Tanggal Mulai"
              className="border-0 p-0 text-xs text-slate-700 font-medium focus:ring-0 cursor-pointer bg-transparent"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
              title="Tanggal Akhir"
              className="border-0 p-0 text-xs text-slate-700 font-medium focus:ring-0 cursor-pointer bg-transparent"
            />
          </div>

          {/* 1. Multi-Select Pos / Kode Akun Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'code' ? null : 'code')}
              className={clsx(
                "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs",
                filterTransactionCodeIds.length > 0
                  ? "bg-blue-50 border-blue-300 text-blue-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <Filter size={13} className={filterTransactionCodeIds.length > 0 ? "text-blue-600" : "text-slate-400"} />
              <span>
                {filterTransactionCodeIds.length === 0
                  ? (filterType === 'Income' ? 'Semua Pos Pemasukan' : filterType === 'Expense' ? 'Semua Pos Pengeluaran' : 'Semua Pos / Kode Akun')
                  : `${filterTransactionCodeIds.length} Pos Dipilih`}
              </span>
              <ChevronDown size={14} className="text-slate-400 ml-0.5" />
            </button>

            {openDropdown === 'code' && (
              <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Filter Pos {filterType === 'Income' ? 'Pemasukan' : filterType === 'Expense' ? 'Pengeluaran' : 'Kode Akun'}
                  </span>
                  {filterTransactionCodeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTransactionCodeIds && setFilterTransactionCodeIds([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Reset ({filterTransactionCodeIds.length})
                    </button>
                  )}
                </div>

                {/* Search in Codes */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Cari pos ${filterType === 'Income' ? 'pemasukan' : filterType === 'Expense' ? 'pengeluaran' : 'atau kode'}...`}
                    value={codeSearch}
                    onChange={e => setCodeSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Codes List (Hierarchical Induk & Child) */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
                  {filteredMasterCodes.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Tidak ada pos {filterType === 'Income' ? 'pemasukan' : filterType === 'Expense' ? 'pengeluaran' : ''} yang ditemukan.
                    </div>
                  ) : (
                    filteredMasterCodes.map(master => {
                      const children = relevantTransactionCodes.filter(c => c.parent_code_id === master.id);
                      const isMasterSelected = filterTransactionCodeIds.includes(master.id);

                      return (
                        <div key={master.id} className="space-y-0.5">
                          {/* Induk Header / Option */}
                          <label className={clsx(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition select-none",
                            isMasterSelected ? "bg-blue-50 text-blue-900" : "text-slate-800 hover:bg-slate-100"
                          )}>
                            <input
                              type="checkbox"
                              checked={isMasterSelected}
                              onChange={() => toggleTransactionCode(master.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{master.code} — {master.name}</span>
                          </label>

                          {/* Children List */}
                          {children.map(child => {
                            const isChildSelected = filterTransactionCodeIds.includes(child.id);
                            return (
                              <label
                                key={child.id}
                                className={clsx(
                                  "flex items-center gap-2 pl-6 pr-2 py-1 rounded-lg text-[11px] cursor-pointer transition select-none font-medium",
                                  isChildSelected ? "bg-blue-50/80 text-blue-800 font-semibold" : "text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChildSelected}
                                  onChange={() => toggleTransactionCode(child.id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate">↳ {child.code} — {child.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Multi-Select Sumber Dana Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'fund' ? null : 'fund')}
              className={clsx(
                "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs",
                filterFundSources.length > 0
                  ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span>
                {filterFundSources.length === 0
                  ? "Semua Sumber Dana"
                  : `${filterFundSources.length} Sumber Dana`}
              </span>
              <ChevronDown size={14} className="text-slate-400 ml-0.5" />
            </button>

            {openDropdown === 'fund' && (
              <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">Sumber Dana</span>
                  {filterFundSources.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterFundSources && setFilterFundSources([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Reset ({filterFundSources.length})
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {FUND_SOURCE_OPTIONS.map(fund => {
                    const isSelected = filterFundSources.includes(fund);
                    return (
                      <label
                        key={fund}
                        className={clsx(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition",
                          isSelected ? "bg-indigo-50 text-indigo-900 font-bold" : "text-slate-700 hover:bg-slate-50 font-medium"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFundSource(fund)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{fund}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Multi-Select Semester Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'semester' ? null : 'semester')}
              className={clsx(
                "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs",
                selectedSemesters.length > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span>
                {selectedSemesters.length === 0
                  ? "Semua Semester"
                  : selectedSemesters.length === 1
                  ? selectedSemesters[0] === '1' ? 'Ganjil' : 'Genap'
                  : '2 Semester'}
              </span>
              <ChevronDown size={14} className="text-slate-400 ml-0.5" />
            </button>

            {openDropdown === 'semester' && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">Filter Semester</span>
                  {selectedSemesters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSemesters && setSelectedSemesters([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {SEMESTER_OPTIONS.map(sem => {
                    const isSelected = selectedSemesters.includes(sem.value);
                    return (
                      <label
                        key={sem.value}
                        className={clsx(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition",
                          isSelected ? "bg-amber-50 text-amber-950 font-bold" : "text-slate-700 hover:bg-slate-50 font-medium"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSemester(sem.value)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{sem.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition"
              title="Reset semua filter ke default"
            >
              <RotateCcw size={12} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Sort & Pagination Limit */}
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={e => { setSortOrder(e.target.value as 'asc'|'desc'); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer font-medium text-slate-700 shadow-2xs"
          >
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer font-medium text-slate-700 shadow-2xs"
          >
            <option value="20">20 Baris</option>
            <option value="40">40 Baris</option>
            <option value="80">80 Baris</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CashLedgerFilter;
