import React from 'react';
import { Search, Filter } from 'lucide-react';
import clsx from 'clsx';

interface DailyInfaqFilterProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterStartDate: string;
    setFilterStartDate: (val: string) => void;
    filterEndDate: string;
    setFilterEndDate: (val: string) => void;
    showFilterPanel: boolean;
    setShowFilterPanel: (val: boolean) => void;
}

const DailyInfaqFilter: React.FC<DailyInfaqFilterProps> = ({
    searchQuery, setSearchQuery,
    filterStartDate, setFilterStartDate,
    filterEndDate, setFilterEndDate,
    showFilterPanel, setShowFilterPanel
}) => {
    return (
        <>
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari sumber, keterangan, kelas..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={clsx(
                            "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition",
                            showFilterPanel ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                        )}
                    >
                        <Filter size={16} />
                        <span>Filter Periode</span>
                    </button>
                </div>
            </div>

            {showFilterPanel && (
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Dari:</label>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={e => setFilterStartDate(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Sampai:</label>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={e => setFilterEndDate(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    {(filterStartDate || filterEndDate) && (
                        <button
                            onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                            className="text-xs text-red-500 hover:text-red-700 transition"
                        >
                            Reset
                        </button>
                    )}
                </div>
            )}
        </>
    );
};

export default DailyInfaqFilter;
