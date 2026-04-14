import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Search, DollarSign, FileText, Eye, Plus } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import PPDBPaymentForm from '../../components/PPDBPaymentForm';
import PPDBPaymentStatusBadge from '../../components/PPDBPaymentStatusBadge';

interface PPDBPaymentItem {
    id: string;
    item_name: string;
    expected_amount: number;
    paid_amount: number;
}

interface PPDBPayment {
    id: string;
    ppdb_registration_id: string;
    ppdb_registration: {
        name: string;
        nisn: string;
        phone: string;
    };
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    status: string; // Belum Bayar, DP Terpenuhi, Lunas
    items: PPDBPaymentItem[];
    created_at: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const PPDBPayment: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<PPDBPayment | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [editPayment, setEditPayment] = useState<PPDBPayment | null>(null);

    const { data: payments, isLoading } = useQuery({
        queryKey: ['ppdb-payments'],
        queryFn: async () => {
            const res = await api.get('/ppdb/payments');
            return res.data;
        },
    });

    const handleViewDetail = (payment: PPDBPayment) => {
        setSelectedPayment(payment);
        setShowDetailModal(true);
    };

    const handleAddPayment = () => {
        setEditPayment(null);
        setShowPaymentForm(true);
    };

    const handleEditPayment = (payment: PPDBPayment) => {
        setEditPayment(payment);
        setShowPaymentForm(true);
    };

    const handleCloseForm = () => {
        setShowPaymentForm(false);
        setEditPayment(null);
    };

    const filteredPayments = payments?.filter((payment: PPDBPayment) =>
        payment.ppdb_registration?.name.toLowerCase().includes(search.toLowerCase()) ||
        payment.ppdb_registration?.nisn.includes(search) ||
        payment.invoice_number.includes(search)
    );

    return (
        <div className="space-y-6">
            <CardGlass className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex-1">
                        <InputGlass
                            placeholder="Cari nama, NISN, atau nomor invoice..."
                            icon={Search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <ButtonGlass
                        variant="primary"
                        onClick={handleAddPayment}
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Catat Pembayaran
                    </ButtonGlass>
                </div>

                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>No. Invoice</TableHeadGlass>
                            <TableHeadGlass>Calon Siswa</TableHeadGlass>
                            <TableHeadGlass className="text-right">Total</TableHeadGlass>
                            <TableHeadGlass className="text-right">Terbayar</TableHeadGlass>
                            <TableHeadGlass className="text-right">Sisa</TableHeadGlass>
                            <TableHeadGlass className="text-center">Status</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={7} className="text-center py-8 text-slate-600">
                                    Loading...
                                </TableCellGlass>
                            </TableRowGlass>
                        ) : filteredPayments?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={7} className="text-center py-8 text-slate-600">
                                    Tidak ada data pembayaran PPDB
                                </TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            filteredPayments?.map((payment: PPDBPayment) => {
                                const remaining = payment.total_amount - payment.paid_amount;
                                
                                return (
                                    <TableRowGlass key={payment.id}>
                                        <TableCellGlass>
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-slate-400" />
                                                <span className="font-mono text-sm text-slate-900">
                                                    {payment.invoice_number}
                                                </span>
                                            </div>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">
                                                    {payment.ppdb_registration?.name}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {payment.ppdb_registration?.nisn}
                                                </span>
                                            </div>
                                        </TableCellGlass>
                                        <TableCellGlass className="text-right">
                                            <span className="text-slate-900 font-medium">
                                                {formatCurrency(payment.total_amount)}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass className="text-right">
                                            <span className="text-green-600 font-medium">
                                                {formatCurrency(payment.paid_amount)}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass className="text-right">
                                            <span className={`font-medium ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {remaining > 0 ? formatCurrency(remaining) : '-'}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass className="text-center">
                                            <PPDBPaymentStatusBadge status={payment.status} />
                                        </TableCellGlass>
                                        <TableCellGlass className="text-right">
                                            <button
                                                onClick={() => handleViewDetail(payment)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                            >
                                                <Eye size={14} />
                                                Detail
                                            </button>
                                        </TableCellGlass>
                                    </TableRowGlass>
                                );
                            })
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>

            {/* Detail Modal */}
            <ModalGlass
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Detail Pembayaran PPDB"
            >
                {selectedPayment && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50/50 rounded-lg">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">No. Invoice</p>
                                <p className="font-mono text-sm font-medium text-slate-900">
                                    {selectedPayment.invoice_number}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Status</p>
                                <PPDBPaymentStatusBadge status={selectedPayment.status} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Nama Calon Siswa</p>
                                <p className="text-sm font-medium text-slate-900">
                                    {selectedPayment.ppdb_registration?.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">NISN</p>
                                <p className="font-mono text-sm text-slate-900">
                                    {selectedPayment.ppdb_registration?.nisn}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <DollarSign size={16} className="text-indigo-600" />
                                Rincian Pembayaran
                            </h3>
                            <div className="space-y-2">
                                {selectedPayment.items?.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{item.item_name}</p>
                                            <p className="text-xs text-slate-500">
                                                Terbayar: {formatCurrency(item.paid_amount)} dari {formatCurrency(item.expected_amount)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {formatCurrency(item.expected_amount)}
                                            </p>
                                            {item.paid_amount < item.expected_amount && (
                                                <p className="text-xs text-amber-600">
                                                    Sisa: {formatCurrency(item.expected_amount - item.paid_amount)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-600">Total</span>
                                <span className="text-lg font-bold text-slate-900">
                                    {formatCurrency(selectedPayment.total_amount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-600">Terbayar</span>
                                <span className="text-lg font-bold text-green-600">
                                    {formatCurrency(selectedPayment.paid_amount)}
                                </span>
                            </div>
                            {selectedPayment.paid_amount < selectedPayment.total_amount && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Sisa</span>
                                    <span className="text-lg font-bold text-amber-600">
                                        {formatCurrency(selectedPayment.total_amount - selectedPayment.paid_amount)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </ModalGlass>
        </div>
    );
};

export default PPDBPayment;
