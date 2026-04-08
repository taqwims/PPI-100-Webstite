import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, BadgeCheck, Search, Loader2 } from 'lucide-react';
import axios from 'axios';

// Public verification page, bypassing auth
const VerifyInvoice: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryCode = searchParams.get('code');

    const [codeInput, setCodeInput] = useState(queryCode || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [searched, setSearched] = useState(false);

    const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api';

    const verifyCode = async (codeToVerify: string) => {
        if (!codeToVerify.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            // Using axios directly to bypass the api interceptor which requires token
            const res = await axios.get(`${API_URL}/invoice/verify?code=${encodeURIComponent(codeToVerify)}`);
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
        if (codeInput) {
            navigate(`/verify?code=${codeInput}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200 overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold text-white mb-2">Verifikasi Dokumen</h1>
                        <p className="text-slate-400 text-sm">Cek keaslian dokumen & kuitansi SDIT Al-Muhajirin</p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSearch} className="mb-8">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Kode Verifikasi</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value)}
                                placeholder="Contoh: SIG-1234abcd..."
                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono text-sm uppercase tracking-wider"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            </button>
                        </div>
                    </form>

                    {searched && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
                                    <p className="text-sm">Memverifikasi tanda tangan kriptografi...</p>
                                </div>
                            ) : result?.valid ? (
                                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 text-center">
                                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                        <BadgeCheck size={32} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-900 mb-1">Dokumen Valid</h3>
                                    <p className="text-emerald-700 text-sm mb-4">Dokumen ini otentik dan ditandatangani secara digital oleh pihak berwenang SDIT.</p>
                                    
                                    <div className="bg-white rounded-xl p-4 text-left border border-emerald-50 shadow-sm space-y-3">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Modul</p>
                                            <p className="text-sm font-medium text-slate-800">{result.metadata?.module_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Nilai Transaksi</p>
                                            <p className="text-sm font-medium text-slate-800">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(result.metadata?.amount || 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Tanggal Ditandatangani</p>
                                            <p className="text-sm font-medium text-slate-800">
                                                {result.metadata?.date ? new Date(result.metadata.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 text-center">
                                    <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                                        <ShieldAlert size={32} className="text-rose-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-rose-900 mb-1">Dokumen Tidak Valid</h3>
                                    <p className="text-rose-700 text-sm">
                                        Kode verifikasi tidak ditemukan atau tanda tangan kriptografi telah dimanipulasi. Dokumen ini tidak dapat dipertanggungjawabkan!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                        Sistem verifikasi menggunakan <span className="font-semibold text-slate-700">HMAC-SHA256</span>.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 text-center text-slate-500 text-sm max-w-sm">
                Bila Anda menemukan dokumen yang dicurigai palsu, harap segera hubungi Tata Usaha SDIT Al-Muhajirin.
            </div>
        </div>
    );
};

export default VerifyInvoice;
