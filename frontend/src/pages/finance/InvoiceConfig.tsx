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
    invoice_type: string;
    display_label: string;
    prefix: string;
    separator: string;
    include_date: boolean;
    counter_length: number;
    current_counter: number;
    auto_notify_wa: boolean;
    wa_template_id?: number;
}

interface WATemplate {
    id: number;
    name: string;
}

const InvoiceConfigPage: React.FC = () => {
    const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
    const [invoiceConfigs, setInvoiceConfigs] = useState<InvoiceConfig[]>([]);
    const [waTemplates, setWATemplates] = useState<WATemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [shRes, cfgRes, waRes] = await Promise.all([
                api.get('/finance/stakeholders'),
                api.get('/finance/invoice-configs'),
                api.get('/finance/wa-templates')
            ]);
            setStakeholders(shRes.data || []);
            setInvoiceConfigs(cfgRes.data || []);
            setWATemplates(waRes.data || []);
        } catch (error) {
            console.error("Failed to fetch config", error);
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
        }
    };

    const handleUpdateConfig = async (id: string, updates: Partial<InvoiceConfig>) => {
        try {
            await api.put(`/finance/invoice-configs/${id}`, updates);
            toast.success("Pengaturan kuitansi diperbarui");
            fetchData();
        } catch (error) {
        }
    };

    const handleResetCounter = async (id: string) => {
        if (!window.confirm("Yakin ingin me-reset (mengulang dari 0) urutan nomor dokumen ini?")) return;
        try {
            await api.post(`/finance/invoice-configs/${id}/reset`);
            toast.success("Urutan dokumen berhasil di-reset");
            fetchData();
        } catch (error) {
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
                        {stakeholders.map((sh: Stakeholder) => (
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
                    <div className="divide-y divide-slate-100 max-h-[80vh] overflow-y-auto">
                        {invoiceConfigs.map((cfg: InvoiceConfig) => (
                            <div key={cfg.id} className="p-6 hover:bg-slate-50/30 transition space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 text-lg">{cfg.display_label || cfg.invoice_type}</h3>
                                    <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-mono text-slate-600">
                                        Urutan: #{cfg.current_counter}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Format Penomoran</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text"
                                                    defaultValue={cfg.prefix}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== cfg.prefix) {
                                                            handleUpdateConfig(cfg.id, { prefix: e.target.value });
                                                        }
                                                    }}
                                                    placeholder="PREFIX"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm uppercase"
                                                />
                                            </div>
                                            <select 
                                                defaultValue={cfg.separator}
                                                onChange={(e) => handleUpdateConfig(cfg.id, { separator: e.target.value })}
                                                className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                                            >
                                                <option value="-">-</option>
                                                <option value="/">/</option>
                                                <option value=".">.</option>
                                            </select>
                                            <div className="w-16">
                                                <input 
                                                    type="number"
                                                    defaultValue={cfg.counter_length}
                                                    onBlur={(e) => handleUpdateConfig(cfg.id, { counter_length: parseInt(e.target.value) })}
                                                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs text-center"
                                                    title="Panjang Counter (Padded)"
                                                />
                                            </div>
                                        </div>
                                        
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                defaultChecked={cfg.include_date} 
                                                onChange={(e) => handleUpdateConfig(cfg.id, { include_date: e.target.checked })}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm text-slate-600">Sertakan Tahun/Bulan (YYYYMM)</span>
                                        </label>
                                    </div>

                                    <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notifikasi WhatsApp</p>
                                        
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={cfg.auto_notify_wa} 
                                                onChange={(e) => handleUpdateConfig(cfg.id, { auto_notify_wa: e.target.checked })}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">Auto Notif saat Tagihan Dibuat</span>
                                        </label>

                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500">Gunakan Template:</p>
                                            <select 
                                                value={cfg.wa_template_id || 0}
                                                onChange={(e) => handleUpdateConfig(cfg.id, { wa_template_id: parseInt(e.target.value) })}
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                                            >
                                                <option value={0}>Gunakan Template Default</option>
                                                {waTemplates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                    <div className="text-[10px] text-slate-400">
                                        Contoh: {cfg.prefix}{cfg.separator}{cfg.include_date ? '202604' : ''}{cfg.separator}{'0'.repeat(cfg.counter_length - 1)}1
                                    </div>
                                    <button 
                                        onClick={() => handleResetCounter(cfg.id)}
                                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                                    >
                                        <RefreshCw size={12} /> Reset Nomor Urut
                                    </button>
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
