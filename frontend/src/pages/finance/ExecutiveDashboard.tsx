import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Wallet, TrendingDown, TrendingUp, DollarSign, PiggyBank, BarChart3, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, Area, AreaChart } from 'recharts';

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
const formatCompact = (n: number) => {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return formatCurrency(n);
};

const CHART_COLORS = {
    income: '#10b981',
    expense: '#ef4444',
    planned: '#94a3b8',
    realized: '#f59e0b',
};
const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ExecutiveDashboard: React.FC = () => {
    const [showRkasDetail, setShowRkasDetail] = useState(false);

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

    const { data: rkasBudgets = [] } = useQuery<any[]>({
        queryKey: ['rkas-budgets-dashboard'],
        queryFn: async () => {
            try {
                const years = (await api.get('/finance/academic-years')).data || [];
                const active = years.find((y: any) => y.is_active);
                if (active) return (await api.get(`/finance/budgets?academic_year_id=${active.id}`)).data || [];
                return [];
            } catch { return []; }
        },
    });

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

    const { data: recentTxns = [] } = useQuery<GlobalTransaction[]>({
        queryKey: ['expense-chart-data'],
        queryFn: async () => {
            try {
                return (await api.get('/finance/global-transactions')).data || [];
            } catch { return []; }
        },
    });

    // Expense by category
    const expenseByCat: Record<string, number> = {};
    recentTxns.filter(t => t.type === 'Expense').forEach(t => { expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount; });
    const barData = Object.entries(expenseByCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    // RKAS overview
    const totalPenerimaanPlanned = rkasBudgets.filter(b => b.budget_type === 'Penerimaan').reduce((s, b) => s + b.planned_amount, 0);
    const totalPenerimaanRealized = rkasBudgets.filter(b => b.budget_type === 'Penerimaan').reduce((s, b) => s + b.realized_amount, 0);
    const totalPengeluaranPlanned = rkasBudgets.filter(b => b.budget_type === 'Pengeluaran').reduce((s, b) => s + b.planned_amount, 0);
    const totalPengeluaranRealized = rkasBudgets.filter(b => b.budget_type === 'Pengeluaran').reduce((s, b) => s + b.realized_amount, 0);

    const rkasOverviewData = [
        { name: 'Penerimaan', Anggaran: totalPenerimaanPlanned, Realisasi: totalPenerimaanRealized },
        { name: 'Pengeluaran', Anggaran: totalPengeluaranPlanned, Realisasi: totalPengeluaranRealized }
    ];

    // RKAS Category
    const rkasCategoryData = budgetSummary.map(s => ({
        name: s.category.length > 18 ? s.category.substring(0, 16) + '…' : s.category,
        fullName: s.category,
        Anggaran: s.planned,
        Realisasi: s.realized,
        pct: s.percentage,
    }));

    // Monthly trend
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyTrendData = monthNames.map((name) => ({ name, Penerimaan: 0, Pengeluaran: 0 }));
    recentTxns.forEach(t => {
        if (!t.date) return;
        const monthIndex = new Date(t.date).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
            if (t.type === 'Income') monthlyTrendData[monthIndex].Penerimaan += t.amount;
            else if (t.type === 'Expense') monthlyTrendData[monthIndex].Pengeluaran += t.amount;
        }
    });

    // RKAS progress percentage
    const rkasRealizationPct = totalPengeluaranPlanned > 0 ? Math.round((totalPengeluaranRealized / totalPengeluaranPlanned) * 100) : 0;
    const rkasPenerimaanPct = totalPenerimaanPlanned > 0 ? Math.round((totalPenerimaanRealized / totalPenerimaanPlanned) * 100) : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-700 mb-1">{label}</p>
                    {payload.map((entry: any, i: number) => (
                        <p key={i} style={{ color: entry.color }} className="font-medium">
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Eksekutif</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Ringkasan keuangan sekolah real-time</p>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* ─── Row 1: Key Financial Metrics ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                    icon={<TrendingUp size={16} />}
                    label="Pendapatan Hari Ini"
                    value={formatCompact(pendapatanHariIni)}
                    accent="emerald"
                />
                <MetricCard
                    icon={<TrendingDown size={16} />}
                    label="Belanja Hari Ini"
                    value={formatCompact(belanjaHariIni)}
                    accent="rose"
                />
                <MetricCard
                    icon={<AlertTriangle size={16} />}
                    label="Total Hutang"
                    value={formatCompact(analytics?.total_school_debt || 0)}
                    accent="red"
                />
                <MetricCard
                    icon={<DollarSign size={16} />}
                    label="Piutang Tagihan"
                    value={formatCompact(analytics?.total_school_receivables || 0)}
                    subtitle={`${analytics?.unpaid_spp_count || 0} belum lunas`}
                    accent="amber"
                />
            </div>

            {/* ─── Row 2: SPP + Savings mini cards ─── */}
            <div className="grid grid-cols-3 gap-3">
                <MiniCard
                    icon={<PiggyBank size={15} />}
                    label="Tabungan Siswa"
                    value={formatCompact(analytics?.total_student_savings || 0)}
                    iconColor="text-blue-500"
                    iconBg="bg-blue-50"
                />
                <MiniCard
                    icon={<Wallet size={15} />}
                    label="SPP Lunas"
                    value={String(analytics?.paid_spp_count || 0)}
                    iconColor="text-emerald-500"
                    iconBg="bg-emerald-50"
                />
                <MiniCard
                    icon={<Wallet size={15} />}
                    label="SPP Tertunggak"
                    value={String(analytics?.unpaid_spp_count || 0)}
                    iconColor="text-amber-500"
                    iconBg="bg-amber-50"
                />
            </div>

            {/* ─── Row 3: Monthly Trend Chart ─── */}
            <ChartCard title="Tren Keuangan Bulanan" icon={<TrendingUp size={16} />}>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS.expense} stopOpacity={0.15} />
                                <stop offset="100%" stopColor={CHART_COLORS.expense} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} width={55} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Area type="monotone" dataKey="Penerimaan" stroke={CHART_COLORS.income} strokeWidth={2.5} fill="url(#gradIncome)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                        <Area type="monotone" dataKey="Pengeluaran" stroke={CHART_COLORS.expense} strokeWidth={2.5} fill="url(#gradExpense)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* ─── Row 4: Side-by-side charts ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Expense by Category */}
                <ChartCard title="Pengeluaran per Kategori" icon={<BarChart3 size={16} />}>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                                    {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                </ChartCard>

                {/* RKAS Overview */}
                <ChartCard title="RAB: Anggaran vs Realisasi" icon={<TrendingUp size={16} />}>
                    {rkasBudgets.length > 0 ? (
                        <div className="space-y-4">
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={rkasOverviewData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} width={55} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="Anggaran" fill={CHART_COLORS.planned} radius={[4, 4, 0, 0]} barSize={28} />
                                    <Bar dataKey="Realisasi" fill={CHART_COLORS.realized} radius={[4, 4, 0, 0]} barSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Mini progress bars */}
                            <div className="grid grid-cols-2 gap-3 pt-1 px-1">
                                <ProgressMini label="Penerimaan" pct={rkasPenerimaanPct} color="bg-emerald-500" />
                                <ProgressMini label="Pengeluaran" pct={rkasRealizationPct} color="bg-amber-500" />
                            </div>
                        </div>
                    ) : <EmptyChart />}
                </ChartCard>
            </div>

            {/* ─── Row 5: RKAS per Kategori (collapsible) ─── */}
            {rkasCategoryData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowRkasDetail(!showRkasDetail)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-slate-500" />
                            <h3 className="font-semibold text-slate-800 text-sm">RKAS Detail per Kategori</h3>
                            <span className="text-xs text-slate-400 ml-1">({rkasCategoryData.length} kategori)</span>
                        </div>
                        {showRkasDetail ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {showRkasDetail && (
                        <div className="px-5 pb-5 border-t border-slate-100">
                            <div className="pt-4 space-y-2">
                                {budgetSummary.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="w-[180px] text-slate-600 truncate shrink-0" title={item.category}>{item.category}</span>
                                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${Math.min(item.percentage, 100)}%`,
                                                    background: item.percentage > 100
                                                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                                        : item.percentage > 75
                                                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                        : 'linear-gradient(90deg, #10b981, #059669)'
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500 w-[45px] text-right">{item.percentage}%</span>
                                        <span className="text-xs text-slate-400 w-[120px] text-right hidden sm:block">{formatCompact(item.realized)} / {formatCompact(item.planned)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── Subcomponents ─── */

const MetricCard = ({ icon, label, value, subtitle, accent }: { icon: React.ReactNode; label: string; value: string; subtitle?: string; accent: string }) => {
    const styles: Record<string, { border: string; iconBg: string; iconText: string }> = {
        emerald: { border: 'border-emerald-100', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
        rose: { border: 'border-rose-100', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
        red: { border: 'border-red-100', iconBg: 'bg-red-50', iconText: 'text-red-600' },
        amber: { border: 'border-amber-100', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
    };
    const s = styles[accent] || styles.emerald;
    return (
        <div className={`bg-white rounded-xl border ${s.border} p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-lg ${s.iconBg} ${s.iconText} flex items-center justify-center`}>{icon}</span>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
            </div>
            <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
            {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
        </div>
    );
};

const MiniCard = ({ icon, label, value, iconColor, iconBg }: { icon: React.ReactNode; label: string; value: string; iconColor: string; iconBg: string }) => (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm flex items-center gap-3">
        <span className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>{icon}</span>
        <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
            <p className="text-base font-bold text-slate-800 leading-tight">{value}</p>
        </div>
    </div>
);

const ChartCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <span className="text-slate-400">{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);

const EmptyChart = () => (
    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
        <BarChart3 size={28} className="mb-2" />
        <p className="text-xs">Belum ada data</p>
    </div>
);

const ProgressMini = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
    <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>{label}</span>
            <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    </div>
);

export default ExecutiveDashboard;
