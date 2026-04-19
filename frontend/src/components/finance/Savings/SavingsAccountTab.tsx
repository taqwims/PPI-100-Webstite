import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ArrowDownRight, Wallet, Users, ArrowUpRight, History } from 'lucide-react';
import clsx from 'clsx';
import { SavingAccount, ClassData, Student } from './types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

interface Props {
    loading: boolean;
    accounts: SavingAccount[];
    students: Student[];
    classList: ClassData[];
    classFilter: string;
    setClassFilter: (val: string) => void;
    openDepositModal: (studentId?: string) => void;
    openWithdrawalModal: (studentId: string) => void;
    openHistory: (account: SavingAccount) => void;
}

export const SavingsAccountTab: React.FC<Props> = ({
    loading, accounts, students, classList, classFilter, setClassFilter,
    openDepositModal, openWithdrawalModal, openHistory
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

    const unitAccounts = accounts.filter(acc => students.some(s => s.id === acc.student_id));
    
    const filtered = unitAccounts.filter(acc => {
        const matchesClass = !classFilter || acc.student?.class_id === Number(classFilter);
        if (!searchQuery) return matchesClass;
        const q = searchQuery.toLowerCase();
        return matchesClass && (
            acc.student?.user?.name?.toLowerCase().includes(q) || 
            acc.student?.nisn?.toLowerCase().includes(q) || 
            acc.student?.class?.name?.toLowerCase().includes(q)
        );
    });

    const groupedAccounts = filtered.reduce((acc, account) => {
        const className = account.student?.class?.name || 'Tanpa Kelas';
        if (!acc[className]) {
            acc[className] = { accounts: [], totalBalance: 0 };
        }
        acc[className].accounts.push(account);
        acc[className].totalBalance += account.balance;
        return acc;
    }, {} as Record<string, { accounts: SavingAccount[], totalBalance: number }>);

    const toggleClass = (className: string) => {
        setExpandedClasses(prev => {
            const next = new Set(prev);
            if (next.has(className)) next.delete(className);
            else next.add(className);
            return next;
        });
    };

    const expandAll = useCallback(() => setExpandedClasses(new Set(Object.keys(groupedAccounts))), [groupedAccounts]);
    const collapseAll = useCallback(() => setExpandedClasses(new Set()), []);

    useEffect(() => {
        if (searchQuery) {
            expandAll();
        }
    }, [searchQuery, expandAll]);

    return (
        <div className="space-y-4">
            {/* Filters Container */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative group flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cari nama, NISN, atau kelas..." 
                        className="w-full pl-12 pr-4 py-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 bg-white shadow-sm transition-all font-medium text-slate-900" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                    />
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <select 
                            value={classFilter} 
                            onChange={e => setClassFilter(e.target.value)} 
                            className="appearance-none pl-12 pr-10 py-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500/30 bg-white shadow-sm transition-all font-bold text-slate-700 cursor-pointer hover:bg-slate-50 min-w-[180px]"
                        >
                            <option value="">Semua Kelas</option>
                            {classList.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ArrowDownRight size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* List / Table Wrapper */}
            <div className="space-y-6">
                {loading ? (
                    <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-20 flex flex-col items-center gap-4 border border-white/60 shadow-xl shadow-slate-200/50">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Memuat Data...</p>
                    </div>
                ) : Object.keys(groupedAccounts).length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-20 text-center text-slate-400 border border-white/60 shadow-xl shadow-slate-200/50">
                        <Wallet size={64} className="mx-auto opacity-20 mb-4" />
                        <p className="text-xl font-black opacity-40 uppercase tracking-widest">Kosong</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-end gap-2 px-2">
                            <button onClick={expandAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">Buka Semua</button>
                            <button onClick={collapseAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors">Tutup Semua</button>
                        </div>
                        {Object.entries(groupedAccounts).map(([className, data]) => {
                            const isExpanded = expandedClasses.has(className);
                            return (
                                <div key={className} className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300">
                                    {/* Header / Dropdown Trigger */}
                                    <button 
                                        onClick={() => toggleClass(className)}
                                        className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/40 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                isExpanded ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Users size={24} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-900 transition-colors">{className}</h3>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                    {data.accounts.length} Siswa • Total {formatCurrency(data.totalBalance)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                            isExpanded ? "bg-emerald-50 border-emerald-100 text-emerald-600 rotate-180" : "bg-slate-50 border-slate-100 text-slate-400"
                                        )}>
                                            <ArrowDownRight size={20} />
                                        </div>
                                    </button>

                                    {/* Content */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100/50 animate-in slide-in-from-top-4 duration-300">
                                            {/* Desktop Table */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50/50">
                                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Siswa</th>
                                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">NISN</th>
                                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Saldo</th>
                                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Tindakan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50/50">
                                                        {data.accounts.map(account => (
                                                            <tr key={account.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                                                                <td className="px-8 py-5">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-black shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                                            {account.student?.user?.name?.charAt(0)}
                                                                        </div>
                                                                        <p className="font-extrabold text-slate-900 group-hover:text-emerald-900 transition-colors text-sm">{account.student?.user?.name}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-5 text-slate-500 font-mono text-xs">{account.student?.nisn}</td>
                                                                <td className="px-8 py-5 text-right">
                                                                    <p className={clsx("text-base font-black tracking-tight", account.balance > 0 ? "text-emerald-600" : "text-slate-300")}>
                                                                        {formatCurrency(account.balance)}
                                                                    </p>
                                                                </td>
                                                                <td className="px-8 py-5">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button onClick={() => openDepositModal(account.student_id)} className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"><ArrowUpRight size={14} /></button>
                                                                        <button onClick={() => openWithdrawalModal(account.student_id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><ArrowDownRight size={14} /></button>
                                                                        <button onClick={() => openHistory(account)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><History size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Cards */}
                                            <div className="md:hidden divide-y divide-slate-100/50">
                                                {data.accounts.map(account => (
                                                    <div key={account.id} className="p-6 space-y-4 hover:bg-slate-50/30 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-0.5">
                                                                <p className="font-black text-slate-900 text-sm leading-tight">{account.student?.user?.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{account.student?.nisn}</p>
                                                            </div>
                                                            <p className={clsx("text-base font-black tracking-tight", account.balance > 0 ? "text-emerald-600" : "text-slate-300")}>
                                                                {formatCurrency(account.balance)}
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <button onClick={() => openDepositModal(account.student_id)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-[9px] uppercase"><ArrowUpRight size={14} /> Setor</button>
                                                            <button onClick={() => openWithdrawalModal(account.student_id)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-red-50 text-red-600 font-bold text-[9px] uppercase"><ArrowDownRight size={14} /> Tarik</button>
                                                            <button onClick={() => openHistory(account)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] uppercase"><History size={14} /> Histori</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};
