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
    const [showRkasExpenseDetail, setShowRkasExpenseDetail] = useState(false);
    const [showRkasIncomeDetail, setShowRkasIncomeDetail] = useState(false);

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

    // RKAS Category Breakdown (Pengeluaran)
    const expenseCategoryData = React.useMemo(() => {
        const catMap: Record<string, { category: string; planned: number; realized: number }> = {};
        rkasBudgets.filter(b => b.budget_type === 'Pengeluaran').forEach(b => {
            const catName = b.category?.name || 'Operasional';
            if (!catMap[catName]) catMap[catName] = { category: catName, planned: 0, realized: 0 };
            catMap[catName].planned += b.planned_amount || 0;
            catMap[catName].realized += b.realized_amount || 0;
        });
        const list = Object.values(catMap).map(item => ({
            category: item.category,
            planned: item.planned,
            realized: item.realized,
            percentage: item.planned > 0 ? (item.realized / item.planned) * 100 : 0
        }));
        if (list.length > 0) return list.sort((a, b) => b.planned - a.planned);
        return budgetSummary;
    }, [rkasBudgets, budgetSummary]);

    // RKAS Category Breakdown (Pemasukan)
    const incomeCategoryData = React.useMemo(() => {
        const catMap: Record<string, { category: string; planned: number; realized: number }> = {};
        rkasBudgets.filter(b => b.budget_type === 'Penerimaan').forEach(b => {
            const catName = b.category?.name || 'Penerimaan';
            if (!catMap[catName]) catMap[catName] = { category: catName, planned: 0, realized: 0 };
            catMap[catName].planned += b.planned_amount || 0;
            catMap[catName].realized += b.realized_amount || 0;
        });
        return Object.values(catMap).map(item => ({
            category: item.category,
            planned: item.planned,
            realized: item.realized,
            percentage: item.planned > 0 ? (item.realized / item.planned) * 100 : 0
        })).sort((a, b) => b.planned - a.planned);
    }, [rkasBudgets]);

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

            {/* ─── Row 5: Realisasi Anggaran Kategori Pengeluaran (collapsible) ─── */}
            {expenseCategoryData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowRkasExpenseDetail(!showRkasExpenseDetail)}
                        className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 rounded-lg text-rose-600 group-hover:bg-rose-100 transition-colors">
                                <TrendingDown size={18} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-800 text-base">Realisasi Anggaran Kategori Pengeluaran</h3>
                                <p className="text-xs text-slate-400 font-medium">Klik untuk melihat detail realisasi {expenseCategoryData.length} kategori pengeluaran RKAS</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                                {totalPengeluaranPlanned > 0 ? Math.round(totalPengeluaranRealized / totalPengeluaranPlanned * 100) : 0}% Total
                            </span>
                            {showRkasExpenseDetail ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                    </button>
                    {showRkasExpenseDetail && (
                        <div className="px-6 pb-6 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                                {expenseCategoryData.map((item, i) => {
                                    const pct = Math.round(item.percentage);
                                    const isOver = pct > 100;
                                    return (
                                        <div key={i} className="group py-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-slate-700 truncate max-w-[220px]" title={item.category}>
                                                    {item.category}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-slate-600'}`}>
                                                        {pct}%
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        ({formatCompact(item.realized)})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${Math.min(pct, 100)}%`,
                                                        background: isOver
                                                            ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                                                            : pct > 85
                                                            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                            : 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                                                <span>Pagu Anggaran: {formatCompact(item.planned)}</span>
                                                {isOver && <span className="text-red-500 font-bold">Over budget!</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Row 6: Realisasi Anggaran Kategori Pemasukan (collapsible) ─── */}
            {incomeCategoryData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowRkasIncomeDetail(!showRkasIncomeDetail)}
                        className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <TrendingUp size={18} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-800 text-base">Realisasi Anggaran Kategori Pemasukan</h3>
                                <p className="text-xs text-slate-400 font-medium">Klik untuk melihat detail realisasi {incomeCategoryData.length} kategori pemasukan RKAS</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                {totalPenerimaanPlanned > 0 ? Math.round(totalPenerimaanRealized / totalPenerimaanPlanned * 100) : 0}% Total
                            </span>
                            {showRkasIncomeDetail ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                    </button>
                    {showRkasIncomeDetail && (
                        <div className="px-6 pb-6 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                                {incomeCategoryData.map((item, i) => {
                                    const pct = Math.round(item.percentage);
                                    return (
                                        <div key={i} className="group py-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-slate-700 truncate max-w-[220px]" title={item.category}>
                                                    {item.category}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-emerald-600">
                                                        {pct}%
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        ({formatCompact(item.realized)})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${Math.min(pct, 100)}%`,
                                                        background: 'linear-gradient(90deg, #10b981, #059669)'
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                                                <span>Target Anggaran: {formatCompact(item.planned)}</span>
                                                <span className="text-emerald-600 font-semibold">Tercapai: {formatCompact(item.realized)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
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
