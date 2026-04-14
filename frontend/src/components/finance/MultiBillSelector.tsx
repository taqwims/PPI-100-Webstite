import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, ShoppingCart } from 'lucide-react';

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    bill_type?: string;
    student_id?: number;
    student?: {
        user: { name: string };
        class?: { name: string };
    };
}

interface MultiBillSelectorProps {
    bills: Bill[];
    onSelectionChange: (selectedIds: string[], totalAmount: number) => void;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'Paid') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle size={11} /> Lunas
            </span>
        );
    }
    if (status === 'Partial') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                <Clock size={11} /> Cicil
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
            <XCircle size={11} /> Belum Bayar
        </span>
    );
};

const MultiBillSelector: React.FC<MultiBillSelectorProps> = ({ bills, onSelectionChange }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const selectableBills = bills.filter(b => b.status !== 'Paid');

    const totalAmount = bills
        .filter(b => selectedIds.has(b.id))
        .reduce((sum, b) => sum + b.amount, 0);

    useEffect(() => {
        onSelectionChange(Array.from(selectedIds), totalAmount);
    }, [selectedIds]);

    const toggleBill = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === selectableBills.length && selectableBills.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableBills.map(b => b.id)));
        }
    };

    const allSelected = selectableBills.length > 0 && selectedIds.size === selectableBills.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < selectableBills.length;

    if (bills.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200">
                <ShoppingCart size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">Tidak ada tagihan tersedia</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header with select-all */}
            <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleAll}
                        disabled={selectableBills.length === 0}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700">
                        Pilih Semua ({selectableBills.length} tagihan belum lunas)
                    </span>
                </label>
                {selectedIds.size > 0 && (
                    <span className="text-xs text-indigo-600 font-medium">
                        {selectedIds.size} dipilih
                    </span>
                )}
            </div>

            {/* Bill list */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                {bills.map(bill => {
                    const isPaid = bill.status === 'Paid';
                    const isSelected = selectedIds.has(bill.id);
                    const formattedDueDate = bill.due_date
                        ? new Date(bill.due_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                          })
                        : '-';

                    return (
                        <div
                            key={bill.id}
                            onClick={() => !isPaid && toggleBill(bill.id)}
                            className={`flex items-center gap-4 p-4 transition-colors ${
                                isPaid
                                    ? 'opacity-50 cursor-not-allowed bg-slate-50/50'
                                    : isSelected
                                    ? 'bg-indigo-50/60 cursor-pointer hover:bg-indigo-50'
                                    : 'cursor-pointer hover:bg-slate-50/80'
                            }`}
                        >
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => !isPaid && toggleBill(bill.id)}
                                disabled={isPaid}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                            />

                            {/* Bill info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{bill.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Jatuh tempo: {formattedDueDate}</p>
                            </div>

                            {/* Status badge */}
                            <StatusBadge status={bill.status} />

                            {/* Amount */}
                            <p className={`text-sm font-bold flex-shrink-0 ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                                {formatCurrency(bill.amount)}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Total summary */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={18} className="text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-800">
                            Total {selectedIds.size} tagihan dipilih
                        </span>
                    </div>
                    <span className="text-lg font-bold text-indigo-700">
                        {formatCurrency(totalAmount)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MultiBillSelector;
