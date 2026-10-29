import React, { useState, useEffect, useRef } from 'react';
import {
    Camera, RefreshCw, CheckCircle2, Trash2, Search,
    Users, GraduationCap, Briefcase, X, AlertCircle,
    Upload, Sparkles, SwitchCamera
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    extractFaceEmbedding,
    extractEmbeddingFromImageUrl,
    extractEmbeddingFromFile
} from '../../utils/faceBiometric';
import { registerCameraStream, stopMediaStream } from '../../utils/cameraGuard';

interface UserItem {
    id: string;
    name: string;
    email: string;
    role_id: number;
    photo_url?: string;
    face_embedding?: string;
    face_photo_url?: string;
    face_registered_at?: string;
    student?: {
        nisn: string;
        class?: { name: string };
    };
    teacher?: {
        nip: string;
    };
}

interface FaceEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

    // Camera State & Cancellation Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);
    const requestTokenRef = useRef(0);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedEmbedding, setCapturedEmbedding] = useState<number[] | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isBulkSyncing, setIsBulkSyncing] = useState(false);
    const [isTabVisible, setIsTabVisible] = useState<boolean>(() => typeof document !== 'undefined' ? !document.hidden : true);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

    const toggleFacingMode = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const toggleFitMode = () => {
        setFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
    };

    // ─── Stop Camera Tracks Completely ───
    const stopCamera = () => {
        // Invalidate any in-flight startCamera
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
        setCameraActive(false);
    };

    // ─── Listen to Tab Visibility (pindah tab browser) ───
    useEffect(() => {
        isMountedRef.current = true;

        const handleVisibilityChange = () => {
            const visible = !document.hidden;
            setIsTabVisible(visible);
            if (!visible) {
                stopCamera();
            }
        };

        const handleFocus = () => setIsTabVisible(true);
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

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        } else {
            stopCamera();
            setCapturedImage(null);
            setCapturedEmbedding(null);
            setSelectedUser(null);
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await api.get('/users/');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setUsers(data);
        } catch (err: any) {
            console.error('Gagal mengambil daftar pengguna:', err);
            toast.error('Gagal memuat daftar pengguna');
        } finally {
            setLoadingUsers(false);
        }
    };

    const startCamera = async () => {
        stopCamera();
        const token = ++requestTokenRef.current;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // Pastikan jika modal tertutup atau tab tidak aktif saat kamera siap, langsung matikan stream
            if (!isMountedRef.current || token !== requestTokenRef.current || !isOpen || !selectedUser || capturedImage || document.hidden) {
                stopMediaStream(stream);
                return;
            }

            registerCameraStream(stream);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            if (token === requestTokenRef.current) {
                console.error('Gagal membuka kamera:', err);
                toast.error('Kamera tidak dapat diakses. Pastikan izin kamera aktif.');
            }
        }
    };

    // Kamera HANYA aktif saat modal terbuka, ada user terpilih, belum ada foto tercapture, dan tab browser aktif
    useEffect(() => {
        const shouldRun = isOpen && selectedUser && !capturedImage && isTabVisible;
        if (shouldRun) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, selectedUser, capturedImage, isTabVisible, facingMode]);

    // Capture photo from video to canvas
    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Extract embedding directly from video hardware stream (standard unflipped)
        const emb = extractFaceEmbedding(video);
        setCapturedEmbedding(emb);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw flipped image for selfie mirror UI preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setCapturedEmbedding(null);
        startCamera();
    };

    const handleSaveFace = async () => {
        if (!selectedUser || !capturedImage) {
            toast.error('Silakan ambil foto wajah terlebih dahulu');
            return;
        }

        setSubmitting(true);
        try {
            const embedding = capturedEmbedding || (canvasRef.current ? extractFaceEmbedding(canvasRef.current) : []);

            await api.post('/attendance/face-register', {
                user_id: selectedUser.id,
                embedding: embedding,
                photo_url: capturedImage
            });

            toast.success(`Wajah ${selectedUser.name} berhasil didaftarkan!`);
            fetchUsers();
            setSelectedUser(null);
            setCapturedImage(null);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Error registering face:', err);
            toast.error(err.response?.data?.error || 'Gagal mendaftarkan wajah');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Enroll from Profile Photo ───
    const handleEnrollFromProfilePhoto = async (targetUser?: UserItem) => {
        const u = targetUser || selectedUser;
        if (!u || !u.photo_url) {
            toast.error('Pengguna ini tidak memiliki foto profil');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading(`Mengekstrak biometrik wajah dari foto profil ${u.name}...`);
        try {
            const { embedding, dataUrl } = await extractEmbeddingFromImageUrl(u.photo_url);

            await api.post('/attendance/face-register', {
                user_id: u.id,
                embedding: embedding,
                photo_url: u.photo_url
            });

            toast.success(`Wajah ${u.name} berhasil didaftarkan dari foto profil!`, { id: toastId });
            setCapturedImage(dataUrl);
            setCapturedEmbedding(embedding);
            stopCamera();
            fetchUsers();
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Error enrolling from profile photo:', err);
            toast.error(err.message || 'Gagal mengekstrak wajah dari foto profil', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Upload File Pas Foto ───
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!selectedUser) {
            toast.error('Pilih siswa atau guru terlebih dahulu');
            return;
        }

        const toastId = toast.loading('Memproses file pas foto...');
        try {
            const { embedding, dataUrl } = await extractEmbeddingFromFile(file);
            setCapturedImage(dataUrl);
            setCapturedEmbedding(embedding);
            stopCamera();
            toast.success('Foto berhasil dimuat! Klik "Simpan & Daftarkan Wajah" untuk menyelesaikan.', { id: toastId });
        } catch (err: any) {
            console.error('File extraction error:', err);
            toast.error(err.message || 'Gagal memproses file foto', { id: toastId });
        } finally {
            e.target.value = '';
        }
    };

    // ─── Bulk Sync from All Existing Profile Photos ───
    const handleBulkSyncFromProfiles = async () => {
        const eligibleUsers = users.filter(u => u.photo_url && !u.face_embedding);
        if (eligibleUsers.length === 0) {
            toast('Semua siswa dan guru yang memiliki foto profil sudah terdaftar biometriknya.', { icon: 'ℹ️' });
            return;
        }

        if (!window.confirm(`Ditemukan ${eligibleUsers.length} siswa/guru yang memiliki foto profil di sistem.\n\nApakah Anda ingin mendaftarkan wajah semuanya secara otomatis sekarang?`)) {
            return;
        }

        setIsBulkSyncing(true);
        const toastId = toast.loading(`Mendaftarkan 0/${eligibleUsers.length} wajah...`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < eligibleUsers.length; i++) {
            const u = eligibleUsers[i];
            toast.loading(`Mendaftarkan ${i + 1}/${eligibleUsers.length}: ${u.name}...`, { id: toastId });
            try {
                const { embedding } = await extractEmbeddingFromImageUrl(u.photo_url!);
                await api.post('/attendance/face-register', {
                    user_id: u.id,
                    embedding: embedding,
                    photo_url: u.photo_url
                });
                successCount++;
            } catch (err) {
                console.warn(`Gagal sync wajah ${u.name}:`, err);
                failCount++;
            }
        }

        setIsBulkSyncing(false);
        toast.success(`Selesai! ${successCount} berhasil didaftarkan${failCount > 0 ? `, ${failCount} gagal` : ''}`, { id: toastId });
        fetchUsers();
        if (onSuccess) onSuccess();
    };

    const handleDeleteFace = async (user: UserItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Hapus data biometrik wajah ${user.name}?`)) return;

        try {
            await api.delete(`/attendance/face/${user.id}`);
            toast.success(`Data wajah ${user.name} berhasil dihapus`);
            fetchUsers();
            if (selectedUser?.id === user.id) {
                setSelectedUser(null);
                setCapturedImage(null);
            }
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Error removing face:', err);
            toast.error('Gagal menghapus data wajah');
        }
    };

    // Filtered users
    const filteredUsers = users.filter(u => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.student?.nisn && u.student.nisn.includes(searchQuery)) ||
            (u.teacher?.nip && u.teacher.nip.includes(searchQuery));

        if (!matchesSearch) return false;

        if (roleFilter === 'student') return u.student != null || u.role_id === 6;
        if (roleFilter === 'teacher') return u.teacher != null || u.role_id === 4 || u.role_id === 5;
        return true;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Camera size={20} className="text-emerald-600" />
                            Pendaftaran Wajah Siswa & Guru
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Ambil foto dari kamera untuk mendaftarkan wajah ke sistem presensi
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body: Split View (User List vs Camera Enrollment) */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                    {/* Left: User Directory (5 cols) */}
                    <div className="md:col-span-5 p-4 border-r border-slate-100 flex flex-col space-y-3 bg-slate-50/30 overflow-hidden">
                        {/* Search & Filter */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama, NIP, atau NISN..."
                                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
                            <button
                                onClick={() => setRoleFilter('all')}
                                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                                    roleFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setRoleFilter('student')}
                                className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                                    roleFilter === 'student' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                <GraduationCap size={13} /> Siswa
                            </button>
                            <button
                                onClick={() => setRoleFilter('teacher')}
                                className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                                    roleFilter === 'teacher' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                <Briefcase size={13} /> Guru
                            </button>
                        </div>

                        {/* Bulk Sync Button if any user has photo_url without face_embedding */}
                        {users.some(u => u.photo_url && !u.face_embedding) && (
                            <button
                                type="button"
                                onClick={handleBulkSyncFromProfiles}
                                disabled={isBulkSyncing}
                                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                            >
                                <Sparkles size={14} />
                                {isBulkSyncing
                                    ? 'Sedang Memproses Massal...'
                                    : `Daftarkan Otomatis dari Foto Profil (${users.filter(u => u.photo_url && !u.face_embedding).length})`}
                            </button>
                        )}

                        {/* User List Scrollable */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {loadingUsers ? (
                                <div className="text-center py-8 text-xs text-slate-400">Memuat data pengguna...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400">Tidak ada pengguna ditemukan</div>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isSelected = selectedUser?.id === user.id;
                                    const hasFace = !!user.face_embedding;
                                    const hasProfilePhoto = !!user.photo_url;
                                    const isStudent = !!user.student || user.role_id === 6;

                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setCapturedImage(null);
                                                setCapturedEmbedding(null);
                                            }}
                                            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                                                isSelected
                                                    ? 'bg-emerald-50/80 border-emerald-400 shadow-xs'
                                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                    {user.photo_url ? (
                                                        <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${
                                                            isStudent ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {user.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                                                        {user.name}
                                                        {hasProfilePhoto && (
                                                            <span className="text-[10px] text-emerald-600" title="Ada Foto Profil">📸</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        {isStudent
                                                            ? (user.student?.class?.name ? `Kelas ${user.student.class.name}` : 'Siswa')
                                                            : (user.teacher?.nip ? `NIP ${user.teacher.nip}` : 'Guru / Staf')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {hasFace ? (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle2 size={11} /> Terdaftar
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                                        Belum
                                                    </span>
                                                )}

                                                {hasFace && (
                                                    <button
                                                        onClick={(e) => handleDeleteFace(user, e)}
                                                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition"
                                                        title="Hapus Wajah"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Camera View & Face Registration (7 cols) */}
                    <div className="md:col-span-7 p-6 flex flex-col justify-between overflow-y-auto">
                        {selectedUser ? (
                            <div className="space-y-4">
                                {/* Profile Info */}
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                            {selectedUser.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">{selectedUser.name}</h4>
                                            <p className="text-xs text-slate-500">
                                                {selectedUser.student
                                                    ? `Siswa • NISN ${selectedUser.student.nisn}`
                                                    : `Guru / Staf • ${selectedUser.teacher?.nip ? 'NIP ' + selectedUser.teacher.nip : selectedUser.email}`}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedUser.face_embedding && (
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                                            Sudah ada data wajah
                                        </span>
                                    )}
                                </div>

                                {/* Profile Photo Quick Enroll Banner */}
                                {selectedUser.photo_url && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <img src={selectedUser.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-emerald-300 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-emerald-900 truncate">Foto Profil Tersedia</p>
                                                <p className="text-[11px] text-emerald-700">Daftarkan langsung tanpa perlu buka kamera</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleEnrollFromProfilePhoto()}
                                            disabled={submitting}
                                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition shadow-sm active:scale-95 flex items-center gap-1.5"
                                        >
                                            <Sparkles size={14} /> Daftarkan dari Foto Profil
                                        </button>
                                    </div>
                                )}

                                {/* Camera Viewport: Portrait on mobile, Horizontal on desktop */}
                                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center border border-slate-300 shadow-inner group">
                                    {/* Video Stream */}
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'} transform ${facingMode === 'user' ? 'scale-x-[-1]' : 'scale-x-1'} ${
                                            capturedImage ? 'hidden' : 'block'
                                        }`}
                                    />

                                    {/* Top floating camera quick toggles (flip camera & fit mode) */}
                                    {!capturedImage && cameraActive && isTabVisible && (
                                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={toggleFacingMode}
                                                className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-medium border border-white/20 flex items-center gap-1 shadow-sm transition active:scale-95"
                                                title={`Ganti Kamera (${facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'})`}
                                            >
                                                <SwitchCamera size={12} className="text-emerald-400" />
                                                <span>{facingMode === 'user' ? 'Depan' : 'Belakang'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={toggleFitMode}
                                                className="px-2 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-white/20 shadow-sm transition active:scale-95"
                                                title={`Tampilan: ${fitMode === 'contain' ? 'Fit Utuh (Tanpa Zoom/Crop)' : 'Cover Penuh'}`}
                                            >
                                                {fitMode === 'contain' ? 'FIT' : 'CROP'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Captured Snapshot Preview */}
                                    {capturedImage && (
                                        <img
                                            src={capturedImage}
                                            alt="Captured Face"
                                            className="w-full h-full object-cover"
                                        />
                                    )}

                                    {/* Overlay when browser tab is inactive / hidden */}
                                    {!isTabVisible && !capturedImage && (
                                        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center text-slate-300">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 animate-pulse">
                                                <Camera size={24} />
                                            </div>
                                            <p className="text-xs font-bold text-white mb-1">Kamera Dinonaktifkan Sementara</p>
                                            <p className="text-[11px] text-slate-400 max-w-xs">
                                                Tab browser sedang tidak aktif. Kamera otomatis menyala kembali saat Anda membuka tab ini.
                                            </p>
                                        </div>
                                    )}

                                    {/* Normal Oval Face Guide Frame */}
                                    {!capturedImage && cameraActive && isTabVisible && (
                                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                                            <div className="w-48 h-60 rounded-full border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                                                <div className="w-44 h-56 rounded-full border border-dashed border-white/60" />
                                            </div>
                                            <p className="absolute bottom-4 text-xs font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                                                Posisikan wajah tepat di dalam lingkaran oval
                                            </p>
                                        </div>
                                    )}

                                    {/* Hidden canvas for capturing */}
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>

                                {/* Camera & Upload Action Buttons */}
                                <div className="flex flex-wrap items-center justify-center gap-2.5">
                                    {!capturedImage ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleCapture}
                                                disabled={!cameraActive || !isTabVisible}
                                                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 active:scale-95"
                                            >
                                                <Camera size={16} /> Ambil Foto Kamera
                                            </button>

                                            <label className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 shadow-sm transition cursor-pointer active:scale-95">
                                                <Upload size={14} className="text-emerald-600" /> Unggah Pas Foto
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleRetake}
                                                disabled={submitting}
                                                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 transition"
                                            >
                                                <RefreshCw size={14} /> Ambil Ulang
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveFace}
                                                disabled={submitting}
                                                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
                                            >
                                                {submitting ? (
                                                    <span>Menyimpan...</span>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={16} /> Simpan & Daftarkan Wajah
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                                    <Users size={28} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700 mb-1">Pilih Pengguna</h4>
                                <p className="text-xs text-slate-400 max-w-xs">
                                    Pilih salah satu siswa atau guru pada daftar di sebelah kiri untuk mulai mengambil foto wajah.
                                </p>
                            </div>
                        )}

                        {/* Footer Info */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                                <AlertCircle size={13} className="text-emerald-500" />
                                Hanya butuh 1x pendaftaran per orang
                            </span>
                            <button
                                onClick={onClose}
                                className="text-slate-500 hover:text-slate-800 font-semibold"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollmentModal;
