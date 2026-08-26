import React, { useState } from 'react';
import { CreditCard, Tag, Link2, BarChart2, Sparkles, Building2, ArrowRightCircle } from 'lucide-react';
import clsx from 'clsx';

// Import sub-page components
import PaymentTypes from './PaymentTypes';
import TransactionCodes from './TransactionCodes';
import FinancialMappingMatrix from '../../components/finance/FinancialMappingMatrix';
import RKAS from './RKAS';

const FinancialMasterHub: React.FC = () => {
    // Sequentially aligned flow: Step 1 = codes, Step 2 = types, Step 3 = mapping, Step 4 = rkas
    const [activeTab, setActiveTab] = useState<'codes' | 'types' | 'mapping' | 'rkas'>('codes');

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                                <Sparkles size={13} /> Modul Pengaturan Keuangan Terpadu
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Pusat Master & Pemetaan Keuangan</h1>
                        <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                            Kelola Kode Pos Transaksi, Jenis Pembayaran Siswa, Matriks Pemetaan Alur, dan Realisasi Anggaran RKAS secara efisien dalam 1 alur terpadu.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold shrink-0">
                        <Building2 size={18} className="text-emerald-400" />
                        <span>Sistem Keuangan SDIT AN-NUR</span>
                    </div>
                </div>
            </div>

            {/* Interactive Financial Flow Guidance Wizard */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <ArrowRightCircle size={16} className="text-emerald-600" />
                        Alur Pengaturan & Otomatisasi Keuangan Sekolah (Step by Step)
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Klik langkah untuk berpindah tab</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {/* Step 1 */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('codes')}
                        className={clsx(
                            "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group",
                            activeTab === 'codes' ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm" : "bg-slate-50/80 border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={clsx("text-[10px] font-extrabold px-2 py-0.5 rounded-md", activeTab === 'codes' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700")}>
                                LANGKAH 1
                            </span>
                            <Tag size={16} className={activeTab === 'codes' ? "text-indigo-600" : "text-slate-400"} />
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">1. Kode Transaksi</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Buat pos standar master keuangan (misal: SPP, ATK)</p>
                    </button>

                    {/* Step 2 */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('types')}
                        className={clsx(
                            "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group",
                            activeTab === 'types' ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm" : "bg-slate-50/80 border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={clsx("text-[10px] font-extrabold px-2 py-0.5 rounded-md", activeTab === 'types' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700")}>
                                LANGKAH 2
                            </span>
                            <CreditCard size={16} className={activeTab === 'types' ? "text-emerald-600" : "text-slate-400"} />
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">2. Jenis Pembayaran</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Atur tarif tagihan siswa & hubungkan ke Kode Pos</p>
                    </button>

                    {/* Step 3 */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('mapping')}
                        className={clsx(
                            "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group",
                            activeTab === 'mapping' ? "bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 shadow-sm" : "bg-slate-50/80 border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={clsx("text-[10px] font-extrabold px-2 py-0.5 rounded-md", activeTab === 'mapping' ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700")}>
                                LANGKAH 3
                            </span>
                            <Link2 size={16} className={activeTab === 'mapping' ? "text-teal-600" : "text-slate-400"} />
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition">3. Matriks Pemetaan</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Verifikasi keterhubungan 3 arah (Jenis ➔ Kode ➔ RKAS)</p>
                    </button>

                    {/* Step 4 */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('rkas')}
                        className={clsx(
                            "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group",
                            activeTab === 'rkas' ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-sm" : "bg-slate-50/80 border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={clsx("text-[10px] font-extrabold px-2 py-0.5 rounded-md", activeTab === 'rkas' ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700")}>
                                LANGKAH 4
                            </span>
                            <BarChart2 size={16} className={activeTab === 'rkas' ? "text-amber-600" : "text-slate-400"} />
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition">4. Realisasi RKAS</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Atur target RKAS & pantau realisasi otomatis secara live</p>
                    </button>
                </div>
            </div>

            {/* 4 Main Navigation Tabs (Sequentially Ordered) */}
            <div className="flex p-1.5 bg-slate-100/90 rounded-2xl gap-1 border border-slate-200 shadow-inner overflow-x-auto">
                <button
                    onClick={() => setActiveTab('codes')}
                    className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeTab === 'codes'
                            ? "bg-white text-indigo-800 shadow-md border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <Tag size={18} className={clsx(activeTab === 'codes' ? "text-indigo-600" : "text-slate-400")} />
                    1. Kode Transaksi
                </button>

                <button
                    onClick={() => setActiveTab('types')}
                    className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeTab === 'types'
                            ? "bg-white text-emerald-800 shadow-md border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <CreditCard size={18} className={clsx(activeTab === 'types' ? "text-emerald-600" : "text-slate-400")} />
                    2. Jenis Pembayaran
                </button>

                <button
                    onClick={() => setActiveTab('mapping')}
                    className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeTab === 'mapping'
                            ? "bg-white text-teal-800 shadow-md border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <Link2 size={18} className={clsx(activeTab === 'mapping' ? "text-teal-600" : "text-slate-400")} />
                    3. Matriks Pemetaan Keuangan
                </button>

                <button
                    onClick={() => setActiveTab('rkas')}
                    className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeTab === 'rkas'
                            ? "bg-white text-amber-800 shadow-md border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <BarChart2 size={18} className={clsx(activeTab === 'rkas' ? "text-amber-600" : "text-slate-400")} />
                    4. Realisasi RKAS
                </button>
            </div>

            {/* Tab Contents */}
            <div className="animate-in fade-in duration-200">
                {activeTab === 'codes' && <TransactionCodes />}
                {activeTab === 'types' && <PaymentTypes />}
                {activeTab === 'mapping' && <FinancialMappingMatrix />}
                {activeTab === 'rkas' && <RKAS />}
            </div>
        </div>
    );
};

export default FinancialMasterHub;
