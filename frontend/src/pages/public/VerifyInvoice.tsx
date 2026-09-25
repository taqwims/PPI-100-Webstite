import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, BadgeCheck, Search, Loader2, CheckCircle2, FileText, Calendar, DollarSign, UserCheck } from 'lucide-react';
import api from '../../services/api';

// Public verification page, bypassing auth
const VerifyInvoice: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryCode = searchParams.get('code');

    const [codeInput, setCodeInput] = useState(queryCode || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [searched, setSearched] = useState(false);

    const cleanInputCode = (raw: string) => {
        let clean = raw.trim();
        if (clean.includes('code=')) {
            const parts = clean.split('code=');
            if (parts.length > 1) {
                clean = parts[1].split('&')[0];
            }
        }
        return clean.trim();
    };

    const verifyCode = async (codeToVerify: string) => {
        const clean = cleanInputCode(codeToVerify);
        if (!clean) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await api.get(`/invoice/verify?code=${encodeURIComponent(clean)}`, { _suppressToast: true });
            setResult(res.data);
        } catch (error) {
            console.error("Verification failed", error);
            setResult({ valid: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (queryCode) {
            verifyCode(queryCode);
        }
    }, [queryCode]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = cleanInputCode(codeInput);
        if (clean) {
            navigate(`/verify?code=${encodeURIComponent(clean)}`);
            verifyCode(clean);
        }
    };

    const formatModuleLabel = (mod: string) => {
        const map: Record<string, string> = {
            Cashledger: 'Buku Kas Umum (Pemasukan/Pengeluaran)',
            CashLedger: 'Buku Kas Umum (Pemasukan/Pengeluaran)',
            Payroll: 'Penggajian & Honorarium',
            Bill: 'Tagihan & SPP Siswa',
            Obligation: 'Tanggungan / Pos Biaya Siswa',
            Infaq: 'Penerimaan Infaq',
            Activity: 'Kegiatan & Acara Sekolah',
            Debt: 'Pembayaran Hutang Operasional',
            Piutang: 'Penarikan Piutang Yayasan',
            Savings: 'Tabungan Siswa',
        };
        return map[mod] || mod || 'Dokumen Keuangan';
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 py-8">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-200">
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={140} />
                    </div>
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full mb-3 border border-emerald-500/30">
                            Sistem Verifikasi Otentikasi Digital
                        </span>
                        <h1 className="text-2xl font-bold text-white mb-2">Verifikasi Dokumen</h1>
                        <p className="text-slate-400 text-sm">Cek keaslian dokumen resmi & kuitansi SDIT AN-NUR</p>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSearch} className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Nomor Kuitansi / Kode Verifikasi QR
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value)}
                                placeholder="Contoh: B1-202609-0003 atau 6d3d-e474-fa2f"
                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm uppercase tracking-wider"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            </button>
                        </div>
                    </form>

                    {searched && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Loader2 size={36} className="animate-spin mb-3 text-emerald-500" />
                                    <p className="text-sm font-medium">Memverifikasi tanda tangan kriptografi...</p>
                                </div>
                            ) : result?.valid ? (
                                <div className="bg-emerald-50/80 rounded-2xl p-5 sm:p-6 border border-emerald-200 text-center">
                                    <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                        <BadgeCheck size={32} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-950 mb-1">Dokumen Resmi & Valid</h3>
                                    <p className="text-emerald-800 text-xs sm:text-sm mb-4 leading-relaxed">
                                        Dokumen ini sah, otentik, dan tercatat di database keuangan SDIT AN-NUR.
                                    </p>

                                    <div className="bg-white rounded-xl p-4 text-left border border-emerald-100 shadow-sm space-y-3">
                                        {result.metadata?.invoice_number && (
                                            <div className="flex items-start gap-2.5 pb-2 border-b border-slate-100">
                                                <FileText size={16} className="text-emerald-600 mt-0.5" />
                                                <div>
                                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Nomor Dokumen / Kuitansi</p>
                                                    <p className="text-sm font-bold text-slate-800">{result.metadata.invoice_number}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2.5">
                                            <FileText size={16} className="text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Jenis / Modul</p>
                                                <p className="text-xs sm:text-sm font-semibold text-slate-800">{formatModuleLabel(result.metadata?.module_name)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <DollarSign size={16} className="text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Nilai Transaksi</p>
                                                <p className="text-sm font-bold text-emerald-600">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(result.metadata?.amount || 0)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Calendar size={16} className="text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Tanggal Dokumen</p>
                                                <p className="text-xs sm:text-sm font-medium text-slate-700">
                                                    {result.metadata?.date ? new Date(result.metadata.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signatures List */}
                                    {result.signatures && result.signatures.length > 0 && (
                                        <div className="mt-4 text-left">
                                            <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                                                <UserCheck size={14} className="text-emerald-600" /> Penanggung Jawab Terverifikasi:
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {result.signatures.map((sig: any, idx: number) => (
                                                    <div key={idx} className="bg-white/80 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
                                                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{sig.stakeholder_name || sig.stakeholder_role}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">{sig.stakeholder_role?.replace('_', ' ')}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 text-center">
                                    <div className="mx-auto w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                                        <ShieldAlert size={32} className="text-rose-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-rose-950 mb-1">Dokumen Tidak Ditemukan / Tidak Valid</h3>
                                    <p className="text-rose-700 text-xs sm:text-sm leading-relaxed">
                                        Kode atau nomor kuitansi tidak terdaftar di sistem keuangan resmi SDIT AN-NUR, atau tanda tangan digital tidak cocok.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                        Otentikasi Kriptografi <span className="font-semibold text-slate-700">HMAC-SHA256</span> — SDIT AN-NUR Banjarsari
                    </p>
                </div>
            </div>

            <div className="mt-6 text-center text-slate-500 text-xs max-w-sm">
                Bila Anda menemukan dokumen yang dicurigai palsu, harap segera hubungi pihak Tata Usaha SDIT AN-NUR.
            </div>
        </div>
    );
};

export default VerifyInvoice;
