import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const PWAPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
            console.log('PWA was installed');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    if (!showInstallPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white shadow-2xl rounded-2xl p-4 border border-slate-200 z-[100] animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                        <Download size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Install Aplikasi</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Akses lebih cepat dengan aplikasi Desktop/Mobile</p>
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
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl text-sm transition"
            >
                Install Sekarang
            </button>
        </div>
    );
};

export default PWAPrompt;
