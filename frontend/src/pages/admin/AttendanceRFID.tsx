import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Radio, Smartphone, Usb, CheckCircle2, Clock, XCircle,
    Volume2, VolumeX, RefreshCw, AlertTriangle, Sparkles, Zap
} from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import {
    TableGlass, TableHeaderGlass, TableBodyGlass,
    TableRowGlass, TableHeadGlass, TableCellGlass
} from '../../components/ui/glass/TableGlass';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useUnits } from '../../hooks/useUnits';

// ─── Web Audio API Sound Synthesizer ───
class SoundEffects {
    private ctx: AudioContext | null = null;

    private getContext(): AudioContext | null {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    playSuccess() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1046.50, now); // C6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    }

    playLate() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.linearRampToValueAtTime(523.25, now + 0.25); // C5

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    playCheckOut() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.25); // C5

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    playError() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.setValueAtTime(180, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }
}

const sounds = new SoundEffects();

// ─── Interfaces ───
interface ScanResult {
    success: boolean;
    message: string;
    student?: {
        id: string;
        name: string;
        nisn: string;
        rfid: string;
        class_name: string;
        unit_id: number;
    };
    status?: string;
    type?: string;
    timestamp?: string;
    error?: string;
}

interface RecentAttendance {
    id: string;
    timestamp: string;
    method: string;
    status: string;
    type: string;
    device_id?: string;
    student: {
        id: string;
        nisn: string;
        user: { name: string };
        class?: { name: string };
    };
}

export const AttendanceRFID: React.FC = () => {
    const { user } = useAuth();
    const { units, defaultUnitId, getUnitName } = useUnits();
    const [unitID, setUnitID] = useState(user?.role_id === 1 ? defaultUnitId : user?.unit_id || defaultUnitId);
    const queryClient = useQueryClient();

    // Mode state
    const [mode, setMode] = useState<'Auto' | 'CheckIn' | 'CheckOut'>('Auto');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [manualRfid, setManualRfid] = useState('');

    // NFC & Hardware State
    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isNfcReading, setIsNfcReading] = useState(false);
    const nfcAbortControllerRef = useRef<AbortController | null>(null);

    // Live clock
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Last scanned student for hero display
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);

    // Check Web NFC support
    useEffect(() => {
        if (typeof window !== 'undefined' && 'NDEFReader' in window) {
            setIsNfcSupported(true);
        }
    }, []);

    // Fetch School Settings for RFID toggle
    const { data: settings } = useQuery({
        queryKey: ['school-settings'],
        queryFn: async () => (await api.get('/admin/settings')).data,
    });

    const isFeatureEnabled = settings?.find((s: any) => s.key === 'enable_rfid_attendance')?.value !== 'false';

    // Fetch Today's Summary
    const { data: summary } = useQuery({
        queryKey: ['attendance-today-summary', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/attendance/today-summary?unit_id=${unitID}`);
            return res.data;
        },
        refetchInterval: 10000,
    });

    // Fetch Recent Taps Live Feed
    const { data: recentTaps = [], refetch: refetchRecent } = useQuery<RecentAttendance[]>({
        queryKey: ['attendance-recent-taps', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/attendance/live-recent?unit_id=${unitID}&limit=12`);
            return res.data || [];
        },
        refetchInterval: 5000,
    });

    // Mutation: Record RFID Tap
    const tapMutation = useMutation({
        mutationFn: async (payload: { rfid: string; method: string; type: string }) => {
            const res = await api.post('/students/attendance/rfid-tap', {
                rfid: payload.rfid,
                unit_id: unitID,
                type: payload.type,
                method: payload.method,
                device_id: payload.method === 'NFC' ? 'Mobile-NFC' : 'Web-Kiosk',
            });
            return res.data;
        },
        onSuccess: (data) => {
            setLastResult({
                success: true,
                message: data.message,
                student: data.student,
                status: data.status,
                type: data.type,
                timestamp: data.timestamp,
            });

            if (soundEnabled) {
                if (data.type === 'CheckOut') {
                    sounds.playCheckOut();
                } else if (data.status === 'Late') {
                    sounds.playLate();
                } else {
                    sounds.playSuccess();
                }
            }

            if ('vibrate' in navigator) {
                navigator.vibrate?.([80, 40, 80]);
            }

            queryClient.invalidateQueries({ queryKey: ['attendance-today-summary'] });
            queryClient.invalidateQueries({ queryKey: ['attendance-recent-taps'] });
            queryClient.invalidateQueries({ queryKey: ['daily-attendance'] });
            setManualRfid('');
        },
        onError: (err: any) => {
            const errorMsg = err.response?.data?.error || 'Gagal memproses tap kartu';
            const student = err.response?.data?.student;

            setLastResult({
                success: false,
                message: errorMsg,
                student: student ? {
                    id: student.id,
                    name: student.user?.name || student.name || 'Siswa',
                    nisn: student.nisn,
                    rfid: student.rfid,
                    class_name: student.class?.name || '',
                    unit_id: student.unit_id,
                } : undefined,
                error: errorMsg,
            });

            if (soundEnabled) {
                sounds.playError();
            }

            if ('vibrate' in navigator) {
                navigator.vibrate?.([200]);
            }

            toast.error(errorMsg);
            setManualRfid('');
        },
    });

    const handleProcessTap = (rfidCode: string, method: string = 'RFID') => {
        const clean = rfidCode.trim();
        if (!clean) return;
        tapMutation.mutate({
            rfid: clean,
            method,
            type: mode,
        });
    };

    // ─── USB RFID Reader / Barcode HID Scanner Keystroke Buffer ───
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active element is a regular text input or textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                if (target.id !== 'rfid-hidden-input') {
                    return;
                }
            }

            const now = Date.now();
            if (now - lastKeyTime > 300) {
                buffer = ''; // Reset buffer if typing was slow (human typing)
            }
            lastKeyTime = now;

            if (e.key === 'Enter') {
                if (buffer.length >= 3) {
                    handleProcessTap(buffer, 'RFID');
                    buffer = '';
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, unitID, soundEnabled]);

    // ─── Web NFC Reader Toggle ───
    const startNfcReading = async () => {
        if (!isNfcSupported) {
            toast.error('Browser ini tidak mendukung sensor Web NFC. Gunakan Google Chrome di Android.');
            return;
        }

        try {
            const ndef = new (window as any).NDEFReader();
            const controller = new AbortController();
            nfcAbortControllerRef.current = controller;

            await ndef.scan({ signal: controller.signal });
            setIsNfcReading(true);
            toast.success('Sensor NFC HP Aktif! Tempelkan kartu siswa ke belakang HP.');

            ndef.onreading = (event: any) => {
                const serial = event.serialNumber;
                if (serial) {
                    const cleanSerial = serial.replace(/:/g, '').toUpperCase();
                    handleProcessTap(cleanSerial, 'NFC');
                }
            };

            ndef.onreadingerror = () => {
                toast.error('Gagal membaca kartu NFC. Coba tempelkan lebih dekat.');
                if (soundEnabled) sounds.playError();
            };
        } catch (err: any) {
            setIsNfcReading(false);
            toast.error(err.message || 'Gagal mengaktifkan NFC. Pastikan izin NFC diaktifkan di HP.');
        }
    };

    const stopNfcReading = () => {
        if (nfcAbortControllerRef.current) {
            nfcAbortControllerRef.current.abort();
            nfcAbortControllerRef.current = null;
        }
        setIsNfcReading(false);
        toast.success('Sensor NFC HP dinonaktifkan.');
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleProcessTap(manualRfid, 'Manual');
    };

    return (
        <div className="space-y-6">
            {/* Top Bar: Title & Live Clock */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
                        <Radio size={28} className="text-emerald-600 animate-pulse" />
                        Scanner Presensi RFID & NFC
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tap kartu RFID siswa menggunakan Sensor NFC HP atau USB Scanner
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live Clock Badge */}
                    <div className="px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 shadow-sm flex items-center gap-2">
                        <Clock size={16} className="text-emerald-600" />
                        <span className="text-sm font-mono font-bold text-slate-800">
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                        </span>
                        <span className="text-xs text-slate-400">
                            | {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                    </div>

                    {/* Mute Toggle */}
                    <button
                        type="button"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2.5 rounded-xl border transition-all ${
                            soundEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                        title={soundEnabled ? 'Suara Aktif' : 'Suara Dimatikan'}
                    >
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                </div>
            </div>

            {/* Feature Disabled Warning */}
            {!isFeatureEnabled && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-800">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                        <span className="text-sm font-medium">
                            Fitur Presensi RFID & NFC saat ini sedang <strong>dinonaktifkan</strong> oleh administrator di menu Pengaturan Sekolah.
                        </span>
                    </div>
                    <a
                        href="/dashboard/settings"
                        className="px-3 py-1.5 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-300 transition"
                    >
                        Buka Pengaturan
                    </a>
                </div>
            )}

            {/* Mode & Unit Control Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Mode Selector */}
                <CardGlass className="p-4 flex items-center justify-between lg:col-span-2">
                    <div className="flex items-center gap-2">
                        <Zap size={18} className="text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Mode Presensi:</span>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={() => setMode('Auto')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                mode === 'Auto'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-white/60 text-slate-600 hover:bg-white'
                            }`}
                        >
                            ⚡ Auto (Masuk/Pulang)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('CheckIn')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                mode === 'CheckIn'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'bg-white/60 text-slate-600 hover:bg-white'
                            }`}
                        >
                            🌅 Masuk Saja
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('CheckOut')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                mode === 'CheckOut'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white/60 text-slate-600 hover:bg-white'
                            }`}
                        >
                            🌇 Pulang Saja
                        </button>
                    </div>
                </CardGlass>

                {/* Unit Selector */}
                <CardGlass className="p-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Unit Sekolah:</span>
                    {user?.role_id === 1 ? (
                        <select
                            value={unitID}
                            onChange={(e) => setUnitID(Number(e.target.value))}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                            {units.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl">
                            {getUnitName(unitID)}
                        </span>
                    )}
                </CardGlass>
            </div>

            {/* Main Interactive Row: Scanner Device & Live Hero Result */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Scanner Controller (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                    {/* NFC HP Card */}
                    <CardGlass className="p-6 text-center relative overflow-hidden">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 mb-4 relative">
                            {isNfcReading ? (
                                <>
                                    <Smartphone size={30} className="animate-bounce" />
                                    <span className="absolute inset-0 rounded-3xl border-4 border-white animate-ping opacity-30" />
                                </>
                            ) : (
                                <Smartphone size={30} />
                            )}
                        </div>

                        <h2 className="text-base font-bold text-slate-900 mb-1">Sensor NFC Smartphone</h2>
                        <p className="text-xs text-slate-500 mb-4">
                            {isNfcSupported
                                ? 'Gunakan bodi belakang HP untuk menempelkan kartu RFID/NFC siswa.'
                                : 'Web NFC didukung pada Google Chrome di Android.'}
                        </p>

                        {isNfcReading ? (
                            <button
                                type="button"
                                onClick={stopNfcReading}
                                className="w-full py-3 px-4 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                                <XCircle size={16} /> Matikan Sensor NFC HP
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={startNfcReading}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:opacity-95 transition flex items-center justify-center gap-2"
                            >
                                <Sparkles size={16} /> Aktifkan Sensor NFC HP
                            </button>
                        )}
                    </CardGlass>

                    {/* USB Scanner & Manual Input */}
                    <CardGlass className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Usb size={16} className="text-indigo-600" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                USB RFID Reader / Input Manual
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            Hubungkan USB RFID reader ke laptop/PC (otomatis mendeteksi saat kartu di-tap) atau ketik nomor kartu:
                        </p>

                        <form onSubmit={handleManualSubmit} className="flex gap-2">
                            <input
                                id="rfid-hidden-input"
                                type="text"
                                value={manualRfid}
                                onChange={(e) => setManualRfid(e.target.value)}
                                placeholder="Nomor / UID Kartu RFID..."
                                className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                            <ButtonGlass
                                type="submit"
                                disabled={!manualRfid || tapMutation.isPending}
                                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900"
                            >
                                {tapMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : 'Tap'}
                            </ButtonGlass>
                        </form>
                    </CardGlass>
                </div>

                {/* Right Column: Hero Display Result (7 cols) */}
                <div className="lg:col-span-7">
                    <CardGlass className="p-8 h-full flex flex-col justify-center items-center text-center relative overflow-hidden border-2 border-emerald-100">
                        {lastResult ? (
                            <div className="space-y-4 w-full animate-fade-in">
                                {/* Status Icon */}
                                <div className="inline-flex items-center justify-center">
                                    {lastResult.success ? (
                                        lastResult.type === 'CheckOut' ? (
                                            <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                <CheckCircle2 size={44} />
                                            </div>
                                        ) : lastResult.status === 'Late' ? (
                                            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                                <Clock size={44} />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 size={44} />
                                            </div>
                                        )
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                                            <XCircle size={44} />
                                        </div>
                                    )}
                                </div>

                                {/* Student Name & Info */}
                                {lastResult.student ? (
                                    <div>
                                        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 uppercase tracking-wide bg-slate-100 text-slate-700">
                                            {lastResult.student.class_name || 'Santri SDIT'}
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                            {lastResult.student.name}
                                        </h2>
                                        <p className="text-xs text-slate-500 font-mono mt-1">
                                            NISN: {lastResult.student.nisn} | RFID: {lastResult.student.rfid}
                                        </p>
                                    </div>
                                ) : (
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Kartu Belum Terdaftar
                                    </h2>
                                )}

                                {/* Status Result Badge */}
                                <div className="pt-2">
                                    {lastResult.success ? (
                                        <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-extrabold ${
                                            lastResult.type === 'CheckOut'
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                                : lastResult.status === 'Late'
                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                        }`}>
                                            {lastResult.type === 'CheckOut'
                                                ? 'PRESENSI PULANG BERHASIL'
                                                : lastResult.status === 'Late'
                                                ? 'PRESENSI MASUK (TERLAMBAT)'
                                                : 'PRESENSI MASUK (HADIR TEPAT WAKTU)'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold bg-red-600 text-white shadow-lg shadow-red-600/30">
                                            {lastResult.error || 'GAGAL MENCATAT PRESENSI'}
                                        </span>
                                    )}
                                </div>

                                {lastResult.timestamp && (
                                    <p className="text-xs text-slate-400 font-mono">
                                        Waktu Tap: {new Date(lastResult.timestamp).toLocaleTimeString('id-ID')} WIB
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 text-slate-400 py-10">
                                <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                    <Radio size={40} className="animate-pulse" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Siap Menerima Tap Kartu</h3>
                                <p className="text-xs max-w-sm mx-auto text-slate-400">
                                    Dekatkan kartu RFID siswa ke sensor NFC HP atau tempelkan ke USB Scanner untuk mencatat absensi otomatis.
                                </p>
                            </div>
                        )}
                    </CardGlass>
                </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <CardGlass className="p-4 bg-white/70">
                    <span className="text-xs font-semibold text-slate-500">Total Siswa Aktif</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                        {summary?.total_students || 0}
                    </p>
                </CardGlass>

                <CardGlass className="p-4 bg-emerald-50/70 border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-700">Hadir Tepat Waktu</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                        {summary?.present || 0}
                    </p>
                </CardGlass>

                <CardGlass className="p-4 bg-amber-50/70 border-amber-200">
                    <span className="text-xs font-semibold text-amber-700">Terlambat</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">
                        {summary?.late || 0}
                    </p>
                </CardGlass>

                <CardGlass className="p-4 bg-blue-50/70 border-blue-200">
                    <span className="text-xs font-semibold text-blue-700">Sudah Pulang</span>
                    <p className="text-2xl font-black text-blue-700 mt-1">
                        {summary?.check_out || 0}
                    </p>
                </CardGlass>

                <CardGlass className="p-4 bg-slate-50/70">
                    <span className="text-xs font-semibold text-slate-500">Belum Hadir</span>
                    <p className="text-2xl font-black text-slate-600 mt-1">
                        {summary?.unattended || 0}
                    </p>
                </CardGlass>
            </div>

            {/* Recent Live Taps Table */}
            <CardGlass className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Radio size={18} className="text-emerald-600" />
                        <h2 className="text-base font-bold text-slate-900">Live Feed Tap Kartu Terakhir</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetchRecent()}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                    >
                        <RefreshCw size={12} /> Segarkan
                    </button>
                </div>

                {recentTaps.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                        Belum ada riwayat tap kartu untuk hari ini.
                    </div>
                ) : (
                    <TableGlass>
                        <TableHeaderGlass>
                            <TableRowGlass>
                                <TableHeadGlass>Waktu</TableHeadGlass>
                                <TableHeadGlass>Nama Siswa</TableHeadGlass>
                                <TableHeadGlass>Kelas</TableHeadGlass>
                                <TableHeadGlass>Tipe</TableHeadGlass>
                                <TableHeadGlass>Status</TableHeadGlass>
                                <TableHeadGlass>Metode</TableHeadGlass>
                            </TableRowGlass>
                        </TableHeaderGlass>
                        <TableBodyGlass>
                            {recentTaps.map((tap) => (
                                <TableRowGlass key={tap.id}>
                                    <TableCellGlass className="font-mono text-xs text-slate-600">
                                        {new Date(tap.timestamp).toLocaleTimeString('id-ID')}
                                    </TableCellGlass>
                                    <TableCellGlass className="font-bold text-slate-800 text-xs">
                                        {tap.student?.user?.name || '-'}
                                    </TableCellGlass>
                                    <TableCellGlass className="text-xs text-slate-600">
                                        {tap.student?.class?.name || '-'}
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                            tap.type === 'CheckOut' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {tap.type === 'CheckOut' ? 'Pulang' : 'Masuk'}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                            tap.status === 'Late'
                                                ? 'bg-amber-100 text-amber-700'
                                                : tap.status === 'Present'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {tap.status === 'Late' ? 'Terlambat' : tap.status === 'Present' ? 'Hadir' : tap.status}
                                        </span>
                                    </TableCellGlass>
                                    <TableCellGlass className="text-xs font-mono text-slate-500">
                                        {tap.method || 'RFID'}
                                    </TableCellGlass>
                                </TableRowGlass>
                            ))}
                        </TableBodyGlass>
                    </TableGlass>
                )}
            </CardGlass>
        </div>
    );
};

export default AttendanceRFID;
