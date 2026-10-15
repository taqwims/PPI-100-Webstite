import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Camera, Maximize2, Minimize2, Volume2, VolumeX,
    CheckCircle2, Clock, Coins, RefreshCw,
    GraduationCap, Briefcase, Info, Zap, UserPlus, Smile, LogOut, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useFeatureStore } from '../../store/featureStore';
import { FaceEnrollmentModal } from '../../components/admin/FaceEnrollmentModal';
import { extractFaceEmbedding } from '../../utils/faceBiometric';
import { registerCameraStream, stopMediaStream, stopAllCameraStreams } from '../../utils/cameraGuard';

// ─── Web Audio API Sound Synthesizer ───
class BiometricAudio {
    private ctx: AudioContext | null = null;
    public soundEnabled: boolean = true;

    private getContext(): AudioContext | null {
        if (!this.soundEnabled) return null;
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
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
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
        osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.24); // C6

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1046.50, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    }

    playCheckOut() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // Melodious descending chime: G5 (783.99Hz) -> E5 (659.25Hz) -> C5 (523.25Hz)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
        osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.22);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(523.25, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
    }

    playLateWarning() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.linearRampToValueAtTime(440.00, now + 0.25); // A4

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    playScanBeep() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }
}

interface ScanResult {
    id: string;
    name: string;
    role: 'Siswa' | 'Guru' | 'Staf';
    identifier: string; // NISN atau NIP
    subtext: string; // Kelas atau Jabatan
    timestamp: string;
    status: 'Present' | 'Late';
    type?: 'CheckIn' | 'CheckOut';
    lateMinutes: number;
    hourlyRate: number;
    penaltyAmount: number;
    photoUrl?: string;
    confidence: number;
}

const AttendanceFaceScanner: React.FC = () => {
    const isFaceEnabled = useFeatureStore((s) => s.isFaceEnabled());

    // ─── Sound System ───
    const soundRef = useRef<BiometricAudio>(new BiometricAudio());
    const [soundOn, setSoundOn] = useState(true);

    // ─── Fetch School Settings (Jam Masuk, Pulang, dan Tarif Denda) ───
    const { data: schoolSettings } = useQuery({
        queryKey: ['school-settings'],
        queryFn: async () => (await api.get('/admin/settings')).data,
    });

    const cutoffTime = useMemo(() => {
        const found = schoolSettings?.find((s: any) => s.key === 'attendance_late_threshold' || s.key === 'student_check_in_time');
        return found?.value || '07:00';
    }, [schoolSettings]);

    const exitTime = useMemo(() => {
        const found = schoolSettings?.find((s: any) => s.key === 'attendance_exit_start');
        return found?.value || '14:00';
    }, [schoolSettings]);

    // ─── Mode & Settings ───
    const [scanMode, setScanMode] = useState<'Auto' | 'CheckIn' | 'CheckOut'>('Auto');
    const [targetMode, setTargetMode] = useState<'all' | 'student' | 'teacher'>('all');
    const [isScanning, setIsScanning] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hourlyRate, setHourlyRate] = useState(30000); // Rp 30.000 / jam

    useEffect(() => {
        if (schoolSettings) {
            const rate = schoolSettings.find((s: any) => s.key === 'teacher_late_hourly_rate');
            if (rate && rate.value) {
                setHourlyRate(Number(rate.value) || 30000);
            }
        }
    }, [schoolSettings]);

    // Early return if Face Attendance is disabled
    if (!isFaceEnabled) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                    <Camera size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2">Fitur Presensi Wajah Dinonaktifkan</h2>
                <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                    Fitur pengenalan wajah (Face Attendance) sedang dinonaktifkan pada konfigurasi sistem (FEATURE_FACE_ATTENDANCE=false). Silakan aktifkan di pengaturan lingkungan atau hubungi administrator.
                </p>
                <Link
                    to="/dashboard/attendance"
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition"
                >
                    Kembali ke Halaman Presensi
                </Link>
            </div>
        );
    }

    // ─── Camera Stream State & Cancellation Refs ───
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);
    const requestTokenRef = useRef(0);
    const [hasCamera, setHasCamera] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [isLiveScanning, setIsLiveScanning] = useState(false);
    const [isTabVisible, setIsTabVisible] = useState<boolean>(() => typeof document !== 'undefined' ? !document.hidden : true);
    const [currentTime, setCurrentTime] = useState<string>(() =>
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
    );

    // Live Clock Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // ─── Biometric Scan State ───
    const [activeResult, setActiveResult] = useState<ScanResult | null>(null);
    const [livenessStage, setLivenessStage] = useState<'detecting' | 'verifying' | 'matched'>('detecting');
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    // ─── History State ───
    const [recentScans, setRecentScans] = useState<ScanResult[]>([
        {
            id: '1',
            name: 'Muhammad Farhan',
            role: 'Siswa',
            identifier: 'NISN 00928374',
            subtext: 'Kelas 5A - Abu Bakar',
            timestamp: '06:48 WIB',
            status: 'Present',
            lateMinutes: 0,
            hourlyRate: 30000,
            penaltyAmount: 0,
            confidence: 99.4
        },
        {
            id: '2',
            name: 'Ustadz Ahmad Fauzi, S.Pd',
            role: 'Guru',
            identifier: 'NIP 1985041201',
            subtext: 'Guru Matematika & PAI',
            timestamp: '07:24 WIB',
            status: 'Late',
            lateMinutes: 24,
            hourlyRate: 30000,
            penaltyAmount: 12000, // (24 / 60) * 30000 = 12000
            confidence: 99.1
        },
        {
            id: '3',
            name: 'Aisyah Putri Azzahra',
            role: 'Siswa',
            identifier: 'NISN 00928112',
            subtext: 'Kelas 4B - Khadijah',
            timestamp: '06:55 WIB',
            status: 'Present',
            lateMinutes: 0,
            hourlyRate: 30000,
            penaltyAmount: 0,
            confidence: 98.8
        }
    ]);

    // ─── Stop Camera Tracks Completely ───
    const stopCamera = () => {
        // Invalidate any in-flight startCamera asynchronous promise
        requestTokenRef.current++;

        if (streamRef.current) {
            stopMediaStream(streamRef.current);
            streamRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stopMediaStream(stream);
            videoRef.current.srcObject = null;
        }
        stopAllCameraStreams();
        setHasCamera(false);
    };

    // ─── Listen to Tab Visibility (pindah tab browser / minimize) ───
    useEffect(() => {
        isMountedRef.current = true;

        const handleVisibilityChange = () => {
            const visible = !document.hidden;
            setIsTabVisible(visible);
            if (!visible) {
                // Langsung matikan kamera secara sinkron saat berpindah tab browser
                stopCamera();
            }
        };

        const handleFocus = () => {
            setIsTabVisible(true);
        };

        const handlePageLeave = () => {
            stopCamera();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('pagehide', handlePageLeave);
        window.addEventListener('beforeunload', handlePageLeave);

        return () => {
            isMountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('pagehide', handlePageLeave);
            window.removeEventListener('beforeunload', handlePageLeave);
            stopCamera();
        };
    }, []);

    // ─── Start Camera Function with Race-Condition Prevention ───
    const startCamera = async () => {
        // Stop any existing stream first
        stopCamera();
        const token = ++requestTokenRef.current;

        try {
            const devs = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = devs.filter(d => d.kind === 'videoinput');
            if (token !== requestTokenRef.current || !isMountedRef.current) return;
            setDevices(videoDevs);

            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
            const constraints: MediaStreamConstraints = {
                video: selectedDeviceId
                    ? { deviceId: { exact: selectedDeviceId } }
                    : {
                        facingMode: 'user',
                        width: isMobile ? { ideal: 720 } : { ideal: 1280 },
                        height: isMobile ? { ideal: 1280 } : { ideal: 720 }
                    }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Periksa jika saat menunggu kamera dibuka komponen unmount, tab berpindah, atau scanner dimatikan
            if (!isMountedRef.current || token !== requestTokenRef.current || document.hidden || !isScanning || showEnrollModal) {
                stopMediaStream(stream);
                return;
            }

            registerCameraStream(stream);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setHasCamera(true);
                setCameraError(null);
            }
        } catch (err: any) {
            if (token === requestTokenRef.current) {
                console.warn('Camera stream error:', err);
                setCameraError(err.message || 'Kamera tidak dapat diakses');
                setHasCamera(false);
            }
        }
    };

    // ─── Camera Lifecycle Effect ───
    // Kamera HANYA aktif jika:
    // 1. isScanning === true (kamera diaktifkan)
    // 2. isTabVisible === true (tab browser sedang aktif di layar)
    // 3. !showEnrollModal (modal pendaftaran wajah tidak sedang terbuka)
    useEffect(() => {
        const shouldRunCamera = isScanning && isTabVisible && !showEnrollModal;

        if (shouldRunCamera) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isScanning, isTabVisible, showEnrollModal, selectedDeviceId]);

    // ─── Fetch Real Live Attendance Records from Backend ───
    const fetchLiveRecent = async () => {
        try {
            const [staffRes, studentRes] = await Promise.allSettled([
                api.get('/staff-attendance/live-recent?limit=10'),
                api.get('/students/attendance/live-recent?limit=10')
            ]);

            const liveList: ScanResult[] = [];

            if (staffRes.status === 'fulfilled' && staffRes.value.data?.data) {
                const staffData = staffRes.value.data.data;
                staffData.forEach((s: any) => {
                    const dt = new Date(s.check_in_time || s.created_at);
                    liveList.push({
                        id: s.id || Math.random().toString(),
                        name: s.user?.name || 'Guru / Staf',
                        role: 'Guru',
                        identifier: s.user?.teacher?.nip ? `NIP ${s.user.teacher.nip}` : 'Staff NIP',
                        subtext: 'Guru / Tenaga Pendidik',
                        timestamp: dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                        status: s.status === 'Late' ? 'Late' : 'Present',
                        type: s.check_out_time ? 'CheckOut' : 'CheckIn',
                        lateMinutes: s.late_minutes || 0,
                        hourlyRate: s.hourly_rate || 30000,
                        penaltyAmount: s.penalty_amount || 0,
                        confidence: 99.2
                    });
                });
            }

            if (studentRes.status === 'fulfilled' && studentRes.value.data) {
                const studentData = studentRes.value.data;
                studentData.forEach((st: any) => {
                    const dt = new Date(st.timestamp || st.created_at);
                    liveList.push({
                        id: st.id || Math.random().toString(),
                        name: st.student?.user?.name || 'Siswa',
                        role: 'Siswa',
                        identifier: st.student?.nisn ? `NISN ${st.student.nisn}` : 'NISN',
                        subtext: st.student?.class?.name ? `Kelas ${st.student.class.name}` : 'Siswa Aktif',
                        timestamp: dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                        status: st.status === 'Late' ? 'Late' : 'Present',
                        type: (st.type === 'CheckOut' ? 'CheckOut' : 'CheckIn') as 'CheckIn' | 'CheckOut',
                        lateMinutes: 0,
                        hourlyRate: 0,
                        penaltyAmount: 0,
                        confidence: 99.5
                    });
                });
            }

            if (liveList.length > 0) {
                setRecentScans(prev => {
                    // Combine while keeping uniqueness
                    const existingIds = new Set(liveList.map(item => item.id));
                    const remaining = prev.filter(p => !existingIds.has(p.id));
                    return [...liveList, ...remaining].slice(0, 20);
                });
            }
        } catch (err) {
            console.warn('Live logs fetch info:', err);
        }
    };

    useEffect(() => {
        fetchLiveRecent();
    }, []);

    // ─── Fullscreen Toggle ───
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // ─── Live Camera Scan Real Backend Match ───
    const handleLiveScan = async () => {
        if (!videoRef.current || !canvasRef.current) {
            toast.error('Kamera belum siap');
            return;
        }
        setIsLiveScanning(true);
        soundRef.current.playScanBeep();
        setLivenessStage('verifying');

        // Delay 1.2s to display the friendly blink/smile prompt
        setTimeout(async () => {
            try {
                const video = videoRef.current;
                if (!video) return;

                const embedding = extractFaceEmbedding(video);

                const res = await api.post('/attendance/face-scan', {
                    descriptor: embedding,
                    scan_type: scanMode.toLowerCase(),
                    device_id: selectedDeviceId || 'kiosk-camera'
                });

                if (res.data?.data) {
                    const match = res.data.data;
                    const isCheckOut = match.type === 'CheckOut';
                    const resultItem: ScanResult = {
                        id: match.user_id || Date.now().toString(),
                        name: match.name,
                        role: match.role === 'Guru' ? 'Guru' : 'Siswa',
                        identifier: match.identifier || '-',
                        subtext: match.subtext || '-',
                        timestamp: match.timestamp || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'),
                        status: match.status === 'Late' ? 'Late' : 'Present',
                        type: isCheckOut ? 'CheckOut' : 'CheckIn',
                        lateMinutes: match.late_minutes || 0,
                        hourlyRate: match.hourly_rate || hourlyRate,
                        penaltyAmount: match.penalty_amount || 0,
                        confidence: 99.2
                    };

                    setLivenessStage('matched');
                    setActiveResult(resultItem);
                    setRecentScans(prev => [resultItem, ...prev.slice(0, 19)]);

                    if (resultItem.status === 'Late') {
                        soundRef.current.playLateWarning();
                        toast.error(match.message || `Presensi Tercatat (Terlambat ${resultItem.lateMinutes} Menit)`);
                    } else if (isCheckOut) {
                        soundRef.current.playCheckOut();
                        toast.success(match.message || `Presensi Pulang ${resultItem.name} Berhasil. Hati-hati di jalan!`, {
                            icon: '👋'
                        });
                    } else {
                        soundRef.current.playSuccess();
                        toast.success(match.message || `Presensi Masuk ${resultItem.name} Berhasil`);
                    }

                    setTimeout(() => {
                        setActiveResult(null);
                        setLivenessStage('detecting');
                    }, 4000);
                }
            } catch (err: any) {
                console.warn('Scan error:', err);
                setLivenessStage('detecting');
                const errMsg = err.response?.data?.error || 'Wajah belum terdaftar. Silakan daftarkan wajah terlebih dahulu.';
                toast.error(errMsg, { icon: '👤' });
            } finally {
                setIsLiveScanning(false);
            }
        }, 1200);
    };

    // ─── Stats Today ───
    const stats = useMemo(() => {
        const studentCount = recentScans.filter(s => s.role === 'Siswa').length;
        const teacherCount = recentScans.filter(s => s.role === 'Guru' || s.role === 'Staf').length;
        const lateCount = recentScans.filter(s => s.status === 'Late').length;
        const totalPenaltyToday = recentScans.reduce((sum, s) => sum + s.penaltyAmount, 0);

        return { studentCount, teacherCount, lateCount, totalPenaltyToday };
    }, [recentScans]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* ─── Top Header Bar ─── */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
                {/* Top Row: Title, Live Status, Cutoff Info & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {!isTabVisible ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Dijeda (Tab Lain)
                                </span>
                            ) : showEnrollModal ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Modal Terbuka
                                </span>
                            ) : isScanning && hasCamera ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Kamera Siap
                                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Nonaktif
                                </span>
                            )}
                            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                <Clock size={11} className="text-amber-500" />
                                <span>Batas Masuk: <strong className="text-slate-700 font-semibold">{cutoffTime} WIB</strong></span>
                                <span>•</span>
                                <span>Mulai Pulang: <strong className="text-purple-700 font-semibold">{exitTime} WIB</strong></span>
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 flex items-center gap-2">
                            Presensi Wajah
                            <span className="text-emerald-600 text-sm sm:text-lg font-medium">(Siswa & Guru)</span>
                        </h1>
                    </div>

                    {/* Quick Utility Actions */}
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Toggle Kamera Manual */}
                        <button
                            onClick={() => setIsScanning(prev => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                isScanning
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                            title={isScanning ? 'Klik untuk mematikan kamera' : 'Klik untuk menyalakan kamera'}
                        >
                            <Camera size={14} className={isScanning ? 'text-emerald-600' : 'text-slate-400'} />
                            <span>{isScanning ? 'Kamera ON' : 'Kamera OFF'}</span>
                        </button>

                        {/* Sound Toggle */}
                        <button
                            onClick={() => {
                                const next = !soundOn;
                                setSoundOn(next);
                                soundRef.current.soundEnabled = next;
                            }}
                            className={`p-2 rounded-xl border transition-all ${
                                soundOn
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={soundOn ? 'Suara Aktif' : 'Mute'}
                        >
                            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        </button>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all hidden sm:inline-flex"
                            title="Mode Kiosk / Layar Penuh"
                        >
                            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>

                        {/* Face Enrollment Button */}
                        <button
                            onClick={() => setShowEnrollModal(true)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                            <UserPlus size={14} /> <span>Daftarkan Wajah</span>
                        </button>

                        {/* Settings Button */}
                        <Link
                            to="/dashboard/settings?tab=rfid_attendance"
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            title="Pengaturan Jam Masuk & Pulang Sekolah"
                        >
                            <Settings size={14} className="text-slate-500" />
                            <span>Pengaturan Jam</span>
                        </Link>

                        {/* Back to Attendance */}
                        <Link
                            to="/dashboard/attendance"
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
                        >
                            Tabel Rekap
                        </Link>
                    </div>
                </div>

                {/* Bottom Row: Mode Presensi + Mode Target + Camera Selector */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    {/* Mode Presensi (Auto / Masuk / Pulang) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mode:</span>
                        <div className="grid grid-cols-3 sm:inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-center w-full sm:w-auto">
                            <button
                                onClick={() => setScanMode('Auto')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                    scanMode === 'Auto'
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Zap size={13} /> <span>Auto (Masuk/Pulang)</span>
                            </button>
                            <button
                                onClick={() => setScanMode('CheckIn')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                    scanMode === 'CheckIn'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span>🌅 Masuk Saja</span>
                            </button>
                            <button
                                onClick={() => setScanMode('CheckOut')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                    scanMode === 'CheckOut'
                                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span>🌇 Pulang Saja</span>
                            </button>
                        </div>
                    </div>

                    {/* Target Filter & Device Selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">Filter:</span>
                        <div className="grid grid-cols-3 sm:inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-center w-full sm:w-auto">
                            <button
                                onClick={() => setTargetMode('all')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    targetMode === 'all'
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setTargetMode('student')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                                    targetMode === 'student'
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <GraduationCap size={13} /> <span>Siswa</span>
                            </button>
                            <button
                                onClick={() => setTargetMode('teacher')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                                    targetMode === 'teacher'
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Briefcase size={13} /> <span>Guru & Staf</span>
                            </button>
                        </div>

                        {/* Camera Device Selector if multiple devices exist */}
                        {devices.length > 1 && (
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                aria-label="Pilih Perangkat Kamera"
                                className="text-xs bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                            >
                                {devices.map((d, i) => (
                                    <option key={d.deviceId || i} value={d.deviceId}>
                                        {d.label || `Kamera ${i + 1}`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Main Two-Column Layout ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ─── Left Column: Camera Viewfinder (7 Cols) ─── */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Viewfinder: Portrait aspect-[3/4] on mobile, Horizontal aspect-[16/10] on desktop */}
                    <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl aspect-[3/4] sm:aspect-[16/10] flex items-center justify-center group">
                        {/* Live Video Feed */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Overlay when tab is inactive / hidden */}
                        {!isTabVisible && (
                            <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-slate-300">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 animate-pulse">
                                    <Camera size={32} />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-white mb-1">Kamera Dinonaktifkan Otomatis</h3>
                                <p className="text-xs text-slate-400 max-w-sm mb-3">
                                    Tab browser sedang tidak aktif. Kamera hardware dimatikan demi privasi dan menghemat daya baterai.
                                </p>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                    Otomatis aktif kembali saat membuka tab ini
                                </span>
                            </div>
                        )}

                        {/* Overlay when enrollment modal is active */}
                        {isTabVisible && showEnrollModal && (
                            <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-slate-300">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                                    <Camera size={32} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-1">Modal Pendaftaran Wajah Sedang Terbuka</h3>
                                <p className="text-xs text-slate-400 max-w-sm">
                                    Kamera pemindai presensi dijeda sementara agar webcam dapat digunakan di modal pendaftaran.
                                </p>
                            </div>
                        )}

                        {/* Fallback overlay if camera disabled/not found */}
                        {isTabVisible && !showEnrollModal && (!hasCamera || cameraError) && (
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
                                    <Camera size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Kamera Viewfinder Siap</h3>
                                <p className="text-xs text-slate-400 max-w-sm mb-4">
                                    {cameraError
                                        ? `Akses kamera: ${cameraError}. Silakan izinkan akses kamera di browser atau gunakan tombol simulasi di bawah.`
                                        : 'Kamera sedang nonaktif atau sedang diinisialisasi...'}
                                </p>
                                <button
                                    onClick={() => {
                                        setIsScanning(true);
                                        startCamera();
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                                >
                                    <RefreshCw size={14} /> Aktifkan Kamera
                                </button>
                            </div>
                        )}

                        {/* ─── Modern Minimalist Camera HUD Overlay ─── */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
                            {/* Top Corner Badges: Clean pills at left & right corners, open in the center */}
                            <div className="flex items-center justify-between w-full">
                                {/* Left: Minimalist Live Status */}
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-[11px] font-bold text-emerald-300 uppercase tracking-wider shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>LIVE CAM</span>
                                </div>

                                {/* Right: Real-time Clock Badge */}
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-[11px] font-mono text-slate-200 shadow-sm">
                                    <Clock size={11} className="text-amber-400" />
                                    <span>{currentTime}</span>
                                </div>
                            </div>

                            {/* Centered Facial Bounding Frame (Clean Oval adapted to mobile portrait & desktop landscape) */}
                            <div className="relative mx-auto w-48 h-64 sm:w-60 sm:h-76 flex items-center justify-center my-auto">
                                <div className={`w-full h-full rounded-[68px] sm:rounded-[80px] border-2 transition-all duration-300 ${
                                    livenessStage === 'matched'
                                        ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                                        : livenessStage === 'verifying'
                                        ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_25px_rgba(251,191,36,0.3)]'
                                        : 'border-white/50 bg-transparent'
                                }`}>
                                    {/* Soft corner guides */}
                                    <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2 border-white/60 rounded-tl-md" />
                                    <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2 border-white/60 rounded-tr-md" />
                                    <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2 border-white/60 rounded-bl-md" />
                                    <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2 border-white/60 rounded-br-md" />
                                </div>
                            </div>

                            {/* Floating Guidance Banner at Bottom */}
                            <div className="flex justify-center pb-1">
                                {livenessStage === 'detecting' && (
                                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 text-white text-[11px] sm:text-xs font-medium flex items-center gap-1.5 shadow-md">
                                        <Smile size={14} className="text-emerald-400 shrink-0" />
                                        <span>Arahkan wajah ke dalam bingkai oval</span>
                                    </div>
                                )}
                                {livenessStage === 'verifying' && (
                                    <div className="bg-black/75 backdrop-blur-md px-4 py-2 rounded-full border border-amber-400/40 text-amber-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shadow-lg animate-pulse">
                                        <Smile size={14} className="text-amber-400 shrink-0" />
                                        <span>Kedipkan mata atau tersenyum 😉</span>
                                    </div>
                                )}
                                {livenessStage === 'matched' && (
                                    <div className="bg-emerald-950/85 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-400/40 text-emerald-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                        <span>Wajah Terverifikasi</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Instant Success/Result Overlay ─── */}
                        {activeResult && (
                            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white animate-in fade-in zoom-in-95 duration-300">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-3 shadow-2xl border-2 ${
                                    activeResult.type === 'CheckOut'
                                        ? 'bg-purple-500/20 border-purple-400 text-purple-400 shadow-purple-500/30'
                                        : activeResult.status === 'Present'
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30'
                                        : 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/30'
                                }`}>
                                    {activeResult.type === 'CheckOut' ? (
                                        <LogOut size={44} className="animate-pulse" />
                                    ) : activeResult.status === 'Present' ? (
                                        <CheckCircle2 size={44} className="animate-bounce" />
                                    ) : (
                                        <Clock size={44} className="animate-pulse" />
                                    )}
                                </div>

                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 uppercase tracking-wide border shadow-sm">
                                    <span className={`w-2 h-2 rounded-full ${
                                        activeResult.type === 'CheckOut'
                                            ? 'bg-purple-400'
                                            : activeResult.status === 'Present'
                                            ? 'bg-emerald-400'
                                            : 'bg-amber-400'
                                    }`} />
                                    <span className={
                                        activeResult.type === 'CheckOut'
                                            ? 'text-purple-300'
                                            : activeResult.status === 'Present'
                                            ? 'text-emerald-300'
                                            : 'text-amber-300'
                                    }>
                                        {activeResult.type === 'CheckOut'
                                            ? 'Presensi Pulang Berhasil'
                                            : activeResult.status === 'Present'
                                            ? 'Presensi Masuk Tepat Waktu'
                                            : `Terlambat ${activeResult.lateMinutes} Menit`}
                                    </span>
                                </div>

                                <h2 className="text-2xl font-extrabold text-center tracking-tight max-w-md">{activeResult.name}</h2>
                                <p className="text-xs text-slate-300 mb-1">{activeResult.identifier} • {activeResult.subtext}</p>
                                <p className={`text-[11px] font-mono mb-4 ${activeResult.type === 'CheckOut' ? 'text-purple-300' : 'text-emerald-400'}`}>
                                    Jam Absen: {activeResult.timestamp}
                                </p>

                                {/* Deduction Warning Card for Late Teacher */}
                                {activeResult.role === 'Guru' && activeResult.status === 'Late' && (
                                    <div className="w-full max-w-md bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4 text-amber-100 shadow-xl mb-2 text-left">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                                                <Coins size={16} />
                                                <span>Potongan Penggajian (Otomatis)</span>
                                            </div>
                                            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                                                Tarif Rp {hourlyRate.toLocaleString('id-ID')}/jam
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-300 space-y-1">
                                            <div className="flex justify-between">
                                                <span>Rumus Potongan:</span>
                                                <span className="font-mono text-amber-200">
                                                    ({activeResult.lateMinutes} : 60) × Rp {hourlyRate.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-amber-500/30">
                                                <span>Total Potongan Gaji:</span>
                                                <span className="text-amber-400 font-extrabold">
                                                    - Rp {activeResult.penaltyAmount.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-amber-300/80 mt-2 italic">
                                            * Nominal di atas otomatis memotong Net Salary pada slip penggajian bulan ini.
                                        </p>
                                    </div>
                                )}

                                <p className="text-[11px] text-slate-400 mt-2">
                                    Memindai wajah berikutnya dalam 3 detik...
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ─── Action Control Bar ─── */}
                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 rounded-3xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Camera size={16} className="text-emerald-600" />
                                <span className="text-xs font-bold text-slate-800">Pemindai Wajah Kamera Langsung</span>
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                <Clock size={12} className="text-amber-500" />
                                <span>Masuk: <strong className="text-slate-700 font-semibold">{cutoffTime} WIB</strong></span>
                                <span>•</span>
                                <span>Pulang: <strong className="text-purple-700 font-semibold">{exitTime} WIB</strong></span>
                                <Link
                                    to="/dashboard/settings?tab=rfid_attendance"
                                    className="text-[11px] text-emerald-600 hover:text-emerald-800 underline font-semibold flex items-center gap-0.5 ml-1"
                                >
                                    <Settings size={11} /> Ubah
                                </Link>
                            </span>
                        </div>

                        {/* Live Camera Scan Button */}
                        <button
                            onClick={handleLiveScan}
                            disabled={!hasCamera || isLiveScanning}
                            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 active:scale-[0.99]"
                        >
                            <Camera size={18} />
                            {isLiveScanning ? 'Sedang Memproses Pemindaian Wajah...' : 'Pindai Wajah Sekarang'}
                        </button>
                    </div>
                </div>

                {/* ─── Right Column: Stats, Formula Card & Live Log Feed (5 Cols) ─── */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Formula Config Widget */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-xl border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Coins size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Formula Potongan Gaji Guru</h4>
                                    <p className="text-[11px] text-slate-400">Sinkronisasi otomatis ke Modul Payroll</p>
                                </div>
                            </div>
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                Aktif
                            </span>
                        </div>

                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs space-y-2">
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Rumus Baku:</span>
                                <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                    (Menit : 60) × Tarif
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Batas Masuk Sekolah:</span>
                                <span className="font-mono text-amber-300 font-semibold">{cutoffTime} WIB</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Tarif Per Jam:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400">Rp</span>
                                    <input
                                        type="number"
                                        value={hourlyRate}
                                        onChange={(e) => setHourlyRate(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-24 px-2 py-0.5 text-right font-mono bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800">
                            <Info size={14} className="text-emerald-400 shrink-0" />
                            <span>Total menit terlambat terakumulasi di database dan langsung terisi di <strong>lateness_penalty</strong> form penggajian.</span>
                        </div>
                    </div>

                    {/* Stats Widget */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white/80 p-3 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 font-medium block">Siswa Hadir</span>
                            <span className="text-lg font-extrabold text-emerald-600">{stats.studentCount}</span>
                        </div>
                        <div className="bg-white/80 p-3 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 font-medium block">Guru Hadir</span>
                            <span className="text-lg font-extrabold text-blue-600">{stats.teacherCount}</span>
                        </div>
                        <div className="bg-white/80 p-3 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 font-medium block">Terlambat</span>
                            <span className="text-lg font-extrabold text-amber-600">{stats.lateCount}</span>
                        </div>
                        <div className="bg-white/80 p-3 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 font-medium block">Total Potongan</span>
                            <span className="text-xs font-extrabold text-red-600 block truncate" title={`Rp ${stats.totalPenaltyToday.toLocaleString('id-ID')}`}>
                                Rp {stats.totalPenaltyToday.toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {/* Live Scans History Card */}
                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-600" />
                                <h3 className="text-sm font-bold text-slate-800">Aktivitas Presensi Terkini</h3>
                            </div>
                            <span className="text-[11px] text-slate-500">{recentScans.length} Tercatat</span>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {recentScans.map((scan) => (
                                <div
                                    key={scan.id}
                                    className="p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-3 shadow-xs"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                            scan.role === 'Siswa'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {scan.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{scan.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{scan.subtext}</p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                scan.type === 'CheckOut'
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                                {scan.type === 'CheckOut' ? 'Pulang' : 'Masuk'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                scan.status === 'Present'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {scan.status === 'Present' ? 'Tepat Waktu' : `+${scan.lateMinutes} mnt`}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                            {scan.timestamp}
                                        </span>
                                        {scan.penaltyAmount > 0 && (
                                            <span className="text-[10px] font-bold text-red-600 block mt-0.5">
                                                -Rp {scan.penaltyAmount.toLocaleString('id-ID')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Pendaftaran Wajah */}
            <FaceEnrollmentModal
                isOpen={showEnrollModal}
                onClose={() => setShowEnrollModal(false)}
                onSuccess={fetchLiveRecent}
            />
        </div>
    );
};

export default AttendanceFaceScanner;
