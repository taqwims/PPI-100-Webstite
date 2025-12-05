
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { CreditCard, CheckCircle, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';

interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    payment_link?: string;
}

const StudentBills: React.FC = () => {
    const { } = useAuth();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

    // Fetch student profile to get student_id
    const { data: bills, isLoading } = useQuery({
        queryKey: ['my-bills'],
        queryFn: async () => {
            const response = await api.get(`/finance/bills`);
            return response.data;
        },
    });

    const handlePayClick = (bill: Bill) => {
        setSelectedBill(bill);
        setIsPaymentModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tagihan Saya</h1>
                <p className="text-slate-600">Riwayat pembayaran dan tagihan aktif</p>
            </div>

            <CardGlass className="p-6">
                <TableGlass>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            <TableHeadGlass>Judul Tagihan</TableHeadGlass>
                            <TableHeadGlass>Jumlah</TableHeadGlass>
                            <TableHeadGlass>Jatuh Tempo</TableHeadGlass>
                            <TableHeadGlass>Status</TableHeadGlass>
                            <TableHeadGlass className="text-right">Aksi</TableHeadGlass>
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {isLoading ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8 text-slate-600">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : bills?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8 text-slate-600">Tidak ada tagihan.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            bills?.map((bill: Bill) => (
                                <TableRowGlass key={bill.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg text-green-600">
                                                <CreditCard size={18} />
                                            </div>
                                            <span className="font-medium text-slate-900">{bill.title}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-900">Rp {bill.amount.toLocaleString()}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className="text-slate-600">{new Date(bill.due_date).toLocaleDateString()}</span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bill.status === 'Paid'
                                            ? 'bg-green-100 text-green-600'
                                            : bill.status === 'Overdue'
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {bill.status}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        {bill.status !== 'Paid' && (
                                            <button
                                                className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                                                onClick={() => handlePayClick(bill)}
                                            >
                                                Bayar Sekarang
                                            </button>
                                        )}
                                        {bill.status === 'Paid' && (
                                            <span className="text-green-600 flex items-center justify-end gap-1 text-sm">
                                                <CheckCircle size={14} /> Lunas
                                            </span>
                                        )}
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))
                        )}
                    </TableBodyGlass>
                </TableGlass>
            </CardGlass>

            <ModalGlass
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Instruksi Pembayaran"
            >
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-600 mb-1">Total Pembayaran</p>
                        <p className="text-2xl font-bold text-slate-900">Rp {selectedBill?.amount.toLocaleString()}</p>
                        <p className="text-sm text-green-600 mt-1">{selectedBill?.title}</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-slate-900 font-semibold">Transfer Bank</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-slate-900">BSI</div>
                                    <div>
                                        <p className="text-slate-900 font-medium">Bank Syariah Indonesia</p>
                                        <p className="text-sm text-slate-600">a.n. Yayasan PPI 100</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 font-mono">7123456789</p>
                                    <button
                                        className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1 justify-end mt-1"
                                        onClick={() => {
                                            navigator.clipboard.writeText('7123456789');
                                            alert('Nomor rekening berhasil disalin!');
                                        }}
                                    >
                                        <Copy size={12} /> Salin
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                            Mohon lakukan transfer sesuai nominal yang tertera. Simpan bukti transfer dan konfirmasi ke bagian keuangan jika status belum berubah dalam 1x24 jam.
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <ButtonGlass onClick={() => setIsPaymentModalOpen(false)}>
                            Tutup
                        </ButtonGlass>
                    </div>
                </div>
            </ModalGlass>
        </div>
    );
};

export default StudentBills;
