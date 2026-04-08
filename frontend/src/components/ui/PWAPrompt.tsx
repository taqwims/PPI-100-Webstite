import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const PWAPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // iOS detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
            console.log('PWA was installed');
        });

        // If it's iOS and not standalone, show prompt after a short delay since iOS doesn't fire beforeinstallprompt
        if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
            setTimeout(() => {
                setShowInstallPrompt(true);
            }, 3000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            alert("Untuk install di iOS: Tap tombol 'Share' (ikon panah ke atas) di menu browser bawah, lalu pilih 'Add to Home Screen'.");
            return;
        }

        if (!deferredPrompt) {
            alert("Untuk install, silakan klik menu browser (titik tiga di pojok kanan atas) dan pilih 'Install Aplikasi' atau 'Add to Home Screen'.");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    if (!showInstallPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white shadow-2xl rounded-2xl p-5 border border-slate-200 z-[100] animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
                        <Download size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Aplikasi SIS-Keuangan</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Install untuk akses lebih cepat</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInstallPrompt(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                >
                    <X size={16} />
                </button>
            </div>
            <button
                onClick={handleInstallClick}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-md shadow-blue-500/20"
            >
                {isIOS ? 'Cara Install (iOS)' : 'Install Sekarang'}
            </button>
        </div>
    );
};

export default PWAPrompt;
