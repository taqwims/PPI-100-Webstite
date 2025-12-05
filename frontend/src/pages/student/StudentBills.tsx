
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
                <h1 className="text-2xl font-bold text-white">Tagihan Saya</h1>
                <p className="text-gray-400">Riwayat pembayaran dan tagihan aktif</p>
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
                                <TableCellGlass colSpan={5} className="text-center py-8">Loading...</TableCellGlass>
                            </TableRowGlass>
                        ) : bills?.length === 0 ? (
                            <TableRowGlass>
                                <TableCellGlass colSpan={5} className="text-center py-8">Tidak ada tagihan.</TableCellGlass>
                            </TableRowGlass>
                        ) : (
                            bills?.map((bill: Bill) => (
                                <TableRowGlass key={bill.id}>
                                    <TableCellGlass>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg text-green-400">
                                                <CreditCard size={18} />
                                            </div>
                                            <span className="font-medium text-white">{bill.title}</span>
                                        </div>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        Rp {bill.amount.toLocaleString()}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        {new Date(bill.due_date).toLocaleDateString()}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bill.status === 'Paid'
                                            ? 'bg-green-500/20 text-green-400'
                                            : bill.status === 'Overdue'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {bill.status}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-right">
                                        {bill.status !== 'Paid' && (
                                            <button
                                                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                                onClick={() => handlePayClick(bill)}
                                            >
                                                Bayar Sekarang
                                            </button>
                                        )}
                                        {bill.status === 'Paid' && (
                                            <span className="text-green-400 flex items-center justify-end gap-1 text-sm">
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
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <p className="text-sm text-gray-400 mb-1">Total Pembayaran</p>
                        <p className="text-2xl font-bold text-white">Rp {selectedBill?.amount.toLocaleString()}</p>
                        <p className="text-sm text-green-400 mt-1">{selectedBill?.title}</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-white font-semibold">Transfer Bank</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">BSI</div>
                                    <div>
                                        <p className="text-white font-medium">Bank Syariah Indonesia</p>
                                        <p className="text-sm text-gray-400">a.n. Yayasan PPI 100</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-mono">7123456789</p>
                                    <button
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-end mt-1"
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

                    <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                        <p className="text-sm text-yellow-200">
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
