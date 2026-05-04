
import { Pencil, Trash2, CheckCircle, Printer } from 'lucide-react';
import { PayrollRecord } from './types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

// Collect all unique custom component names across all payrolls
const getUniqueCustomNames = (payrolls: PayrollRecord[], type: 'income' | 'deduction') => {
    const field = type === 'income' ? 'custom_income_items' : 'custom_deduction_items';
    const nameSet = new Set<string>();
    payrolls.forEach(p => {
        (p[field] || []).forEach((item: any) => {
            if (item.name) nameSet.add(item.name);
        });
    });
    return Array.from(nameSet);
};

export const PayrollTableDesktop = ({ payrolls, canManage, onEdit, onDelete, onPay, onPrint }: any) => {
    const customIncomeNames = getUniqueCustomNames(payrolls, 'income');
    const customDeductionNames = getUniqueCustomNames(payrolls, 'deduction');

    const fixedIncomeCount = 4;
    const fixedDeductionCount = 3;
    const totalIncomeColSpan = fixedIncomeCount + customIncomeNames.length;
    const totalDeductionColSpan = fixedDeductionCount + customDeductionNames.length;

    return (
        <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>NO</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>NAMA</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>NIK / NIP</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>JABATAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" colSpan={totalIncomeColSpan}>PENDAPATAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center bg-gray-100" rowSpan={2}>JML PENDAPATAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" colSpan={totalDeductionColSpan}>POTONGAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center bg-gray-100" rowSpan={2}>JML POTONGAN</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center bg-emerald-50 text-emerald-700" rowSpan={2}>GAJI BERSIH</th>
                        <th className="p-3 border-r border-slate-200 font-semibold text-center" rowSpan={2}>KET.</th>
                        <th className="p-3 font-semibold text-center" rowSpan={2}>AKSI</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                        {/* Fixed Pendapatan */}
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Gaji Pokok</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Tunj. Fungsional</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Tunj. Transport</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Tugas Tambahan</th>
                        {/* Custom Pendapatan */}
                        {customIncomeNames.map(name => (
                            <th key={name} className="p-2 border-r border-slate-200 font-medium text-right text-emerald-600 bg-emerald-50/30">{name}</th>
                        ))}
                        {/* Fixed Potongan */}
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Keterlambatan</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Infaq</th>
                        <th className="p-2 border-r border-slate-200 font-medium text-right">Kasbon</th>
                        {/* Custom Potongan */}
                        {customDeductionNames.map(name => (
                            <th key={name} className="p-2 border-r border-slate-200 font-medium text-right text-red-500 bg-red-50/30">{name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {payrolls.map((p: PayrollRecord, i: number) => {
                        const customIncomeMap: Record<string, number> = {};
                        (p.custom_income_items || []).forEach(item => { customIncomeMap[item.name] = item.amount; });
                        const customDeductionMap: Record<string, number> = {};
                        (p.custom_deduction_items || []).forEach(item => { customDeductionMap[item.name] = item.amount; });

                        return (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 border-r border-slate-100 text-center">{i + 1}</td>
                                <td className="p-3 border-r border-slate-100 font-medium text-slate-800">{p.employee_name || p.user?.name}</td>
                                <td className="p-3 border-r border-slate-100 text-slate-600">{p.employee_nik}</td>
                                <td className="p-3 border-r border-slate-100 text-slate-600">{p.position}</td>
                                
                                {/* Fixed Pendapatan */}
                                <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.base_salary)}</td>
                                <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.functional_allowance)}</td>
                                <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.transport_allowance)}</td>
                                <td className="p-3 border-r border-slate-100 text-right">{formatCurrency(p.additional_task)}</td>
                                {/* Custom Pendapatan */}
                                {customIncomeNames.map(name => (
                                    <td key={name} className="p-3 border-r border-slate-100 text-right text-emerald-600">{formatCurrency(customIncomeMap[name] || 0)}</td>
                                ))}
                                <td className="p-3 border-r border-slate-100 text-right font-semibold bg-gray-50">{formatCurrency(p.total_income)}</td>
                                
                                {/* Fixed Potongan */}
                                <td className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(p.lateness_penalty)}</td>
                                <td className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(p.infaq_deduction)}</td>
                                <td className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(p.cash_advance)}</td>
                                {/* Custom Potongan */}
                                {customDeductionNames.map(name => (
                                    <td key={name} className="p-3 border-r border-slate-100 text-right text-red-500">{formatCurrency(customDeductionMap[name] || 0)}</td>
                                ))}
                                <td className="p-3 border-r border-slate-100 text-right font-semibold text-red-600 bg-gray-50">{formatCurrency(p.total_deduction)}</td>
                                
                                <td className="p-3 border-r border-slate-100 text-right font-bold text-emerald-700 bg-emerald-50/30">{formatCurrency(p.net_salary)}</td>
                                <td className="p-3 border-r border-slate-100 text-slate-500 text-xs text-center">
                                    {p.status === 'Paid' ? <span className="text-emerald-600 font-medium">Lunas</span> : <span className="text-amber-600 font-medium">Draft</span>}
                                </td>
                                
                                <td className="p-3 text-center">
                                    <div className="flex items-center justify-center space-x-1 text-slate-400">
                                        <button onClick={() => onPrint(p)} className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Cetak Slip">
                                            <Printer size={16} />
                                        </button>
                                        
                                        {canManage && (
                                            <>
                                                <button onClick={() => onEdit(p)} className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => onDelete(p.id)} className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                                                    <Trash2 size={16} />
                                                </button>
                                                {p.status !== 'Paid' && (
                                                    <button onClick={() => onPay(p.id)} className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Bayar">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {payrolls.length === 0 && (
                        <tr>
                            <td colSpan={100} className="p-8 text-center text-slate-500">
                                Tidak ada data penggajian untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
