import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, GraduationCap, CheckCircle, XCircle, Wallet, TrendingDown, PieChart, AlertTriangle } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DashboardAnalytics {
    total_students: number;
    total_teachers: number;
    paid_spp_count: number;
    unpaid_spp_count: number;
    total_school_debt: number;
    total_student_savings: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const PrincipalDashboard = () => {
    const [stats, setStats] = useState<DashboardAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const response = await api.get('/finance/dashboard');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, []);

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    const sppData = stats ? [
        { name: 'SPP Lunas', value: stats.paid_spp_count, color: '#10b981' },
        { name: 'SPP Belum Lunas', value: stats.unpaid_spp_count, color: '#ef4444' },
    ] : [];

    const totalSPPTarget = stats ? stats.paid_spp_count + stats.unpaid_spp_count : 0;
    const sppPercentage = totalSPPTarget > 0 ? ((stats!.paid_spp_count / totalSPPTarget) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Top Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Total Siswa</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users size={20} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.total_students || 0}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Dewan Asatidz</h3>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <GraduationCap size={20} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.total_teachers || 0}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Total Tabungan Pasif</h3>
                        <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats?.total_student_savings || 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">Saldo akumulatif dipegang sekolah</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between border-l-4 border-l-red-500 group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Utang Pihak Ke-3</h3>
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats?.total_school_debt || 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">Sumber dari Kas Umum</p>
                </div>
            </div>

            {/* Analytical Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* SPP Breakdown Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-slate-50 rounded-lg">
                            <PieChart size={24} className="text-slate-700" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Persentase SPP Aktif</h3>
                            <p className="text-sm text-slate-500">Perbandingan status pembayaran</p>
                        </div>
                    </div>

                    {totalSPPTarget === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <AlertTriangle size={48} className="mb-4 text-slate-300" />
                            <p>Belum ada data tagihan SPP yg tersedia.</p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                <span className="text-4xl font-extrabold text-emerald-600">{sppPercentage}%</span>
                                <span className="text-sm text-slate-500 font-medium tracking-wide">LUNAS</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={sppData}
                                        innerRadius={90}
                                        outerRadius={120}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {sppData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => [`${value} Transaksi`, 'Jumlah']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Quick Recap Action or Detailed List Placeholders */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Rangkuman Kesehatan Finansial</h3>

                    <div className="space-y-6">
                        <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <CheckCircle className="text-emerald-500 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold text-slate-800">SPP Terbayar</h4>
                                <p className="text-slate-600 text-sm mt-1">
                                    Terdapat {stats?.paid_spp_count} tagihan yang sukses terbayar dari {totalSPPTarget} total target tagihan SPP sistem.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4 p-4 rounded-xl bg-red-50 border border-red-100">
                            <XCircle className="text-red-500 mt-1" size={24} />
                            <div>
                                <h4 className="font-semibold text-slate-800">Potensi Tunggakan</h4>
                                <p className="text-slate-600 text-sm mt-1">
                                    Perlu pengingat kepada {stats?.unpaid_spp_count} wali murid yang belum menyelesaikan kewajiban tagihannya.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrincipalDashboard;
