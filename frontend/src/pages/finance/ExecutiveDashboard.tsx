import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Wallet, TrendingDown, TrendingUp, DollarSign, PiggyBank, BarChart3, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';

interface DashboardData {
    total_students: number;
    total_teachers: number;
    paid_spp_count: number;
    unpaid_spp_count: number;
    total_student_savings: number;
    total_school_debt: number;
    total_school_receivables: number;
}

interface BudgetSummary { category: string; planned: number; realized: number; percentage: number; }
interface GlobalTransaction { date: string; type: string; amount: number; category: string; module: string; }

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ExecutiveDashboard: React.FC = () => {
    const { data: analytics } = useQuery<DashboardData>({
        queryKey: ['finance-dashboard'],
        queryFn: async () => (await api.get('/finance/dashboard')).data,
    });

    const { data: budgetSummary = [] } = useQuery<BudgetSummary[]>({
        queryKey: ['budget-summary-dashboard'],
        queryFn: async () => {
            try {
                const years = (await api.get('/finance/academic-years')).data || [];
                const active = years.find((y: any) => y.is_active);
                if (active) return (await api.get(`/finance/budgets/summary?academic_year_id=${active.id}`)).data || [];
                return [];
            } catch { return []; }
        },
    });

    // Today's transactions
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTxns = [] } = useQuery<GlobalTransaction[]>({
        queryKey: ['today-transactions'],
        queryFn: async () => {
            try {
                return (await api.get(`/finance/global-transactions?start_date=${today}&end_date=${today}`)).data || [];
            } catch { return []; }
        },
    });

    const pendapatanHariIni = todayTxns.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const belanjaHariIni = todayTxns.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

    // Expense by category for bar chart
    const { data: recentTxns = [] } = useQuery<GlobalTransaction[]>({
        queryKey: ['expense-chart-data'],
        queryFn: async () => {
            try {
                return (await api.get('/finance/global-transactions')).data || [];
            } catch { return []; }
        },
    });

    const expenseByCat: Record<string, number> = {};
    recentTxns.filter(t => t.type === 'Expense').forEach(t => { expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount; });
    const barData = Object.entries(expenseByCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Pie data for real-time cash composition



    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Eksekutif</h1>
                <p className="text-slate-500 mt-1">Ringkasan keuangan sekolah secara real-time</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<AlertTriangle size={20} />} label="Total Hutang" value={formatCurrency(analytics?.total_school_debt || 0)} color="red" />
                <StatCard icon={<DollarSign size={20} />} label="Total Piutang (Tagihan)" value={formatCurrency(analytics?.total_school_receivables || 0)} subtitle={`${analytics?.unpaid_spp_count || 0} tagihan belum lunas`} color="amber" />
                <StatCard icon={<TrendingUp size={20} />} label="Pendapatan Hari Ini" value={formatCurrency(pendapatanHariIni)} color="emerald" />
                <StatCard icon={<TrendingDown size={20} />} label="Belanja Hari Ini" value={formatCurrency(belanjaHariIni)} color="rose" />
            </div>

            {/* Real-time Cash + SPP Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={<PiggyBank size={20} />} label="Tabungan Siswa" value={formatCurrency(analytics?.total_student_savings || 0)} color="blue" />
                <StatCard icon={<Wallet size={20} />} label="SPP Terbayar" value={String(analytics?.paid_spp_count || 0)} subtitle="tagihan lunas" color="emerald" />
                <StatCard icon={<Wallet size={20} />} label="SPP Belum Dibayar" value={String(analytics?.unpaid_spp_count || 0)} subtitle="tagihan tertunggak" color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense by Category (Bar Chart) */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Pengeluaran per Kategori</h3>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tickFormatter={v => `${(v / 1000000).toFixed(1)}jt`} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-slate-400 text-center py-12">Belum ada data pengeluaran</p>}
                </div>

                {/* Budget Realization */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Realisasi Anggaran</h3>
                    {budgetSummary.length > 0 ? (
                        <div className="space-y-4">
                            {budgetSummary.map((s, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-700">{s.category}</span>
                                        <span className="text-xs text-slate-500">{s.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-4 relative overflow-hidden">
                                        <div className={clsx('h-4 rounded-full transition-all duration-500', s.percentage > 100 ? 'bg-red-500' : s.percentage > 80 ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                                            {formatCurrency(s.realized)} / {formatCurrency(s.planned)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-slate-400 text-center py-12">Belum ada data anggaran tahun aktif</p>}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, subtitle, color }: { icon: React.ReactNode; label: string; value: string; subtitle?: string; color: string }) => {
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        rose: 'bg-rose-50 border-rose-200 text-rose-700',
    };
    const iconColorMap: Record<string, string> = {
        emerald: 'text-emerald-500', red: 'text-red-500', amber: 'text-amber-500', blue: 'text-blue-500', rose: 'text-rose-500',
    };
    return (
        <div className={clsx('rounded-2xl p-5 border shadow-sm backdrop-blur-sm', colorMap[color] || 'bg-white border-slate-200')}>
            <div className="flex items-center gap-2 mb-2">
                <span className={iconColorMap[color] || 'text-slate-500'}>{icon}</span>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
            </div>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>}
        </div>
    );
};

export default ExecutiveDashboard;
