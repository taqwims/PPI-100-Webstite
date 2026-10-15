/**
 * Camera Guard Utility
 * 
 * Memastikan kamera perangkat (webcam) benar-benar mati saat:
 * 1. Berpindah tab browser (tab menjadi tidak aktif / background).
 * 2. Berpindah ke halaman/page lain di dalam aplikasi (SPA navigation).
 * 3. Berpindah tab di dalam komponen (in-app tab switching).
 * 4. Menutup modal atau membatalkan proses scan/enrollment.
 * 5. Menutup atau me-refresh browser (beforeunload / pagehide).
 */

const activeStreams = new Set<MediaStream>();

/**
 * Mendaftarkan MediaStream aktif agar terlacak dan dapat dimatikan secara terpusat.
 */
export function registerCameraStream(stream: MediaStream): () => void {
    if (!stream) return () => {};

    activeStreams.add(stream);

    // Otomatis hapus stream dari set jika semua track sudah stopped
    const handleTrackEnded = () => {
        const hasLiveTracks = stream.getTracks().some(t => t.readyState === 'live');
        if (!hasLiveTracks) {
            activeStreams.delete(stream);
        }
    };

    stream.getTracks().forEach(track => {
        track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
        stopMediaStream(stream);
    };
}

/**
 * Menghentikan satu MediaStream secara tuntas dan aman.
 */
export function stopMediaStream(stream: MediaStream | null | undefined): void {
    if (!stream) return;

    try {
        stream.getTracks().forEach(track => {
            try {
                if (track.readyState === 'live') {
                    track.stop();
                }
            } catch (err) {
                console.warn('[CameraGuard] Gagal mematikan track:', err);
            }
        });
    } catch (e) {
        console.warn('[CameraGuard] Error saat iterasi tracks:', e);
    }

    activeStreams.delete(stream);
}

/**
 * Menghentikan SEMUA MediaStream kamera yang aktif di aplikasi,
 * serta membersihkan srcObject dari semua tag <video> di DOM.
 */
export function stopAllCameraStreams(): void {
    // 1. Matikan semua stream yang terdaftar
    activeStreams.forEach(stream => {
        try {
            stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {}
            });
        } catch (e) {}
    });
    activeStreams.clear();

    // 2. Bersihkan semua elemen <video> di halaman DOM jika masih memiliki srcObject
    if (typeof document !== 'undefined') {
        try {
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach(video => {
                if (video.srcObject) {
                    try {
                        const stream = video.srcObject as MediaStream;
                        if (stream && typeof stream.getTracks === 'function') {
                            stream.getTracks().forEach(t => {
                                try {
                                    t.stop();
                                } catch (e) {}
                            });
                        }
                    } catch (e) {}
                    video.srcObject = null;
                }
            });
        } catch (e) {
            console.warn('[CameraGuard] Gagal membersihkan tag video DOM:', e);
        }
    }
}

// ─── Global Event Listeners ───
if (typeof window !== 'undefined') {
    // 1. Tangani ketika browser tab diminimalkan atau beralih ke tab lain
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAllCameraStreams();
        }
    });

    // 2. Tangani ketika window kehilangan fokus (misal pindah aplikasi desktop)
    window.addEventListener('pagehide', () => {
        stopAllCameraStreams();
    });

    // 3. Tangani ketika browser di-reload atau ditutup
    window.addEventListener('beforeunload', () => {
        stopAllCameraStreams();
    });
}
