import { registerSW } from 'virtual:pwa-register';

let isRefreshing = false;

/**
 * Inisialisasi otomatisasi pembaruan PWA & Web Cache.
 * Memastikan aplikasi selalu mendapatkan versi terbaru tanpa perlu
 * hard-reset / clear cache browser secara manual.
 */
export function initPWAAutoUpdate() {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
        // Handle ketika controller service worker berganti (update selesai)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!isRefreshing) {
                isRefreshing = true;
                console.log('[PWA] Versi baru aktif, memuat ulang halaman secara otomatis...');
                window.location.reload();
            }
        });

        const updateSW = registerSW({
            immediate: true,
            onNeedRefresh() {
                console.log('[PWA] Pembaruan baru terdeteksi! Mengaktifkan versi terbaru...');
                // Segera aktifkan service worker baru tanpa menunggu semua tab ditutup
                updateSW(true);
            },
            onOfflineReady() {
                console.log('[PWA] Aplikasi siap bekerja secara offline.');
            },
            onRegisteredSW(swUrl, registration) {
                if (!registration) return;

                console.log('[PWA] Service Worker terdaftar:', swUrl);

                // 1. Cek update berkala setiap 5 menit
                setInterval(() => {
                    registration.update().catch(() => {});
                }, 5 * 60 * 1000);

                // 2. Cek update saat user membuka kembali tab / aplikasi PWA dari background
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') {
                        registration.update().catch(() => {});
                    }
                });

                window.addEventListener('focus', () => {
                    registration.update().catch(() => {});
                });
            },
            onRegisterError(error) {
                console.warn('[PWA] Gagal mendaftarkan Service Worker:', error);
            }
        });
    }

    // ── Deteksi Pembaruan Versi Non-ServiceWorker (Fallback untuk browser biasa) ──
    initWebBuildAutoChecker();
}

/**
 * Fallback auto-updater: Memeriksa apakah file index.html di server berubah
 * jika Service Worker tidak aktif di browser tertentu.
 */
function initWebBuildAutoChecker() {
    let lastScriptTag = '';

    const checkWebUpdate = async () => {
        try {
            const res = await fetch(`/?_update_check=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (!res.ok) return;

            const html = await res.text();
            // Ambil nama file script utama bundle (mis: /assets/index-XXXXX.js)
            const match = html.match(/\/assets\/index-[a-zA-Z0-9_\-]+\.js/);
            const currentScript = match ? match[0] : '';

            if (currentScript) {
                if (lastScriptTag && lastScriptTag !== currentScript && !isRefreshing) {
                    console.log('[Web Auto-Update] Terdeteksi versi build baru di server, auto-refreshing...');
                    isRefreshing = true;
                    window.location.reload();
                } else if (!lastScriptTag) {
                    lastScriptTag = currentScript;
                }
            }
        } catch {
            // Abaikan jika offline / koneksi lambat
        }
    };

    // Jalankan pengecekan pertama setelah 10 detik
    setTimeout(checkWebUpdate, 10000);
    // Ulangi pengecekan setiap 10 menit
    setInterval(checkWebUpdate, 10 * 60 * 1000);

    // Cek saat user kembali ke tab browser
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkWebUpdate();
        }
    });
}

