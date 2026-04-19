import React, { useState } from 'react';
import { User, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { GroupedStudentAmount, Obligation, AcademicYear } from './types';
import { StudentObligationsExpanded } from './StudentObligationsExpanded';

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

interface Props {
    loading: boolean;
    groupedStudents: GroupedStudentAmount[];
    academicYears: AcademicYear[];
    filterYearId: string;
    canManage: boolean;
    setPayingOb: (ob: Obligation) => void;
    setPayAmount: (amount: string) => void;
    setEditingOb: (ob: Obligation) => void;
    setEditAmount: (amount: string) => void;
    handleDelete: (id: string, e?: React.MouseEvent) => void;
    handlePrintReceipt: (params: any) => void;
}

const statusColor = (s: string) => {
    if (s === 'Paid') return 'bg-green-100 text-green-700';
    if (s === 'Partial') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
};
const statusLabel = (s: string) => {
    if (s === 'Paid') return 'Lunas';
    if (s === 'Partial') return 'Cicilan';
    return 'Belum Bayar';
};

export const ObligationsTable: React.FC<Props> = (props) => {
    const { loading, groupedStudents } = props;
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (studentId: string) => {
        setExpandedRows(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-sm">
                        <th className="px-4 py-3 font-medium w-10"></th>
                        <th className="px-4 py-3 font-medium">Siswa</th>
                        <th className="px-4 py-3 font-medium">Kelas</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Orang Tua / Wali</th>
                        <th className="px-4 py-3 font-medium text-right">Total Tagihan</th>
                        <th className="px-4 py-3 font-medium text-right">Total Terbayar</th>
                        <th className="px-4 py-3 font-medium text-right">Sisa Tagihan / Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                    {loading ? (
                        <tr><td colSpan={7} className="py-12 text-center">
                            <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                        </td></tr>
                    ) : groupedStudents.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                            <AlertCircle size={40} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-medium text-slate-600">Belum ada tanggungan</p>
                        </td></tr>
                    ) : groupedStudents.map((group, idx) => {
                        const isExpanded = expandedRows[group.student_id];
                        const globalStatus = group.total_paid >= group.total_amount ? 'Paid' : (group.total_paid > 0 ? 'Partial' : 'Unpaid');
                        return (
                            <React.Fragment key={group.student_id}>
                                <tr 
                                    onClick={() => toggleRow(group.student_id)}
                                    className={clsx(
                                        "cursor-pointer transition-colors group",
                                        isExpanded ? "bg-blue-50/50" : (idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/30 hover:bg-slate-50")
                                    )}
                                >
                                    <td className="px-4 py-4 text-slate-400 group-hover:text-blue-600 transition-colors text-center">
                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-blue-500" />
                                            <span className="font-semibold text-slate-900">{group.student_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 text-sm">{group.class_name}</td>
                                    <td className="px-4 py-4 hidden md:table-cell">
                                        <div className="text-sm">
                                            <p className="text-slate-800 font-medium">{group.parent_name}</p>
                                            {group.parent_phone && <p className="text-xs text-slate-400">{group.parent_phone}</p>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-slate-800 text-sm">{formatCurrency(group.total_amount)}</td>
                                    <td className="px-4 py-4 text-right text-emerald-600 font-bold text-sm">{formatCurrency(group.total_paid)}</td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-red-600 font-bold text-sm">{formatCurrency(group.total_amount - group.total_paid)}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(globalStatus)}`}>{statusLabel(globalStatus)}</span>
                                        </div>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={7} className="p-0 border-b border-slate-100">
                                            <StudentObligationsExpanded 
                                                group={group}
                                                academicYears={props.academicYears}
                                                filterYearId={props.filterYearId}
                                                canManage={props.canManage}
                                                setPayingOb={props.setPayingOb}
                                                setPayAmount={props.setPayAmount}
                                                setEditingOb={props.setEditingOb}
                                                setEditAmount={props.setEditAmount}
                                                handleDelete={props.handleDelete}
                                                handlePrintReceipt={props.handlePrintReceipt}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
