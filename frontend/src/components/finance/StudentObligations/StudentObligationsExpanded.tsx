import React from 'react';
import { FileText, CheckCircle, Edit2, Trash2, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { GroupedStudentAmount, Obligation, AcademicYear } from './types';

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

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

interface Props {
    group: GroupedStudentAmount;
    academicYears: AcademicYear[];
    filterYearId: string;
    canManage: boolean;
    setPayingOb: (ob: Obligation) => void;
    setPayAmount: (amount: string) => void;
    setEditingOb: (ob: Obligation) => void;
    setEditAmount: (amount: string) => void;
    handleDelete: (id: string, e?: React.MouseEvent) => void;
    handleBulkDeleteGroup: (ids: string[], typeName: string, e?: React.MouseEvent) => void;
    handlePrintReceipt: (params: any) => void;
}

export const StudentObligationsExpanded: React.FC<Props> = ({
    group, academicYears, filterYearId, canManage,
    setPayingOb, setPayAmount, setEditingOb, setEditAmount, handleDelete, handleBulkDeleteGroup, handlePrintReceipt
}) => {
    const byType: Record<string, Obligation[]> = {};
    group.obligations.forEach(ob => {
        const key = ob.payment_type?.name || 'Lainnya';
        if (!byType[key]) byType[key] = [];
        byType[key].push(ob);
    });

    const handlePrintAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        import('../../../utils/pdfUtils').then(mod => {
            const ayName = academicYears.find(y => String(y.id) === filterYearId)?.name || 'Semua';
            mod.generateStudentBillPDF({
                studentName: group.student_name,
                className: group.class_name,
                academicYear: ayName,
                obligations: group.obligations.map(ob => ({
                    name: ob.payment_type?.name || '-',
                    amount: ob.amount,
                    paid_amount: ob.paid_amount,
                    status: ob.status,
                    billing_month: ob.billing_month,
                    due_date: ob.due_date || undefined,
                    installment_number: ob.installment_number,
                    total_installments: ob.total_installments
                }))
            });
        });
    };

    return (
        <div className="bg-slate-50/80 p-4 pl-12 shadow-inner space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={handlePrintAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition"
                >
                    <FileText size={14} /> Cetak Surat Tagihan
                </button>
            </div>
            {Object.entries(byType).map(([typeName, obs]) => {
                const schedule = obs[0]?.payment_type?.payment_schedule || '';
                const typeTotal = obs.reduce((s, o) => s + o.amount, 0);
                const typePaid = obs.reduce((s, o) => s + o.paid_amount, 0);

                return (
                    <div key={typeName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                <span className="font-semibold text-slate-800 text-sm">{typeName}</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">{schedule}</span>
                                {canManage && (
                                    <button 
                                        onClick={(e) => handleBulkDeleteGroup(obs.map(o => o.id), typeName, e)} 
                                        className="ml-2 px-2 py-1 flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors"
                                        title={`Hapus semua tanggungan ${typeName}`}
                                    >
                                        <Trash2 size={10} /> Hapus Semua
                                    </button>
                                )}
                            </div>
                            <div className="text-xs text-slate-500">
                                {formatCurrency(typePaid)} / {formatCurrency(typeTotal)}
                            </div>
                        </div>

                        {schedule === 'Bulanan' ? (
                            <div className="p-3">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                                    {obs
                                        .filter(o => o.billing_month && o.billing_month > 0)
                                        .sort((a, b) => {
                                            const monthA = a.billing_month! < 7 ? a.billing_month! + 12 : a.billing_month!;
                                            const monthB = b.billing_month! < 7 ? b.billing_month! + 12 : b.billing_month!;
                                            return monthA - monthB;
                                        })
                                        .map((ob) => {
                                            const monthName = MONTH_NAMES[ob.billing_month!];
                                            const isPaid = ob.status === 'Paid';
                                            const isPartial = ob.status === 'Partial';
                                            return (
                                                <div
                                                    key={ob.id}
                                                    className={clsx(
                                                        'rounded-lg p-2 text-center border transition-all cursor-default',
                                                        isPaid ? 'bg-emerald-50/50 border-emerald-100' :
                                                        isPartial ? 'bg-amber-50/50 border-amber-100' :
                                                        'bg-red-50/50 border-red-100'
                                                    )}
                                                >
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-none">{monthName.slice(0, 3)}</p>
                                                    <div className="mt-1">
                                                        <p className={clsx('text-[10px] font-bold', isPaid ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-red-600')}>
                                                            {isPaid ? 'LUNAS' : isPartial ? `${Math.round((ob.paid_amount / ob.amount) * 100)}%` : 'BELUM'}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">{formatCurrency(ob.amount / 1000)}k</p>
                                                    </div>

                                                    {canManage && (
                                                        <div className="flex items-center justify-center gap-1 mt-1.5 pt-1 border-t border-black/5">
                                                            {!isPaid && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="text-[10px] hover:scale-110 transition" title="Bayar">💵</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="text-[10px] hover:scale-110 transition" title="Ubah Nominal">✏️</button>
                                                                </>
                                                            )}
                                                            <button onClick={(e) => handleDelete(ob.id, e)} className="text-[10px] hover:scale-110 transition" title="Hapus">🗑️</button>
                                                        </div>
                                                    )}
                                                    {(isPaid || isPartial) && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handlePrintReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount, billingMonth: ob.billing_month }); }} 
                                                            className="mt-1.5 w-full text-[8px] text-blue-600 border border-blue-100 py-0.5 rounded hover:bg-blue-50 font-bold transition uppercase"
                                                        >
                                                            Cetak
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ) : schedule === 'Semesteran' ? (
                            <div className="p-4 grid grid-cols-2 gap-3">
                                {obs.map((ob, idx) => {
                                    const isPaid = ob.status === 'Paid';
                                    const isPartial = ob.status === 'Partial';
                                    return (
                                        <div key={ob.id} className={clsx('rounded-xl p-4 border', isPaid ? 'bg-emerald-50 border-emerald-200' : isPartial ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                                            <p className="text-sm font-semibold text-slate-800">Semester {idx + 1}</p>
                                            <p className="text-lg font-bold mt-1 text-slate-900">{formatCurrency(ob.amount)}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(ob.status))}>{statusLabel(ob.status)}</span>
                                                {isPartial && <span className="text-xs text-slate-500">Terbayar: {formatCurrency(ob.paid_amount)}</span>}
                                            </div>
                                            {canManage && (
                                                <div className="mt-2 flex gap-1">
                                                    {!isPaid && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="flex-1 text-xs bg-green-600 text-white py-1.5 rounded-lg hover:bg-green-700 font-medium transition">Bayar</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="bg-blue-100 text-blue-600 px-2 py-1.5 rounded-lg hover:bg-blue-200 transition" title="Edit Nominal"><Edit2 size={14} /></button>
                                                        </>
                                                    )}
                                                    <button onClick={(e) => handleDelete(ob.id, e)} className="bg-red-100 text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-200 transition" title="Hapus"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                            {(isPaid || isPartial) && (
                                                <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount }); }} className="mt-2 w-full text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 font-medium transition">Cetak Kuitansi</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : obs[0]?.total_installments > 0 ? (
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex-1 bg-slate-100 rounded-full h-3">
                                        <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${(typePaid / typeTotal) * 100}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{Math.round((typePaid / typeTotal) * 100)}%</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {obs.sort((a, b) => a.installment_number - b.installment_number).map(ob => {
                                        const isPaid = ob.status === 'Paid';
                                        const isPartial = ob.status === 'Partial';
                                        return (
                                            <div key={ob.id} className={clsx('rounded-lg p-3 border text-center', isPaid ? 'bg-emerald-50 border-emerald-200' : isPartial ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                                                <p className="text-xs font-bold text-slate-600">Cicilan {ob.installment_number}/{ob.total_installments}</p>
                                                <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(ob.amount)}</p>
                                                <span className={clsx('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(ob.status))}>{statusLabel(ob.status)}</span>
                                                {canManage && (
                                                    <div className="mt-2 flex gap-1 justify-center">
                                                        {!isPaid && (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200" title="Bayar">Bayar</button>
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-1 rounded hover:bg-blue-200" title="Edit Nominal"><Edit2 size={10} /></button>
                                                            </>
                                                        )}
                                                        <button onClick={(e) => handleDelete(ob.id, e)} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-1 rounded hover:bg-red-200" title="Hapus"><Trash2 size={10} /></button>
                                                    </div>
                                                )}
                                                {(isPaid || isPartial) && (
                                                    <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount, installmentNumber: ob.installment_number, totalInstallments: ob.total_installments }); }} className="mt-1 block w-full text-[10px] text-blue-600 hover:bg-blue-50 font-medium">Cetak</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4">
                                {obs.map(ob => (
                                    <div key={ob.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{formatCurrency(ob.amount)}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(ob.status))}>{statusLabel(ob.status)}</span>
                                                {ob.paid_amount > 0 && ob.status !== 'Paid' && <span className="text-xs text-slate-500">Terbayar: {formatCurrency(ob.paid_amount)}</span>}
                                                {ob.due_date && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={8} /> {new Date(ob.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {(ob.status === 'Paid' || ob.status === 'Partial') && (
                                                <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt({ id: ob.id, studentName: group.student_name, className: group.class_name, paymentTypeName: typeName, amount: ob.amount, paidAmount: ob.paid_amount }); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Cetak Kuitansi">
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                            {canManage && ob.status !== 'Paid' && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); setPayingOb(ob); setPayAmount(String(ob.amount - ob.paid_amount)); }} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition" title="Bayar"><CheckCircle size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingOb(ob); setEditAmount(String(ob.amount)); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Ubah Nominal"><Edit2 size={16} /></button>
                                                </>
                                            )}
                                            {canManage && (
                                                <button onClick={(e) => handleDelete(ob.id, e)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition" title="Hapus"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
