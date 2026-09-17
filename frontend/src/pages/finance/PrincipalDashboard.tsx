import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Users, GraduationCap, CheckCircle, Wallet, 
    PieChart, Calendar, Layers, Printer, ChevronRight, Activity, Award, BarChart3, 
    RefreshCw, Eye, Sparkles, X
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
    CartesianGrid, PieChart as RePieChart, Pie, Cell, Legend 
} from 'recharts';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface StudentBrief {
    id: string;
    name: string;
    nisn: string;
    status: string;
    paid_count: number;
    unpaid_count: number;
    total_paid_nominal: number;
    total_unpaid_nominal: number;
}

interface ClassSummary {
    class_id: number;
    class_name: string;
    homeroom_teacher: string;
    student_count: number;
    paid_count: number;
    unpaid_count: number;
    total_paid_nominal: number;
    total_unpaid_nominal: number;
    collection_rate: number;
    students: StudentBrief[];
}

interface ActivityDetail {
    id: string;
    name: string;
    description: string;
    status: string;
    target_amount: number;
    start_date: string;
    end_date: string;
    participants: number;
    total_target: number;
    total_collected: number;
    total_expense: number;
    balance: number;
    collection_rate: number;
}

interface ActivitiesSummary {
    active_count: number;
    total_count: number;
    active_list: ActivityDetail[];
    all_list: ActivityDetail[];
}

interface CashLedgerSummary {
    total_income: number;
    total_expense: number;
    current_balance: number;
    recent_transactions: Array<{
        id: string;
        invoice_number?: string;
        date: string;
        source: string;
        item_name: string;
        type: string;
        amount: number;
        category: string;
    }>;
}

interface RKASSummary {
    planned_penerimaan: number;
    realized_penerimaan: number;
    planned_pengeluaran: number;
    realized_pengeluaran: number;
    serapan_pengeluaran_pct: number;
}

interface MonthlyTrendItem {
    month: string;
    income: number;
    expense: number;
}

interface ClassSavingsSummary {
    class_name: string;
    accounts_count: number;
    total_balance: number;
}

interface RecentSavingTx {
    id: string;
    student_name: string;
    class_name: string;
    type: string;
    amount: number;
    date: string;
}

interface SavingsSummary {
    total_accounts: number;
    total_balance: number;
    total_deposits: number;
    total_withdrawals: number;
    operational_debt: number;
    receivable_debt: number;
    available_cash: number;
    classes_breakdown: ClassSavingsSummary[];
    recent_transactions: RecentSavingTx[];
}

interface DashboardAnalytics {
    total_students: number;
    total_teachers: number;
    total_classes: number;
    paid_spp_count: number;
    unpaid_spp_count: number;
    total_spp_paid_nominal: number;
    total_spp_unpaid_nominal: number;
    total_school_receivables: number;
    total_student_savings: number;
    total_school_debt: number;
    classes_summary?: ClassSummary[];
    activities_summary?: ActivitiesSummary;
    cash_ledger?: CashLedgerSummary;
    rkas_summary?: RKASSummary;
    monthly_trend?: MonthlyTrendItem[];
    savings_summary?: SavingsSummary;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

const PrincipalDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [academicYearName, setAcademicYearName] = useState<string>('Tahun Ajaran Aktif');
    const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
    const [activeTab, setActiveTab] = useState<'classes' | 'savings' | 'finance'>('classes');

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const [dashRes, yearsRes] = await Promise.all([
                api.get('/finance/dashboard'),
                api.get('/finance/academic-years').catch(() => ({ data: [] }))
            ]);
            setStats(dashRes.data);

            const years = yearsRes.data || [];
            const activeYear = years.find((y: any) => y.is_active);
            if (activeYear) {
                setAcademicYearName(activeYear.name);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
            toast.error("Gagal memuat data analitik dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    // Print Executive Summary PDF
    const handlePrintExecutiveSummary = () => {
        if (!stats) return;

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text('LAPORAN EKSEKUTIF PIMPINAN & YAYASAN', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Periode: ${academicYearName} | Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, pageWidth / 2, 27, { align: 'center' });
        doc.line(14, 32, pageWidth - 14, 32);

        // Section 1: KPI Ringkasan
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Ringkasan Eksekutif Utama', 14, 40);

        const totalKas = (stats.cash_ledger?.total_income || 0) - (stats.cash_ledger?.total_expense || 0);
        const sppTotalCount = (stats.paid_spp_count || 0) + (stats.unpaid_spp_count || 0);
        const sppPercent = sppTotalCount > 0 ? (((stats.paid_spp_count || 0) / sppTotalCount) * 100).toFixed(1) : '0';

        autoTable(doc, {
            startY: 44,
            head: [['Indikator Utama', 'Nilai Riil', 'Keterangan']],
            body: [
                ['Total Santri / Siswa', `${stats.total_students || 0} Santri`, `Tersebar di ${stats.total_classes || 0} Kelas Aktif`],
                ['Tenaga Pendidik / Asatidz', `${stats.total_teachers || 0} Ustadz/Ustadzah`, 'Dewan Guru Aktif'],
                ['Saldo Kas Umum (BKU)', formatCurrency(totalKas), `Masuk: ${formatCurrency(stats.cash_ledger?.total_income || 0)} | Keluar: ${formatCurrency(stats.cash_ledger?.total_expense || 0)}`],
                ['Tingkat Kelunasan SPP & Tagihan', `${sppPercent}% (${stats.paid_spp_count || 0} Lunas)`, `Terkumpul: ${formatCurrency(stats.total_spp_paid_nominal || 0)} | Tunggakan: ${formatCurrency(stats.total_spp_unpaid_nominal || 0)}`],
                ['Total Tabungan Siswa', formatCurrency(stats.total_student_savings || 0), 'Dana titipan santri di sekolah'],
                ['Total Kewajiban / Utang Sekolah', formatCurrency(stats.total_school_debt || 0), 'Utang pihak ke-3 & operasional'],
                ['Serapan Belanja RKAS', `${(stats.rkas_summary?.serapan_pengeluaran_pct || 0).toFixed(1)}%`, `Realisasi: ${formatCurrency(stats.rkas_summary?.realized_pengeluaran || 0)} dari ${formatCurrency(stats.rkas_summary?.planned_pengeluaran || 0)}`]
            ],
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            headStyles: { fillColor: [30, 41, 59], textColor: 255 },
            theme: 'grid'
        });

        // Section 2: Siswa & Tagihan per Kelas
        const finalY1 = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('2. Rekapitulasi Siswa & Tagihan per Kelas', 14, finalY1);

        const classTableData = (stats.classes_summary || []).map((c, i) => [
            i + 1,
            c.class_name,
            c.homeroom_teacher || '-',
            `${c.student_count} Santri`,
            `${c.paid_count} Lunas`,
            `${c.unpaid_count} Nunggak`,
            formatCurrency(c.total_paid_nominal),
            formatCurrency(c.total_unpaid_nominal),
            `${c.collection_rate.toFixed(1)}%`
        ]);

        autoTable(doc, {
            startY: finalY1 + 4,
            head: [['No', 'Kelas', 'Wali Kelas', 'Siswa', 'Lunas', 'Nunggak', 'Terkumpul', 'Sisa Tunggakan', 'Kelunasan']],
            body: classTableData.length > 0 ? classTableData : [['-', 'Belum ada data kelas', '-', '-', '-', '-', '-', '-', '-']],
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [16, 185, 129], textColor: 255 },
            theme: 'striped'
        });

        // Section 3: Kegiatan Siswa Yang Sedang Berjalan
        const finalY2 = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('3. Laporan Finansial Kegiatan Siswa', 14, finalY2);

        const activitiesData = (stats.activities_summary?.all_list || []).map((act, i) => [
            i + 1,
            act.name,
            act.status === 'Active' ? 'Sedang Berjalan' : 'Selesai',
            `${formatDate(act.start_date)} - ${formatDate(act.end_date)}`,
            `${act.participants} Siswa`,
            formatCurrency(act.total_target),
            formatCurrency(act.total_collected),
            formatCurrency(act.total_expense),
            formatCurrency(act.balance)
        ]);

        autoTable(doc, {
            startY: finalY2 + 4,
            head: [['No', 'Nama Kegiatan', 'Status', 'Jadwal Pelaksanaan', 'Peserta', 'Target Biaya', 'Iuran Masuk', 'Pengeluaran', 'Saldo Kas']],
            body: activitiesData.length > 0 ? activitiesData : [['-', 'Belum ada kegiatan terdaftar', '-', '-', '-', '-', '-', '-', '-']],
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            theme: 'striped'
        });

        doc.save(`Laporan_Eksekutif_Pimpinan_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success("Laporan Eksekutif PDF berhasil diunduh");
    };

    if (loading) {
        return (
            <div className="p-12 flex flex-col justify-center items-center h-[70vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p className="text-slate-500 font-medium text-sm">Menghubungkan & memuat data analitik pimpinan...</p>
            </div>
        );
    }

    // SPP Chart Data
    const sppData = stats ? [
        { name: 'Tagihan Lunas', value: stats.paid_spp_count || 0, color: '#10b981' },
        { name: 'Tunggakan / Belum Lunas', value: stats.unpaid_spp_count || 0, color: '#ef4444' },
    ] : [];

    const totalSPPTarget = stats ? (stats.paid_spp_count || 0) + (stats.unpaid_spp_count || 0) : 0;
    const sppPercentage = totalSPPTarget > 0 ? (((stats?.paid_spp_count || 0) / totalSPPTarget) * 100).toFixed(1) : '0';

    const cashBalance = (stats?.cash_ledger?.total_income || 0) - (stats?.cash_ledger?.total_expense || 0);

    return (
        <div className="space-y-7 pb-12">
            {/* Header Eksekutif & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-700/50">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={13} /> Portal Eksekutif Pimpinan & Yayasan
                        </span>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-semibold">
                            {academicYearName}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Dashboard Pimpinan Sekolah
                    </h1>
                    <p className="text-slate-300 text-sm max-w-2xl">
                        Pemantauan menyeluruh real-time data santri per kelas, laporan kegiatan siswa yang sedang berjalan, dan kesehatan finansial institusi.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={fetchDashboardStats}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-600 transition shadow-sm"
                        title="Segarkan Data"
                    >
                        <RefreshCw size={16} />
                        <span>Segarkan</span>
                    </button>
                    <button
                        onClick={handlePrintExecutiveSummary}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-md hover:shadow-emerald-600/30"
                    >
                        <Printer size={16} />
                        <span>Cetak Laporan Eksekutif</span>
                    </button>
                </div>
            </div>

            {/* Top 5 Key Performance Indicator (KPI) Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
                {/* 1. Total Siswa & Kelas */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Santri</span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Users size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-extrabold text-slate-800">{stats?.total_students || 0}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                            <Layers size={13} className="text-emerald-500" />
                            {stats?.total_classes || 0} Kelas • {stats?.total_teachers || 0} Asatidz
                        </p>
                    </div>
                </div>

                {/* 2. Saldo Kas Riil (BKU) */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Kas Umum</span>
                        <div className={`w-10 h-10 rounded-xl ${cashBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                            <Wallet size={20} />
                        </div>
                    </div>
                    <div>
                        <p className={`text-xl font-extrabold ${cashBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            {formatCurrency(cashBalance)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                            In: <span className="text-emerald-600 font-semibold">{formatCurrency(stats?.cash_ledger?.total_income || 0)}</span>
                        </p>
                    </div>
                </div>

                {/* 3. Kelunasan SPP / Tagihan */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelunasan SPP</span>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-extrabold text-slate-800">{sppPercentage}%</p>
                            <span className="text-xs font-semibold text-emerald-600">({stats?.paid_spp_count || 0} Lunas)</span>
                        </div>
                        <p className="text-[11px] text-red-500 mt-1 font-medium truncate">
                            Sisa Piutang: {formatCurrency(stats?.total_spp_unpaid_nominal || 0)}
                        </p>
                    </div>
                </div>

                {/* 4. Tabungan Santri */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tabungan Santri</span>
                        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Award size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xl font-extrabold text-slate-800">
                            {formatCurrency(stats?.total_student_savings || 0)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Saldo pasif titipan aman</p>
                    </div>
                </div>

                {/* 5. Serapan Belanja RKAS */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Serapan RKAS</span>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-800">
                            {(stats?.rkas_summary?.serapan_pengeluaran_pct || 0).toFixed(1)}%
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
                            Realisasi: {formatCurrency(stats?.rkas_summary?.realized_pengeluaran || 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* SEKSI KEGIATAN YANG SEDANG BERJALAN (Active Events & Activities) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Kegiatan Santri Sedang Berjalan</h2>
                            <p className="text-xs sm:text-sm text-slate-500">
                                Pantau event, target iuran santri, pengeluaran panitia, dan sisa saldo riil kegiatan.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/dashboard/finance/activities"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl transition"
                    >
                        <span>Kelola Kegiatan</span>
                        <ChevronRight size={15} />
                    </Link>
                </div>

                {(!stats?.activities_summary?.active_list || stats.activities_summary.active_list.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                        <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-600 font-semibold text-sm">Tidak ada kegiatan yang sedang berjalan saat ini</p>
                        <p className="text-xs text-slate-400 mt-1">Semua kegiatan telah selesai atau belum ada kegiatan baru yang diaktifkan.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {stats.activities_summary.active_list.map((act) => (
                            <div 
                                key={act.id} 
                                className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl border border-purple-100/80 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full uppercase tracking-wide">
                                                Sedang Berjalan
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                                <Calendar size={13} />
                                                {formatDate(act.start_date)} - {formatDate(act.end_date)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">{act.name}</h3>
                                        {act.description && (
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.description}</p>
                                        )}
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-xs text-slate-400 block font-medium">Target / Santri</span>
                                        <span className="text-sm font-bold text-slate-800">{formatCurrency(act.target_amount)}</span>
                                    </div>
                                </div>

                                {/* Mini Financial Metrics of Activity */}
                                <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-white/90 backdrop-blur-xs rounded-xl border border-purple-100 text-xs mt-3">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Iuran Masuk</span>
                                        <span className="font-bold text-emerald-600 text-sm">
                                            {formatCurrency(act.total_collected)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-0.5">
                                            {act.participants} santri terdaftar
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Pengeluaran</span>
                                        <span className="font-bold text-slate-700 text-sm">
                                            {formatCurrency(act.total_expense)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-0.5">Operasional panitia</span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Sisa Saldo Kas</span>
                                        <span className={`font-bold text-sm ${act.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {formatCurrency(act.balance)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-0.5">Dana tersedia</span>
                                    </div>
                                </div>

                                {/* Progress Iuran */}
                                <div className="mt-3.5">
                                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                                        <span className="text-slate-600">Realisasi Iuran Santri</span>
                                        <span className="text-purple-700 font-bold">{act.collection_rate.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${Math.min(100, act.collection_rate)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SEKSI TAB DATA: SISWA PER KELAS & REKAP KEUANGAN */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
                            activeTab === 'classes' 
                                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Users size={16} />
                        <span>Data Siswa & Tagihan per Kelas</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                            {stats?.classes_summary?.length || 0} Kelas
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('savings')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
                            activeTab === 'savings' 
                                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Wallet size={16} />
                        <span>Statistik Tabungan Santri</span>
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full text-[10px]">
                            {formatCurrency(stats?.total_student_savings || 0)}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
                            activeTab === 'finance' 
                                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <PieChart size={16} />
                        <span>Analisis Arus Kas & RKAS</span>
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'classes' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Distribusi Santri & Status Kelunasan Administrasi per Kelas</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Klik tombol rincian untuk melihat daftar nama santri beserta status kewajibannya.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/90 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="p-4">Kelas</th>
                                            <th className="p-4">Wali Kelas</th>
                                            <th className="p-4 text-center">Jumlah Santri</th>
                                            <th className="p-4">Kelunasan Tagihan</th>
                                            <th className="p-4 text-right">Terkumpul</th>
                                            <th className="p-4 text-right">Sisa Tunggakan</th>
                                            <th className="p-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(!stats?.classes_summary || stats.classes_summary.length === 0) ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400">
                                                    Belum ada data kelas yang terdaftar.
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.classes_summary.map((cls) => (
                                                <tr key={cls.class_id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-bold text-slate-900">
                                                        {cls.class_name}
                                                    </td>
                                                    <td className="p-4 text-slate-600 text-xs">
                                                        <span className="flex items-center gap-1.5 font-medium">
                                                            <GraduationCap size={15} className="text-blue-500 shrink-0" />
                                                            {cls.homeroom_teacher || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-100">
                                                            {cls.student_count} Santri
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-36">
                                                            <div className="flex justify-between text-[11px] font-semibold mb-1">
                                                                <span className="text-emerald-600">{cls.paid_count} Lunas</span>
                                                                <span className="text-red-500">{cls.unpaid_count} Nunggak</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="bg-emerald-500 h-full rounded-full" 
                                                                    style={{ width: `${Math.min(100, cls.collection_rate)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                                                        {formatCurrency(cls.total_paid_nominal)}
                                                    </td>
                                                    <td className="p-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                                                        {formatCurrency(cls.total_unpaid_nominal)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => setSelectedClass(cls)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition"
                                                        >
                                                            <Eye size={14} />
                                                            <span>Rincian</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'savings' && (
                        <div className="space-y-6">
                            {/* 4 Savings Pool Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100">
                                    <span className="text-xs font-bold text-violet-700 uppercase tracking-wider block mb-1">
                                        Total Simpanan Santri
                                    </span>
                                    <p className="text-2xl font-extrabold text-slate-900">
                                        {formatCurrency(stats?.savings_summary?.total_balance || stats?.total_student_savings || 0)}
                                    </p>
                                    <p className="text-[11px] text-violet-600 mt-1 font-medium">
                                        {stats?.savings_summary?.total_accounts || 0} Rekening Santri Terdaftar
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                                        Kas Tabungan Bebas (Riil)
                                    </span>
                                    <p className="text-2xl font-extrabold text-emerald-700">
                                        {formatCurrency(stats?.savings_summary?.available_cash || 0)}
                                    </p>
                                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                                        Dana segar siap ditarik santri
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">
                                        Dipinjam Operasional
                                    </span>
                                    <p className="text-2xl font-extrabold text-amber-800">
                                        {formatCurrency(stats?.savings_summary?.operational_debt || 0)}
                                    </p>
                                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                                        Kewajiban kas umum ke tabungan
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                                        Dipinjam Dana Talangan
                                    </span>
                                    <p className="text-2xl font-extrabold text-blue-800">
                                        {formatCurrency(stats?.savings_summary?.receivable_debt || 0)}
                                    </p>
                                    <p className="text-[11px] text-blue-600 mt-1 font-medium">
                                        Piutang / talangan tertagih
                                    </p>
                                </div>
                            </div>

                            {/* Two Column Layout: Distribusi Saldo per Kelas & Mutasi Terakhir */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Distribusi Tabungan per Kelas */}
                                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">Saldo Tabungan per Kelas</h4>
                                            <p className="text-xs text-slate-500">Distribusi akumulatif simpanan santri per rombel</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-white text-slate-600 uppercase font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3">Kelas</th>
                                                    <th className="p-3 text-center">Rekening</th>
                                                    <th className="p-3 text-right">Total Saldo</th>
                                                    <th className="p-3 text-right">Rata-rata/Santri</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {(!stats?.savings_summary?.classes_breakdown || stats.savings_summary.classes_breakdown.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-6 text-center text-slate-400">
                                                            Belum ada data tabungan per kelas.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    stats.savings_summary.classes_breakdown.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="p-3 font-bold text-slate-800">{item.class_name}</td>
                                                            <td className="p-3 text-center">
                                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                                                                    {item.accounts_count} Rek.
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                                {formatCurrency(item.total_balance)}
                                                            </td>
                                                            <td className="p-3 text-right text-slate-600 font-medium">
                                                                {item.accounts_count > 0 ? formatCurrency(item.total_balance / item.accounts_count) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mutasi Tabungan Terakhir */}
                                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">Mutasi Tabungan Santri Terakhir</h4>
                                            <p className="text-xs text-slate-500">Aktivitas setoran & penarikan tabungan terbaru</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        {(!stats?.savings_summary?.recent_transactions || stats.savings_summary.recent_transactions.length === 0) ? (
                                            <div className="p-6 text-center text-slate-400 bg-white rounded-xl">
                                                Belum ada mutasi transaksi tabungan.
                                            </div>
                                        ) : (
                                            stats.savings_summary.recent_transactions.map((tx) => {
                                                const isDeposit = tx.type.toLowerCase() === 'deposit';
                                                return (
                                                    <div key={tx.id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:shadow-2xs transition">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                                                isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {isDeposit ? '+' : '-'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 line-clamp-1">{tx.student_name}</p>
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    Kelas {tx.class_name} • {formatDate(tx.date)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`font-bold ${isDeposit ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                                                            </span>
                                                            <span className="block text-[10px] text-slate-400 capitalize">
                                                                {isDeposit ? 'Setoran' : 'Penarikan'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Card */}
                            <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                                <div>
                                    <h4 className="font-bold text-sm">Ingin Melihat Detail Buku Tabungan & Penarikan?</h4>
                                    <p className="text-xs text-violet-200 mt-0.5">
                                        Pimpinan dapat memantau rekening individu setiap santri, riwayat operasional, dan rekapitulasi periodik.
                                    </p>
                                </div>
                                <Link
                                    to="/dashboard/finance/savings"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-violet-800 hover:bg-violet-50 rounded-xl font-bold text-xs transition shrink-0"
                                >
                                    <Wallet size={15} />
                                    <span>Buka Modul Tabungan</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-6">
                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Arus Kas Bulanan */}
                                <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Tren Arus Kas Bulanan (BKU)</h4>
                                    <p className="text-xs text-slate-500 mb-4">Perbandingan penerimaan kas riil dan pengeluaran</p>
                                    
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats?.monthly_trend || []}>
                                                <defs>
                                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="month" fontSize={11} stroke="#64748b" />
                                                <YAxis fontSize={10} stroke="#64748b" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}Jt`} />
                                                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                                <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                                                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* SPP Breakdown Chart */}
                                <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200 flex flex-col">
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Rasio Status Tagihan Administrasi</h4>
                                    <p className="text-xs text-slate-500 mb-4">Perbandingan tagihan lunas vs tunggakan seluruh santri</p>

                                    <div className="flex-1 min-h-[220px] flex items-center justify-center relative">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                            <span className="text-3xl font-extrabold text-emerald-600">{sppPercentage}%</span>
                                            <span className="text-[11px] text-slate-500 font-semibold tracking-wide">TERSELESAIKAN</span>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                                <Pie
                                                    data={sppData}
                                                    innerRadius={70}
                                                    outerRadius={95}
                                                    paddingAngle={6}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {sppData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => [`${value} Tagihan`, 'Jumlah']} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* RKAS Progress Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-600">Realisasi Penerimaan RKAS</span>
                                        <span className="text-xs font-extrabold text-emerald-600">
                                            {formatCurrency(stats?.rkas_summary?.realized_penerimaan || 0)} / {formatCurrency(stats?.rkas_summary?.planned_penerimaan || 0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-emerald-500 h-full rounded-full"
                                            style={{ 
                                                width: `${stats?.rkas_summary?.planned_penerimaan ? Math.min(100, (((stats.rkas_summary?.realized_penerimaan || 0) / stats.rkas_summary.planned_penerimaan) * 100)) : 0}%` 
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-600">Realisasi Belanja Pengeluaran RKAS</span>
                                        <span className="text-xs font-extrabold text-indigo-600">
                                            {formatCurrency(stats?.rkas_summary?.realized_pengeluaran || 0)} / {formatCurrency(stats?.rkas_summary?.planned_pengeluaran || 0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-indigo-600 h-full rounded-full"
                                            style={{ 
                                                width: `${stats?.rkas_summary?.planned_pengeluaran ? Math.min(100, (((stats.rkas_summary?.realized_pengeluaran || 0) / stats.rkas_summary.planned_pengeluaran) * 100)) : 0}%` 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL RINCIAN SANTRI KELAS */}
            {selectedClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Daftar Santri — {selectedClass.class_name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Wali Kelas: <span className="font-semibold text-slate-700">{selectedClass.homeroom_teacher}</span> • Total {selectedClass.student_count} Santri
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {(!selectedClass.students || selectedClass.students.length === 0) ? (
                                <div className="p-8 text-center text-slate-400">
                                    Tidak ada santri yang terdaftar di kelas ini.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {selectedClass.students.map((st, idx) => (
                                        <div key={st.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{st.name}</h4>
                                                    <span className="text-[11px] text-slate-400 font-mono">NISN: {st.nisn || '-'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-medium">Terbayar</span>
                                                    <span className="font-bold text-emerald-600">{formatCurrency(st.total_paid_nominal)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-medium">Sisa Tunggakan</span>
                                                    <span className="font-bold text-red-500">{formatCurrency(st.total_unpaid_nominal)}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                    st.unpaid_count === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {st.unpaid_count === 0 ? 'Lunas' : `${st.unpaid_count} Tagihan`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrincipalDashboard;
