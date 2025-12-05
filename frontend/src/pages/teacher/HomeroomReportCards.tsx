import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CardGlass from '../../components/ui/glass/CardGlass';
import { TableGlass, TableHeaderGlass, TableBodyGlass, TableRowGlass, TableHeadGlass, TableCellGlass } from '../../components/ui/glass/TableGlass';
import { ArrowLeft, Printer } from 'lucide-react';

interface SubjectGrade {
    subject_name: string;
    average: number;
}

const HomeroomReportCards: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    // Fetch Report Card Data
    const { data: reportCard, isLoading } = useQuery({
        queryKey: ['report-card', studentId],
        queryFn: async () => {
            const res = await api.get(`/academic/report-cards/${studentId}`);
            return res.data as SubjectGrade[];
        },
        enabled: !!studentId
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <style>
                {`
                    @media print {
                        @page { margin: 2cm; }
                        body * { visibility: hidden; }
                        #report-card-content, #report-card-content * { visibility: visible; }
                        #report-card-content { position: absolute; left: 0; top: 0; width: 100%; }
                        .no-print { display: none !important; }
                        .print-text-black { color: black !important; }
                        .print-bg-white { background-color: white !important; }
                        .print-border { border: 1px solid #ddd !important; }
                    }
                `}
            </style>

            <div className="flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Rapor Siswa</h1>
                        <p className="text-gray-400">Laporan Hasil Belajar</p>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors"
                >
                    <Printer size={20} />
                    <span>Cetak Rapor</span>
                </button>
            </div>

            <div id="report-card-content">
                {/* Print Header */}
                <div className="hidden print:block mb-8 text-center text-black">
                    <h2 className="text-2xl font-bold uppercase">Laporan Hasil Belajar Siswa</h2>
                    <h3 className="text-xl font-semibold">Pesantren Persis 100 Banjarsari</h3>
                    <p className="text-sm mt-2">Jl. Raya Banjarsari No. 100, Ciamis, Jawa Barat</p>
                    <div className="w-full h-0.5 bg-black mt-4 mb-6"></div>
                </div>

                <CardGlass className="p-6 print:shadow-none print:border-none print:bg-white">
                    <TableGlass className="print:text-black">
                        <TableHeaderGlass>
                            <TableRowGlass className="print:border-b print:border-black">
                                <TableHeadGlass className="print:text-black print:font-bold">Mata Pelajaran</TableHeadGlass>
                                <TableHeadGlass className="print:text-black print:font-bold">Nilai Rata-rata</TableHeadGlass>
                                <TableHeadGlass className="print:text-black print:font-bold">Predikat</TableHeadGlass>
                            </TableRowGlass>
                        </TableHeaderGlass>
                        <TableBodyGlass>
                            {isLoading ? (
                                <TableRowGlass>
                                    <TableCellGlass colSpan={3} className="text-center py-8 print:text-black">Loading...</TableCellGlass>
                                </TableRowGlass>
                            ) : reportCard?.length === 0 ? (
                                <TableRowGlass>
                                    <TableCellGlass colSpan={3} className="text-center py-8 print:text-black">Belum ada data nilai.</TableCellGlass>
                                </TableRowGlass>
                            ) : (
                                reportCard?.map((grade, index) => (
                                    <TableRowGlass key={index} className="print:border-b print:border-gray-200">
                                        <TableCellGlass>
                                            <span className="font-medium text-white print:text-black">{grade.subject_name}</span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className="text-white font-bold print:text-black">{grade.average.toFixed(2)}</span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className={`px-2 py-1 rounded text-xs font-bold print:border print:border-black print:bg-transparent print:text-black ${grade.average >= 90 ? 'bg-green-500/20 text-green-400' :
                                                grade.average >= 80 ? 'bg-blue-500/20 text-blue-400' :
                                                    grade.average >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                }`}>
                                                {grade.average >= 90 ? 'A' :
                                                    grade.average >= 80 ? 'B' :
                                                        grade.average >= 70 ? 'C' : 'D'}
                                            </span>
                                        </TableCellGlass>
                                    </TableRowGlass>
                                ))
                            )}
                        </TableBodyGlass>
                    </TableGlass>
                </CardGlass>

                {/* Print Footer */}
                <div className="hidden print:flex justify-end mt-12 text-black">
                    <div className="text-center">
                        <p className="mb-20">Banjarsari, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="font-bold underline">Wali Kelas</p>
                        <p>NIP. ........................</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeroomReportCards;
