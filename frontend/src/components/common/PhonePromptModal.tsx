import React, { Fragment, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Phone, MessageCircle, ArrowRight, X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const DISMISS_SESSION_KEY = 'siarkan_phone_prompt_dismissed';

export const PhonePromptModal: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const location = useLocation();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDismissed, setIsDismissed] = useState(() => {
        try {
            return sessionStorage.getItem(DISMISS_SESSION_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // Periksa apakah user adalah Siswa (role 6) atau Orang Tua / Wali (role 7)
    const isParent = user?.role_id === 7 || user?.role_ids?.includes(7);
    const isStudent = user?.role_id === 6 || user?.role_ids?.includes(6);
    const isTargetRole = Boolean(user && (isParent || isStudent));

    // Nomor telepon dianggap belum ada jika kosong atau kurang dari 8 karakter
    const hasPhone = Boolean(user?.phone && user.phone.trim().length >= 8);

    // Buka modal secara otomatis jika user target belum punya nomor HP dan belum dismiss di sesi ini
    useEffect(() => {
        if (!isTargetRole || hasPhone) {
            setIsOpen(false);
            return;
        }

        // Jangan pop up jika sedang di halaman settings agar tidak mengganggu formulir profil
        if (location.pathname === '/dashboard/settings') {
            setIsOpen(false);
            return;
        }

        if (!isDismissed) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isTargetRole, hasPhone, location.pathname, isDismissed]);

    if (!isTargetRole || hasPhone) {
        return null;
    }

    const cleanNumber = (val: string) => {
        return val.replace(/[^0-9+]/g, '');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = cleanNumber(e.target.value);
        setPhoneNumber(val);
        if (errorMsg) setErrorMsg('');
    };

    const handleDismiss = () => {
        try {
            sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
        } catch {
            // Ignore storage errors
        }
        setIsDismissed(true);
        setIsOpen(false);
    };

    const handleGoToSettings = () => {
        handleDismiss();
        navigate('/dashboard/settings');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        let cleaned = phoneNumber.replace(/[\s\-]/g, '');
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }

        // Validasi format nomor telepon Indonesia:
        // Format valid: 08xx atau 628xx
        if (!cleaned) {
            setErrorMsg('Silakan masukkan nomor telepon atau WhatsApp Anda.');
            return;
        }

        if (!cleaned.startsWith('08') && !cleaned.startsWith('628')) {
            setErrorMsg('Nomor harus diawali dengan 08... atau 628...');
            return;
        }

        if (cleaned.length < 10 || cleaned.length > 15) {
            setErrorMsg('Panjang nomor telepon harus antara 10 hingga 15 digit.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.put('/profile', {
                phone: cleaned,
                name: user?.name,
                email: user?.email,
                address: user?.address || ''
            });

            if (res.data?.user) {
                setUser(res.data.user);
            } else if (user) {
                setUser({ ...user, phone: cleaned });
            }

            toast.success('Nomor WhatsApp berhasil disimpan!');
            setIsOpen(false);
        } catch (err: any) {
            const serverMsg = err.response?.data?.error || err.message || 'Gagal menyimpan nomor telepon.';
            setErrorMsg(serverMsg);
            toast.error(serverMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Modal Popup */}
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[9999]" onClose={handleDismiss}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-slate-100 relative">
                                    {/* Close Button */}
                                    <button
                                        type="button"
                                        onClick={handleDismiss}
                                        className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Tutup (Nanti saja)"
                                    >
                                        <X size={20} />
                                    </button>

                                    {/* Header Icon & Role Tag */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                                            <MessageCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="inline-block text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {isParent ? 'Orang Tua / Wali Murid' : 'Siswa / Siswi'}
                                            </span>
                                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                                                Lengkapi Nomor WhatsApp
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Explanation Note */}
                                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                                        Halo, <strong className="text-slate-800">{user?.name}</strong>! Nomor WhatsApp aktif diperlukan oleh sistem sekolah untuk:
                                    </p>

                                    <ul className="text-xs text-slate-600 space-y-2 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                        <li className="flex items-start gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                            <span>Menerima <strong>notifikasi pembayaran & kwitansi digital</strong> tagihan sekolah secara instan.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                            <span>Informasi kehadiran serta pengumuman penting sekolah langsung ke WhatsApp.</span>
                                        </li>
                                    </ul>

                                    {/* Direct Phone Input Form */}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                                Nomor WhatsApp / HP Aktif
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={phoneNumber}
                                                    onChange={handlePhoneChange}
                                                    placeholder="Contoh: 081234567890"
                                                    disabled={isSubmitting}
                                                    autoFocus
                                                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition focus:outline-none focus:ring-2 ${
                                                        errorMsg
                                                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                                                            : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200 bg-slate-50/50 focus:bg-white'
                                                    }`}
                                                />
                                            </div>
                                            {errorMsg && (
                                                <div className="flex items-center gap-1.5 mt-2 text-rose-600 text-xs font-medium">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span>{errorMsg}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-2 flex flex-col gap-2.5">
                                            {/* Primary Save Button */}
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || !phoneNumber.trim()}
                                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Menyimpan...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle className="w-4 h-4" />
                                                        <span>Simpan Nomor WhatsApp</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Direct to Settings Page Button */}
                                            <button
                                                type="button"
                                                onClick={handleGoToSettings}
                                                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2"
                                            >
                                                <span>Buka Menu Pengaturan Profil Lengkap</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Dismiss Button */}
                                            <button
                                                type="button"
                                                onClick={handleDismiss}
                                                className="text-xs text-slate-400 hover:text-slate-600 font-medium py-1 text-center transition"
                                            >
                                                Nanti Saja (Ingatkan Nanti)
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Persistent Floating Reminder Pill (hanya tampil jika dismissed dan belum isi) */}
            {isDismissed && location.pathname !== '/dashboard/settings' && (
                <div
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 cursor-pointer transition transform hover:scale-105 animate-in slide-in-from-bottom-3 group border border-white/20"
                    role="button"
                    title="Klik untuk melengkapi nomor telepon Anda"
                >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-white animate-pulse" />
                    </div>
                    <div className="text-left pr-1">
                        <p className="text-xs font-bold leading-tight">Nomor WhatsApp Belum Diisi</p>
                        <p className="text-[10px] text-emerald-100 leading-tight">Klik di sini untuk mengisi</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
                </div>
            )}
        </>
    );
};

export default PhonePromptModal;

