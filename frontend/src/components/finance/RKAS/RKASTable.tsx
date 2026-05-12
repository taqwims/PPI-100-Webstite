import React, { useState } from 'react';
import { Edit, Trash2, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import clsx from 'clsx';
import { Budget } from './types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

interface RKASTableProps {
    isLoading: boolean;
    budgetTypeTab: 'Pengeluaran' | 'Penerimaan';
    groupedBudgets: Record<string, Budget[]>;
    canEdit: boolean;
    onEdit: (budget: Budget) => void;
    onDelete: (id: string) => void;
    onRealize: (id: string) => void;
}

export const RKASTable: React.FC<RKASTableProps> = ({
    isLoading, budgetTypeTab, groupedBudgets, canEdit, onEdit, onDelete, onRealize
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void }>({
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const toggleGroup = (standarName: string) => {
        setExpandedGroups(prev => ({ ...prev, [standarName]: !prev[standarName] }));
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/80"><tr>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Kode</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Item</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Tahun</th>
                        <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Vol/Qty</th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Harga Satuan</th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Anggaran</th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Realisasi</th>
                        <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Progress</th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={9} className="text-center py-12 text-slate-400">Memuat...</td></tr>
                        ) : Object.keys(groupedBudgets).length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-12 text-slate-400">Belum ada data anggaran {budgetTypeTab.toLowerCase()}</td></tr>
                        ) : Object.entries(groupedBudgets).map(([standarName, items]) => (
                            <React.Fragment key={standarName}>
                                <tr className="bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => toggleGroup(standarName)}>
                                    <td colSpan={9} className="px-5 py-3 text-sm font-semibold text-slate-800">
                                        <div className="flex items-center gap-2">
                                            {expandedGroups[standarName] ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                                            Standar: {standarName} <span className="text-xs font-normal text-slate-400">({items.length} Item — Subtotal: {formatCurrency(items.reduce((s, b) => s + b.planned_amount, 0))})</span>
                                        </div>
                                    </td>
                                </tr>
                                {expandedGroups[standarName] && (() => {
                                    // Group items by transaction code to merge multi-month budgets visually
                                    const groupedItems = items.reduce((acc, b) => {
                                        const key = b.transaction_code?.code || b.id;
                                        if (!acc[key]) {
                                            acc[key] = { ...b, total_planned: 0, total_realized: 0, months: [], ids: [] };
                                        }
                                        acc[key].total_planned += b.planned_amount;
                                        acc[key].total_realized += b.realized_amount;
                                        if (b.month > 0) acc[key].months.push(b.month);
                                        acc[key].ids.push(b.id);
                                        return acc;
                                    }, {} as Record<string, any>);

                                    return Object.values(groupedItems).map((b: any) => {
                                        const pct = b.total_planned > 0 ? (b.total_realized / b.total_planned) * 100 : 0;
                                        const isMulti = b.months.length > 1;
                                        return (
                                            <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <span className="font-medium text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded text-xs">{b.transaction_code?.code || '-'}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-medium text-slate-900 text-sm">{b.item_name}</p>
                                                        {isMulti ? (
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-medium" title={b.months.join(', ')}>
                                                                {b.months.length} Bulan
                                                            </span>
                                                        ) : (
                                                            b.period === 'Bulanan' && b.month > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-medium">Bulan {b.month}</span>
                                                        )}
                                                        {b.period && b.period !== 'Tahunan' && b.period !== 'Bulanan' && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full font-medium">{b.period}</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">oleh {b.created_by?.name}</p>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">{b.academic_year?.name}</td>
                                                <td className="px-5 py-3.5 text-sm text-center text-slate-700">
                                                    {isMulti ? `${b.quantity} × ${b.months.length}` : (b.quantity > 0 ? b.quantity : '-')}
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-right text-slate-600">{b.unit_price > 0 ? formatCurrency(b.unit_price) : '-'}</td>
                                                <td className="px-5 py-3.5 text-sm text-right font-medium text-slate-900">{formatCurrency(b.total_planned)}</td>
                                                <td className="px-5 py-3.5 text-sm text-right font-medium">
                                                    <span className={pct > 100 ? 'text-red-600 flex items-center justify-end gap-1' : 'text-emerald-600'}>
                                                        {pct > 100 && <span className="flex items-center justify-center w-4 h-4 bg-red-100 rounded-full text-[10px] text-red-600 font-bold" title="Realisasi melebihi anggaran">!</span>}
                                                        {formatCurrency(b.total_realized)}
                                                    </span>
                                                    {pct > 100 && <p className="text-[10px] text-red-500 mt-0.5">Overbudget {formatCurrency(b.total_realized - b.total_planned)}</p>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="w-20 mx-auto">
                                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                                            <div className={clsx('h-2 rounded-full', pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                        </div>
                                                        <p className="text-[10px] text-center text-slate-500 mt-0.5">{pct.toFixed(0)}%</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canEdit && !isMulti && (
                                                            <>
                                                                <button onClick={() => onEdit(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit size={14} /></button>
                                                                <button 
                                                                    onClick={() => {
                                                                        setConfirmAction({
                                                                            title: 'Hapus Anggaran?',
                                                                            message: 'Apakah Anda yakin ingin menghapus item anggaran ini?',
                                                                            onConfirm: () => { onDelete(b.id); setIsConfirmOpen(false); }
                                                                        });
                                                                        setIsConfirmOpen(true);
                                                                    }} 
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" 
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                                <button onClick={() => onRealize(b.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg text-xs font-medium" title="Input Realisasi"><TrendingUp size={14} /></button>
                                                            </>
                                                        )}
                                                        {canEdit && isMulti && (
                                                            <>
                                                                <button 
                                                                    onClick={() => {
                                                                        setConfirmAction({
                                                                            title: 'Hapus Semua Anggaran?',
                                                                            message: `Apakah Anda yakin ingin menghapus semua (${b.ids.length}) item anggaran untuk ${b.item_name}?`,
                                                                            onConfirm: () => { b.ids.forEach((id: string) => onDelete(id)); setIsConfirmOpen(false); }
                                                                        });
                                                                        setIsConfirmOpen(true);
                                                                    }} 
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" 
                                                                    title="Hapus Semua"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog 
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmAction.onConfirm}
                title={confirmAction.title}
                message={confirmAction.message}
                variant="danger"
            />
        </div>
    );
};
