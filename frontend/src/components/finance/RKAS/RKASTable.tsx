import React, { useState } from 'react';
import { Edit, Trash2, TrendingUp, ChevronDown, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
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

const MONTH_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

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
    const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void }>({
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const toggleGroup = (standarName: string) => {
        setExpandedGroups(prev => ({ ...prev, [standarName]: !prev[standarName] }));
    };

    const toggleSubGroup = (key: string) => {
        setExpandedSubGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getStatusBadge = (pct: number, isIncome: boolean) => {
        if (isIncome) {
            if (pct >= 100) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Target Tercapai</span>;
            if (pct >= 50) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">On Track</span>;
            if (pct > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Sedang Berjalan</span>;
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Belum Ada Masuk</span>;
        } else {
            if (pct > 100) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Overbudget</span>;
            if (pct >= 80) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Mendekati Pagu</span>;
            if (pct > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Terkendali</span>;
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Belum Belanja</span>;
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-5 py-4">Kode Pos</th>
                            <th className="px-5 py-4">Item Anggaran / Kegiatan</th>
                            <th className="px-5 py-4">Tahun</th>
                            <th className="px-5 py-4 text-center">Vol / Qty</th>
                            <th className="px-5 py-4 text-right">Tarif / Satuan</th>
                            <th className="px-5 py-4 text-right">Pagu Anggaran</th>
                            <th className="px-5 py-4 text-right">Realisasi Riil</th>
                            <th className="px-5 py-4 text-center">Status & Progress</th>
                            <th className="px-5 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={9} className="text-center py-16 text-slate-400 font-medium">Memuat data anggaran...</td></tr>
                        ) : Object.keys(groupedBudgets).length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-16 text-slate-400">
                                    <AlertCircle size={36} className="mx-auto text-slate-300 mb-2" />
                                    <p className="font-semibold text-slate-600">Belum ada pos anggaran {budgetTypeTab.toLowerCase()}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Klik tombol &ldquo;Tambah Anggaran&rdquo; di kanan atas untuk membuat pos baru.</p>
                                </td>
                            </tr>
                        ) : Object.entries(groupedBudgets).map(([standarName, items]) => {
                            const isGroupExpanded = expandedGroups[standarName] !== false; // Default expanded
                            const subtotalPlanned = items.reduce((s, b) => s + b.planned_amount, 0);
                            const subtotalRealized = items.reduce((s, b) => s + b.realized_amount, 0);

                            return (
                                <React.Fragment key={standarName}>
                                    {/* Standar Group Header */}
                                    <tr
                                        className="bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition select-none"
                                        onClick={() => toggleGroup(standarName)}
                                    >
                                        <td colSpan={9} className="px-5 py-3 text-xs font-bold text-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {isGroupExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                                                    <span>Pos Standar: <strong className="text-slate-900">{standarName}</strong></span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold">
                                                        {items.length} Pos
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                                                    <span>Pagu: <strong>{formatCurrency(subtotalPlanned)}</strong></span>
                                                    <span>Realisasi: <strong className={subtotalRealized > subtotalPlanned ? "text-red-600" : "text-emerald-700"}>{formatCurrency(subtotalRealized)}</strong></span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {isGroupExpanded && (() => {
                                        // Group items by transaction code or item name to merge multi-month budgets visually
                                        const groupedItems = items.reduce((acc, b) => {
                                            const key = b.transaction_code?.code || b.item_name || b.id;
                                            if (!acc[key]) {
                                                acc[key] = {
                                                    ...b,
                                                    total_planned: 0,
                                                    total_realized: 0,
                                                    months: [],
                                                    rawItems: []
                                                };
                                            }
                                            acc[key].total_planned += b.planned_amount;
                                            acc[key].total_realized += b.realized_amount;
                                            if (b.month > 0) acc[key].months.push(b.month);
                                            acc[key].rawItems.push(b);
                                            return acc;
                                        }, {} as Record<string, any>);

                                        return Object.values(groupedItems).map((b: any) => {
                                            const pct = b.total_planned > 0 ? (b.total_realized / b.total_planned) * 100 : 0;
                                            const isMulti = b.months.length > 1;
                                            const subKey = b.transaction_code?.code || b.id;
                                            const isSubExpanded = !!expandedSubGroups[subKey];

                                            return (
                                                <React.Fragment key={b.id}>
                                                    <tr className="hover:bg-slate-50/50 transition-colors group">
                                                        {/* Kode */}
                                                        <td className="px-5 py-4">
                                                            <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                                                                {b.transaction_code?.code || '-'}
                                                            </span>
                                                        </td>

                                                        {/* Item Name */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-semibold text-slate-900 text-sm">{b.item_name}</p>
                                                                {isMulti ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleSubGroup(subKey)}
                                                                        className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] rounded-md font-bold flex items-center gap-1 hover:bg-blue-100 transition"
                                                                    >
                                                                        <Calendar size={11} />
                                                                        <span>{b.months.length} Bulan</span>
                                                                        {isSubExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                                                    </button>
                                                                ) : (
                                                                    b.period === 'Bulanan' && b.month > 0 && (
                                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-md font-semibold">
                                                                            {MONTH_NAMES[b.month] || `Bulan ${b.month}`}
                                                                        </span>
                                                                    )
                                                                )}
                                                                {b.period && b.period !== 'Tahunan' && b.period !== 'Bulanan' && (
                                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded-md font-semibold">{b.period}</span>
                                                                )}
                                                            </div>
                                                            {b.notes && (
                                                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1" title={b.notes}>{b.notes}</p>
                                                            )}
                                                        </td>

                                                        {/* Tahun */}
                                                        <td className="px-5 py-4 text-xs font-medium text-slate-600">
                                                            {b.academic_year?.name || '-'}
                                                        </td>

                                                        {/* Vol / Qty */}
                                                        <td className="px-5 py-4 text-xs text-center text-slate-700 font-semibold">
                                                            {isMulti ? `${b.quantity} × ${b.months.length} bln` : (b.quantity > 0 ? b.quantity : '-')}
                                                        </td>

                                                        {/* Harga Satuan */}
                                                        <td className="px-5 py-4 text-xs text-right text-slate-600 font-medium">
                                                            {b.unit_price > 0 ? formatCurrency(b.unit_price) : '-'}
                                                        </td>

                                                        {/* Pagu Anggaran */}
                                                        <td className="px-5 py-4 text-xs text-right font-bold text-slate-900">
                                                            {formatCurrency(b.total_planned)}
                                                        </td>

                                                        {/* Realisasi Riil */}
                                                        <td className="px-5 py-4 text-xs text-right font-bold">
                                                            <div className="flex flex-col items-end">
                                                                <span className={clsx(
                                                                    budgetTypeTab === 'Pengeluaran'
                                                                        ? (pct > 100 ? 'text-red-600' : 'text-slate-900')
                                                                        : 'text-emerald-700'
                                                                )}>
                                                                    {formatCurrency(b.total_realized)}
                                                                </span>
                                                                {budgetTypeTab === 'Pengeluaran' && pct > 100 && (
                                                                    <span className="text-[10px] text-red-500 font-medium">
                                                                        +{formatCurrency(b.total_realized - b.total_planned)}
                                                                    </span>
                                                                )}
                                                                {budgetTypeTab === 'Penerimaan' && b.total_planned > b.total_realized && (
                                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                                        Sisa: {formatCurrency(b.total_planned - b.total_realized)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Progress & Status */}
                                                        <td className="px-5 py-4">
                                                            <div className="w-28 mx-auto space-y-1">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    {getStatusBadge(pct, budgetTypeTab === 'Penerimaan')}
                                                                    <span className="font-bold text-slate-600">{pct.toFixed(0)}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className={clsx(
                                                                            'h-2 rounded-full transition-all',
                                                                            pct > 100
                                                                                ? (budgetTypeTab === 'Pengeluaran' ? 'bg-red-500' : 'bg-emerald-500')
                                                                                : pct >= 80
                                                                                    ? (budgetTypeTab === 'Pengeluaran' ? 'bg-amber-500' : 'bg-blue-500')
                                                                                    : 'bg-emerald-500'
                                                                        )}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-5 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {canEdit && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => onRealize(b.id)}
                                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                                            title="Input Realisasi Kas Langsung"
                                                                        >
                                                                            <TrendingUp size={15} />
                                                                        </button>
                                                                        {!isMulti && (
                                                                            <button
                                                                                onClick={() => onEdit(b)}
                                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                                title="Edit Anggaran"
                                                                            >
                                                                                <Edit size={15} />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => {
                                                                                setConfirmAction({
                                                                                    title: isMulti ? 'Hapus Semua Anggaran Terkait?' : 'Hapus Item Anggaran?',
                                                                                    message: isMulti
                                                                                        ? `Apakah Anda yakin ingin menghapus seluruh ${b.rawItems.length} bulan anggaran untuk ${b.item_name}?`
                                                                                        : `Apakah Anda yakin ingin menghapus anggaran ${b.item_name}?`,
                                                                                    onConfirm: () => {
                                                                                        if (isMulti) {
                                                                                            b.rawItems.forEach((ri: Budget) => onDelete(ri.id));
                                                                                        } else {
                                                                                            onDelete(b.id);
                                                                                        }
                                                                                        setIsConfirmOpen(false);
                                                                                    }
                                                                                });
                                                                                setIsConfirmOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                            title="Hapus"
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Sub-rows for Multi-Month breakdown */}
                                                    {isMulti && isSubExpanded && b.rawItems.map((raw: Budget) => {
                                                        const rawPct = raw.planned_amount > 0 ? (raw.realized_amount / raw.planned_amount) * 100 : 0;
                                                        return (
                                                            <tr key={raw.id} className="bg-slate-50/30 text-xs border-l-4 border-l-blue-400">
                                                                <td className="px-5 py-2.5 text-slate-400 pl-8">↳</td>
                                                                <td className="px-5 py-2.5 font-medium text-slate-700">
                                                                    Bulan {MONTH_NAMES[raw.month] || raw.month}
                                                                </td>
                                                                <td className="px-5 py-2.5 text-slate-400">{raw.academic_year?.name}</td>
                                                                <td className="px-5 py-2.5 text-center text-slate-600">{raw.quantity}</td>
                                                                <td className="px-5 py-2.5 text-right text-slate-600">{formatCurrency(raw.unit_price)}</td>
                                                                <td className="px-5 py-2.5 text-right font-semibold text-slate-700">{formatCurrency(raw.planned_amount)}</td>
                                                                <td className="px-5 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(raw.realized_amount)}</td>
                                                                <td className="px-5 py-2.5 text-center">
                                                                    <span className="text-[10px] font-bold text-slate-500">{rawPct.toFixed(0)}%</span>
                                                                </td>
                                                                <td className="px-5 py-2.5 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {canEdit && (
                                                                            <>
                                                                                <button onClick={() => onRealize(raw.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Realisasi Bulan Ini"><TrendingUp size={13} /></button>
                                                                                <button onClick={() => onEdit(raw)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Bulan Ini"><Edit size={13} /></button>
                                                                                <button onClick={() => onDelete(raw.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Hapus Bulan Ini"><Trash2 size={13} /></button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                </React.Fragment>
                            );
                        })}
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
