import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { RefreshCw, PenSquare, FileText, CheckCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stakeholder {
    id: string;
    role: string;
    role_label: string;
    name: string;
    short_code: string;
}

interface InvoiceConfig {
    id: string;
    module_name: string;
    prefix: string;
    current_counter: number;
    last_reset: string;
    auto_reset_yearly: boolean;
    auto_reset_monthly: boolean;
}

const InvoiceConfigPage: React.FC = () => {
    const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
    const [invoiceConfigs, setInvoiceConfigs] = useState<InvoiceConfig[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [shRes, cfgRes] = await Promise.all([
                api.get('/finance/stakeholders'),
                api.get('/finance/invoice-configs')
            ]);
            setStakeholders(shRes.data || []);
            setInvoiceConfigs(cfgRes.data || []);
        } catch (error) {
            console.error("Failed to fetch config", error);
            toast.error("Gagal memuat pengaturan");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateStakeholder = async (id: string, name: string) => {
        try {
            await api.put(`/finance/stakeholders/${id}`, { name });
            toast.success("Nama penandatangan berhasil diperbarui");
            fetchData();
        } catch (error) {
            toast.error("Gagal memperbarui penandatangan");
        }
    };

    const handleUpdateConfig = async (id: string, prefix: string) => {
        try {
            await api.put(`/finance/invoice-configs/${id}`, { prefix, current_counter: -1 }); // passing -1 avoids updating counter
            toast.success("Format nomor kuitansi berhasil diperbarui");
            fetchData();
        } catch (error) {
            toast.error("Gagal memperbarui format kuitansi");
        }
    };

    const handleResetCounter = async (id: string) => {
        if (!window.confirm("Yakin ingin me-reset (mengulang dari 0) urutan nomor dokumen ini?")) return;
        try {
            await api.post(`/finance/invoice-configs/${id}/reset`);
            toast.success("Urutan dokumen berhasil di-reset");
            fetchData();
        } catch (error) {
            toast.error("Gagal me-reset urutan");
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pengaturan Kuitansi & Tanda Tangan</h1>
                <p className="text-slate-500 mt-1">Konfigurasi format penomoran dokumen otomatis dan nama pejabat berwenang.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* STAKEHOLDERS SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><PenSquare size={20} /></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Tanda Tangan Digital</h2>
                            <p className="text-xs text-slate-500">Nama pejabat yang akan tampil di PDF.</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {stakeholders.map(sh => (
                            <div key={sh.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50/30 transition">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">{sh.role_label}</p>
                                    <input 
                                        type="text"
                                        defaultValue={sh.name}
                                        onBlur={(e) => {
                                            if (e.target.value !== sh.name) {
                                                handleUpdateStakeholder(sh.id, e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                        <Shield size={10} /> Kode Jabatan: {sh.short_code}
                                    </p>
                                </div>
                                <div className="hidden md:flex justify-end items-center">
                                    <CheckCircle size={20} className="text-slate-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* INVOICE NUMBER CONFIG SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><FileText size={20} /></div>
                        <div>
                            <h2 className="text-lg font-bold text-emerald-900">Format Penomoran</h2>
                            <p className="text-xs text-emerald-600/70">Awalan surat berdasarkan modul.</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {invoiceConfigs.map(cfg => (
                            <div key={cfg.id} className="p-5 hover:bg-slate-50/30 transition">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-800">{cfg.module_name}</h3>
                                    <div className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-500">
                                        Urutan: #{cfg.current_counter}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">Awal:</span>
                                        <input 
                                            type="text"
                                            defaultValue={cfg.prefix}
                                            onBlur={(e) => {
                                                if (e.target.value !== cfg.prefix) {
                                                    handleUpdateConfig(cfg.id, e.target.value);
                                                }
                                            }}
                                            className="w-full pl-12 pr-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm uppercase"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleResetCounter(cfg.id)}
                                        className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                                        title="Reset Nomor Urut"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400">
                                    <span className="bg-slate-100 px-1 inline-block rounded">Contoh: {cfg.prefix}-2026/04-001</span>
                                    {cfg.auto_reset_monthly && <span className="ml-2 text-blue-500">✓ Reset Tiap Bulan</span>}
                                    {cfg.auto_reset_yearly && !cfg.auto_reset_monthly && <span className="ml-2 text-blue-500">✓ Reset Tiap Tahun</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceConfigPage;
