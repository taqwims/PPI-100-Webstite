import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { ArrowLeft, CreditCard, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    paid_amount: number;
}

const ParentChildBills: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    const { data: bills, isLoading } = useQuery({
        queryKey: ['bills', studentId],
        queryFn: async () => {
            const res = await api.get(`/finance/bills?student_id=${studentId}`);
            return res.data;
        },
        enabled: !!studentId
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <ButtonGlass onClick={() => navigate(-1)} className="p-2">
                    <ArrowLeft size={20} />
                </ButtonGlass>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tagihan Keuangan</h1>
                    <p className="text-slate-600">Daftar tagihan sekolah</p>
                </div>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Judul Tagihan</TableHeadGlass>
                            <TableHeadGlass>Jatuh Tempo</TableHeadGlass>
                            <TableHeadGlass>Jumlah</TableHeadGlass>
                            <TableHeadGlass>Terbayar</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : bills?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8 text-slate-600">Belum ada tagihan.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            bills?.map((bill: Bill) => (
                                <TableRowGlass key={bill.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                            <CreditCard size={14} className="text-blue-600" />
                                            {bill.title}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar size={14} />
                                            {new Date(bill.due_date).toLocaleDateString()}
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-900">{formatCurrency(bill.amount)}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-green-600">{formatCurrency(bill.paid_amount)}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {bill.status === 'Paid' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">
                                                <CheckCircle size={12} /> Lunas
                                            </span>
                                        ) : bill.status === 'Partial' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-600 text-xs font-medium">
                                                <AlertCircle size={12} /> Cicilan
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                                                <AlertCircle size={12} /> Belum Lunas
                                            </span>
                                        )}
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>
        </div>
    );
};

export default ParentChildBills;
