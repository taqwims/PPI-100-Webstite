import { useState } from 'react';
import { ChevronDown, Printer, Pencil, Trash2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

export const PayrollCardMobile = ({ payroll, canManage, onEdit, onDelete, onPay, onPrint }: any) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="md:hidden bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-slate-800">{payroll.employee_name || payroll.user?.name}</h3>
                        <p className="text-xs text-slate-500">{payroll.position} • {payroll.employee_nik}</p>
                    </div>
                    <span className={clsx(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        payroll.status === 'Paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                        {payroll.status === 'Paid' ? 'Lunas' : 'Draft'}
                    </span>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Gaji Bersih</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(payroll.net_salary)}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : '' }}>
                        <ChevronDown size={18} />
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                    <div className="space-y-4">
                        {/* Pendapatan Section */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pendapatan</p>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-600">Gaji Pokok</span><span className="font-medium">{formatCurrency(payroll.base_salary)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Tunj. Fungsional</span><span className="font-medium">{formatCurrency(payroll.functional_allowance)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Tunj. Transport</span><span className="font-medium">{formatCurrency(payroll.transport_allowance)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Tugas Tambahan</span><span className="font-medium">{formatCurrency(payroll.additional_task)}</span></div>
                                {payroll.custom_income_items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between"><span className="text-emerald-600">{item.name}</span><span className="font-medium">{formatCurrency(item.amount)}</span></div>
                                ))}
                                <div className="flex justify-between pt-2 border-t border-slate-200 mt-1"><span className="font-semibold text-slate-800">Total Pendapatan</span><span className="font-bold text-slate-800">{formatCurrency(payroll.total_income)}</span></div>
                            </div>
                        </div>

                        {/* Potongan Section */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Potongan</p>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-600">Keterlambatan</span><span className="text-red-500 font-medium">-{formatCurrency(payroll.lateness_penalty)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Infaq</span><span className="text-red-500 font-medium">-{formatCurrency(payroll.infaq_deduction)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">Kasbon</span><span className="text-red-500 font-medium">-{formatCurrency(payroll.cash_advance)}</span></div>
                                {payroll.custom_deduction_items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between"><span className="text-red-500">{item.name}</span><span className="text-red-500 font-medium">-{formatCurrency(item.amount)}</span></div>
                                ))}
                                <div className="flex justify-between pt-2 border-t border-slate-200 mt-1"><span className="font-semibold text-slate-800">Total Potongan</span><span className="font-bold text-red-600">-{formatCurrency(payroll.total_deduction)}</span></div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200">
                            {payroll.notes && <p className="text-xs text-slate-500 italic mb-3">Catatan: {payroll.notes}</p>}
                            
                            <div className="flex space-x-2">
                                <button onClick={() => onPrint(payroll)} className="flex-1 bg-white border border-slate-200 text-indigo-600 py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                                    <Printer size={14} className="mr-1.5" /> Cetak
                                </button>
                                
                                {canManage && (
                                    <>
                                        <button onClick={() => onEdit(payroll)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                                            <Pencil size={14} className="mr-1.5" /> Edit
                                        </button>
                                        {payroll.status !== 'Paid' && (
                                            <button onClick={() => onPay(payroll.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                                                <CheckCircle size={14} className="mr-1.5" /> Bayar
                                            </button>
                                        )}
                                        <button onClick={() => onDelete(payroll.id)} className="w-10 bg-white border border-slate-200 text-red-500 rounded-lg flex justify-center items-center">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
